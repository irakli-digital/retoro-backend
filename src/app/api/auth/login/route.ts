import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users, sessions, returnItems } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validators/auth";
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
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.errors);
    }

    const { email, password, anonymous_user_id } = validation.data;

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !user.password) {
      return errorResponse("Invalid email or password", 401);
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      return errorResponse("Invalid email or password", 401);
    }

    // Migrate anonymous user data if anonymous_user_id provided
    if (anonymous_user_id) {
      // Migrate sessions
      await db
        .update(sessions)
        .set({ userId: user.id })
        .where(eq(sessions.anonymousUserId, anonymous_user_id));

      // Migrate return items from anonymous user to authenticated user
      await db
        .update(returnItems)
        .set({ userId: user.id })
        .where(eq(returnItems.userId, anonymous_user_id));

      console.log(`Migrated anonymous data for ${anonymous_user_id} to user ${user.id}`);
    }

    // Create session
    const session = await createSession(user.id, anonymous_user_id);

    return successResponse({
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
    });
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse("Failed to login", 500);
  }
}
