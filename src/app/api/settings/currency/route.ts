import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { userSettings, users } from "@/lib/db/schema";
import { requireAuth, getUserOrAnonymous } from "@/lib/utils/auth-middleware";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/utils/api-response";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateCurrencySchema = z.object({
  currency: z.string().length(3).toUpperCase(),
});

// GET /api/settings/currency - Get user's preferred currency
export async function GET(request: NextRequest) {
  try {
    const userInfo = await getUserOrAnonymous(request);

    // For anonymous users, return default
    if (userInfo.isAnonymous) {
      return successResponse({ currency: "USD" });
    }

    // Get user settings
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userInfo.userId))
      .limit(1);

    return successResponse({
      currency: settings?.preferredCurrency || "USD",
    });
  } catch (error) {
    console.error("Get currency error:", error);
    return errorResponse("Failed to fetch currency preference", 500);
  }
}

// PUT /api/settings/currency - Update user's preferred currency
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);

    if (authResult.error) {
      return authResult.error;
    }

    const userId = authResult.user.id;
    const body = await request.json();

    // Validate input
    const validation = updateCurrencySchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.errors);
    }

    const { currency } = validation.data;

    // Check if settings exist
    const [existing] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    let updatedSettings;

    if (existing) {
      // Update existing settings
      [updatedSettings] = await db
        .update(userSettings)
        .set({
          preferredCurrency: currency,
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, userId))
        .returning();
    } else {
      // Create new settings
      [updatedSettings] = await db
        .insert(userSettings)
        .values({
          userId,
          preferredCurrency: currency,
        })
        .returning();
    }

    return successResponse({
      currency: updatedSettings.preferredCurrency,
    });
  } catch (error) {
    console.error("Update currency error:", error);
    return errorResponse("Failed to update currency preference", 500);
  }
}
