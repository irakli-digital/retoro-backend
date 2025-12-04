import { NextRequest } from "next/server";
import { getUserOrAnonymous } from "@/lib/utils/auth-middleware";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/utils/api-response";
import { sendSupportEmail } from "@/lib/utils/email";
import { z } from "zod";

const supportRequestSchema = z.object({
  subject: z.string().min(1).max(200),
  message: z.string().min(10).max(2000),
  email: z.string().email().optional(),
});

// POST /api/support - Submit support request
export async function POST(request: NextRequest) {
  try {
    const userInfo = await getUserOrAnonymous(request);
    const body = await request.json();

    // Validate input
    const validation = supportRequestSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues);
    }

    const { subject, message, email } = validation.data;

    // Determine sender email (use provided email or default for anonymous)
    const senderEmail = email || (userInfo.isAnonymous ? "anonymous@retoro.app" : "user@retoro.app");

    // Send support email
    const emailMessage = `
From: ${senderEmail}
User ID: ${userInfo.userId}
Is Anonymous: ${userInfo.isAnonymous}

Message:
${message}
    `.trim();

    try {
      await sendSupportEmail(senderEmail, subject, emailMessage);

      console.log("Support request sent:", {
        userId: userInfo.userId,
        subject,
      });
    } catch (error) {
      // Log the support request even if email fails
      console.error("Support request (email failed):", {
        userId: userInfo.userId,
        isAnonymous: userInfo.isAnonymous,
        email: senderEmail,
        subject,
        message,
        error,
      });

      return errorResponse("Failed to send support request. Please try again later.", 500);
    }

    return successResponse({
      message: "Support request sent successfully. We'll get back to you soon.",
    });
  } catch (error) {
    console.error("Support request error:", error);
    return errorResponse("Failed to submit support request", 500);
  }
}
