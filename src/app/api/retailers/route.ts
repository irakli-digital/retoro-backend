import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { retailerPolicies } from "@/lib/db/schema";
import { requireAuth, getUserOrAnonymous } from "@/lib/utils/auth-middleware";
import { createRetailerSchema } from "@/lib/validators/retailers";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/utils/api-response";
import { ilike, or, and, eq } from "drizzle-orm";

// GET /api/retailers - Get retailers: global + user's own custom retailers
export async function GET(request: NextRequest) {
  try {
    // Get current user (authenticated or anonymous)
    const userInfo = await getUserOrAnonymous(request);
    const userId = userInfo.userId;

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");

    // Build visibility filter:
    // - Global retailers (isCustom = false) OR
    // - User's own custom retailers (createdBy = userId)
    const visibilityFilter = or(
      eq(retailerPolicies.isCustom, false),
      eq(retailerPolicies.createdBy, userId)
    );

    // Combine with optional search filter
    const whereClause = search && search.trim() !== ""
      ? and(
          visibilityFilter,
          ilike(retailerPolicies.name, `%${search.trim()}%`)
        )
      : visibilityFilter;

    const retailers = await db
      .select({
        id: retailerPolicies.id,
        name: retailerPolicies.name,
        return_window_days: retailerPolicies.returnWindowDays,
        website_url: retailerPolicies.websiteUrl,
        has_free_returns: retailerPolicies.hasFreeReturns,
      })
      .from(retailerPolicies)
      .where(whereClause)
      .orderBy(retailerPolicies.name);

    return successResponse(retailers);
  } catch (error) {
    console.error("Get retailers error:", error);
    return errorResponse("Failed to fetch retailers", 500);
  }
}

// POST /api/retailers - Create custom retailer
export async function POST(request: NextRequest) {
  try {
    // Allow both authenticated users and API key (for n8n)
    const apiKey = request.headers.get("x-api-key");
    let userId: string;

    if (apiKey && apiKey === process.env.RETORO_API_KEY) {
      // API key authentication (for n8n and internal services)
      const userInfo = await getUserOrAnonymous(request);
      userId = userInfo.userId;
    } else {
      // Regular session authentication
      const authResult = await requireAuth(request);
      if (authResult.error) {
        return authResult.error;
      }
      userId = authResult.user.id;
    }
    const body = await request.json();

    // Validate input
    const validation = createRetailerSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues);
    }

    const {
      name,
      return_window_days,
      website_url,
      return_portal_url,
      has_free_returns,
    } = validation.data;

    // Check if retailer already exists within user's visible scope
    // (global retailers OR user's own custom retailers)
    const [existing] = await db
      .select()
      .from(retailerPolicies)
      .where(
        and(
          ilike(retailerPolicies.name, name), // Case-insensitive name match
          or(
            eq(retailerPolicies.isCustom, false), // Global retailer
            eq(retailerPolicies.createdBy, userId) // User's own retailer
          )
        )
      )
      .limit(1);

    if (existing) {
      // Return the existing retailer instead of error (for scan flow convenience)
      return successResponse({
        id: existing.id,
        name: existing.name,
        return_window_days: existing.returnWindowDays,
        website_url: existing.websiteUrl,
        has_free_returns: existing.hasFreeReturns,
      }, 200);
    }

    // Create custom retailer
    const [newRetailer] = await db
      .insert(retailerPolicies)
      .values({
        name,
        returnWindowDays: return_window_days,
        websiteUrl: website_url || null,
        returnPortalUrl: return_portal_url || null,
        hasFreeReturns: has_free_returns ?? false,
        isCustom: true,
        createdBy: userId,
      })
      .returning({
        id: retailerPolicies.id,
        name: retailerPolicies.name,
        return_window_days: retailerPolicies.returnWindowDays,
        website_url: retailerPolicies.websiteUrl,
        has_free_returns: retailerPolicies.hasFreeReturns,
      });

    return successResponse(newRetailer, 201);
  } catch (error) {
    console.error("Create retailer error:", error);
    return errorResponse("Failed to create retailer", 500);
  }
}
