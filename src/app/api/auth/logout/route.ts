import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/utils/auth-middleware";
import { deleteSession } from "@/lib/auth/session";
import { successResponse } from "@/lib/utils/api-response";

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);

    if (authResult.error) {
      return authResult.error;
    }

    // Delete the session
    await deleteSession(authResult.session.token);

    return successResponse({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return successResponse({
      success: true,
      message: "Logged out successfully",
    });
  }
}
