import "dotenv/config";
import { db } from "./index";
import { retailerPolicies } from "./schema";

/**
 * Seed database with common retailers
 * Run with: tsx src/lib/db/seed.ts
 */

const commonRetailers = [
  // Major Department Stores
  { name: "Amazon", returnWindowDays: 30, websiteUrl: "https://amazon.com", hasFreeReturns: true },
  { name: "Walmart", returnWindowDays: 90, websiteUrl: "https://walmart.com", hasFreeReturns: true },
  { name: "Target", returnWindowDays: 90, websiteUrl: "https://target.com", hasFreeReturns: true },
  { name: "Costco", returnWindowDays: 90, websiteUrl: "https://costco.com", hasFreeReturns: true },
  { name: "Best Buy", returnWindowDays: 15, websiteUrl: "https://bestbuy.com", hasFreeReturns: true },

  // Fashion & Apparel
  { name: "Zara", returnWindowDays: 30, websiteUrl: "https://zara.com", hasFreeReturns: false },
  { name: "H&M", returnWindowDays: 30, websiteUrl: "https://hm.com", hasFreeReturns: true },
  { name: "Nike", returnWindowDays: 60, websiteUrl: "https://nike.com", hasFreeReturns: true },
  { name: "Adidas", returnWindowDays: 30, websiteUrl: "https://adidas.com", hasFreeReturns: true },
  { name: "Gap", returnWindowDays: 45, websiteUrl: "https://gap.com", hasFreeReturns: true },
  { name: "Old Navy", returnWindowDays: 45, websiteUrl: "https://oldnavy.com", hasFreeReturns: true },
  { name: "Uniqlo", returnWindowDays: 30, websiteUrl: "https://uniqlo.com", hasFreeReturns: true },
  { name: "Forever 21", returnWindowDays: 30, websiteUrl: "https://forever21.com", hasFreeReturns: false },

  // Luxury & Premium
  { name: "Nordstrom", returnWindowDays: 0, websiteUrl: "https://nordstrom.com", hasFreeReturns: true },
  { name: "Saks Fifth Avenue", returnWindowDays: 30, websiteUrl: "https://saksfifthavenue.com", hasFreeReturns: true },
  { name: "Neiman Marcus", returnWindowDays: 30, websiteUrl: "https://neimanmarcus.com", hasFreeReturns: true },

  // Outdoor & Sports
  { name: "REI", returnWindowDays: 365, websiteUrl: "https://rei.com", hasFreeReturns: true },
  { name: "Dick's Sporting Goods", returnWindowDays: 90, websiteUrl: "https://dickssportinggoods.com", hasFreeReturns: true },
  { name: "Patagonia", returnWindowDays: 0, websiteUrl: "https://patagonia.com", hasFreeReturns: true },
  { name: "The North Face", returnWindowDays: 60, websiteUrl: "https://thenorthface.com", hasFreeReturns: true },

  // Home & Furniture
  { name: "IKEA", returnWindowDays: 365, websiteUrl: "https://ikea.com", hasFreeReturns: false },
  { name: "Home Depot", returnWindowDays: 90, websiteUrl: "https://homedepot.com", hasFreeReturns: true },
  { name: "Lowe's", returnWindowDays: 90, websiteUrl: "https://lowes.com", hasFreeReturns: true },
  { name: "Wayfair", returnWindowDays: 30, websiteUrl: "https://wayfair.com", hasFreeReturns: false },

  // Electronics
  { name: "Apple Store", returnWindowDays: 14, websiteUrl: "https://apple.com", hasFreeReturns: true },
  { name: "Microsoft Store", returnWindowDays: 30, websiteUrl: "https://microsoft.com", hasFreeReturns: true },
  { name: "B&H Photo", returnWindowDays: 30, websiteUrl: "https://bhphotovideo.com", hasFreeReturns: false },

  // Beauty & Personal Care
  { name: "Sephora", returnWindowDays: 60, websiteUrl: "https://sephora.com", hasFreeReturns: true },
  { name: "Ulta", returnWindowDays: 60, websiteUrl: "https://ulta.com", hasFreeReturns: true },

  // Online Retailers
  { name: "eBay", returnWindowDays: 30, websiteUrl: "https://ebay.com", hasFreeReturns: false },
  { name: "Etsy", returnWindowDays: 30, websiteUrl: "https://etsy.com", hasFreeReturns: false },
  { name: "ASOS", returnWindowDays: 28, websiteUrl: "https://asos.com", hasFreeReturns: true },
  { name: "Shein", returnWindowDays: 45, websiteUrl: "https://shein.com", hasFreeReturns: false },

  // Grocery & Pharmacy
  { name: "Whole Foods", returnWindowDays: 90, websiteUrl: "https://wholefoodsmarket.com", hasFreeReturns: true },
  { name: "Trader Joe's", returnWindowDays: 0, websiteUrl: "https://traderjoes.com", hasFreeReturns: true },
  { name: "CVS", returnWindowDays: 60, websiteUrl: "https://cvs.com", hasFreeReturns: true },
  { name: "Walgreens", returnWindowDays: 30, websiteUrl: "https://walgreens.com", hasFreeReturns: true },

  // Office & Books
  { name: "Office Depot", returnWindowDays: 30, websiteUrl: "https://officedepot.com", hasFreeReturns: true },
  { name: "Staples", returnWindowDays: 14, websiteUrl: "https://staples.com", hasFreeReturns: true },
  { name: "Barnes & Noble", returnWindowDays: 30, websiteUrl: "https://barnesandnoble.com", hasFreeReturns: true },

  // Pet Supplies
  { name: "Chewy", returnWindowDays: 365, websiteUrl: "https://chewy.com", hasFreeReturns: true },
  { name: "Petco", returnWindowDays: 60, websiteUrl: "https://petco.com", hasFreeReturns: true },
  { name: "PetSmart", returnWindowDays: 60, websiteUrl: "https://petsmart.com", hasFreeReturns: true },
];

async function seed() {
  console.log("🌱 Seeding database with retailers...");

  try {
    // Insert retailers
    for (const retailer of commonRetailers) {
      await db
        .insert(retailerPolicies)
        .values({
          name: retailer.name,
          returnWindowDays: retailer.returnWindowDays,
          websiteUrl: retailer.websiteUrl,
          hasFreeReturns: retailer.hasFreeReturns,
          isCustom: false,
        })
        .onConflictDoNothing();

      console.log(`✓ ${retailer.name}`);
    }

    console.log(`\n✅ Successfully seeded ${commonRetailers.length} retailers`);
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }

  process.exit(0);
}

// Run seed if this file is executed directly
if (require.main === module) {
  seed();
}

export { seed };
