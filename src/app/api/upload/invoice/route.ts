import { NextRequest } from "next/server";
import { getUserOrAnonymous } from "@/lib/utils/auth-middleware";
import {
  successResponse,
  errorResponse,
} from "@/lib/utils/api-response";

// POST /api/upload/invoice - Upload and process invoice
export async function POST(request: NextRequest) {
  try {
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
      return errorResponse("File size exceeds 10MB limit", 400);
    }

    // Get n8n webhook URL from environment
    const webhookUrl = process.env.N8N_INVOICE_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error("N8N_INVOICE_WEBHOOK_URL not configured");
      return errorResponse("Invoice processing is not configured", 500);
    }

    // Convert file to buffer and base64
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Data = buffer.toString("base64");

    // Create data URL in the format Mistral OCR expects
    const dataUrl = `data:${file.type};base64,${base64Data}`;

    // Prepare JSON payload for n8n webhook
    const payload = {
      document: dataUrl,
      document_name: file.name,
      user_id: userInfo.userId,
      is_anonymous: userInfo.isAnonymous,
      file_type: file.type,
      file_size: buffer.length,
    };

    console.log("📤 Forwarding to n8n webhook:", webhookUrl);
    console.log("📦 Payload:", {
      fileName: file.name,
      fileSize: buffer.length,
      fileType: file.type,
      userId: userInfo.userId,
      isAnonymous: userInfo.isAnonymous,
      dataUrlPrefix: dataUrl.substring(0, 50) + "...", // Log first 50 chars
    });

    let response;
    try {
      response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.RETORO_API_KEY || "",
          "X-User-ID": userInfo.userId,
        },
        body: JSON.stringify(payload),
      });
    } catch (fetchError: any) {
      console.error("❌ n8n webhook fetch error:", fetchError.message);
      return errorResponse(
        `Failed to connect to invoice processor: ${fetchError.message}`,
        500
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ n8n webhook error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      return errorResponse(
        `Invoice processor error (${response.status}): ${errorText}`,
        500
      );
    }

    const result = await response.json();

    console.log("Invoice processed:", {
      userId: userInfo.userId,
      fileName: file.name,
      fileSize: file.size,
    });

    return successResponse({
      message: "Invoice uploaded successfully and is being processed",
      ...result,
    });
  } catch (error) {
    console.error("Invoice upload error:", error);
    return errorResponse("Failed to upload invoice", 500);
  }
}
