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

  return {
    userId: anonymousId,
    isAnonymous: true,
  };
}
