#!/bin/bash

# Test Invoice Upload Script
# This script tests the complete invoice processing flow

set -e  # Exit on error

INVOICE_FILE="/Users/iraklichkheidze/Desktop/AI Projects/Retoro IOS/retoro-backend/Example/invoice example.png"
BACKEND_URL="https://retoro-backend-production.up.railway.app"
N8N_WEBHOOK_URL="https://tbcuz.app.n8n.cloud/webhook/invoice-process"
API_KEY="299f5ca754fa16718420949736b75abb139ff5018f792a00c961b99a97716fa7"
TEST_USER_ID="test-user-$(date +%s)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 RETORO INVOICE UPLOAD TEST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Test Configuration:"
echo "  Invoice File: $INVOICE_FILE"
echo "  Backend URL: $BACKEND_URL"
echo "  n8n Webhook: $N8N_WEBHOOK_URL"
echo "  Test User ID: $TEST_USER_ID"
echo ""

# Check if invoice file exists
if [ ! -f "$INVOICE_FILE" ]; then
    echo "❌ Error: Invoice file not found at $INVOICE_FILE"
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📤 Option 1: Testing via Backend API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test via backend
echo "Uploading invoice to backend..."
BACKEND_RESPONSE=$(curl -X POST "$BACKEND_URL/api/upload/invoice" \
  -H "Content-Type: multipart/form-data" \
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
    echo "✅ Backend test PASSED"
else
    echo ""
    echo "❌ Backend test FAILED"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📤 Option 2: Testing n8n Webhook Directly"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test n8n directly
echo "Uploading invoice directly to n8n..."
N8N_RESPONSE=$(curl -X POST "$N8N_WEBHOOK_URL?user_id=$TEST_USER_ID" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: multipart/form-data" \
  -F "data=@$INVOICE_FILE" \
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
    echo "✅ n8n webhook test PASSED"
else
    echo ""
    echo "❌ n8n webhook test FAILED"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Expected Results:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "The response should include:"
echo "  ✓ Seller: mypen.ge"
echo "  ✓ Item: Mypen PRO Subscription"
echo "  ✓ Price: 29.0 GEL"
echo "  ✓ Currency: GEL"
echo "  ✓ Currency Symbol: ₾"
echo "  ✓ Retailer created or found"
echo "  ✓ Return item created"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Verification Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Check if retailer was created:"
echo "   curl '$BACKEND_URL/api/retailers?search=mypen.ge' | jq '.'"
echo ""
echo "2. Check return items for test user:"
echo "   (Requires authentication)"
echo ""
