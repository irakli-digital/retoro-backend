#!/bin/bash

# Test Invoice Upload Script
# This script tests the complete invoice processing flow
# 
# NEW ARCHITECTURE:
# iOS -> Backend -> n8n (parse only) -> Backend (creates DB records) -> iOS
#
# n8n no longer connects to the database directly. It only:
# 1. Receives image
# 2. OCR + AI parsing
# 3. Returns parsed JSON (seller_name, items)
#
# Backend handles:
# 1. Authentication
# 2. Retailer search/creation
# 3. Return item creation

set -e  # Exit on error

INVOICE_FILE="/Users/iraklichkheidze/Desktop/AI Projects/Retoro IOS/retoro-backend/Example/invoice example.png"
BACKEND_URL="https://retoro-backend-production.up.railway.app"
N8N_PARSE_WEBHOOK_URL="https://tbcuz.app.n8n.cloud/webhook/invoice-parse"  # New parse-only endpoint
TEST_USER_ID="test-user-$(date +%s)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 RETORO INVOICE UPLOAD TEST (Simplified Architecture)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Test Configuration:"
echo "  Invoice File: $INVOICE_FILE"
echo "  Backend URL: $BACKEND_URL"
echo "  n8n Parse Webhook: $N8N_PARSE_WEBHOOK_URL"
echo "  Test User ID: $TEST_USER_ID"
echo ""

# Check if invoice file exists
if [ ! -f "$INVOICE_FILE" ]; then
    echo "❌ Error: Invoice file not found at $INVOICE_FILE"
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📤 Test 1: Full Flow via Backend API (Recommended)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Flow: Image -> Backend -> n8n (parse) -> Backend (DB) -> Response"
echo ""

# Test via backend (full flow)
echo "Uploading invoice to backend..."
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
    echo "✅ Backend full flow test PASSED"
    
    # Check if items were created
    ITEMS_COUNT=$(echo "$RESPONSE_BODY" | jq '.items_count' 2>/dev/null)
    RETAILER=$(echo "$RESPONSE_BODY" | jq -r '.retailer_matched' 2>/dev/null)
    
    if [ "$ITEMS_COUNT" != "null" ] && [ "$ITEMS_COUNT" -gt 0 ]; then
        echo "   ✓ Created $ITEMS_COUNT item(s)"
        echo "   ✓ Retailer: $RETAILER"
    fi
else
    echo ""
    echo "❌ Backend test FAILED"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📤 Test 2: n8n Parse-Only (Debugging)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Flow: Image -> n8n -> Parsed JSON (no database operations)"
echo ""

# Test n8n parse endpoint directly (raw image)
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
    
    # Check parsed data
    SUCCESS=$(echo "$RESPONSE_BODY" | jq '.success' 2>/dev/null)
    SELLER=$(echo "$RESPONSE_BODY" | jq -r '.seller_name' 2>/dev/null)
    
    if [ "$SUCCESS" = "true" ]; then
        echo "   ✓ Successfully parsed invoice"
        echo "   ✓ Seller: $SELLER"
    else
        echo "   ⚠️ Parse returned error (check response)"
    fi
else
    echo ""
    echo "❌ n8n parse test FAILED"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Expected Results:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "n8n Parse Response (Test 2):"
echo '  {
    "success": true,
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
echo "Backend Response (Test 1):"
echo '  {
    "message": "Invoice processed successfully",
    "items_created": [...],
    "retailer_matched": "mypen.ge",
    "items_count": 1,
    "errors": []
  }'
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Verification Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Check if retailer was created:"
echo "   curl '$BACKEND_URL/api/retailers?search=mypen.ge' | jq '.'"
echo ""
echo "2. Check return items for test user:"
echo "   curl '$BACKEND_URL/api/return-items' \\"
echo "     -H 'X-Anonymous-User-ID: $TEST_USER_ID' | jq '.'"
echo ""
