import { NextRequest } from "next/server";
import { getUserOrAnonymous } from "@/lib/utils/auth-middleware";
import {
  successResponse,
  errorResponse,
} from "@/lib/utils/api-response";

// Type definitions for n8n response
interface ParsedItem {
  item_name: string;
  item_cost: number;
  item_quantity: number;
  item_currency: string;
  currency_symbol: string;
}

interface N8nSuccessResponse {
  success: true;
  seller_name: string;
  items: ParsedItem[];
}

interface N8nErrorResponse {
  success: false;
  error: boolean;
  message: string;
  document_type?: string;
  confidence?: number;
}

type N8nResponse = N8nSuccessResponse | N8nErrorResponse;

// POST /api/upload/invoice - Upload and parse invoice (returns parsed data for user review)
// NOTE: This endpoint ONLY parses the invoice. It does NOT create any database records.
// The iOS app should display the parsed data in a form for user review/editing,
// then call POST /api/return-items when the user confirms.
export async function POST(request: NextRequest) {
  try {
    // Verify user (for logging purposes)
    const userInfo = await getUserOrAnonymous(request);

    // Get the form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return errorResponse("No file provided", 400);
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return errorResponse("Invalid file type. Only JPEG, PNG, and PDF are allowed", 400);
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return errorResponse("File size exceeds 10MB limit", 500);
    }

    // Get n8n webhook URL from environment
    const webhookUrl = process.env.N8N_INVOICE_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error("N8N_INVOICE_WEBHOOK_URL not configured");
      return errorResponse("Invoice processing is not configured", 500);
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    console.log("📤 Forwarding to n8n for parsing:", webhookUrl);
    console.log("📦 File info:", {
      fileName: file.name,
      fileSize: buffer.length,
      fileType: file.type,
      userId: userInfo.userId,
      isAnonymous: userInfo.isAnonymous,
    });

    // Send to n8n for parsing only
    let n8nResponse: Response;
    try {
      n8nResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": file.type,
          "Content-Disposition": file.name,
        },
        body: buffer,
      });
    } catch (fetchError: unknown) {
      const error = fetchError as Error;
      console.error("❌ n8n webhook fetch error:", error.message);
      return errorResponse(
        `Failed to connect to invoice processor: ${error.message}`,
        500
      );
    }

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error("❌ n8n webhook error:", {
        status: n8nResponse.status,
        statusText: n8nResponse.statusText,
        body: errorText,
      });
      return errorResponse(
        `Invoice processor error (${n8nResponse.status}): ${errorText}`,
        500
      );
    }

    // Parse n8n response
    const parsedData: N8nResponse = await n8nResponse.json();
    console.log("📥 n8n parsed data:", parsedData);

    // Check if parsing failed
    if (!parsedData.success) {
      const errorData = parsedData as N8nErrorResponse;
      return successResponse({
        success: false,
        error: true,
        message: errorData.message || "Failed to parse invoice",
        document_type: errorData.document_type,
        confidence: errorData.confidence,
      });
    }

    // Return parsed data for iOS to display in form
    // NO database operations here - user will review and submit separately
    const successData = parsedData as N8nSuccessResponse;
    
    console.log("✅ Invoice parsed successfully:", {
      seller: successData.seller_name,
      itemCount: successData.items.length,
    });

    return successResponse({
      success: true,
      message: "Invoice parsed successfully",
      seller_name: successData.seller_name,
      items: successData.items,
    });
  } catch (error) {
    console.error("Invoice upload error:", error);
    return errorResponse("Failed to process invoice", 500);
  }
}
