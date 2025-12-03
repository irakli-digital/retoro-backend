import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { returnItems, retailerPolicies } from "@/lib/db/schema";
import { requireAuth, getUserOrAnonymous } from "@/lib/utils/auth-middleware";
import {
  updateReturnItemSchema,
  patchReturnItemSchema,
} from "@/lib/validators/return-items";
import { calculateDeadline } from "@/lib/utils/return-logic";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
} from "@/lib/utils/api-response";
import { eq, and } from "drizzle-orm";

// GET /api/return-items/[id] - Get single return item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);

    if (authResult.error) {
      return authResult.error;
    }

    const { id } = await params;
    const userId = authResult.user.id;

    const [item] = await db
      .select({
        id: returnItems.id,
        retailer_id: returnItems.retailerId,
        name: returnItems.name,
        price: returnItems.price,
        original_currency: returnItems.originalCurrency,
        price_usd: returnItems.priceUsd,
        currency_symbol: returnItems.currencySymbol,
        purchase_date: returnItems.purchaseDate,
        return_deadline: returnItems.returnDeadline,
        is_returned: returnItems.isReturned,
        is_kept: returnItems.isKept,
        returned_date: returnItems.returnedDate,
        kept_date: returnItems.keptDate,
        user_id: returnItems.userId,
        created_at: returnItems.createdAt,
        updated_at: returnItems.updatedAt,
        retailer: {
          id: retailerPolicies.id,
          name: retailerPolicies.name,
          return_window_days: retailerPolicies.returnWindowDays,
          website_url: retailerPolicies.websiteUrl,
          has_free_returns: retailerPolicies.hasFreeReturns,
        },
      })
      .from(returnItems)
      .innerJoin(
        retailerPolicies,
        eq(returnItems.retailerId, retailerPolicies.id)
      )
      .where(and(eq(returnItems.id, id), eq(returnItems.userId, userId)))
      .limit(1);

    if (!item) {
      return notFoundResponse("Return item not found");
    }

    return successResponse(item);
  } catch (error) {
    console.error("Get return item error:", error);
    return errorResponse("Failed to fetch return item", 500);
  }
}

// PUT /api/return-items/[id] - Update return item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);

    if (authResult.error) {
      return authResult.error;
    }

    const { id } = await params;
    const userId = authResult.user.id;
    const body = await request.json();

    // Validate input
    const validation = updateReturnItemSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.errors);
    }

    const data = validation.data;

    // Verify item belongs to user
    const [existingItem] = await db
      .select()
      .from(returnItems)
      .where(and(eq(returnItems.id, id), eq(returnItems.userId, userId)))
      .limit(1);

    if (!existingItem) {
      return notFoundResponse("Return item not found");
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.price !== undefined) updateData.price = data.price?.toString();
    if (data.currency !== undefined) {
      updateData.originalCurrency = data.currency;
      updateData.currencySymbol = getCurrencySymbol(data.currency);
    }

    // If retailer or purchase date changed, recalculate deadline
    if (data.retailer_id || data.purchase_date) {
      const retailerId = data.retailer_id || existingItem.retailerId;
      const purchaseDate = data.purchase_date
        ? new Date(data.purchase_date)
        : existingItem.purchaseDate;

      const [retailer] = await db
        .select()
        .from(retailerPolicies)
        .where(eq(retailerPolicies.id, retailerId))
        .limit(1);

      if (!retailer) {
        return errorResponse("Retailer not found", 404);
      }

      updateData.retailerId = retailerId;
      updateData.purchaseDate = purchaseDate;
      updateData.returnDeadline = calculateDeadline(
        purchaseDate,
        retailer.returnWindowDays
      );
    }

    // Update item
    await db
      .update(returnItems)
      .set(updateData)
      .where(eq(returnItems.id, id));

    // Fetch updated item with retailer info
    const [updatedItem] = await db
      .select({
        id: returnItems.id,
        retailer_id: returnItems.retailerId,
        name: returnItems.name,
        price: returnItems.price,
        original_currency: returnItems.originalCurrency,
        price_usd: returnItems.priceUsd,
        currency_symbol: returnItems.currencySymbol,
        purchase_date: returnItems.purchaseDate,
        return_deadline: returnItems.returnDeadline,
        is_returned: returnItems.isReturned,
        is_kept: returnItems.isKept,
        returned_date: returnItems.returnedDate,
        kept_date: returnItems.keptDate,
        user_id: returnItems.userId,
        created_at: returnItems.createdAt,
        updated_at: returnItems.updatedAt,
        retailer: {
          id: retailerPolicies.id,
          name: retailerPolicies.name,
          return_window_days: retailerPolicies.returnWindowDays,
          website_url: retailerPolicies.websiteUrl,
          has_free_returns: retailerPolicies.hasFreeReturns,
        },
      })
      .from(returnItems)
      .innerJoin(
        retailerPolicies,
        eq(returnItems.retailerId, retailerPolicies.id)
      )
      .where(eq(returnItems.id, id))
      .limit(1);

    return successResponse(updatedItem);
  } catch (error) {
    console.error("Update return item error:", error);
    return errorResponse("Failed to update return item", 500);
  }
}

// PATCH /api/return-items/[id] - Mark item as returned/kept
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getUserOrAnonymous(request);

    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validation = patchReturnItemSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.errors);
    }

    const data = validation.data;

    // Verify item belongs to user
    const [existingItem] = await db
      .select()
      .from(returnItems)
      .where(and(eq(returnItems.id, id), eq(returnItems.userId, userId)))
      .limit(1);

    if (!existingItem) {
      return notFoundResponse("Return item not found");
    }

    // Update item
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.is_returned !== undefined) {
      updateData.isReturned = data.is_returned;
      if (data.is_returned) {
        updateData.returnedDate = new Date();
      }
    }

    if (data.is_kept !== undefined) {
      updateData.isKept = data.is_kept;
      if (data.is_kept) {
        updateData.keptDate = new Date();
      }
    }

    await db
      .update(returnItems)
      .set(updateData)
      .where(eq(returnItems.id, id));

    return successResponse({ success: true });
  } catch (error) {
    console.error("Patch return item error:", error);
    return errorResponse("Failed to update return item", 500);
  }
}

// DELETE /api/return-items/[id] - Delete return item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getUserOrAnonymous(request);

    const { id } = await params;

    // Verify item belongs to user and delete
    const result = await db
      .delete(returnItems)
      .where(and(eq(returnItems.id, id), eq(returnItems.userId, userId)))
      .returning();

    if (result.length === 0) {
      return notFoundResponse("Return item not found");
    }

    return successResponse({ success: true });
  } catch (error) {
    console.error("Delete return item error:", error);
    return errorResponse("Failed to delete return item", 500);
  }
}

// Helper function to get currency symbol
function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    CNY: "¥",
    INR: "₹",
    KRW: "₩",
    BRL: "R$",
    CAD: "CA$",
    AUD: "A$",
    CHF: "CHF",
    SEK: "kr",
    NOK: "kr",
    DKK: "kr",
    PLN: "zł",
    RUB: "₽",
    TRY: "₺",
    ZAR: "R",
    MXN: "MX$",
    SGD: "S$",
    HKD: "HK$",
    NZD: "NZ$",
    GEL: "₾",
  };
  return symbols[currency] || currency;
}
