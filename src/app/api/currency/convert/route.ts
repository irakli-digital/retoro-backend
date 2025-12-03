import { NextRequest } from "next/server";
import {
  successResponse,
  errorResponse,
} from "@/lib/utils/api-response";

// Simple in-memory cache for exchange rates (1 hour TTL)
let ratesCache: {
  rates: Record<string, number>;
  timestamp: number;
} | null = null;

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// GET /api/currency/convert - Convert currency
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get("from")?.toUpperCase();
    const to = searchParams.get("to")?.toUpperCase();
    const amountStr = searchParams.get("amount");

    if (!from || !to || !amountStr) {
      return errorResponse("Missing required parameters: from, to, amount", 400);
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount < 0) {
      return errorResponse("Invalid amount", 400);
    }

    // If same currency, return as-is
    if (from === to) {
      return successResponse({
        from,
        to,
        amount,
        converted: amount,
        rate: 1,
      });
    }

    // Get exchange rates
    const rates = await getExchangeRates();

    if (!rates[from] || !rates[to]) {
      return errorResponse(`Unsupported currency: ${!rates[from] ? from : to}`, 400);
    }

    // Convert via USD
    const amountInUsd = amount / rates[from];
    const converted = amountInUsd * rates[to];
    const rate = rates[to] / rates[from];

    return successResponse({
      from,
      to,
      amount,
      converted: parseFloat(converted.toFixed(2)),
      rate: parseFloat(rate.toFixed(6)),
    });
  } catch (error) {
    console.error("Currency conversion error:", error);
    return errorResponse("Failed to convert currency", 500);
  }
}

async function getExchangeRates(): Promise<Record<string, number>> {
  // Check cache
  if (ratesCache && Date.now() - ratesCache.timestamp < CACHE_TTL) {
    return ratesCache.rates;
  }

  // Try to fetch from external API if configured
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;

  if (apiKey) {
    try {
      const response = await fetch(
        `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`
      );

      if (response.ok) {
        const data = await response.json();
        ratesCache = {
          rates: data.conversion_rates,
          timestamp: Date.now(),
        };
        return ratesCache.rates;
      }
    } catch (error) {
      console.error("Failed to fetch exchange rates from API:", error);
    }
  }

  // Fall back to static rates (approximate, updated periodically)
  const fallbackRates: Record<string, number> = {
    USD: 1.0,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 149.5,
    CNY: 7.24,
    INR: 83.12,
    KRW: 1319.5,
    BRL: 4.97,
    CAD: 1.36,
    AUD: 1.53,
    CHF: 0.88,
    SEK: 10.63,
    NOK: 10.87,
    DKK: 6.86,
    PLN: 4.02,
    RUB: 92.5,
    TRY: 32.15,
    ZAR: 18.45,
    MXN: 17.12,
    SGD: 1.34,
    HKD: 7.83,
    NZD: 1.67,
    GEL: 2.68,
  };

  ratesCache = {
    rates: fallbackRates,
    timestamp: Date.now(),
  };

  return fallbackRates;
}
