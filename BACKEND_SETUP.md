# Retoro Backend Setup Guide

## Prerequisites

- Node.js 18+ installed
- Neon PostgreSQL database (or any PostgreSQL database)
- n8n instance (optional, for invoice processing)
- Mailgun account (optional, for emails)

## Initial Setup

### 1. Install Dependencies

```bash
cd retoro-backend
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

**Required Variables:**

```env
# Database - Get from Neon dashboard
DATABASE_URL=postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/retoro?sslmode=require

# JWT Secrets - Generate random 32+ character strings
JWT_SECRET=your-random-32-char-secret-here
JWT_REFRESH_SECRET=your-random-32-char-refresh-secret-here

# API Keys
RETORO_API_KEY=your-api-key-for-securing-webhooks

# Environment
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000
```

**Optional Variables:**

```env
# n8n Webhooks (for invoice processing)
N8N_INVOICE_WEBHOOK_URL=https://your-n8n.com/webhook/invoice
N8N_ECOMMERCE_WEBHOOK_URL=https://your-n8n.com/webhook/ecommerce

# Mailgun (for emails)
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=mg.yourdomain.com
EMAIL_FROM=noreply@retoro.app
SUPPORT_EMAIL=support@retoro.app

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Apple Sign In (optional)
APPLE_CLIENT_ID=your-apple-client-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY=your-apple-private-key

# Currency API (optional, falls back to static rates)
EXCHANGE_RATE_API_KEY=your-exchange-rate-api-key
```

### 3. Database Setup

#### Push Schema to Database

```bash
npm run db:push
```

This creates all necessary tables in your Neon database.

#### Seed Retailers

```bash
npm run db:seed
```

This populates the database with 40+ common retailers (Amazon, Target, Nike, etc.).

#### View Database (Optional)

```bash
npm run db:studio
```

Opens Drizzle Studio at http://localhost:4983 to view/edit data.

### 4. Start Development Server

```bash
npm run dev
```

Backend will be available at http://localhost:3000

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/session` - Get current session
- `POST /api/auth/register/magic-link` - Magic link registration

### Return Items
- `GET /api/return-items` - Get all active items
- `POST /api/return-items` - Create new item
- `GET /api/return-items/[id]` - Get single item
- `PUT /api/return-items/[id]` - Update item
- `PATCH /api/return-items/[id]` - Mark as returned/kept
- `DELETE /api/return-items/[id]` - Delete item

### Retailers
- `GET /api/retailers` - Get all retailers (supports `?search=` query)
- `POST /api/retailers` - Create custom retailer (authenticated)

### Settings
- `GET /api/settings/currency` - Get preferred currency
- `PUT /api/settings/currency` - Update preferred currency

### Upload
- `POST /api/upload/invoice` - Upload invoice for processing

### Currency
- `GET /api/currency/convert` - Convert currency (`?from=USD&to=EUR&amount=100`)

### Support
- `POST /api/support` - Submit support request

## Anonymous User Support

The backend supports anonymous users via the `X-Anonymous-User-ID` header. Anonymous users can:
- Browse retailers
- Create return items
- Get currency preferences (returns default)

When an anonymous user registers/logs in, their data is automatically migrated using the anonymous ID.

## Database Schema

### Users
- id, email, password, name, emailVerified, timestamps

### Sessions
- id, userId, anonymousUserId, token, expiresAt, createdAt

### Retailer Policies
- id, name, returnWindowDays, websiteUrl, returnPortalUrl, hasFreeReturns, isCustom, createdBy

### Return Items
- id, userId, retailerId, name, price, originalCurrency, priceUsd, currencySymbol
- purchaseDate, returnDeadline, isReturned, isKept, returnedDate, timestamps

### User Settings
- id, userId, preferredCurrency, notificationsEnabled, emailNotificationsEnabled, pushNotificationsEnabled

## iOS App Configuration

Update the iOS app's `APIClient.swift` base URL:

```swift
// Development
private let baseURL = "http://localhost:3000"

// Production
private let baseURL = "https://your-domain.com"
```

For simulator testing with localhost:
- Use `http://127.0.0.1:3000` instead of `localhost`
- Add App Transport Security exception (remove for production)

## Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### Environment Variables for Production

Set these in your deployment platform:
- `DATABASE_URL` - Production Neon connection string
- `JWT_SECRET` - Strong random secret
- `JWT_REFRESH_SECRET` - Different strong random secret
- `RETORO_API_KEY` - API key for webhooks
- `NODE_ENV=production`
- `NEXT_PUBLIC_API_URL` - Your production URL
- All optional variables as needed

### Post-Deployment

1. Run database migration: `npm run db:push` (or via Vercel/platform CLI)
2. Seed retailers: `npm run db:seed`
3. Update iOS app base URL to production domain
4. Test API endpoints

## Troubleshooting

### "Connection refused" from iOS app
- Ensure backend is running on http://localhost:3000
- Use `127.0.0.1` instead of `localhost` for simulator
- Check firewall settings

### "No retailers found"
- Run `npm run db:seed` to populate retailers
- Check database connection with `npm run db:studio`

### "Invalid or expired session"
- Check JWT_SECRET is set correctly
- Verify token is being sent in Authorization header
- Check session hasn't expired

### Invoice upload fails
- Ensure `N8N_INVOICE_WEBHOOK_URL` is configured
- Check n8n webhook is accessible
- Verify `RETORO_API_KEY` matches

### Email sending fails
- Verify Mailgun credentials are correct
- Check `MAILGUN_DOMAIN` is verified
- Emails are logged to console if sending fails

## Development Tips

### Testing API Endpoints

```bash
# Test health/retailers
curl http://localhost:3000/api/retailers

# Test with auth (replace with real token)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/return-items

# Test anonymous user
curl -H "X-Anonymous-User-ID: user_123_abc" http://localhost:3000/api/retailers
```

### Database Migrations

```bash
# Generate migration after schema changes
npm run db:generate

# Apply migration
npm run db:migrate

# Push directly (dev only)
npm run db:push
```

### Logs

- All API errors are logged to console
- Check logs for detailed error messages
- Analytics events are logged in development mode

## Security Notes

- Never commit `.env` file to git
- Use strong, unique secrets for JWT
- Keep API keys secure
- Use HTTPS in production
- Validate all user inputs
- Rate limit endpoints in production
- Use prepared statements (Drizzle handles this)

## Support

For issues or questions:
- Check logs in console
- Verify environment variables
- Test database connection
- Check API endpoint documentation above
