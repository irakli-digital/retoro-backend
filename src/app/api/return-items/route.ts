import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { returnItems, retailerPolicies } from "@/lib/db/schema";
import { getUserOrAnonymous } from "@/lib/utils/auth-middleware";
import { createReturnItemSchema } from "@/lib/validators/return-items";
import { calculateDeadline } from "@/lib/utils/return-logic";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/utils/api-response";
import { eq, and, or } from "drizzle-orm";

// GET /api/return-items - Get return items for user (authenticated or anonymous)
// Query params: ?includeHistory=true to get all items including returned/kept
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getUserOrAnonymous(request);
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('includeHistory') === 'true';

    // Build WHERE clause based on includeHistory flag
    const whereClause = includeHistory
      ? eq(returnItems.userId, userId)
      : and(
          eq(returnItems.userId, userId),
          eq(returnItems.isReturned, false),
          eq(returnItems.isKept, false)
        );

    // Fetch return items with retailer info
    const rawItems = await db
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
      .where(whereClause)
      .orderBy(returnItems.returnDeadline);

    // Format response to match iOS expectations
    const items = rawItems.map(item => ({
      ...item,
      price: item.price ? parseFloat(item.price) : null,
      price_usd: item.price_usd ? parseFloat(item.price_usd) : null,
      purchase_date: item.purchase_date.toISOString(),
      return_deadline: item.return_deadline.toISOString(),
      returned_date: item.returned_date ? item.returned_date.toISOString() : null,
      kept_date: item.kept_date ? item.kept_date.toISOString() : null,
      created_at: item.created_at.toISOString(),
      updated_at: item.updated_at.toISOString(),
    }));

    return successResponse(items);
  } catch (error) {
    console.error("Get return items error:", error);
    return errorResponse("Failed to fetch return items", 500);
  }
}

// POST /api/return-items - Create new return item (authenticated or anonymous)
export async function POST(request: NextRequest) {
  try {
    const { userId } = await getUserOrAnonymous(request);
    const body = await request.json();

    // Validate input
    const validation = createReturnItemSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.errors);
    }

    const {
      retailer_id,
      name,
      price,
      currency,
      purchase_date,
    } = validation.data;

    // Get retailer policy to calculate deadline
    const [retailer] = await db
      .select({
        id: retailerPolicies.id,
        name: retailerPolicies.name,
        returnWindowDays: retailerPolicies.returnWindowDays,
        websiteUrl: retailerPolicies.websiteUrl,
        hasFreeReturns: retailerPolicies.hasFreeReturns,
      })
      .from(retailerPolicies)
      .where(eq(retailerPolicies.id, retailer_id))
      .limit(1);

    if (!retailer) {
      return errorResponse("Retailer not found", 404);
    }

    // Calculate return deadline
    const purchaseDate = new Date(purchase_date);
    const deadline = calculateDeadline(
      purchaseDate,
      retailer.returnWindowDays
    );

    // Create return item
    const [newItem] = await db
      .insert(returnItems)
      .values({
        userId,
        retailerId: retailer_id,
        name: name || null,
        price: price ? price.toString() : null,
        originalCurrency: currency,
        priceUsd: price ? price.toString() : null, // TODO: Convert to USD
        currencySymbol: getCurrencySymbol(currency),
        purchaseDate,
        returnDeadline: deadline,
        isReturned: false,
        isKept: false,
      })
      .returning();

    // Fetch complete item with retailer info
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
      .where(eq(returnItems.id, newItem.id))
      .limit(1);

    // Format response to match iOS expectations
    const completeItem = {
      ...item,
      price: item.price ? parseFloat(item.price) : null,
      price_usd: item.price_usd ? parseFloat(item.price_usd) : null,
      purchase_date: item.purchase_date.toISOString(),
      return_deadline: item.return_deadline.toISOString(),
      returned_date: item.returned_date ? item.returned_date.toISOString() : null,
      kept_date: item.kept_date ? item.kept_date.toISOString() : null,
      created_at: item.created_at.toISOString(),
      updated_at: item.updated_at.toISOString(),
    };

    return successResponse(completeItem, 201);
  } catch (error) {
    console.error("Create return item error:", error);
    return errorResponse("Failed to create return item", 500);
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
