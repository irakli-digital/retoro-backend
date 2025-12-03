import formData from "form-data";
import Mailgun from "mailgun.js";

const mailgun = new Mailgun(formData);

const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY || "",
});

const domain = process.env.MAILGUN_DOMAIN || "";
const from = process.env.EMAIL_FROM || "noreply@retoro.app";

export async function sendMagicLinkEmail(
  email: string,
  token: string,
  name?: string
): Promise<void> {
  const magicLink = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/auth/verify?token=${token}`;

  const messageData = {
    from,
    to: email,
    subject: "Sign in to Retoro",
    text: `Hi${name ? ` ${name}` : ""},\n\nClick the link below to sign in to your Retoro account:\n\n${magicLink}\n\nThis link will expire in 15 minutes.\n\nIf you didn't request this email, you can safely ignore it.`,
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4F46E5;">Sign in to Retoro</h2>
            <p>Hi${name ? ` ${name}` : ""},</p>
            <p>Click the button below to sign in to your Retoro account:</p>
            <div style="margin: 30px 0;">
              <a href="${magicLink}"
                 style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Sign In
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">This link will expire in 15 minutes.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this email, you can safely ignore it.</p>
          </div>
        </body>
      </html>
    `,
  };

  try {
    await mg.messages.create(domain, messageData);
  } catch (error) {
    console.error("Failed to send magic link email:", error);
    throw new Error("Failed to send magic link email");
  }
}

export async function sendSupportEmail(
  userEmail: string,
  subject: string,
  message: string
): Promise<void> {
  const supportEmail = process.env.SUPPORT_EMAIL || "support@retoro.app";

  const messageData = {
    from,
    to: supportEmail,
    "reply-to": userEmail,
    subject: `Support Request: ${subject}`,
    text: `From: ${userEmail}\n\nSubject: ${subject}\n\nMessage:\n${message}`,
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Support Request</h2>
            <p><strong>From:</strong> ${userEmail}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <h3>Message:</h3>
            <p>${message.replace(/\n/g, "<br>")}</p>
          </div>
        </body>
      </html>
    `,
  };

  try {
    await mg.messages.create(domain, messageData);
  } catch (error) {
    console.error("Failed to send support email:", error);
    throw new Error("Failed to send support email");
  }
}
