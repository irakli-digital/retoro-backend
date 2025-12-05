import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { returnItems, retailerPolicies } from "@/lib/db/schema";
import { getUserOrAnonymous } from "@/lib/utils/auth-middleware";
import { calculateDeadline } from "@/lib/utils/return-logic";
import {
  successResponse,
  errorResponse,
} from "@/lib/utils/api-response";
import { ilike, eq } from "drizzle-orm";

// Type definitions for n8n response
interface ParsedItem {
  item_name: string;
  item_cost: number;
  item_quantity: number;
  item_currency: string;
  currency_symbol: string;
}

interface N8nSuccessResponse {
  success: true;
  seller_name: string;
  items: ParsedItem[];
}

interface N8nErrorResponse {
  success: false;
  error: boolean;
  message: string;
  document_type?: string;
  confidence?: number;
}

type N8nResponse = N8nSuccessResponse | N8nErrorResponse;

// Helper function to get currency symbol
function getCurrencySymbol(currency: string, providedSymbol?: string): string {
  if (providedSymbol && providedSymbol.trim() !== "") {
    return providedSymbol;
  }
  
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

// POST /api/upload/invoice - Upload, parse, and process invoice
export async function POST(request: NextRequest) {
  try {
    const userInfo = await getUserOrAnonymous(request);
    const userId = userInfo.userId;

    // Get the form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return errorResponse("No file provided", 400);
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return errorResponse("Invalid file type. Only JPEG, PNG, and PDF are allowed", 400);
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return errorResponse("File size exceeds 10MB limit", 400);
    }

    // Get n8n webhook URL from environment
    const webhookUrl = process.env.N8N_INVOICE_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error("N8N_INVOICE_WEBHOOK_URL not configured");
      return errorResponse("Invoice processing is not configured", 500);
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    console.log("📤 Forwarding to n8n for parsing:", webhookUrl);
    console.log("📦 File info:", {
      fileName: file.name,
      fileSize: buffer.length,
      fileType: file.type,
      userId: userId,
      isAnonymous: userInfo.isAnonymous,
    });

    // Send to n8n for parsing only
    let n8nResponse: Response;
    try {
      n8nResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": file.type,
          "Content-Disposition": file.name,
        },
        body: buffer,
      });
    } catch (fetchError: unknown) {
      const error = fetchError as Error;
      console.error("❌ n8n webhook fetch error:", error.message);
      return errorResponse(
        `Failed to connect to invoice processor: ${error.message}`,
        500
      );
    }

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error("❌ n8n webhook error:", {
        status: n8nResponse.status,
        statusText: n8nResponse.statusText,
        body: errorText,
      });
      return errorResponse(
        `Invoice processor error (${n8nResponse.status}): ${errorText}`,
        500
      );
    }

    // Parse n8n response
    const parsedData: N8nResponse = await n8nResponse.json();
    console.log("📥 n8n parsed data:", parsedData);

    // Check if parsing failed
    if (!parsedData.success) {
      const errorData = parsedData as N8nErrorResponse;
      return successResponse({
        error: true,
        message: errorData.message || "Failed to parse invoice",
        document_type: errorData.document_type,
        confidence: errorData.confidence,
      });
    }

    const successData = parsedData as N8nSuccessResponse;

    // Step 1: Find or create retailer
    console.log("🔍 Searching for retailer:", successData.seller_name);
    
    // Search for existing retailer (case-insensitive)
    const [existingRetailer] = await db
      .select({
        id: retailerPolicies.id,
        name: retailerPolicies.name,
        returnWindowDays: retailerPolicies.returnWindowDays,
        websiteUrl: retailerPolicies.websiteUrl,
        hasFreeReturns: retailerPolicies.hasFreeReturns,
      })
      .from(retailerPolicies)
      .where(ilike(retailerPolicies.name, successData.seller_name.trim()))
      .limit(1);

    let retailer = existingRetailer;

    // Create retailer if not found
    if (!retailer) {
      console.log("➕ Creating new retailer:", successData.seller_name);
      
      const [newRetailer] = await db
        .insert(retailerPolicies)
        .values({
          name: successData.seller_name.trim(),
          returnWindowDays: 30, // Default 30 days
          websiteUrl: successData.seller_name.includes('.') 
            ? `https://${successData.seller_name}` 
            : null,
          hasFreeReturns: false,
          isCustom: true,
          createdBy: userId,
        })
        .returning({
          id: retailerPolicies.id,
          name: retailerPolicies.name,
          returnWindowDays: retailerPolicies.returnWindowDays,
          websiteUrl: retailerPolicies.websiteUrl,
          hasFreeReturns: retailerPolicies.hasFreeReturns,
        });
      
      retailer = newRetailer;
    }

    console.log("✅ Using retailer:", retailer.name, "(ID:", retailer.id, ")");

    // Step 2: Create return items for each parsed item
    const createdItems: Array<{
      id: string;
      name: string | null;
      price: number | null;
      currency: string;
      currency_symbol: string;
    }> = [];
    const purchaseDate = new Date(); // Use current date as purchase date

    for (const item of successData.items) {
      // Calculate deadline based on retailer's return window
      const deadline = calculateDeadline(purchaseDate, retailer.returnWindowDays);
      const currencySymbol = getCurrencySymbol(item.item_currency, item.currency_symbol);

      // Create return item for each quantity
      for (let i = 0; i < item.item_quantity; i++) {
        const [newItem] = await db
          .insert(returnItems)
          .values({
            userId: userId,
            retailerId: retailer.id,
            name: item.item_name || null,
            price: item.item_cost ? item.item_cost.toString() : null,
            originalCurrency: item.item_currency,
            priceUsd: item.item_cost ? item.item_cost.toString() : null, // TODO: Convert to USD
            currencySymbol: currencySymbol,
            purchaseDate: purchaseDate,
            returnDeadline: deadline,
            isReturned: false,
            isKept: false,
            updatedAt: new Date(),
          })
          .returning({
            id: returnItems.id,
            name: returnItems.name,
            price: returnItems.price,
            originalCurrency: returnItems.originalCurrency,
            currencySymbol: returnItems.currencySymbol,
          });

        createdItems.push({
          id: newItem.id,
          name: newItem.name,
          price: newItem.price ? parseFloat(newItem.price) : null,
          currency: newItem.originalCurrency,
          currency_symbol: newItem.currencySymbol,
        });
      }
    }

    console.log("✅ Created", createdItems.length, "return items");

    // Return success response matching iOS expectations
    return successResponse({
      message: "Invoice processed successfully",
      items_created: createdItems,
      retailer_matched: retailer.name,
      items_count: createdItems.length,
      errors: [],
    });
  } catch (error) {
    console.error("Invoice upload error:", error);
    return errorResponse("Failed to upload invoice", 500);
  }
}
