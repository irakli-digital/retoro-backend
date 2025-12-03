import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users, userSettings, returnItems, sessions } from "@/lib/db/schema";
import { verifyAppleToken, isEmailVerified } from "@/lib/auth/apple";
import { createSession } from "@/lib/auth/session";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/utils/api-response";
import { eq } from "drizzle-orm";
import { z } from "zod";

const appleAuthSchema = z.object({
  identity_token: z.string().min(1, "Identity token is required"),
  user_data: z
    .object({
      name: z
        .object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
        })
        .optional(),
      email: z.string().email().optional(),
    })
    .optional(),
  anonymous_user_id: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = appleAuthSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.errors);
    }

    const { identity_token, user_data, anonymous_user_id } = validation.data;

    // Get bundle ID from environment variable
    const bundleId = process.env.APPLE_BUNDLE_ID || "com.retoro.app";

    // Verify the Apple identity token
    let applePayload;
    try {
      applePayload = await verifyAppleToken(identity_token, bundleId);
    } catch (error) {
      console.error("Apple token verification error:", error);
      return errorResponse("Invalid Apple identity token", 401);
    }

    // Extract user info from token
    const appleUserId = applePayload.sub;
    const email = applePayload.email || user_data?.email;

    if (!email) {
      return errorResponse(
        "Email is required. Please grant email permission in Apple Sign In.",
        400
      );
    }

    // Build full name from user_data if provided (only sent on first sign-in)
    let fullName: string | null = null;
    if (user_data?.name) {
      const parts = [
        user_data.name.firstName,
        user_data.name.lastName,
      ].filter(Boolean);
      fullName = parts.length > 0 ? parts.join(" ") : null;
    }

    // Check if user already exists by Apple ID
    let existingUserByApple = await db
      .select()
      .from(users)
      .where(eq(users.appleUserId, appleUserId))
      .limit(1);

    let user;

    if (existingUserByApple.length > 0) {
      // User exists with this Apple ID - just log them in
      user = existingUserByApple[0];

      // Update name if provided and not already set
      if (fullName && !user.name) {
        [user] = await db
          .update(users)
          .set({ name: fullName, updatedAt: new Date() })
          .where(eq(users.id, user.id))
          .returning();
      }
    } else {
      // Check if user exists by email
      const existingUserByEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUserByEmail.length > 0) {
        // User exists with this email - link Apple ID to existing account
        user = existingUserByEmail[0];

        if (user.appleUserId && user.appleUserId !== appleUserId) {
          return errorResponse(
            "This email is already linked to a different Apple account",
            400
          );
        }

        // Link Apple ID to existing account
        [user] = await db
          .update(users)
          .set({
            appleUserId,
            emailVerified: isEmailVerified(applePayload),
            updatedAt: new Date()
          })
          .where(eq(users.id, user.id))
          .returning();
      } else {
        // Create new user
        [user] = await db
          .insert(users)
          .values({
            email,
            appleUserId,
            name: fullName,
            password: null, // OAuth users don't have passwords
            emailVerified: isEmailVerified(applePayload),
          })
          .returning();

        // Create default user settings
        await db.insert(userSettings).values({
          userId: user.id,
          preferredCurrency: "USD",
          notificationsEnabled: true,
          emailNotificationsEnabled: true,
          pushNotificationsEnabled: true,
        });
      }
    }

    // Migrate anonymous user data if anonymous_user_id provided
    if (anonymous_user_id) {
      // Migrate sessions
      await db
        .update(sessions)
        .set({ userId: user.id })
        .where(eq(sessions.anonymousUserId, anonymous_user_id));

      // Migrate return items from anonymous user to new user
      await db
        .update(returnItems)
        .set({ userId: user.id })
        .where(eq(returnItems.userId, anonymous_user_id));

      console.log(`Migrated anonymous data for ${anonymous_user_id} to user ${user.id}`);
    }

    // Create session
    const session = await createSession(user.id, anonymous_user_id);

    return successResponse(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
        },
        session: {
          token: session.token,
          expiresAt: session.expiresAt.toISOString(),
        },
      },
      200
    );
  } catch (error) {
    console.error("Apple authentication error:", error);
    return errorResponse("Failed to authenticate with Apple", 500);
  }
}
