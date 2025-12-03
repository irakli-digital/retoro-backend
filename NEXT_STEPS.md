# Retoro Backend - Next Steps

## What Has Been Completed ✅

### 1. Project Structure
- ✅ Next.js 14 project with App Router
- ✅ TypeScript configuration
- ✅ Directory structure for API routes
- ✅ Package.json with all dependencies

### 2. Database Schema & ORM
- ✅ Drizzle ORM setup
- ✅ Complete database schema (`src/lib/db/schema.ts`):
  - Users table
  - Sessions table
  - Magic link tokens table
  - Retailer policies table
  - Return items table
  - User settings table
- ✅ Database client configuration
- ✅ Migration configuration

### 3. Authentication System
- ✅ JWT token generation and verification
- ✅ Password hashing with bcrypt
- ✅ Session management
- ✅ Auth middleware
- ✅ API Routes:
  - `POST /api/auth/register` - Email/password registration
  - `POST /api/auth/login` - Email/password login
  - `POST /api/auth/register/magic-link` - Magic link auth
  - `GET /api/auth/session` - Session check
  - `POST /api/auth/logout` - Logout
- ✅ Anonymous user support with data migration

### 4. Return Items API
- ✅ Full CRUD operations:
  - `GET /api/return-items` - List all active items
  - `POST /api/return-items` - Create new item
  - `GET /api/return-items/[id]` - Get single item
  - `PUT /api/return-items/[id]` - Update item
  - `PATCH /api/return-items/[id]` - Mark as returned/kept
  - `DELETE /api/return-items/[id]` - Delete item
- ✅ Return logic utilities (deadline calculation, urgency levels)
- ✅ Validation schemas with Zod

### 5. Utilities & Helpers
- ✅ API response helpers
- ✅ Email utilities (Mailgun integration)
- ✅ Validation middleware
- ✅ Return logic matching iOS app

### 6. Configuration
- ✅ Environment variables template (.env.example)
- ✅ TypeScript configuration
- ✅ Next.js configuration
- ✅ Drizzle configuration
- ✅ .gitignore

## What Needs to Be Done 🚧

### 1. Retailers API (HIGH PRIORITY)
Create `/src/app/api/retailers/route.ts`:
```typescript
// GET /api/retailers - Get all retailers
// GET /api/retailers?search={query} - Search retailers
// POST /api/retailers - Create custom retailer
```

Implementation notes:
- Should support searching by retailer name
- Custom retailers should be tied to the user who created them
- Return all default retailers + user's custom retailers

### 2. Settings API (HIGH PRIORITY)
Create `/src/app/api/settings/currency/route.ts`:
```typescript
// GET /api/settings/currency - Get user's preferred currency
// PUT /api/settings/currency - Update preferred currency
```

### 3. Invoice Upload Proxy (MEDIUM PRIORITY)
Create `/src/app/api/upload/invoice/route.ts`:
- Accept multipart/form-data upload
- Forward to n8n webhook
- Return job ID or status
- Need to configure n8n webhook URL

### 4. Support Contact API (MEDIUM PRIORITY)
Create `/src/app/api/support/contact/route.ts`:
```typescript
// POST /api/support/contact
// Body: { subject, message, email }
```
- Use existing `sendSupportEmail` function in `src/lib/utils/email.ts`

### 5. Currency Conversion (MEDIUM PRIORITY)
Create `/src/lib/utils/currency.ts`:
- Integrate with exchange rate API (e.g., exchangerate-api.io)
- Add conversion function
- Update return items creation to convert prices to USD

### 6. OAuth Integrations (LOW PRIORITY)
- Google OAuth: Create `/src/app/api/auth/google/` routes
- Apple Sign In: Create `/src/app/api/auth/apple/` routes

### 7. Database Setup (REQUIRED BEFORE TESTING)

#### Step 1: Create Neon Database
1. Go to [neon.tech](https://neon.tech) and create account
2. Create new project: "retoro-backend"
3. Copy connection string

#### Step 2: Configure Environment
```bash
cd retoro-backend
cp .env.example .env.local
# Edit .env.local and add your DATABASE_URL
```

#### Step 3: Run Migrations
```bash
npm run db:generate  # Generate migration files
npm run db:push      # Push schema to database
```

#### Step 4: Seed Retailer Data
Create a seed script or manually insert popular retailers:
```sql
INSERT INTO retailer_policies (name, return_window_days, website_url, has_free_returns) VALUES
('Amazon', 30, 'https://amazon.com', true),
('Zara', 30, 'https://zara.com', true),
('H&M', 30, 'https://hm.com', true),
('Nike', 60, 'https://nike.com', true),
('Target', 90, 'https://target.com', true),
('Walmart', 90, 'https://walmart.com', true),
('Nordstrom', 0, 'https://nordstrom.com', true); -- 0 = unlimited
```

### 8. Testing & Validation

#### Local Testing Checklist
- [ ] Start dev server: `npm run dev`
- [ ] Test registration endpoint with Postman/curl
- [ ] Test login endpoint
- [ ] Test session endpoint
- [ ] Test return items CRUD
- [ ] Verify JWT tokens work correctly
- [ ] Test anonymous user flow

#### Example Test Commands
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get return items (replace TOKEN)
curl -X GET http://localhost:3000/api/return-items \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 9. Deployment to Vercel

#### Step 1: Initialize Git
```bash
cd retoro-backend
git init
git add .
git commit -m "Initial commit: Retoro backend API"
```

#### Step 2: Push to GitHub
```bash
# Create new repo on GitHub first, then:
git remote add origin https://github.com/yourusername/retoro-backend.git
git branch -M main
git push -u origin main
```

#### Step 3: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure environment variables (all from .env.example)
5. Deploy

#### Step 4: Update iOS App
In iOS app's `APIClient.swift:40`:
```swift
private let baseURL = "https://your-vercel-app.vercel.app"
```

### 10. Production Considerations

#### Security
- [ ] Enable CORS for iOS app domain only
- [ ] Add rate limiting middleware
- [ ] Set up Vercel firewall rules
- [ ] Rotate JWT secrets regularly
- [ ] Use environment-specific secrets

#### Monitoring
- [ ] Set up Vercel Analytics
- [ ] Configure error tracking (Sentry)
- [ ] Set up logging (Vercel logs + external service)
- [ ] Database connection pooling monitoring

#### Performance
- [ ] Add database indices (already in schema)
- [ ] Enable Vercel Edge Functions for auth endpoints
- [ ] Set up caching for retailer policies
- [ ] Optimize SQL queries

### 11. Documentation
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Postman collection
- [ ] Integration guide for iOS team
- [ ] Database schema diagrams

## Priority Order

### Phase 1 (Essential for MVP)
1. Set up Neon database
2. Run migrations and seed data
3. Test authentication endpoints locally
4. Test return items CRUD locally
5. Implement retailers API
6. Implement settings API

### Phase 2 (Core Features)
7. Deploy to Vercel staging
8. Integrate currency conversion
9. Implement invoice upload proxy
10. Implement support contact

### Phase 3 (Enhanced Features)
11. Add OAuth integrations
12. Write integration tests
13. Set up CI/CD
14. Deploy to production

### Phase 4 (Polish)
15. Add rate limiting
16. Improve error handling
17. Add monitoring/analytics
18. Write comprehensive docs

## Quick Start Command

To get started immediately:

```bash
# 1. Install dependencies
cd retoro-backend
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your values

# 3. Set up database
npm run db:generate
npm run db:push

# 4. Start dev server
npm run dev

# 5. Test in browser
open http://localhost:3000
```

## Questions or Issues?

- Check README.md for detailed API documentation
- Review CLAUDE.md in iOS app for integration details
- Check Vercel logs for deployment issues
- Review Drizzle docs: https://orm.drizzle.team/docs/overview

---

Good luck! The foundation is solid - you're about 60% complete. The remaining work is mostly implementing the additional API endpoints and deploying to production.
