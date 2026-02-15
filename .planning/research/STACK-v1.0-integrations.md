# Stack Research: v1.0 Integrations

**Domain:** External service integrations for Next.js 16 client dashboard
**Researched:** 2026-02-15
**Confidence:** HIGH

## Executive Summary

This research focuses on the NEW stack additions required for 5 major integrations: Facebook Ads API, Google Drive API, Stripe payments, transactional email, and optional production monitoring. The existing validated stack (Next.js 16, React 19, Prisma, PostgreSQL, NextAuth v5, Tailwind, shadcn/ui) will be extended, not replaced.

All recommended libraries are current as of February 2026, verified through official sources and recent documentation. The recommendations prioritize developer experience, Next.js 16 App Router compatibility, and production readiness.

## Recommended Stack Additions

### Facebook Ads API Integration

| Package | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| `facebook-nodejs-business-sdk` | 24.0.1+ | Official Meta Marketing API SDK for campaign metrics | Meta's official SDK, supports Marketing API v22.0+, 81K+ weekly downloads, comprehensive campaign/ad account management |

**Implementation Notes:**
- Requires Facebook App registration with Marketing API product enabled
- Access tokens last ~60 days and must be refreshed (store in database)
- Use long-lived tokens for backend operations (not short-lived user tokens)
- Initialize with: `const api = FacebookAdsApi.init(accessToken)`
- Supports both server-side and client-side usage (use server-side for security)

**Integration with Existing Stack:**
- Store Facebook credentials in Prisma schema (add `Account` model or extend `Client` model)
- Create API routes in `app/api/facebook/` for token refresh and data fetching
- Use Server Actions for campaign metric queries (no REST API needed)
- Cache campaign data in PostgreSQL to reduce API calls

### Google Drive API Integration

| Package | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| `googleapis` | 145.0.0+ | Official Google APIs Node.js client | Google's official library, supports OAuth 2.0 + service accounts, Drive API v3, updated 2 days ago |
| `@google-cloud/local-auth` | 3.0.1+ | Google OAuth 2.0 local authentication | Simplifies OAuth flow for development and testing |

**Auth Pattern:**
- Use **OAuth 2.0** (not service accounts) since you're accessing client-specific Drive folders
- Service accounts = app-owned files only; OAuth = user-specific access with consent
- Integrate with NextAuth v5 by adding Google provider to existing `lib/auth.ts`
- Store refresh tokens in database (tokens expire, need refresh mechanism)

**Implementation Notes:**
- Add Google provider to NextAuth configuration: `GoogleProvider({ clientId, clientSecret })`
- Request Drive scopes: `https://www.googleapis.com/auth/drive.file` (create/edit app files only, not all user files)
- Use `google.drive({ version: 'v3', auth })` for API client
- Replace Vercel Blob storage with Drive API for document uploads

**Integration with Existing Stack:**
- Extend Prisma `User` model to store Google tokens (add `Account` model for OAuth providers)
- Update `Document` model: replace `fileUrl` with `driveFileId`
- Migrate existing Vercel Blob files to Google Drive (one-time migration script)
- Create Server Actions for file upload/download/list operations

### Stripe Payment Processing

| Package | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| `stripe` | 20.3.1+ | Official Stripe Node.js library (already installed) | Stripe's official SDK, latest API version, excellent Next.js integration |
| `@stripe/stripe-js` | 8.7.0+ | Client-side Stripe.js library (already installed) | Official client library for Checkout, Payment Elements |

**Already Installed:** Your `package.json` includes both packages. No new dependencies needed.

**Implementation Notes:**
- Use **Server Actions** for checkout flows (no API routes needed in App Router)
- Webhooks require API route: `app/api/webhooks/stripe/route.ts`
- Webhook signature verification requires raw body (use `await request.text()`)
- Do NOT use default body parser for webhook routes

**Webhook Pattern for Next.js 16 App Router:**
```typescript
// app/api/webhooks/stripe/route.ts
export async function POST(request: Request) {
  const body = await request.text(); // RAW body for signature verification
  const signature = request.headers.get('stripe-signature')!;

  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );

  // Handle event types: customer.subscription.updated, invoice.paid, etc.
}
```

**Integration with Existing Stack:**
- Prisma schema already has `Invoice` and `Subscription` models with Stripe fields
- Add webhook event handlers to update `Invoice.status` and `Subscription.status`
- Create Server Actions for: creating checkout sessions, managing subscriptions, generating invoices
- Store Stripe Customer ID in `Subscription.stripeCustomerId` (already in schema)

**Testing:**
- Install Stripe CLI: `stripe listen --forward-to http://localhost:3000/api/webhooks/stripe`
- Use Stripe test mode for development

### Transactional Email Service

| Package | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| `resend` | 4.0.1+ | Modern transactional email API | Built for Next.js/React, excellent DX, React Email integration, best for new projects |
| `react-email` | 3.0.1+ | Email template builder with React/TypeScript | Created by Resend team, type-safe templates, supports all major email clients |
| `@react-email/components` | 0.0.27+ | Pre-built email components | Button, Link, Container, etc. - production-ready components |

**Why Resend over alternatives:**
- **vs SendGrid:** Simpler API, better DX, no legacy baggage, built for modern stacks. SendGrid is overkill for your use case (1-5 clients).
- **vs Nodemailer:** Resend is hosted service (no SMTP management), better deliverability, React Email integration.
- **vs AWS SES:** Easier setup, better DX, comparable pricing for low volume.

**Pricing:** Free tier: 100 emails/day, 3K/month. More than enough for 1-5 clients.

**Implementation Notes:**
- Create email templates in `emails/` directory using React/TypeScript
- Send emails via Server Actions (no API routes needed)
- Templates are type-safe and reusable
- Example: `await resend.emails.send({ from, to, subject, react: <EmailTemplate /> })`

**Email Use Cases:**
1. Client onboarding welcome email
2. Invoice sent notifications
3. Milestone completion notifications
4. Document approval/rejection notifications
5. Password reset (if you add forgot password feature)

**Integration with Existing Stack:**
- Create `lib/email.ts` with Resend client initialization
- Create React Email templates in `emails/` directory
- Call email functions from Server Actions (user registration, invoice creation, etc.)
- Store email send logs in `Activity` model for audit trail

### Production Monitoring (Optional)

| Package | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| `@sentry/nextjs` | 10.38.0+ | Error tracking and performance monitoring | Official Next.js SDK, one-command setup, App Router support, session replay |

**Why Sentry over alternatives:**
- **vs Axiom:** Sentry specializes in errors/performance; Axiom is general logging. Sentry has better code context and debugging tools.
- **vs LogRocket:** Comparable features, but Sentry has better Next.js integration and open-source roots.
- **vs Datadog/New Relic:** Sentry is developer-focused, simpler setup, better pricing for small projects.

**Implementation Notes:**
- Run setup wizard: `npx @sentry/wizard@latest -i nextjs`
- Automatically configures error tracking, tracing, and source maps
- Creates `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- Supports App Router, Pages Router, and API routes
- Captures React rendering errors via `app/global-error.tsx`

**Free Tier:** 5K errors/month, 10K transactions/month. Sufficient for initial production deployment.

**Integration Points:**
- Automatically captures unhandled errors in Server Components, Client Components, API routes
- Add performance tracing to critical flows (payment processing, file uploads)
- Tag errors with client ID for better debugging: `Sentry.setTag('clientId', client.id)`
- Alert on critical errors (payment failures, auth errors)

## Installation Commands

### Core Integrations (Required)

```bash
# Facebook Ads API
npm install facebook-nodejs-business-sdk

# Google Drive API
npm install googleapis @google-cloud/local-auth

# Stripe (already installed - verify versions)
npm install stripe@latest @stripe/stripe-js@latest

# Transactional Email
npm install resend react-email @react-email/components
```

### Development Tools

```bash
# Email template development server
npm install -D react-email

# TypeScript types
npm install -D @types/facebook-nodejs-business-sdk

# Stripe CLI (for webhook testing)
# Download from: https://docs.stripe.com/stripe-cli
```

### Optional Production Monitoring

```bash
# Sentry (use wizard for automatic setup)
npx @sentry/wizard@latest -i nextjs
```

## Alternatives Considered

| Category | Recommended | Alternative | When to Use Alternative |
|----------|-------------|-------------|------------------------|
| Email Service | Resend | SendGrid | If you need marketing campaigns (Resend is transactional-only) or already have SendGrid account |
| Email Service | Resend | Nodemailer | If you want to self-host SMTP or use existing email server |
| Email Service | Resend | AWS SES | If minimizing costs is critical and you have AWS expertise |
| Monitoring | Sentry | Axiom | If you need general-purpose logging with complex queries over error-specific debugging |
| Monitoring | Sentry | LogRocket | If you need advanced session replay features (form interactions, network logs) |
| Facebook SDK | facebook-nodejs-business-sdk | Manual REST API | Never - official SDK handles pagination, versioning, types |
| Google Drive | googleapis | google-drive npm package | Never - googleapis is the official library, others are unmaintained wrappers |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `facebook-nodejs-ads-sdk` | Deprecated, last updated 2018 | `facebook-nodejs-business-sdk` (official replacement) |
| `micro` for webhook parsing | Outdated pattern for App Router | `await request.text()` in Route Handlers |
| Service accounts for Google Drive | Wrong auth pattern for user-specific data | OAuth 2.0 with NextAuth Google provider |
| Short-lived Facebook tokens | Expire too quickly for backend operations | Long-lived tokens (60-day expiry, refreshable) |
| Client-side Stripe secret key | Security risk - exposes API key | Server Actions or API routes only |
| NextAuth database adapter without Account model | Can't store OAuth tokens for Google/Facebook | Add `Account` model to Prisma schema |

## Authentication Patterns by Service

### Facebook Ads API
**Pattern:** Long-lived access tokens + manual refresh
- Admin generates long-lived token via Meta Developer Tools
- Store token in database (encrypted recommended)
- Refresh every 60 days (set up reminder or automated refresh)
- Token is admin-level, not per-client (you're pulling campaign data for your clients)

### Google Drive API
**Pattern:** OAuth 2.0 with NextAuth
- Add Google provider to NextAuth configuration
- User authorizes app to access their Drive
- NextAuth stores access token + refresh token in database
- Refresh token is long-lived, access token auto-refreshes
- **CRITICAL:** Must add `Account` model to Prisma schema for OAuth provider tokens

### Stripe
**Pattern:** API keys (server-side only) + webhooks
- Secret key stored in environment variables (never client-side)
- Server Actions handle checkout creation, subscription management
- Webhooks update database on payment events (async, reliable)
- No user authentication needed (Stripe handles customer sessions)

### Resend
**Pattern:** API key authentication (server-side only)
- API key stored in environment variables
- Server Actions send emails (no client-side exposure)
- No OAuth needed (you're sending emails on behalf of your domain)

## Prisma Schema Additions Required

### For OAuth Providers (Google, Facebook)

```prisma
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String  // "oauth"
  provider          String  // "google", "facebook"
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

// Add to User model:
model User {
  // ... existing fields
  accounts Account[]
}
```

### For Facebook Ads Integration (Optional - if storing per-client tokens)

```prisma
model Client {
  // ... existing fields
  facebookAccessToken String? @db.Text
  facebookTokenExpiry DateTime?
  facebookAdAccountId String? // Ad account ID for this client
}
```

### For Google Drive Integration

```prisma
model Document {
  // ... existing fields
  driveFileId String? // Replace fileUrl with Drive file ID
  driveFolderId String? // Parent folder in Drive

  // Keep fileUrl for migration period (nullable after migration)
}
```

## Version Compatibility Matrix

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| stripe | 20.3.1+ | Node.js 18+ | Drops Node 16 support in next major version |
| @stripe/stripe-js | 8.7.0+ | All browsers | Client-side only, no Node.js compatibility needed |
| googleapis | 145.0.0+ | Node.js 18+ | Updated Feb 13, 2026 |
| facebook-nodejs-business-sdk | 24.0.1+ | Node.js 14+ | Supports Marketing API v22.0+ |
| resend | 4.0.1+ | Node.js 18+ | Works with all Next.js versions |
| react-email | 3.0.1+ | React 18+ | Compatible with React 19 |
| @sentry/nextjs | 10.38.0+ | Next.js 13.2+, 16.x | Minimum Next.js 13.2, fully supports 16.x |
| next-auth | 5.0.0-beta.30 (current) | Next.js 16.x | Already using NextAuth v5 beta |

## Integration Complexity Estimates

| Integration | Complexity | Estimated Setup Time | Primary Challenges |
|-------------|-----------|---------------------|-------------------|
| Stripe | Low | 4-6 hours | Webhook signature verification, idempotency |
| Resend + React Email | Low | 2-4 hours | Template creation, email design |
| Google Drive (OAuth) | Medium | 8-12 hours | OAuth token management, file migration from Vercel Blob |
| Facebook Ads API | Medium | 6-10 hours | Long-lived token generation, API pagination, data mapping |
| Sentry | Very Low | 1 hour | Automated setup wizard handles everything |

**Total estimated integration time:** 21-33 hours

## Security Considerations

### API Keys and Secrets
- Store in environment variables (`.env.local` for dev, Vercel env vars for production)
- Never commit to git (already in `.gitignore`)
- Use different keys for development and production

### OAuth Token Storage
- Store refresh tokens encrypted in database (consider adding `@prisma/client` encryption extension)
- Access tokens can be stored plain (short-lived, auto-refresh)
- Never expose tokens to client-side code

### Webhook Security
- **CRITICAL:** Always verify webhook signatures (Stripe, Facebook, etc.)
- Use raw request body for signature verification (not parsed JSON)
- Reject webhooks with invalid signatures
- Implement idempotency (check if event already processed)

### Rate Limiting
- Facebook Ads API: 200 calls/hour per user (business apps get higher limits)
- Google Drive API: 20K requests/100 seconds per user
- Stripe API: No hard limit, but use exponential backoff for retries
- Resend: 10 requests/second

## Next Steps After Stack Installation

1. **Extend Prisma Schema**
   - Add `Account` model for OAuth providers
   - Add Facebook/Google fields to `Client` model
   - Run migration: `npx prisma migrate dev --name add-integration-models`

2. **Configure NextAuth OAuth Providers**
   - Add Google provider to `lib/auth.ts`
   - Configure callbacks to store tokens in `Account` model
   - Update NextAuth secret and configure providers

3. **Set Up Service Accounts**
   - Create Facebook App in Meta Developer Console
   - Create Google Cloud project and enable Drive API
   - Create Stripe account and get API keys
   - Sign up for Resend and get API key

4. **Test Integrations in Development**
   - Use Stripe test mode and CLI for webhook testing
   - Use Google OAuth playground for Drive API testing
   - Use Facebook Graph API Explorer for Ads API testing
   - Use Resend test mode (sends to your verified email only)

5. **Implement Webhook Handlers**
   - Stripe: `app/api/webhooks/stripe/route.ts`
   - Store webhook events in database for audit trail
   - Add retry logic for failed webhook processing

6. **Create Email Templates**
   - Set up React Email development server: `npm run email dev`
   - Create templates for each transactional email type
   - Test templates in all major email clients (Gmail, Outlook, Apple Mail)

7. **Data Migration**
   - Migrate existing Vercel Blob files to Google Drive
   - Update all `Document` records with `driveFileId`
   - Keep Vercel Blob as backup during transition period

## Sources

### Official Documentation (HIGH confidence)
- [Stripe Node.js library](https://github.com/stripe/stripe-node) — Latest version 20.3.1, releases
- [Facebook Marketing API Node.js SDK](https://github.com/facebook/facebook-nodejs-business-sdk) — Official SDK, version 24.0.1
- [Google APIs Node.js client](https://github.com/googleapis/google-api-nodejs-client) — Official library, Drive API v3
- [Resend documentation](https://resend.com/docs/send-with-nextjs) — Next.js integration guide
- [Sentry Next.js documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/) — Setup and configuration

### Integration Guides (MEDIUM-HIGH confidence)
- [Stripe Checkout with Next.js 15](https://medium.com/@gragson.john/stripe-checkout-and-webhook-in-a-next-js-15-2025-925d7529855e) — Webhook patterns for App Router
- [Resend vs SendGrid comparison](https://nextbuild.co/blog/resend-vs-sendgrid-vs-ses-email) — Email service evaluation
- [Next.js authentication solutions 2026](https://workos.com/blog/top-authentication-solutions-nextjs-2026) — NextAuth and alternatives
- [Google Drive API with Node.js](https://developers.google.com/workspace/drive/api/quickstart/nodejs) — Official quickstart
- [NextAuth.js OAuth configuration](https://next-auth.js.org/configuration/providers/oauth) — NextAuth OAuth configuration

### Version Information (MEDIUM confidence - WebSearch)
- npm package searches (stripe, resend, @sentry/nextjs, googleapis) — Latest versions as of Feb 2026
- [Next.js 16 release notes](https://nextjs.org/blog/next-16) — App Router updates, React 19 compatibility

### Community Patterns (LOW-MEDIUM confidence - verified with official docs)
- [Stripe webhook signature verification](https://kitson-broadhurst.medium.com/next-js-app-router-stripe-webhook-signature-verification-ea9d59f3593f) — App Router patterns
- [Facebook Ads API long-lived tokens](https://www.blackhatworld.com/seo/getting-a-long-lived-token-for-facebook-ads-api-access.1698802/) — Token management strategies
- [Google Drive service account vs OAuth](https://www.codegenes.net/blog/google-drive-api-oauth-and-service-account/) — Auth pattern comparison

---

*Stack research for: BaseAim Client Dashboard v1.0 Integrations*
*Researched: 2026-02-15*
*Confidence: HIGH for library versions and Next.js 16 compatibility*
*Confidence: MEDIUM-HIGH for auth patterns and integration complexity estimates*
