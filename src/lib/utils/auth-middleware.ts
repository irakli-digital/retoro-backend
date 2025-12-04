import { NextRequest } from "next/server";
import { getSessionByToken } from "../auth/session";
import { unauthorizedResponse } from "./api-response";

export async function requireAuth(request: NextRequest) {
  // Check for session token in Authorization header
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return {
      error: unauthorizedResponse("No authentication token provided"),
    };
  }

  const session = await getSessionByToken(token);

  if (!session) {
    return {
      error: unauthorizedResponse("Invalid or expired session"),
    };
  }

  return {
    user: session.user,
    session: session.session,
  };
}

export function getAnonymousUserId(request: NextRequest): string | null {
  return request.headers.get("x-anonymous-user-id");
}

export async function getUserOrAnonymous(request: NextRequest): Promise<{
  userId: string;
  isAnonymous: boolean;
}> {
  // Try to get authenticated user first
  const authResult = await requireAuth(request);

  if (!authResult.error && authResult.user) {
    return {
      userId: authResult.user.id,
      isAnonymous: false,
    };
  }

  // Fall back to anonymous user ID
  const anonymousId = getAnonymousUserId(request);

  if (!anonymousId) {
    throw new Error("No user ID or anonymous ID provided");
  }

  // For anonymous users, we need to create or find a user record
  // because return_items.userId must reference users.id (UUID)
  const { db } = await import("../db");
  const { users } = await import("../db/schema");
  const { eq } = await import("drizzle-orm");

  // Check if we already have a user for this anonymous ID
  let existingUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, `${anonymousId}@anonymous.temp`))
    .limit(1);

  if (existingUsers.length > 0) {
    return {
      userId: existingUsers[0].id,
      isAnonymous: true,
    };
  }

  // Create a temporary user for this anonymous ID
  const [newUser] = await db
    .insert(users)
    .values({
      email: `${anonymousId}@anonymous.temp`,
      password: null, // No password for anonymous users
      name: "Anonymous User",
      emailVerified: false,
    })
    .returning({ id: users.id });

  return {
    userId: newUser.id,
    isAnonymous: true,
  };
}
