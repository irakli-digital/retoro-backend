import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users, userSettings, returnItems, sessions } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { registerSchema } from "@/lib/validators/auth";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/utils/api-response";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.errors);
    }

    const { email, password, name, anonymous_user_id } = validation.data;

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return errorResponse("User with this email already exists", 400);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        name,
        emailVerified: false,
      })
      .returning();

    // Create default user settings
    await db.insert(userSettings).values({
      userId: newUser.id,
      preferredCurrency: "USD",
      notificationsEnabled: true,
      emailNotificationsEnabled: true,
      pushNotificationsEnabled: true,
    });

    // Migrate anonymous user data if anonymous_user_id provided
    if (anonymous_user_id) {
      // Find sessions with this anonymous ID and migrate them
      await db
        .update(sessions)
        .set({ userId: newUser.id })
        .where(eq(sessions.anonymousUserId, anonymous_user_id));

      // Migrate return items
      // Note: This assumes returnItems has a userId field that can store anonymous IDs
      // You may need to adjust based on your actual schema
    }

    // Create session
    const session = await createSession(newUser.id, anonymous_user_id);

    return successResponse(
      {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          emailVerified: newUser.emailVerified,
        },
        session: {
          token: session.token,
          expiresAt: session.expiresAt.toISOString(),
        },
      },
      201
    );
  } catch (error) {
    console.error("Registration error:", error);
    return errorResponse("Failed to register user", 500);
  }
}
