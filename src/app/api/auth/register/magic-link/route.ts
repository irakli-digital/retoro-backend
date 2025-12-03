import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users, magicLinkTokens } from "@/lib/db/schema";
import { magicLinkSchema } from "@/lib/validators/auth";
import { sendMagicLinkEmail } from "@/lib/utils/email";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/utils/api-response";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = magicLinkSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.errors);
    }

    const { email, name, anonymous_user_id } = validation.data;

    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // If user doesn't exist, create one
    let userId: string;
    if (!existingUser) {
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          name,
          password: null, // No password for magic link users
          emailVerified: false,
        })
        .returning();
      userId = newUser.id;
    } else {
      userId = existingUser.id;
    }

    // Generate magic link token
    const token = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes expiry

    // Store token with anonymous_user_id for migration
    await db.insert(magicLinkTokens).values({
      email,
      token,
      expiresAt,
      used: false,
    });

    // Send magic link email
    await sendMagicLinkEmail(email, token, name);

    return successResponse({
      success: true,
      message: "Magic link sent to your email",
    });
  } catch (error) {
    console.error("Magic link error:", error);
    return errorResponse("Failed to send magic link", 500);
  }
}
