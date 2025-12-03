import { NextRequest } from "next/server";
import { requireAuth, getAnonymousUserId } from "@/lib/utils/auth-middleware";
import { successResponse } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    // Try to get authenticated user
    const authResult = await requireAuth(request);

    if (authResult.error) {
      // No authenticated session, check for anonymous user
      const anonymousId = getAnonymousUserId(request);

      if (anonymousId) {
        return successResponse({
          userId: anonymousId,
          isAnonymous: true,
        });
      }

      // Return the unauthorized error
      return authResult.error;
    }

    // Return authenticated user session
    return successResponse({
      userId: authResult.user.id,
      email: authResult.user.email,
      name: authResult.user.name,
      emailVerified: authResult.user.emailVerified,
      isAnonymous: false,
    });
  } catch (error) {
    console.error("Session check error:", error);
    return successResponse({
      userId: null,
      isAnonymous: true,
    });
  }
}
