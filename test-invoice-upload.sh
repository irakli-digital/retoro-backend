#!/bin/bash

# Test Invoice Upload Script
# This script tests the invoice parsing flow
# 
# ARCHITECTURE:
# iOS -> Backend -> n8n (parse only) -> Backend -> iOS (form population)
# 
# The upload endpoint ONLY parses the invoice and returns data.
# NO database records are created until user reviews and submits.
#
# Flow:
# 1. User uploads invoice image
# 2. Backend forwards to n8n for OCR + AI parsing
# 3. Parsed data returned to iOS
# 4. iOS populates form with parsed data (item name, price, currency, seller)
# 5. User reviews/edits the form
# 6. User clicks Submit -> THEN createReturnItem API is called

set -e  # Exit on error

INVOICE_FILE="/Users/iraklichkheidze/Desktop/AI Projects/Retoro IOS/retoro-backend/Example/invoice example.png"
BACKEND_URL="https://retoro-backend-production.up.railway.app"
N8N_PARSE_WEBHOOK_URL="https://tbcuz.app.n8n.cloud/webhook/invoice-parse"
TEST_USER_ID="test-user-$(date +%s)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 RETORO INVOICE PARSING TEST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Test Configuration:"
echo "  Invoice File: $INVOICE_FILE"
echo "  Backend URL: $BACKEND_URL"
echo "  n8n Parse Webhook: $N8N_PARSE_WEBHOOK_URL"
echo ""

# Check if invoice file exists
if [ ! -f "$INVOICE_FILE" ]; then
    echo "❌ Error: Invoice file not found at $INVOICE_FILE"
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📤 Test 1: Parse Invoice via Backend (Production Flow)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Flow: Image -> Backend -> n8n -> Parsed JSON (NO DB records)"
echo ""

# Test via backend (parse only - no DB operations)
echo "Uploading invoice to backend for parsing..."
BACKEND_RESPONSE=$(curl -X POST "$BACKEND_URL/api/upload/invoice" \
  -H "X-Anonymous-User-ID: $TEST_USER_ID" \
  -F "file=@$INVOICE_FILE" \
  -w "\n%{http_code}" \
  -s)

HTTP_CODE=$(echo "$BACKEND_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$BACKEND_RESPONSE" | sed '$d')

echo ""
echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"

if [ "$HTTP_CODE" -eq 200 ]; then
    echo ""
    
    # Check parsed data
    SUCCESS=$(echo "$RESPONSE_BODY" | jq '.success' 2>/dev/null)
    SELLER=$(echo "$RESPONSE_BODY" | jq -r '.seller_name' 2>/dev/null)
    ITEM_NAME=$(echo "$RESPONSE_BODY" | jq -r '.items[0].item_name' 2>/dev/null)
    ITEM_COST=$(echo "$RESPONSE_BODY" | jq '.items[0].item_cost' 2>/dev/null)
    ITEM_CURRENCY=$(echo "$RESPONSE_BODY" | jq -r '.items[0].item_currency' 2>/dev/null)
    
    if [ "$SUCCESS" = "true" ]; then
        echo "✅ Invoice parsing test PASSED"
        echo ""
        echo "📝 Parsed Data (would populate iOS form):"
        echo "   Seller Name: $SELLER"
        echo "   Item Name: $ITEM_NAME"
        echo "   Price: $ITEM_COST $ITEM_CURRENCY"
        echo ""
        echo "⚠️  NOTE: No database records created!"
        echo "   User would review this data in the form and click Submit."
    else
        echo "⚠️ Parse returned error (check response)"
    fi
else
    echo ""
    echo "❌ Backend test FAILED"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📤 Test 2: n8n Parse Directly (Debugging)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test n8n parse endpoint directly
echo "Testing n8n parse endpoint..."
N8N_RESPONSE=$(curl -X POST "$N8N_PARSE_WEBHOOK_URL" \
  -H "Content-Type: image/png" \
  -H "Content-Disposition: test-invoice.png" \
  --data-binary "@$INVOICE_FILE" \
  -w "\n%{http_code}" \
  -s)

HTTP_CODE=$(echo "$N8N_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$N8N_RESPONSE" | sed '$d')

echo ""
echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"

if [ "$HTTP_CODE" -eq 200 ]; then
    echo ""
    echo "✅ n8n parse test PASSED"
else
    echo ""
    echo "❌ n8n parse test FAILED"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Expected Response Format:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Backend Response (for iOS form population):"
echo '  {
    "success": true,
    "message": "Invoice parsed successfully",
    "seller_name": "mypen.ge",
    "items": [
      {
        "item_name": "Mypen PRO Subscription",
        "item_cost": 29.0,
        "item_quantity": 1,
        "item_currency": "GEL",
        "currency_symbol": "₾"
      }
    ]
  }'
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 iOS App Flow:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. User taps 'Scan Invoice' button"
echo "2. Takes photo or selects from gallery"
echo "3. App uploads to /api/upload/invoice"
echo "4. Parsed data populates the form:"
echo "   - Item Name field"
echo "   - Price field"
echo "   - Currency selector"
echo "   - Retailer search (using seller_name)"
echo "5. User reviews and edits if needed"
echo "6. User taps 'Submit' button"
echo "7. App calls POST /api/return-items (creates DB record)"
echo ""
