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

// GET /api/retailers - Get all retailers with optional search
export async function GET(request: NextRequest) {
  try {
    // Allow both authenticated and anonymous users
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");

    // Build query with optional search filter
    const retailers = await db
      .select({
        id: retailerPolicies.id,
        name: retailerPolicies.name,
        return_window_days: retailerPolicies.returnWindowDays,
        website_url: retailerPolicies.websiteUrl,
        has_free_returns: retailerPolicies.hasFreeReturns,
      })
      .from(retailerPolicies)
      .where(
        search && search.trim() !== ""
          ? ilike(retailerPolicies.name, `%${search.trim()}%`)
          : undefined
      )
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

    // Check if retailer already exists
    const [existing] = await db
      .select()
      .from(retailerPolicies)
      .where(eq(retailerPolicies.name, name))
      .limit(1);

    if (existing) {
      return errorResponse("A retailer with this name already exists", 409);
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
