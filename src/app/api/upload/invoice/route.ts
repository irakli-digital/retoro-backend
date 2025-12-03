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

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Data = buffer.toString("base64");

    // Forward to n8n webhook for processing
    const n8nFormData = new FormData();
    n8nFormData.append("file", new Blob([buffer], { type: file.type }), file.name);
    n8nFormData.append("user_id", userInfo.userId);
    n8nFormData.append("is_anonymous", userInfo.isAnonymous.toString());

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "X-API-Key": process.env.RETORO_API_KEY || "",
        "X-User-ID": userInfo.userId,
      },
      body: n8nFormData,
    });

    if (!response.ok) {
      console.error("n8n webhook error:", await response.text());
      return errorResponse("Failed to process invoice", 500);
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
