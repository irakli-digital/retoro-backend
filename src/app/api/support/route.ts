import { NextRequest } from "next/server";
import { getUserOrAnonymous } from "@/lib/utils/auth-middleware";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/utils/api-response";
import { sendEmail } from "@/lib/utils/email";
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
      return validationErrorResponse(validation.error.errors);
    }

    const { subject, message, email } = validation.data;

    // Determine sender email (use provided email or default for anonymous)
    const senderEmail = email || (userInfo.isAnonymous ? "anonymous@retoro.app" : "user@retoro.app");

    // Send support email
    const emailSent = await sendEmail({
      to: process.env.SUPPORT_EMAIL || "support@retoro.app",
      subject: `Support Request: ${subject}`,
      text: `
From: ${senderEmail}
User ID: ${userInfo.userId}
Is Anonymous: ${userInfo.isAnonymous}

Subject: ${subject}

Message:
${message}
      `.trim(),
      html: `
<div style="font-family: Arial, sans-serif;">
  <h2>Support Request</h2>
  <p><strong>From:</strong> ${senderEmail}</p>
  <p><strong>User ID:</strong> ${userInfo.userId}</p>
  <p><strong>Anonymous:</strong> ${userInfo.isAnonymous ? "Yes" : "No"}</p>
  <hr>
  <h3>${subject}</h3>
  <p>${message.replace(/\n/g, "<br>")}</p>
</div>
      `.trim(),
    });

    if (!emailSent) {
      // Log the support request even if email fails
      console.log("Support request (email failed):", {
        userId: userInfo.userId,
        isAnonymous: userInfo.isAnonymous,
        email: senderEmail,
        subject,
        message,
      });

      return errorResponse("Failed to send support request. Please try again later.", 500);
    }

    console.log("Support request sent:", {
      userId: userInfo.userId,
      subject,
    });

    return successResponse({
      message: "Support request sent successfully. We'll get back to you soon.",
    });
  } catch (error) {
    console.error("Support request error:", error);
    return errorResponse("Failed to submit support request", 500);
  }
}
