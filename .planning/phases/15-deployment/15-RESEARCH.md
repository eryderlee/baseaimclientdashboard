# Phase 15: Deployment - Research

**Researched:** 2026-03-13
**Domain:** Vercel deployment, PostgreSQL provisioning, external service configuration
**Confidence:** HIGH (all critical claims verified via official docs)

---

## Summary

Phase 15 takes a fully-built Next.js 16 app (using App Router, Prisma, NextAuth v5, Stripe, Resend, Google Drive, Upstash Redis, Sentry) from local development to a live production URL. The codebase already has Sentry instrumentation files, security headers, and rate limiting implemented — this phase is purely infrastructure setup and verification.

The standard approach is: (1) provision a Neon PostgreSQL database, (2) create a Vercel project linked to the GitHub repo, (3) configure all environment variables in the Vercel dashboard, (4) run `prisma db push` once against the production database, (5) register the Stripe production webhook endpoint, (6) verify all integrations fire correctly in production.

Key finding: this project uses `prisma db push` (not `prisma migrate deploy`) because it has no migrations folder — this is intentional. The `postinstall: "prisma generate"` script must be added to `package.json` before deploying to prevent Vercel's dependency cache from serving a stale Prisma Client binary.

**Primary recommendation:** Add `"postinstall": "prisma generate"` to package.json, deploy to Vercel with Neon as the database provider, then configure all env vars and run `prisma db push` against the production DATABASE_URL from local machine.

---

## Standard Stack

### Core (already installed in project)

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Vercel | — (platform) | Hosting | Zero-config Next.js deployment; Vercel owns Next.js |
| Neon | — (SaaS) | PostgreSQL database | Official Vercel Marketplace integration; replaced Vercel Postgres Q4 2024 |
| @sentry/nextjs | ^10.39.0 | Error monitoring | Already installed; `instrumentation.ts` already configured |
| @upstash/ratelimit | ^2.0.8 | Rate limiting | Already installed; middleware.ts already configured |
| @upstash/redis | ^1.36.2 | Redis HTTP client | Already installed |

### Services Required (external accounts)

| Service | Account URL | What You Get |
|---------|------------|--------------|
| Vercel | vercel.com | Hosting, env vars, domain |
| Neon | neon.com | Managed PostgreSQL, connection pooling, free tier |
| Upstash | console.upstash.com | Managed Redis, REST credentials |
| Sentry | sentry.io | DSN, auth token for source maps |
| Stripe | dashboard.stripe.com | Live keys, webhook endpoint |
| Resend | resend.com | API key (likely already exists from dev) |
| Google Cloud Console | console.cloud.google.com | OAuth credentials + production consent screen |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Neon | Supabase | Supabase = full platform (auth, storage, realtime); overkill here. Neon = pure Postgres, simpler |
| Neon | Railway | Railway requires more manual config; no Vercel Marketplace integration |

---

## Architecture Patterns

### Vercel Deployment Flow

```
GitHub repo (main branch)
    ↓ (push triggers)
Vercel build
    ↓ (postinstall: prisma generate)
    ↓ (next build)
Vercel Functions (serverless)
    ↓ (connects to)
Neon PostgreSQL (production database)
```

### Environment Variable Scoping on Vercel

Vercel has three built-in environments:

| Environment | When Active | Notes |
|------------|-------------|-------|
| Production | Pushes to `main` branch | Use live Stripe, live Sentry, live Redis |
| Preview | Pushes to other branches | Can use test Stripe, separate Neon branch |
| Development | `vercel dev` locally | Downloads to `.env` via `vercel env pull` |

**Rule:** Set all vars for **Production** scope only (not Preview/Development) unless you intentionally want them in preview deployments.

### Prisma on Vercel

The project uses `prisma db push` (no migrations folder). This is intentional and must stay that way. The critical requirement is:

1. Add `"postinstall": "prisma generate"` to `package.json` scripts
2. Run `prisma db push --accept-data-loss` from local machine pointing at the production `DATABASE_URL` before first deployment (or after any schema change)
3. For Neon with PgBouncer pooling: use the **pooled** connection string for `DATABASE_URL` in Vercel (with `-pooler` in hostname), optionally use the **direct** URL if any tool requires it

**Note:** The current `prisma/schema.prisma` datasource only has `url = env("DATABASE_URL")` — no `directUrl`. With `db push` (not `migrate`), a single URL works fine. DIRECT_URL is only required when using Prisma Accelerate or when running migrations through a PgBouncer-pooled connection.

### Neon Connection String Pattern

```
# Pooled (use for DATABASE_URL in Vercel — for app queries)
postgresql://user:pass@ep-cool-rain-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
#                                          ^^^^^^^^ -pooler suffix enables PgBouncer

# Direct (for running prisma db push locally)
postgresql://user:pass@ep-cool-rain-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
#                                          (no -pooler suffix)
```

**Practical pattern:**
- `DATABASE_URL` in Vercel = pooled connection string (runtime queries)
- `DATABASE_URL` in local `.env` for running `prisma db push` = direct connection string

### Anti-Patterns to Avoid

- **Setting env vars in `.env` file and expecting Vercel to use them:** Vercel ignores `.env` files. All vars must be set in the Vercel dashboard (Project Settings → Environment Variables).
- **Using `prisma migrate deploy` when no migrations folder exists:** This project uses `db push`. Don't switch to migrate.
- **Using direct (non-pooled) DATABASE_URL on Vercel:** Every serverless function invocation creates a new DB connection. Without PgBouncer pooling you'll exhaust connection limits.
- **Keeping Google OAuth consent screen in "Testing" mode:** Refresh tokens issued in Testing mode expire after **7 days**. The consent screen must be published to "In production" for the refresh token to remain valid indefinitely.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Connection pooling | Custom pg pool logic | Neon's `-pooler` URL (PgBouncer) | Serverless functions have no persistent state; PgBouncer handles it |
| Source map upload | Manual upload script | Sentry's `withSentryConfig` in next.config.ts (already configured) | Already done; just needs SENTRY_AUTH_TOKEN env var |
| Webhook signature verification | Custom HMAC | `stripe.webhooks.constructEvent()` | Stripe's SDK handles this; it's already in the codebase |
| Auth secret generation | UUID or random string | `openssl rand -base64 32` or `npx auth secret` | Cryptographically secure 32+ char string required |

**Key insight:** The hard work is already done in the codebase. Phase 15 is service provisioning and environment variable configuration, not coding.

---

## Common Pitfalls

### Pitfall 1: Outdated Prisma Client on Vercel

**What goes wrong:** Build succeeds but app throws Prisma errors at runtime; Prisma Client binary mismatch with Node.js version.
**Why it happens:** Vercel caches `node_modules`. Without `postinstall: "prisma generate"`, the Prisma Client generated locally doesn't match Vercel's Node.js runtime.
**How to avoid:** Add `"postinstall": "prisma generate"` to `package.json` scripts BEFORE first deploy.
**Warning signs:** Error messages like "PrismaClientInitializationError" or "binary not found" in Vercel function logs.

### Pitfall 2: Stripe webhook uses test secret in production

**What goes wrong:** Webhook events fail signature verification with HTTP 400 errors.
**Why it happens:** `STRIPE_WEBHOOK_SECRET` from test mode (`whsec_test_...`) doesn't match the live mode endpoint secret.
**How to avoid:** Register a separate webhook endpoint in Stripe's **live mode** dashboard (not test mode). Copy that endpoint's signing secret as `STRIPE_WEBHOOK_SECRET` in Vercel.
**Warning signs:** Stripe dashboard shows webhook delivery failures; app logs show "No signatures found matching the expected signature".

### Pitfall 3: Google OAuth refresh token expires after 7 days

**What goes wrong:** Google Drive integration stops working 7 days after setup.
**Why it happens:** OAuth consent screen was left in "Testing" publishing status when the refresh token was generated.
**How to avoid:** Before generating the production refresh token, publish the consent screen to "In production" in Google Cloud Console → APIs & Services → OAuth consent screen → Publishing status → Publish App.
**Warning signs:** Google Drive API calls start returning 401 errors with "Token has been expired or revoked".

### Pitfall 4: NEXT_PUBLIC_APP_URL not set

**What goes wrong:** Authentication callbacks fail; OAuth redirects go to wrong URL; emails contain wrong links.
**Why it happens:** `NEXT_PUBLIC_APP_URL` must be the full production URL (e.g., `https://yourdomain.com`).
**How to avoid:** Set `NEXT_PUBLIC_APP_URL` to the exact production URL before first deploy.
**Warning signs:** NextAuth callbacks return 404; Stripe webhook URL in email confirmation is wrong.

### Pitfall 5: STRIPE_SECRET_KEY validation fails in production

**What goes wrong:** App crashes at startup with `@t3-oss/env-nextjs` validation error.
**Why it happens:** `lib/env.ts` has a `.refine()` that rejects `sk_test_` keys when `NODE_ENV=production`. Vercel sets `NODE_ENV=production` automatically.
**How to avoid:** Use `sk_live_...` key in the production `STRIPE_SECRET_KEY` env var. Do not use test keys.
**Warning signs:** Deployment succeeds but first request returns a 500 error; Vercel function logs show env validation error.

### Pitfall 6: Middleware rate limiting crashes if Redis not configured

**What goes wrong:** All auth routes return 500 if `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are missing.
**Why it happens:** `middleware.ts` creates a Redis client at module initialization using `process.env.UPSTASH_REDIS_REST_URL!` (non-null assertion). Missing env var = empty string passed to Redis constructor = runtime error.
**How to avoid:** Set both Upstash env vars in Vercel before deploying. The `try/catch` in middleware will swallow errors and fall through, but the Redis constructor itself may throw.
**Warning signs:** `/login` returns 500 immediately; Vercel logs show Redis connection errors.

### Pitfall 7: Sentry source maps require SENTRY_AUTH_TOKEN at build time

**What goes wrong:** Production stack traces show minified code, not source code.
**Why it happens:** `withSentryConfig` in `next.config.ts` uploads source maps during `next build`. This requires `SENTRY_AUTH_TOKEN` to be set as a **build-time** environment variable in Vercel (not just runtime).
**How to avoid:** Set `SENTRY_AUTH_TOKEN` in Vercel environment variables with "Production" scope checked. The auth token is only needed for the build step; it does not need to be a runtime variable.
**Warning signs:** Sentry shows errors with `[minified]` filenames; source context shows compiled JavaScript.

### Pitfall 8: Vercel env vars don't take effect without redeployment

**What goes wrong:** Env vars set in dashboard don't affect existing deployments.
**Why it happens:** Vercel bakes env vars into each deployment at build time.
**How to avoid:** After updating any env var, trigger a redeploy (Vercel dashboard → Deployments → Redeploy, or push a new commit).
**Warning signs:** Updated env var appears correct in dashboard but app still uses old value.

---

## Code Examples

### package.json postinstall (REQUIRED before deploy)

```json
// Source: https://www.prisma.io/docs/orm/prisma-client/deployment/serverless/deploy-to-vercel
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "postinstall": "prisma generate"
  }
}
```

### Running prisma db push against production

```bash
# From local machine, using the DIRECT (non-pooled) Neon connection string
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require" \
  npx prisma db push
```

Or set it in `.env` temporarily, run `npx prisma db push`, then restore `.env`.

### Generating AUTH_SECRET

```bash
# Source: https://authjs.dev/getting-started/deployment
openssl rand -base64 32
# OR
npx auth secret
```

### Verifying security headers via curl

```bash
# Source: Phase 15 success criterion DEPLOY-05
curl -I https://yourdomain.com
# Look for: X-Frame-Options, X-Content-Type-Options, Content-Security-Policy,
#            Strict-Transport-Security, Referrer-Policy, Permissions-Policy
```

### Verifying rate limiting fires at 11th request

```bash
# Source: Phase 15 success criterion DEPLOY-04
for i in $(seq 1 11); do
  curl -s -o /dev/null -w "%{http_code}\n" https://yourdomain.com/login
done
# 11th request should return 429
```

### Triggering Sentry test error (browser console)

```javascript
// Navigate to any page in production, open browser console
// Source: Sentry docs - verifying production setup
throw new Error("Sentry test error from production");
// Then check Sentry dashboard → Issues for new event
```

---

## Deployment Sequence (Ordered Steps)

This is the correct order to avoid dependency issues:

### Step 1: Prepare codebase

Add `"postinstall": "prisma generate"` to `package.json` scripts. Commit and push to main.

### Step 2: Create Neon database

1. Go to console.neon.tech → Create project
2. Select region closest to users
3. Copy two connection strings from the dashboard:
   - **Pooled** (for Vercel runtime): hostname contains `-pooler`
   - **Direct** (for `db push`): hostname without `-pooler`

### Step 3: Run prisma db push

From local machine with the direct Neon connection string:

```bash
DATABASE_URL="<direct-neon-url>" npx prisma db push
```

### Step 4: Create Vercel project

1. Go to vercel.com → New Project → Import Git Repository
2. Select your GitHub repo
3. Framework: Next.js (auto-detected)
4. Do NOT deploy yet — add env vars first

### Step 5: Configure all environment variables in Vercel

Set the following in Vercel Project Settings → Environment Variables → Production scope:

| Variable | Value Source |
|----------|-------------|
| `DATABASE_URL` | Neon pooled connection string |
| `AUTH_SECRET` | Generated with `openssl rand -base64 32` |
| `STRIPE_SECRET_KEY` | Stripe live mode → Developers → API keys → `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | After step 6 (placeholder for now: use test value, update after) |
| `RESEND_API_KEY` | Resend dashboard → API Keys |
| `RESEND_FROM_EMAIL` | Your verified sender domain email (optional) |
| `GOOGLE_OAUTH_CLIENT_ID` | Google Cloud Console → Credentials |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google Cloud Console → Credentials |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | Generated via OAuth flow (see Step 7) |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | Google Drive folder ID from URL |
| `UPSTASH_REDIS_REST_URL` | Upstash Console → Database → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Console → Database → REST API |
| `SENTRY_DSN` | Sentry → Project → Settings → Client Keys |
| `NEXT_PUBLIC_SENTRY_DSN` | Same value as SENTRY_DSN |
| `SENTRY_ORG` | Sentry org slug (from URL: sentry.io/organizations/YOUR-ORG/) |
| `SENTRY_PROJECT` | Sentry project slug |
| `SENTRY_AUTH_TOKEN` | Sentry → Settings → Auth Tokens → Create |
| `NEXT_PUBLIC_APP_URL` | `https://yourdomain.com` (or Vercel URL before custom domain) |

### Step 6: Register Stripe production webhook

1. Stripe Dashboard (live mode) → Developers → Webhooks → Add endpoint
2. Endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
3. Events: "Receive all events" or select: `payment_intent.*`, `customer.*`, `invoice.*`, `checkout.session.*`
4. Copy signing secret → update `STRIPE_WEBHOOK_SECRET` in Vercel
5. Redeploy after updating the env var

### Step 7: Get Google Drive refresh token for production

**CRITICAL: Do this before generating the token:**
1. Google Cloud Console → APIs & Services → OAuth consent screen
2. Verify "Publishing status" is **"In production"** (not "Testing")
3. If still in Testing, click "Publish App" → confirm

**Generate the refresh token:**
1. Use the Google OAuth 2.0 Playground (https://developers.google.com/oauthplayground/)
2. Click gear icon → check "Use your own OAuth credentials"
3. Enter your Client ID and Client Secret
4. Step 1: Select scope `https://www.googleapis.com/auth/drive`
5. Authorize and exchange for tokens
6. Copy the **refresh_token** value → set as `GOOGLE_OAUTH_REFRESH_TOKEN` in Vercel

### Step 8: Deploy

Push to main (or click Deploy in Vercel dashboard). Monitor build logs for errors.

### Step 9: Verify all integrations

See verification steps in Code Examples section.

---

## Sentry Configuration Details

The codebase already has Sentry fully configured:

| File | Purpose |
|------|---------|
| `instrumentation.ts` | Registers server + edge Sentry on Node.js/edge runtimes |
| `instrumentation-client.ts` | Client-side Sentry init (reads `NEXT_PUBLIC_SENTRY_DSN`) |
| `sentry.server.config.ts` | Server-side init (reads `SENTRY_DSN`) |
| `sentry.edge.config.ts` | Edge runtime init (reads `SENTRY_DSN`) |
| `next.config.ts` | `withSentryConfig` wraps config for source map upload |

The `next.config.ts` reads `SENTRY_ORG` and `SENTRY_PROJECT` at build time. `SENTRY_AUTH_TOKEN` must be set as a **build-time** env var (not just runtime) for source map uploads to work.

**Verification:** After deploying, trigger a test error from the browser and check the Sentry Issues tab. Error should appear with readable stack trace (not minified) if source maps uploaded correctly.

---

## Upstash Redis Details

The `middleware.ts` rate limiter runs on every request to `/login`, `/reset-password`, `/api/auth`. It uses:
- `slidingWindow(10, '60 s')` — 10 requests per 60 seconds per IP
- Falls through on Redis errors (doesn't block on infrastructure failures)

**Upstash setup:**
1. console.upstash.com → Create Database → Select region
2. Database page → "REST API" section → copy `.env` values
3. Variables needed: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

**Note:** The free tier of Upstash is sufficient for rate limiting in production.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vercel Postgres | Neon (via Vercel Marketplace) | Q4 2024 - Q1 2025 | Existing Vercel Postgres stores migrated to Neon; new projects use Neon directly |
| `NEXTAUTH_URL` required on Vercel | Not needed for NextAuth v5 | v5 beta | Host is inferred from request headers; saves one env var |
| `@sentry/nextjs` wizard creates `sentry.client.config.ts` | Now `instrumentation-client.ts` | ~v8+ | The codebase already uses the new filename convention |
| `prisma migrate deploy` recommended | `prisma db push` for schema-push projects | — | This project has no migrations folder; `db push` is correct and intentional |

---

## Open Questions

1. **Stripe webhook events to subscribe**
   - What we know: App has a Stripe webhook handler at `/api/webhooks/stripe`
   - What's unclear: Which specific events are handled (not researched)
   - Recommendation: Check `app/api/webhooks/stripe/route.ts` before registering webhook; subscribe only to handled events

2. **Custom domain availability**
   - What we know: Vercel auto-assigns a `.vercel.app` URL; custom domains need DNS configuration
   - What's unclear: Whether user has a domain ready
   - Recommendation: App works on `.vercel.app` URL for initial verification; custom domain can be added later. `NEXT_PUBLIC_APP_URL` can be updated and redeployed.

3. **Google Drive root folder ID**
   - What we know: `GOOGLE_DRIVE_ROOT_FOLDER_ID` must be set; it's the ID from the Drive folder URL
   - What's unclear: Whether a production Drive folder already exists or needs to be created
   - Recommendation: Create a dedicated production Google Drive folder; share it with the OAuth app's Google account; use the folder ID from the URL

---

## Sources

### Primary (HIGH confidence)

- Vercel official docs: https://vercel.com/docs/frameworks/full-stack/nextjs — Next.js on Vercel overview
- Vercel official docs: https://vercel.com/docs/environment-variables — Environment variable scoping
- Vercel official docs: https://vercel.com/docs/getting-started-with-vercel/import — Import project steps
- Prisma official docs: https://www.prisma.io/docs/orm/prisma-client/deployment/serverless/deploy-to-vercel — Prisma + Vercel deployment
- Auth.js official docs: https://authjs.dev/getting-started/deployment — NextAuth v5 Vercel deployment
- Neon official docs: https://neon.com/docs/connect/connection-pooling — PgBouncer pooling, `-pooler` URL format
- Sentry official docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/ — Sentry config files
- Google OAuth docs: https://developers.google.com/identity/protocols/oauth2/web-server — Refresh token acquisition
- Upstash official docs: https://upstash.com/docs/redis/features/restapi — REST URL and token

### Secondary (MEDIUM confidence)

- WebSearch verified: Google OAuth consent screen "Testing" vs "In production" — refresh token 7-day expiry is a well-documented behavior confirmed by multiple sources including Google's support forums
- WebSearch verified: Prisma `postinstall: "prisma generate"` requirement — confirmed by Prisma official docs

### Tertiary (LOW confidence)

- None — all critical claims have official source verification

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all services are official, documented, and in the existing codebase
- Architecture: HIGH — Vercel, Neon, Prisma deployment patterns verified via official docs
- Pitfalls: HIGH — most pitfalls are documented in official sources; Google refresh token expiry confirmed by Google's own support forums
- Sentry config: HIGH — existing instrumentation files verified by reading the codebase directly
- Rate limiting: HIGH — middleware.ts read directly; Upstash setup verified via official docs

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (30 days — these are stable, established platforms)
