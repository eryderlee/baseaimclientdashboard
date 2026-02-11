# External Integrations

**Analysis Date:** 2026-02-11

## APIs & External Services

**Payment Processing:**
- Stripe - Billing, invoicing, and subscription management
  - SDK/Client: `stripe` (v20.3.0) - Server-side API client at `lib/stripe.ts`
  - Client SDK: `@stripe/stripe-js` (v8.7.0) - Browser-side payment UI
  - Auth: `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` env vars
  - Implementation: Stripe instances initialized in `lib/stripe.ts` with API version `2024-12-18.acacia`
  - Usage: Invoice and subscription management (Subscription model in schema includes `stripeInvoiceId`, `stripeCustomerId`, `stripePriceId`, `stripeSubscriptionId`)
  - Webhook endpoint (planned): `https://your-app.vercel.app/api/webhooks/stripe` (not yet implemented)

## Data Storage

**Databases:**
- PostgreSQL - Primary database
  - Connection: `DATABASE_URL` env var
  - Client: Prisma ORM v7.3.0
  - Schema location: `prisma/schema.prisma`
  - Migrations: `prisma/migrations/` directory
  - Models: User, Client, Document, Folder, Message, Notification, Milestone, Invoice, Subscription, Activity

**File Storage:**
- Vercel Blob - Production file storage for document uploads
  - Client: `@vercel/blob` (v2.0.1)
  - Auth: `BLOB_READ_WRITE_TOKEN` env var
  - Usage: Upload documents via `app/api/documents/upload/route.ts`, delete via `app/api/documents/[id]/route.ts`
  - Fallback: Local filesystem (development without BLOB_READ_WRITE_TOKEN) - files stored at `/uploads/{filename}`
  - Token check: Conditional usage in `app/api/documents/upload/route.ts` (line 23) and `app/api/documents/[id]/route.ts` (line 37)

**Caching:**
- None detected - Standard request-response pattern with database queries

## Authentication & Identity

**Auth Provider:**
- Custom (NextAuth.js with Credentials provider)
  - Implementation: `lib/auth.ts` - NextAuth.js v5.0.0-beta.30
  - Strategy: Email/password with bcryptjs hashing
  - Provider: Credentials provider (email + password flow)
  - Session flow: JWT token with role and user ID stored in token and session
  - User verification: Bcryptjs password comparison against hashed passwords in `users` table
  - Sign-in page: `/login` (configured in NextAuth config)
  - Protected routes: Use `auth()` function from `lib/auth` to check session
  - Session customization: Role and ID added to token and session via JWT and session callbacks

## Monitoring & Observability

**Error Tracking:**
- None detected - Standard console.error logging without external error tracking service

**Logs:**
- Console logging only - Error logging via `console.error()` in API routes
- No structured logging or external log aggregation

## CI/CD & Deployment

**Hosting:**
- Vercel (preferred deployment target)
  - Implied by use of @vercel/blob and Next.js framework
  - Environment variables managed via Vercel dashboard

**CI Pipeline:**
- None detected - No CI configuration files (no .github/workflows, .gitlab-ci.yml, etc.)

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - PostgreSQL connection string (CRITICAL)
- `NEXTAUTH_URL` - Application URL for NextAuth (CRITICAL)
- `NEXTAUTH_SECRET` - Secret for NextAuth JWT encryption (CRITICAL)

**Optional env vars:**
- `STRIPE_SECRET_KEY` - Stripe API secret key (optional, required for payment features)
- `STRIPE_PUBLISHABLE_KEY` - Stripe public key (optional, required for client-side payment UI)
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage token (optional, falls back to local storage)
- `NODE_ENV` - Environment mode (used in `lib/prisma.ts` for development Prisma caching)

**Secrets location:**
- `.env` file (local development)
- Vercel environment variables dashboard (production)
- `.env*` files are gitignored (see `.gitignore`)

## Webhooks & Callbacks

**Incoming:**
- Stripe webhooks (planned but not implemented)
  - Endpoint: `/api/webhooks/stripe` (referenced in README but code not present)
  - Events: Invoice payment, subscription updates
  - Secret: `STRIPE_WEBHOOK_SECRET` env var (mentioned in README)

**Outgoing:**
- None detected - No outbound webhook calls to external services

## API Routes & Internal Endpoints

**Authentication:**
- `POST /api/auth/register` - User registration with client profile creation
- `GET,POST /api/auth/[...nextauth]` - NextAuth.js authentication endpoints

**Documents:**
- `POST /api/documents/upload` - File upload to Vercel Blob with metadata storage
- `DELETE /api/documents/[id]` - Document deletion from Blob and database

**Messages:**
- `GET,POST /api/messages` - Message retrieval and creation with notifications

**Notifications:**
- `GET,PUT /api/notifications/[id]` - Notification retrieval and updates
- `PUT /api/notifications/mark-all-read` - Mark all notifications as read

**User:**
- `PUT /api/user/settings` - User settings updates

---

*Integration audit: 2026-02-11*
