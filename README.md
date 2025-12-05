# Retoro Backend API

Backend API for the Retoro iOS app, built with Next.js 14 (App Router), Drizzle ORM, and Neon Postgres.

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Database**: Neon Postgres (serverless)
- **ORM**: Drizzle ORM
- **Validation**: Zod
- **Auth**: JWT + Sessions
- **Email**: Mailgun
- **Deployment**: Vercel

## Project Structure

```
retoro-backend/
├── src/
│   ├── app/api/
│   │   ├── auth/              # Authentication endpoints
│   │   │   ├── register/
│   │   │   ├── login/
│   │   │   ├── session/
│   │   │   ├── logout/
│   │   │   └── register/magic-link/
│   │   ├── return-items/      # Return items CRUD
│   │   │   ├── route.ts       # GET (list), POST (create)
│   │   │   └── [id]/route.ts  # GET, PUT, PATCH, DELETE
│   │   ├── retailers/         # Retailer management
│   │   ├── settings/          # User settings
│   │   ├── upload/            # Invoice upload proxy
│   │   └── support/           # Support contact
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts      # Drizzle schema
│   │   │   └── index.ts       # DB client
│   │   ├── auth/
│   │   │   ├── jwt.ts         # JWT utilities
│   │   │   ├── password.ts    # Password hashing
│   │   │   └── session.ts     # Session management
│   │   ├── validators/        # Zod schemas
│   │   └── utils/
│   │       ├── api-response.ts      # Response helpers
│   │       ├── auth-middleware.ts   # Auth middleware
│   │       ├── return-logic.ts      # Return calculations
│   │       └── email.ts             # Email sending
│   └── types/                 # TypeScript types
├── drizzle/                   # DB migrations
├── .env.example               # Environment variables template
├── drizzle.config.ts          # Drizzle configuration
├── next.config.ts             # Next.js configuration
└── package.json

```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Required variables:
- `DATABASE_URL` - Neon Postgres connection string
- `JWT_SECRET` - Secret for JWT signing (min 32 chars)
- `MAILGUN_API_KEY` - Mailgun API key
- `MAILGUN_DOMAIN` - Mailgun domain

### 3. Set Up Neon Database

1. Create a new Neon project at [neon.tech](https://neon.tech)
2. Copy the connection string to `DATABASE_URL`
3. Run migrations:

```bash
npm run db:generate  # Generate migration files
npm run db:push      # Push schema to database
```

### 4. Seed Initial Data

You'll need to seed the retailer policies table with initial retailers. Create a seed script or manually insert retailers into the database.

### 5. Run Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Authentication

#### POST `/api/auth/register`
Register a new user with email/password.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "anonymous_user_id": "user_12345_abc" // Optional, for data migration
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": false
  },
  "session": {
    "token": "session_token",
    "expiresAt": "2025-01-15T00:00:00.000Z"
  }
}
```

#### POST `/api/auth/login`
Login with email/password.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "anonymous_user_id": "user_12345_abc" // Optional
}
```

#### POST `/api/auth/register/magic-link`
Send magic link for passwordless authentication.

**Body:**
```json
{
  "email": "user@example.com",
  "name": "John Doe", // Optional
  "anonymous_user_id": "user_12345_abc" // Optional
}
```

#### GET `/api/auth/session`
Check current session status.

**Headers:**
- `Authorization: Bearer {token}` (optional)
- `X-Anonymous-User-ID: {id}` (optional)

**Response:**
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "isAnonymous": false
}
```

#### POST `/api/auth/logout`
Logout and invalidate session.

**Headers:**
- `Authorization: Bearer {token}`

### Return Items

#### GET `/api/return-items`
Get all active return items for the authenticated user.

**Headers:**
- `Authorization: Bearer {token}`

**Response:**
```json
[
  {
    "id": "uuid",
    "retailer_id": "uuid",
    "name": "Blue T-Shirt",
    "price": "29.99",
    "original_currency": "USD",
    "price_usd": "29.99",
    "currency_symbol": "$",
    "purchase_date": "2025-01-01T00:00:00.000Z",
    "return_deadline": "2025-01-31T00:00:00.000Z",
    "is_returned": false,
    "returned_date": null,
    "user_id": "uuid",
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T00:00:00.000Z",
    "retailer": {
      "id": "uuid",
      "name": "Amazon",
      "return_window_days": 30,
      "website_url": "https://amazon.com",
      "return_portal_url": "https://amazon.com/returns",
      "has_free_returns": true
    }
  }
]
```

#### POST `/api/return-items`
Create a new return item.

**Headers:**
- `Authorization: Bearer {token}`

**Body:**
```json
{
  "retailer_id": "uuid",
  "name": "Blue T-Shirt",
  "price": 29.99,
  "currency": "USD",
  "purchase_date": "2025-01-01T00:00:00.000Z"
}
```

#### GET `/api/return-items/{id}`
Get a single return item.

**Headers:**
- `Authorization: Bearer {token}`

#### PUT `/api/return-items/{id}`
Update a return item.

**Headers:**
- `Authorization: Bearer {token}`

**Body:**
```json
{
  "retailer_id": "uuid",
  "name": "Updated Name",
  "price": 35.00,
  "currency": "USD",
  "purchase_date": "2025-01-02T00:00:00.000Z",
  "user_id": "uuid"
}
```

#### PATCH `/api/return-items/{id}`
Mark item as returned or kept.

**Headers:**
- `Authorization: Bearer {token}`

**Body:**
```json
{
  "is_returned": true,
  "user_id": "uuid"
}
```

#### DELETE `/api/return-items/{id}`
Delete a return item.

**Headers:**
- `Authorization: Bearer {token}`

**Query Params:**
- `user_id` - User ID for verification

## Database Schema

### Tables

- **users** - User accounts
- **sessions** - Active user sessions
- **magic_link_tokens** - Magic link authentication tokens
- **retailer_policies** - Retailer return policies
- **return_items** - User return items
- **user_settings** - User preferences (currency, notifications)

See `src/lib/db/schema.ts` for full schema definition.

## Development

### Running Migrations

```bash
# Generate migration files from schema changes
npm run db:generate

# Push schema directly to database (dev only)
npm run db:push

# Run migrations
npm run db:migrate

# Open Drizzle Studio (DB GUI)
npm run db:studio
```

### Database Migrations

When you modify the schema in `src/lib/db/schema.ts`:

1. Generate migration: `npm run db:generate`
2. Review the generated SQL in `drizzle/` directory
3. Apply migration: `npm run db:migrate`

### Testing Locally

Use tools like Postman, Insomnia, or curl to test API endpoints:

```bash
# Test registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test getting return items (with auth token)
curl -X GET http://localhost:3000/api/return-items \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

## Anonymous User Flow

The API supports anonymous users (users without accounts) to enable data persistence before account creation:

1. **iOS App Generates Anonymous ID**: On first launch, the app generates a unique ID like `user_1234567890_abc123`
2. **Anonymous Requests**: All requests include `X-Anonymous-User-ID` header
3. **Data Migration**: When user registers/logs in, their anonymous data is migrated to the authenticated account
4. **Session Association**: Sessions table has `anonymous_user_id` field to link anonymous and authenticated sessions

## Invoice Processing Architecture

The invoice processing uses a simplified architecture where:
- **n8n** only handles OCR/AI parsing (no database access)
- **Backend** forwards images and returns parsed data
- **iOS** populates the form and lets user review before submitting

### Flow
```
1. iOS uploads invoice image
2. Backend forwards to n8n for parsing
3. n8n returns parsed JSON (seller, items, prices)
4. Backend returns parsed data to iOS
5. iOS populates form with parsed data
6. User reviews/edits the form
7. User taps Submit
8. iOS calls POST /api/return-items (creates DB record)
```

### Why This Architecture?
- User can review and edit parsed data before committing
- n8n stays stateless (no database credentials needed)
- Clear separation: parsing vs. data creation
- Better UX: user has control over final data

### n8n Workflow (Parse Only)
n8n receives the image and returns parsed JSON:
```json
{
  "success": true,
  "seller_name": "Amazon",
  "items": [
    {
      "item_name": "Product Name",
      "item_cost": 29.99,
      "item_quantity": 1,
      "item_currency": "USD",
      "currency_symbol": "$"
    }
  ]
}
```

### Backend `/api/upload/invoice`
This endpoint ONLY parses - it does NOT create database records:
1. Receives invoice image from iOS app
2. Forwards to n8n for OCR + AI parsing
3. Returns parsed data to iOS for form population

### iOS Form Population
When parsed data is received, the iOS app:
1. Populates item name, price, and currency fields
2. Searches for matching retailer by seller_name
3. Displays success message: "Review the details and tap Submit"
4. User can edit any field before submitting

### Configuration
Set `N8N_INVOICE_WEBHOOK_URL` to your n8n parse webhook (e.g., `https://your-n8n.cloud/webhook/invoice-parse`).

The n8n workflow file is in `n8n flow/scanner-simplified.json`.

## Return Logic

The deadline calculation matches the iOS app's logic:

- **Standard Returns**: `purchase_date + return_window_days`
- **Unlimited Returns** (0 days): Set deadline to 10 years from purchase
- **Urgency Levels**:
  - **Safe**: > 7 days remaining (green)
  - **Due Soon**: ≤ 7 days remaining (yellow)
  - **Urgent**: ≤ 2 days remaining (red)
  - **Overdue**: < 0 days remaining (red)

See `src/lib/utils/return-logic.ts` for implementation.

## Deployment

### Vercel Deployment

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production

Make sure to set all required environment variables in Vercel:
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `RETORO_API_KEY`
- `N8N_INVOICE_WEBHOOK_URL`
- `N8N_ECOMMERCE_WEBHOOK_URL`
- `MAILGUN_API_KEY`
- `MAILGUN_DOMAIN`
- `EMAIL_FROM`
- `NEXT_PUBLIC_API_URL`
- `EXCHANGE_RATE_API_KEY`

### Multiple Environments

Create separate Vercel projects or environments:
- **Development**: `retoro-backend-dev`
- **Staging**: `retoro-backend-staging`
- **Production**: `retoro-backend`

Each environment should have its own Neon database branch.

## TODO: Remaining Implementation

The following endpoints still need to be implemented:

### Retailers API
- `GET /api/retailers` - Get all retailers
- `GET /api/retailers?search={query}` - Search retailers
- `POST /api/retailers` - Create custom retailer

### Settings API
- `GET /api/settings/currency` - Get preferred currency
- `PUT /api/settings/currency` - Update preferred currency

### Upload API
- `POST /api/upload/invoice` - Upload and process invoice (see Invoice Processing below)

### Support API
- `POST /api/support/contact` - Send support request

### OAuth
- Google OAuth handlers
- Apple Sign In handlers

### Currency Conversion
- Integration with exchange rate API
- Currency conversion utility

### Rate Limiting
- Add rate limiting middleware
- Configure limits per endpoint

### Tests
- Integration tests for auth flow
- Unit tests for return logic
- E2E tests for critical paths

## iOS App Integration

Update the iOS app's `APIClient.swift` base URL:

```swift
private let baseURL = "https://your-vercel-app.vercel.app" // Production
// private let baseURL = "https://your-vercel-app-staging.vercel.app" // Staging
// private let baseURL = "http://localhost:3000" // Local dev
```

The iOS app is already configured to:
- Send `X-Anonymous-User-ID` header
- Handle session tokens
- Parse the API response format

## Support

For issues or questions:
- Check the CLAUDE.md in the iOS app for integration details
- Review API endpoint documentation above
- Check Vercel deployment logs for errors

---

**Last Updated**: December 2025
