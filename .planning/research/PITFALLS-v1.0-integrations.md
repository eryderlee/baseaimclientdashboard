# Domain Pitfalls: External Service Integrations

**Domain:** SaaS Dashboard with External Integrations (Facebook Ads, Google Drive, Stripe, Email, Chat)
**Platform:** Next.js App Router
**Researched:** 2026-02-15
**Scale:** Low volume (1-5 clients), production-critical
**Team:** Small agency, limited DevOps

---

## Critical Pitfalls

Mistakes that cause complete integration failures, security breaches, or data loss.

### Pitfall 1: Stripe Webhook Signature Verification Failure

**What goes wrong:** Next.js middleware or body parser corrupts the raw request body before signature verification, causing all webhook verifications to fail silently. Payments process but your app never receives confirmation, leading to abandoned orders showing as "pending" forever.

**Why it happens:**
- Next.js automatically parses JSON request bodies via `bodyParser` in API routes
- Framework parses body before webhook handler runs
- Signature is computed over the RAW body bytes, not the parsed JSON
- Most tutorials show signature verification AFTER body parsing (wrong order)

**Consequences:**
- 100% webhook verification failure rate
- Customer payments succeed but never update in your app
- Manual reconciliation required for every transaction
- Production launch blocked until resolved

**Prevention:**
```typescript
// app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  // CRITICAL: Get raw body BEFORE any parsing
  const body = await req.text()
  const signature = headers().get('stripe-signature')!

  let event: Stripe.Event

  try {
    // Verify signature with RAW body
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // ONLY parse after verification succeeds
  // Now process event...
}
```

**Detection:**
- Test webhooks return 400 errors in Stripe dashboard
- Stripe CLI shows "signature mismatch" errors
- Production webhooks all fail immediately after deployment
- No webhook events appear in your application logs

**Phase:** Architecture & API Design (Phase 1) - Must configure route correctly from the start
**Severity:** CRITICAL - App unusable without working webhooks

---

### Pitfall 2: Wrong Stripe Webhook Secret in Production

**What goes wrong:** Using test mode webhook secret in production environment. Stripe sends live events signed with production secret, but your app tries to verify with test secret. Result: 100% verification failure.

**Why it happens:**
- Test and live mode have DIFFERENT webhook secrets
- Environment variables not updated when switching modes
- Copy-paste from Stripe dashboard grabs wrong secret
- `.env.production` file uses test values from development

**Consequences:**
- Complete production webhook failure
- Payments succeed, app state never updates
- Discovered only after first real customer transaction
- Emergency hotfix during launch weekend

**Prevention:**
```bash
# .env.local (development)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...

# .env.production (production) - DIFFERENT values
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_live_...
```

**Testing checklist:**
- [ ] Send test webhook to staging with live-mode secret
- [ ] Verify environment variable is NOT prefixed with `NEXT_PUBLIC_`
- [ ] Confirm webhook secret matches mode in Stripe dashboard
- [ ] Document which secret goes with which environment

**Detection:**
- All production webhooks fail with signature verification errors
- Test mode webhooks work fine (false sense of security)
- Stripe dashboard shows delivery failures
- Error logs show "signature verification failed"

**Phase:** Deployment & Environment Setup (Phase 5)
**Severity:** CRITICAL - Production payments broken

---

### Pitfall 3: Missing Idempotency in Stripe Webhook Handlers

**What goes wrong:** Stripe sends duplicate webhook events due to retries, network issues, or timeouts. Without idempotency, your handler processes the same `payment_intent.succeeded` event multiple times, creating duplicate database records, sending duplicate emails, or double-charging customers.

**Why it happens:**
- Network timeouts cause Stripe to retry (3 days of retries)
- Handler returns error after partial processing
- No tracking of processed event IDs
- Database operations not idempotent

**Consequences:**
- Customer charged once, receives 5 confirmation emails
- Duplicate subscription records in database
- Analytics show inflated revenue numbers
- Customer complaints and refund requests

**Prevention:**
```typescript
// Track processed events in database
async function handleWebhook(event: Stripe.Event) {
  // Check if already processed
  const existing = await db.webhookEvent.findUnique({
    where: { stripeEventId: event.id }
  })

  if (existing) {
    console.log(`Event ${event.id} already processed, skipping`)
    return NextResponse.json({ received: true }, { status: 200 })
  }

  // Process event in transaction
  await db.$transaction(async (tx) => {
    // Record event as processed FIRST
    await tx.webhookEvent.create({
      data: {
        stripeEventId: event.id,
        type: event.type,
        processedAt: new Date()
      }
    })

    // Then perform business logic
    if (event.type === 'payment_intent.succeeded') {
      await processPayment(event.data.object, tx)
    }
  })

  return NextResponse.json({ received: true }, { status: 200 })
}
```

**Alternative approach - unique constraint:**
```typescript
// Add unique constraint to schema
model WebhookEvent {
  id            String   @id @default(cuid())
  stripeEventId String   @unique // Enforces idempotency at DB level
  type          String
  processedAt   DateTime
}

// Database will reject duplicates automatically
```

**Detection:**
- Duplicate records in database for single payment
- Customer receives multiple confirmation emails
- Stripe dashboard shows multiple successful deliveries for same event
- Database logs show constraint violations

**Phase:** Implementation (Phase 2) - Build into webhook handlers from start
**Severity:** CRITICAL - Financial and data integrity issues

---

### Pitfall 4: Facebook Ads API Advanced Access Trap

**What goes wrong:** You build the entire integration using Standard Access (works for your own ad accounts), ship to production, then discover Standard Access is essentially "demo mode" - severely rate limited and can't access client ad accounts. Applying for Advanced Access requires business verification (2-4 weeks) plus app review (2-7 days per attempt), blocking your launch by 1-2 months.

**Why it happens:**
- Standard Access has no warnings that it's limited
- Works fine during development with your test ad account
- Advanced Access requirements buried in documentation
- Business verification is separate process not mentioned upfront
- Each permission requires separate app review submission

**Consequences:**
- Production integration unusable for clients
- 1-2 month delay to get Advanced Access approved
- Possible rejection requiring code changes and resubmission
- Lost revenue from delayed launch
- Emergency workarounds with manual data exports

**Prevention:**
- **Apply for Advanced Access in Phase 1** (Architecture) - not when feature is "ready"
- Complete Business Verification FIRST (submit with business documents)
- Request ONLY permissions you actually use with clear justification
- Document use case in business terms (not technical jargon)
- Record demo video showing exactly how each permission is used

**Required permissions for campaign metrics:**
```
- ads_read: View ad campaigns and performance data
- ads_management: (Only if modifying campaigns)
- business_management: Access ad accounts under Business Manager
```

**Advanced Access timeline:**
```
Business Verification: 2-4 weeks
App Review (per permission): 2-7 days
Rejection + Resubmission: +3-5 days each attempt
Total: 3-6 weeks minimum
```

**Detection:**
- API returns 403 "requires Advanced Access" in production
- Rate limits hit immediately with real client volume
- Can only access your own ad account, not client accounts
- "Application does not have permission" errors

**Phase:** Phase 1 (Architecture) - Begin verification process immediately
**Severity:** CRITICAL - Blocks production launch for 1-2 months

---

### Pitfall 5: Exposed API Keys in Client-Side Code

**What goes wrong:** Storing API keys (Stripe, Facebook, Google Drive) in environment variables prefixed with `NEXT_PUBLIC_`, which embeds them into the client-side JavaScript bundle. Keys visible in browser DevTools, accessible to any user, and used for unauthorized access to your services.

**Why it happens:**
- Misunderstanding of `NEXT_PUBLIC_` prefix behavior
- Copy-paste from tutorials that expose test keys
- Trying to call APIs directly from Client Components
- Not understanding Server vs Client Components in App Router

**Consequences:**
- API keys leaked in production bundle (viewable via View Source)
- Unauthorized access to your Facebook Ads, Stripe, or Google Drive
- Potential financial loss from API abuse
- Key rotation emergency (invalidates existing integrations)
- Security audit failure

**Prevention:**
```bash
# .env.local - NEVER use NEXT_PUBLIC_ for secrets
# ❌ WRONG - Exposed to client
NEXT_PUBLIC_STRIPE_SECRET_KEY=sk_live_...

# ✅ CORRECT - Server-only
STRIPE_SECRET_KEY=sk_live_...
FACEBOOK_APP_SECRET=...
GOOGLE_DRIVE_CLIENT_SECRET=...

# Only safe to expose
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

**Architecture pattern:**
```typescript
// ❌ WRONG - Client Component calling API directly
'use client'
export default function CampaignMetrics() {
  const data = await fetch('https://graph.facebook.com/...', {
    headers: { 'Authorization': `Bearer ${process.env.FACEBOOK_TOKEN}` }
  })
}

// ✅ CORRECT - Server Component or API Route
export default async function CampaignMetrics() {
  // Server Component - can safely access secrets
  const data = await fetchFacebookAds(process.env.FACEBOOK_TOKEN!)
}

// OR use API route
'use client'
export default function CampaignMetrics() {
  const data = await fetch('/api/facebook/campaigns') // Your API route handles auth
}
```

**Detection:**
- Search codebase for `NEXT_PUBLIC_STRIPE_SECRET` or similar
- Check browser DevTools → Sources → search for API keys
- Run `grep -r "NEXT_PUBLIC_.*SECRET" .env*`
- Audit build output for embedded secrets

**Phase:** Phase 1 (Architecture) - Establish pattern before writing code
**Severity:** CRITICAL - Security breach, financial exposure

---

### Pitfall 6: OAuth Token Refresh Race Conditions

**What goes wrong:** Multiple Next.js server instances or concurrent requests attempt to refresh the same expired OAuth token (Google Drive, Facebook) simultaneously. First request succeeds and receives new refresh token, invalidating the old one. Other requests fail with "refresh token already used" or "invalid_grant" errors. Integration breaks sporadically under load.

**Why it happens:**
- Vercel/serverless platforms run multiple instances
- No coordination between instances during token refresh
- Concurrent API calls trigger simultaneous refresh attempts
- OAuth providers invalidate old refresh token immediately
- In-memory locking doesn't work across instances

**Consequences:**
- Intermittent "unauthorized" errors (works sometimes, fails randomly)
- User forced to re-authenticate repeatedly
- Integration appears unreliable in production
- Impossible to reproduce in local development (single instance)
- Customer trust eroded by "broken" features

**Prevention:**
```typescript
// Use database-level locking for token refresh
import { PrismaClient } from '@prisma/client'

async function refreshAccessToken(userId: string) {
  const prisma = new PrismaClient()

  try {
    // Acquire exclusive lock using database transaction
    const integration = await prisma.$transaction(async (tx) => {
      // SELECT FOR UPDATE prevents concurrent refreshes
      const locked = await tx.integration.findUnique({
        where: { userId },
        // PostgreSQL: FOR UPDATE locks the row
      })

      if (!locked) throw new Error('Integration not found')

      // Check if token was refreshed while we waited for lock
      if (locked.expiresAt > new Date(Date.now() + 60000)) {
        return locked // Already refreshed by another request
      }

      // Perform actual refresh
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: locked.refreshToken,
          grant_type: 'refresh_token'
        })
      })

      const tokens = await response.json()

      // Update with new tokens
      return await tx.integration.update({
        where: { userId },
        data: {
          accessToken: tokens.access_token,
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          refreshToken: tokens.refresh_token || locked.refreshToken
        }
      })
    })

    return integration.accessToken
  } catch (error) {
    console.error('Token refresh failed:', error)
    throw error
  }
}
```

**Alternative: Redis-based locking for multi-instance:**
```typescript
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

async function refreshWithLock(userId: string) {
  const lockKey = `token_refresh_lock:${userId}`
  const lockValue = Date.now().toString()

  // Try to acquire lock (30 second expiry)
  const acquired = await redis.set(lockKey, lockValue, 'EX', 30, 'NX')

  if (!acquired) {
    // Another instance is refreshing, wait and retry
    await new Promise(resolve => setTimeout(resolve, 1000))
    return getAccessToken(userId) // Fetch refreshed token
  }

  try {
    // We have the lock, perform refresh
    const newToken = await performTokenRefresh(userId)
    return newToken
  } finally {
    // Release lock
    await redis.del(lockKey)
  }
}
```

**Detection:**
- "invalid_grant" or "token has been revoked" errors in production logs
- Errors only occur under concurrent load, not in testing
- Users report needing to reconnect integrations frequently
- Error rate increases with traffic volume
- Different behavior on localhost vs Vercel

**Phase:** Phase 2 (Implementation) - Build locking from the start
**Severity:** CRITICAL - Integration unreliable, frequent re-authentication

---

## High Severity Pitfalls

Mistakes that cause data loss, poor UX, or significant technical debt.

### Pitfall 7: Email Authentication Missing (SPF/DKIM/DMARC)

**What goes wrong:** Transactional emails sent without proper SPF, DKIM, and DMARC configuration. Gmail and Yahoo (2026 requirements) reject emails entirely or mark as spam. Critical notifications (password resets, payment confirmations) never reach customers.

**Why it happens:**
- Email service provider setup incomplete
- DNS records not configured for custom domain
- Using shared IP pool without proper authentication
- Sending from `@yourdomain.com` without authorization
- 2026 enforcement stricter than previous years

**Consequences:**
- 50-80% of emails marked as spam or bounced
- Password reset emails never arrive (support nightmare)
- Payment confirmations lost (customer disputes)
- Domain reputation damaged permanently
- Gmail/Yahoo block future emails from domain

**Prevention:**

**Step 1: Configure SPF record** (authorizes sending servers)
```dns
TXT record for @
v=spf1 include:_spf.google.com include:sendgrid.net ~all
```

**Step 2: Configure DKIM** (cryptographic signature)
```dns
TXT record for: [selector]._domainkey
v=DKIM1; k=rsa; p=[public_key_from_email_provider]
```

**Step 3: Configure DMARC** (policy for failures)
```dns
TXT record for _dmarc
v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com; pct=100
```

**Verification checklist:**
- [ ] Test emails to Gmail show "mailed-by: yourdomain.com" and "signed-by: yourdomain.com"
- [ ] Check authentication at https://www.mail-tester.com (aim for 10/10)
- [ ] Monitor DMARC reports for failures
- [ ] Set up separate subdomain for transactional emails (transactional.yourdomain.com)
- [ ] Use dedicated IP if sending >100k emails/month

**2026 Requirements (Gmail/Yahoo):**
- SPF + DKIM: MANDATORY for domains sending >5,000 emails/day
- DMARC: REQUIRED with policy of at least `p=none`
- One-click unsubscribe: REQUIRED for promotional emails
- Low spam complaint rate: <0.3%

**Detection:**
- Email deliverability <50% in analytics
- Customers report not receiving emails
- Emails appear in spam folder
- Bounce rate >5%
- Email service provider shows "authentication failed"

**Phase:** Phase 1 (Architecture) - Configure DNS before sending emails
**Severity:** HIGH - Critical business communications blocked

---

### Pitfall 8: Google Drive API Rate Limits Not Handled

**What goes wrong:** App hits Google Drive rate limits (12,000 queries/60 seconds per user) during bulk operations or high traffic. API returns 403/429 errors, operations fail, and app shows error messages to users. Without exponential backoff, retry storm makes problem worse.

**Why it happens:**
- Syncing entire folder trees without pagination
- Polling for changes instead of using push notifications
- Multiple simultaneous file operations per user
- No retry logic or backoff strategy
- Not requesting quota increase for legitimate high-volume use

**Consequences:**
- File uploads fail during peak usage
- Document list shows "failed to load" errors
- Retry storms amplify the problem
- User workflow interrupted
- Support tickets spike

**Prevention:**
```typescript
async function fetchWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries = 5
): Promise<T> {
  let attempt = 0

  while (attempt < maxRetries) {
    try {
      return await operation()
    } catch (error: any) {
      const isRateLimitError =
        error.code === 403 ||
        error.code === 429 ||
        error.message?.includes('rate limit')

      if (!isRateLimitError || attempt >= maxRetries - 1) {
        throw error // Not rate limit or max retries exhausted
      }

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      const delayMs = Math.min(
        (2 ** attempt) * 1000 + Math.random() * 1000,
        32000 // Max 32 seconds
      )

      console.log(`Rate limited, retrying in ${delayMs}ms (attempt ${attempt + 1})`)
      await new Promise(resolve => setTimeout(resolve, delayMs))
      attempt++
    }
  }

  throw new Error('Max retries exhausted')
}

// Usage
const files = await fetchWithBackoff(() =>
  drive.files.list({
    pageSize: 100,
    fields: 'files(id, name, mimeType)',
    q: `'${folderId}' in parents`
  })
)
```

**Additional strategies:**
- **Use push notifications instead of polling:**
```typescript
// Set up change notifications
const channel = await drive.files.watch({
  fileId: 'root',
  requestBody: {
    id: uuid(),
    type: 'web_hook',
    address: 'https://yourdomain.com/api/drive/webhook'
  }
})
```

- **Batch operations:**
```typescript
// Use batch requests to reduce quota consumption
const batch = drive.newBatch()
batch.add(drive.files.get({ fileId: 'file1' }))
batch.add(drive.files.get({ fileId: 'file2' }))
await batch.execute()
```

- **Request quota increase:**
  - Go to Google Cloud Console → IAM & Admin → Quotas
  - Filter by "Drive API"
  - Request increase with business justification

**Detection:**
- Logs show 403 "User rate limit exceeded" or 429 "Too many requests"
- Operations fail intermittently during peak hours
- Multiple requests to same endpoint in quick succession
- Google Cloud Console quota dashboard shows 100% utilization

**Phase:** Phase 2 (Implementation) - Build into API client from start
**Severity:** HIGH - User-facing errors, poor reliability

---

### Pitfall 9: Google Drive File Permissions Not Managed

**What goes wrong:** Files uploaded to Google Drive via API default to private (only service account can access). Users click shared links and see "You need access" errors. Or worse: files set to "anyone with link" expose confidential client data publicly.

**Why it happens:**
- Google Drive API doesn't set permissions automatically
- Service account is not the user's account
- Shared Drive vs My Drive permission models differ
- Tutorials skip permission management
- Default permissions are private

**Consequences:**
- Users can't access files uploaded on their behalf
- Manual permission granting required for every file
- Confidential files accidentally made public
- Integration appears broken
- Security audit failures

**Prevention:**

**Option 1: Use Shared Drives (recommended for teams)**
```typescript
// Create file in Shared Drive (inherits permissions)
const file = await drive.files.create({
  requestBody: {
    name: 'document.pdf',
    parents: [sharedDriveId], // Files inherit Shared Drive permissions
  },
  media: {
    mimeType: 'application/pdf',
    body: fileStream,
  },
  supportsAllDrives: true, // Required for Shared Drives
})
```

**Option 2: Set explicit permissions for My Drive**
```typescript
// Create file
const file = await drive.files.create({
  requestBody: {
    name: 'document.pdf',
  },
  media: {
    mimeType: 'application/pdf',
    body: fileStream,
  },
})

// Grant permission to specific user
await drive.permissions.create({
  fileId: file.data.id!,
  requestBody: {
    type: 'user',
    role: 'writer', // or 'reader'
    emailAddress: clientEmail,
  },
  sendNotificationEmail: false, // Avoid spam
})
```

**Option 3: Domain-wide sharing (for organization)**
```typescript
// Share with entire domain
await drive.permissions.create({
  fileId: file.data.id!,
  requestBody: {
    type: 'domain',
    role: 'reader',
    domain: 'yourcompany.com',
  },
})
```

**Security checklist:**
- [ ] NEVER use `type: 'anyone'` for confidential data
- [ ] Default to most restrictive permissions
- [ ] Document permission strategy in ADR
- [ ] Test file access as different users
- [ ] Implement permission templates per file type

**Detection:**
- Users report "You need access" on shared links
- Files not visible in Drive UI for intended users
- Service account owns all files (wrong owner)
- Security scan finds publicly accessible files

**Phase:** Phase 2 (Implementation) - Design permission model upfront
**Severity:** HIGH - Broken UX or security vulnerability

---

### Pitfall 10: Mixing Test and Production Stripe Modes

**What goes wrong:** Using Stripe's test mode in production or live mode in development. Test charges appear successful but no real money moves. Production testing creates actual charges on your account. Database records inconsistent between environments.

**Why it happens:**
- Single `.env` file for all environments
- Not using environment-specific keys
- Forgetting to toggle mode in Stripe dashboard
- Testing production webhooks in development
- Copy-paste from staging to production

**Consequences:**
- Production shows fake test transactions
- Development creates real charges (costly mistakes)
- Webhook secrets mismatched (events fail)
- Database corruption with mixed test/live data
- Customer refunds for accidental charges

**Prevention:**

**Environment-specific configuration:**
```typescript
// lib/stripe.ts
const isProduction = process.env.NODE_ENV === 'production'

if (!isProduction && process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_')) {
  throw new Error(
    'DANGER: Live Stripe key detected in non-production environment!'
  )
}

if (isProduction && process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
  throw new Error(
    'ERROR: Test Stripe key in production environment!'
  )
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

// Log mode on startup
console.log(`Stripe mode: ${isProduction ? 'LIVE' : 'TEST'}`)
```

**Environment variable validation:**
```bash
# .env.local (development)
NODE_ENV=development
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...

# .env.production (production)
NODE_ENV=production
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_live_...
```

**Startup validation:**
```typescript
// app/layout.tsx or middleware
if (process.env.NODE_ENV === 'production') {
  const requiredEnvVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ]

  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar]
    if (!value) {
      throw new Error(`Missing required environment variable: ${envVar}`)
    }
    if (value.includes('test')) {
      throw new Error(`Production cannot use test value for: ${envVar}`)
    }
  }
}
```

**Detection:**
- Stripe dashboard shows test transactions in live mode
- Real charges in development environment
- Webhooks fail signature verification
- Database contains both test_ and live_ prefixed IDs
- Environment indicator in UI shows wrong mode

**Phase:** Phase 1 (Architecture) & Phase 5 (Deployment)
**Severity:** HIGH - Financial errors, data corruption

---

### Pitfall 11: Facebook Ads API Data Staleness (13-Month Limit)

**What goes wrong:** Requesting campaign metrics older than 13 months returns errors or empty datasets (effective January 2026). Historical reporting features break, year-over-year comparisons fail, and dashboards show incomplete data.

**Why it happens:**
- Facebook changed retention policy in January 2026
- No migration path for historical data
- Apps built before 2026 assumed unlimited retention
- Date range validation missing
- No fallback for old data requests

**Consequences:**
- Historical reports suddenly break in production
- Year-over-year analysis impossible
- Customer complaints about missing data
- Need to archive data before 13-month window
- Emergency data export required

**Prevention:**

**Proactive data archival:**
```typescript
// Cron job: Archive Facebook Ads data monthly
export async function archiveFacebookAdsData() {
  const thirteenMonthsAgo = new Date()
  thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13)

  // Fetch data approaching the 13-month limit
  const targetDate = new Date()
  targetDate.setMonth(targetDate.getMonth() - 12) // Archive at 12 months

  const campaigns = await fetchFacebookCampaigns({
    time_range: {
      since: targetDate.toISOString().split('T')[0],
      until: new Date().toISOString().split('T')[0]
    }
  })

  // Store in your database
  await db.archivedCampaignData.createMany({
    data: campaigns.map(campaign => ({
      campaignId: campaign.id,
      date: new Date(),
      metrics: campaign.insights,
      archived: true,
    }))
  })
}
```

**Date range validation:**
```typescript
function validateDateRange(startDate: Date, endDate: Date) {
  const thirteenMonthsAgo = new Date()
  thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13)

  if (startDate < thirteenMonthsAgo) {
    console.warn(
      `Requested date ${startDate.toISOString()} exceeds Facebook 13-month limit. ` +
      `Using archived data instead.`
    )
    return {
      useFacebookAPI: false,
      useArchivedData: true,
      adjustedStartDate: thirteenMonthsAgo
    }
  }

  return {
    useFacebookAPI: true,
    useArchivedData: false,
    adjustedStartDate: startDate
  }
}
```

**Hybrid approach (API + archived data):**
```typescript
async function getCampaignMetrics(startDate: Date, endDate: Date) {
  const validation = validateDateRange(startDate, endDate)

  if (validation.useArchivedData) {
    // Combine archived data + recent API data
    const archivedData = await db.archivedCampaignData.findMany({
      where: {
        date: {
          gte: startDate,
          lt: validation.adjustedStartDate
        }
      }
    })

    const recentData = await fetchFacebookCampaigns({
      time_range: {
        since: validation.adjustedStartDate.toISOString().split('T')[0],
        until: endDate.toISOString().split('T')[0]
      }
    })

    return [...archivedData, ...recentData]
  }

  // Within 13-month window, use API directly
  return fetchFacebookCampaigns({
    time_range: {
      since: startDate.toISOString().split('T')[0],
      until: endDate.toISOString().split('T')[0]
    }
  })
}
```

**Detection:**
- API returns errors for date ranges >13 months old
- Dashboard shows empty data for historical periods
- Error logs show "Invalid date range" from Facebook
- Reports missing data before [current date - 13 months]

**Phase:** Phase 2 (Implementation) - Build archival system from start
**Severity:** HIGH - Data loss, broken features

---

## Medium Severity Pitfalls

Mistakes that cause poor UX, technical debt, or operational issues.

### Pitfall 12: Not Implementing Stripe Webhook Retry Logic

**What goes wrong:** Your webhook endpoint has temporary issues (database timeout, deployment, rate limit) and returns 5xx error. Stripe retries for 3 days, flooding logs with retry attempts. If handler is not idempotent, retries cause duplicate processing when system recovers.

**Why it happens:**
- Webhook handlers have complex logic that can fail
- No separation of receipt acknowledgment vs processing
- Synchronous processing blocks response
- Database transactions timeout
- External API calls fail mid-processing

**Consequences:**
- Webhook marked "failed" in Stripe dashboard after 3 days
- Manual reconciliation required for failed events
- Duplicate processing when retries succeed
- Alert fatigue from retry errors
- Lost events if retries exhausted

**Prevention:**

**Pattern 1: Acknowledge immediately, process async**
```typescript
export async function POST(req: Request) {
  const body = await req.text()
  const sig = headers().get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Acknowledge receipt immediately
  console.log(`Webhook received: ${event.type}`)

  // Queue for background processing (don't await)
  queueWebhookProcessing(event).catch(err => {
    console.error('Failed to queue webhook:', err)
  })

  // Return 200 immediately so Stripe stops retrying
  return NextResponse.json({ received: true }, { status: 200 })
}

async function queueWebhookProcessing(event: Stripe.Event) {
  // Use background job queue (BullMQ, Inngest, etc)
  await jobQueue.add('process-stripe-webhook', {
    eventId: event.id,
    eventType: event.type,
    data: event.data
  })
}
```

**Pattern 2: Fast path with timeout fallback**
```typescript
export async function POST(req: Request) {
  // ... verify signature ...

  try {
    // Try to process quickly (5 second timeout)
    await Promise.race([
      processWebhookEvent(event),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000)
      )
    ])

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    if (error.message === 'Timeout') {
      // Queue for retry, but still return 200
      await queueWebhookProcessing(event)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Log error but return 200 to prevent retries
    console.error('Webhook processing error:', error)
    await logWebhookError(event.id, error)
    return NextResponse.json({ received: true }, { status: 200 })
  }
}
```

**Monitoring failed webhooks:**
```typescript
// Daily cron: Check for failed webhooks in Stripe
async function checkFailedWebhooks() {
  const events = await stripe.events.list({
    delivery_success: false,
    limit: 100
  })

  if (events.data.length > 0) {
    // Alert team
    await sendAlert({
      title: 'Stripe webhooks failing',
      count: events.data.length,
      eventTypes: events.data.map(e => e.type)
    })

    // Attempt manual processing
    for (const event of events.data) {
      await processWebhookEvent(event)
    }
  }
}
```

**Detection:**
- Stripe dashboard shows failed webhook deliveries
- Logs show repeated webhook attempts for same event
- Customer data out of sync with Stripe
- High volume of webhook errors in logs

**Phase:** Phase 2 (Implementation) & Phase 4 (Testing)
**Severity:** MEDIUM - Operational burden, manual reconciliation needed

---

### Pitfall 13: Email Template Variables Not Escaped

**What goes wrong:** User-generated content (client names, campaign names) inserted into email templates without HTML escaping. Special characters break formatting, or worse, enable XSS attacks if email client renders malicious HTML.

**Why it happens:**
- Using string concatenation instead of template engine
- Not escaping variables in HTML emails
- Trusting user input
- Copy-paste from marketing email templates (different security model)

**Consequences:**
- Broken email formatting for names with quotes/apostrophes
- Email appears corrupted to recipients
- Potential XSS in webmail clients
- Emails rejected by spam filters (malformed HTML)

**Prevention:**

**Use email template library with auto-escaping:**
```typescript
// Install: npm install @react-email/components
import {
  Html,
  Body,
  Container,
  Text,
  Link,
} from '@react-email/components'

export default function PaymentConfirmationEmail({
  clientName,
  amount,
  campaignName
}: {
  clientName: string
  amount: number
  campaignName: string
}) {
  return (
    <Html>
      <Body>
        <Container>
          {/* Automatically escaped by React */}
          <Text>Hi {clientName},</Text>
          <Text>
            Payment of ${amount} received for campaign: {campaignName}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
```

**If using plain HTML templates:**
```typescript
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, char => map[char])
}

// Usage
const emailHtml = `
  <html>
    <body>
      <h1>Hi ${escapeHtml(clientName)},</h1>
      <p>Campaign: ${escapeHtml(campaignName)}</p>
    </body>
  </html>
`
```

**Validation for email addresses:**
```typescript
function isValidEmail(email: string): boolean {
  // Use standard email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length < 255
}

// Before sending
if (!isValidEmail(recipient)) {
  throw new Error(`Invalid email address: ${recipient}`)
}
```

**Detection:**
- Emails show raw HTML tags in content
- Special characters appear as "&#039;" in plain text view
- Spam filter blocks emails with suspicious HTML
- Customers report broken email formatting

**Phase:** Phase 2 (Implementation)
**Severity:** MEDIUM - Poor UX, potential security issue

---

### Pitfall 14: Hard-Coded OAuth Redirect URLs

**What goes wrong:** OAuth callback URLs hard-coded to production domain (e.g., `https://app.baseaim.com/api/auth/callback/google`). Local development and staging environments fail authentication because Google/Facebook reject mismatched redirect URLs.

**Why it happens:**
- OAuth providers require pre-registered redirect URLs
- Developers forget to add localhost URLs
- Staging environment uses different domain
- Dynamic callback URL not supported by some providers

**Consequences:**
- Can't test OAuth flows locally
- Staging environment broken for integration testing
- Must use production for all OAuth testing (risky)
- Onboarding new developers blocked

**Prevention:**

**Register multiple redirect URLs with providers:**

**Google Cloud Console:**
```
Authorized redirect URIs:
- https://app.baseaim.com/api/auth/callback/google
- https://staging.baseaim.com/api/auth/callback/google
- http://localhost:3000/api/auth/callback/google
- http://localhost:3000/api/auth/callback/google
```

**Facebook App Settings:**
```
Valid OAuth Redirect URIs:
- https://app.baseaim.com/api/auth/callback/facebook
- https://staging.baseaim.com/api/auth/callback/facebook
- https://localhost:3000/api/auth/callback/facebook
```

**Environment-based configuration:**
```typescript
// lib/auth-config.ts
const getBaseUrl = () => {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  if (process.env.NODE_ENV === 'production') {
    return 'https://app.baseaim.com'
  }
  return 'http://localhost:3000'
}

export const authConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          redirect_uri: `${getBaseUrl()}/api/auth/callback/google`
        }
      }
    })
  ]
}
```

**Separate OAuth apps for environments:**
```bash
# .env.local (development)
GOOGLE_CLIENT_ID=xxx-dev.apps.googleusercontent.com
FACEBOOK_APP_ID=123456789_dev

# .env.production
GOOGLE_CLIENT_ID=xxx-prod.apps.googleusercontent.com
FACEBOOK_APP_ID=987654321_prod
```

**Detection:**
- OAuth callbacks fail with "redirect_uri_mismatch" error
- Local development shows "invalid redirect URI"
- Can only test OAuth in production
- Error: "The redirect URI provided does not match a registered redirect URI"

**Phase:** Phase 1 (Architecture) - Set up from the beginning
**Severity:** MEDIUM - Blocks local development, risky testing

---

### Pitfall 15: Missing Facebook Ads Rate Limit Monitoring

**What goes wrong:** Facebook enforces multiple rate limit types (per app, per user, per ad account). App unknowingly hits limits during normal operation. Rate limit errors (error code 17 or 32) appear sporadically, affecting random users. No visibility into quota consumption until complete failure.

**Why it happens:**
- Rate limit headers not monitored
- Complex quota system (app-level + user-level)
- Multiple ad accounts sharing quota
- No alerting on approaching limits
- Dev/test traffic counts against production quota

**Consequences:**
- Intermittent failures for users
- Can't diagnose root cause (looks like random API errors)
- Campaign metrics stop updating during peak hours
- Customer complaints about "broken" integration
- No warning before hitting limits

**Prevention:**

**Monitor rate limit headers:**
```typescript
async function fetchFacebookAds(accessToken: string, accountId: string) {
  const response = await fetch(
    `https://graph.facebook.com/v19.0/act_${accountId}/insights`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  )

  // Facebook rate limit headers
  const usageHeader = response.headers.get('x-business-use-case-usage')
  const appUsageHeader = response.headers.get('x-app-usage')

  if (usageHeader) {
    const usage = JSON.parse(usageHeader)
    /*
    Example response:
    {
      "account_id": {
        "call_count": 50,
        "total_cputime": 25,
        "total_time": 30,
        "type": "ads_management",
        "estimated_time_to_regain_access": 0
      }
    }
    */

    // Alert if approaching limit (>80%)
    const callCount = Object.values(usage)[0]?.call_count
    if (callCount > 80) {
      console.warn(`Facebook API usage at ${callCount}%`)
      await sendAlert({
        type: 'rate_limit_warning',
        usage: callCount,
        accountId
      })
    }
  }

  return response.json()
}
```

**Implement circuit breaker:**
```typescript
class FacebookAPIClient {
  private failureCount = 0
  private circuitOpen = false
  private resetTime: Date | null = null

  async callAPI(endpoint: string) {
    if (this.circuitOpen) {
      if (this.resetTime && new Date() > this.resetTime) {
        this.circuitOpen = false
        this.failureCount = 0
      } else {
        throw new Error('Circuit breaker open - Facebook API rate limited')
      }
    }

    try {
      const response = await fetch(endpoint)

      if (response.status === 429 || response.status === 17) {
        this.handleRateLimit(response)
      }

      this.failureCount = 0
      return response.json()
    } catch (error) {
      this.failureCount++
      if (this.failureCount >= 3) {
        this.openCircuit()
      }
      throw error
    }
  }

  private handleRateLimit(response: Response) {
    const retryAfter = response.headers.get('retry-after')
    const estimatedTime = this.parseEstimatedTimeToRegainAccess(response)

    const waitTime = retryAfter
      ? parseInt(retryAfter) * 1000
      : estimatedTime || 3600000 // Default 1 hour

    this.openCircuit(waitTime)
  }

  private openCircuit(durationMs = 3600000) {
    this.circuitOpen = true
    this.resetTime = new Date(Date.now() + durationMs)
    console.error(`Circuit breaker opened until ${this.resetTime}`)
  }
}
```

**Stagger requests across time:**
```typescript
// Instead of fetching all accounts at once
async function updateAllAccountMetrics(accountIds: string[]) {
  // Stagger requests by 2 seconds each
  for (const accountId of accountIds) {
    await updateAccountMetrics(accountId)
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
}
```

**Detection:**
- API returns error code 17 or 32 ("rate limit exceeded")
- Response headers show `estimated_time_to_regain_access > 0`
- Errors occur during specific time windows (hourly quota)
- Multiple accounts affected simultaneously

**Phase:** Phase 2 (Implementation) & Phase 4 (Testing)
**Severity:** MEDIUM - Intermittent failures, poor reliability

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Architecture & API Design | Exposing secrets in client-side code | Use Server Components/API routes for all external integrations; never prefix secrets with `NEXT_PUBLIC_` |
| Implementation | Missing idempotency in webhook handlers | Implement event ID tracking in database with unique constraints from day one |
| Implementation | OAuth token refresh race conditions | Use database-level locking (SELECT FOR UPDATE) or Redis distributed locks |
| Testing | Using test API keys in production | Add startup validation to reject test keys in production; environment-specific configs |
| Deployment | Stripe webhook secret mismatch | Separate secrets for test/live mode; verify in staging before production deploy |
| Deployment | Missing DNS records for email auth | Configure SPF/DKIM/DMARC before sending first production email |
| Pre-Launch | Facebook Advanced Access not approved | Apply for Advanced Access in Phase 1, not at launch time (2-6 week approval) |
| Monitoring | No visibility into rate limit consumption | Implement header monitoring and circuit breakers before high-volume usage |

---

## Low Priority Pitfalls

### Pitfall 16: External Chat Integration Account Mapping

**What goes wrong:** Linking chat accounts (e.g., Intercom, Drift) to client records without proper validation. Typos in email addresses or multiple accounts with same email create incorrect mappings. Customer messages routed to wrong client dashboard.

**Prevention:**
- Implement fuzzy matching with confirmation step
- Show preview of linked records before finalizing
- Allow manual override with audit log
- Validate email format and existence

**Phase:** Implementation (Phase 2)
**Severity:** LOW - Fixable with manual intervention

---

### Pitfall 17: Not Handling Google Drive Quota (750GB/day)

**What goes wrong:** Large file uploads or bulk imports hit Google Drive's 750GB daily transfer limit. Operations fail mid-process with quota errors.

**Prevention:**
- Track daily upload volume
- Implement queue with daily budget
- Warn users before large operations
- Spread large migrations across multiple days

**Phase:** Implementation (Phase 2)
**Severity:** LOW - Rare for 1-5 clients, but plan for growth

---

## Research Confidence Assessment

| Area | Confidence | Source Quality |
|------|------------|----------------|
| Stripe Webhooks | HIGH | Official Stripe docs + Next.js docs + multiple verified sources |
| Facebook Ads API | HIGH | Official Meta docs + recent 2026 policy changes + developer community |
| Google Drive API | HIGH | Official Google docs + quota documentation |
| Email Authentication | HIGH | Multiple authoritative sources + 2026 enforcement documentation |
| Next.js Security | HIGH | Official Next.js 16.1.6 documentation (Feb 2026) |
| OAuth Patterns | MEDIUM | Community best practices + vendor docs |
| Chat Integration | LOW | Generic patterns, not platform-specific |

---

## Sources

### Official Documentation (HIGH confidence)
- [Stripe Webhooks Documentation](https://docs.stripe.com/webhooks)
- [Google Drive API Usage Limits](https://developers.google.com/workspace/drive/api/guides/limits)
- [Next.js Data Security Guide](https://nextjs.org/docs/app/guides/data-security) (v16.1.6, 2026-02-11)
- [Next.js Environment Variables](https://nextjs.org/docs/pages/guides/environment-variables)

### Security & Best Practices (HIGH-MEDIUM confidence)
- [Next.js Security Hardening: Five Steps to Bulletproof Your App in 2026](https://medium.com/@widyanandaadi22/next-js-security-hardening-five-steps-to-bulletproof-your-app-in-2026-61e00d4c006e)
- [Stripe Webhook Security Mistakes (Next.js)](https://www.codedaily.io/tutorials/Stripe-Webhook-Verification-with-NextJS)
- [How to Resolve Stripe Webhook Signature Verification Failures](https://killbait.com/en/how-to-resolve-stripe-webhook-signature-verification-failures-in-node-js-deployments/)
- [Handling Payment Webhooks Reliably (Idempotency, Retries, Validation)](https://medium.com/@sohail_saifii/handling-payment-webhooks-reliably-idempotency-retries-validation-69b762720bf5)

### Authentication & Email (HIGH confidence)
- [Transactional Email Best Practices: A Practical Guide for 2026](https://moosend.com/blog/transactional-email-best-practices/)
- [Email Authentication Crisis 2026: Why Emails Fail & Fixes](https://www.getmailbird.com/email-authentication-crisis-fix-spam-deliverability/)
- [SPF DKIM DMARC Common Setup Mistakes](https://www.infraforge.ai/blog/spf-dkim-dmarc-common-setup-mistakes)
- [Email Deliverability in 2026: SPF, DKIM, DMARC Checklist](https://www.egenconsulting.com/blog/email-deliverability-2026.html)

### Facebook/Meta Ads API (HIGH confidence)
- [Facebook Marketing API: The Advanced Access Trap That Nearly Killed My Project](https://medium.com/@bilal.105.ahmed/facebook-marketing-api-the-advanced-access-trap-that-nearly-killed-my-project-7227ea2ee2c2)
- [Meta Ads API Integration Guide: Complete Setup 2026](https://www.adstellar.ai/blog/meta-ads-api-integration-guide)
- [Facebook Ads: Historical limitations - January 12, 2026](https://docs.supermetrics.com/docs/facebook-ads-new-historical-limitations-attribution-window-and-metric-removals-january-12-2026)
- [How Can I Reduce Facebook API Rate Limit Errors?](https://fivetran.com/docs/connectors/applications/facebook-ads/troubleshooting/rate-limit)

### OAuth & Token Management (MEDIUM confidence)
- [How to handle concurrency with OAuth token refreshes](https://nango.dev/blog/concurrency-with-oauth-token-refreshes)
- [Google OAuth invalid grant: Token has been expired or revoked](https://nango.dev/blog/google-oauth-invalid-grant-token-has-been-expired-or-revoked)
- [Salesforce OAuth refresh token invalid_grant](https://nango.dev/blog/salesforce-oauth-refresh-token-invalid-grant)

### Google Drive Integration (HIGH confidence)
- [Accessing Google Drive from Next.js](https://www.learncloudnative.com/blog/2024-09-23-gdrive-from-nextjs)
- [How to Handle Google Drive API Rate Limits](https://folderpal.io/articles/how-to-handle-google-drive-api-rate-limits-for-bulk-folder-copying-and-automation)
- [Google Drive Large Migration Best Practices](https://support.google.com/a/answer/10445916?hl=en)

### Next.js Vulnerabilities (HIGH confidence)
- [Critical Security Alert: Unauthenticated RCE in React & Next.js](https://www.upwind.io/feed/critical-security-alert-unauthenticated-rce-in-react-next-js-cve-2025-55182-cve-2025-66478)
- [Next.js Security Update: December 11, 2025](https://nextjs.org/blog/security-update-2025-12-11)
- [Understanding CVE-2025-29927: Next.js Middleware Authorization Bypass](https://securitylabs.datadoghq.com/articles/nextjs-middleware-auth-bypass/)
