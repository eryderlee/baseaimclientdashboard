---
phase: 12-production-hardening
plan: 03
subsystem: auth
tags: [upstash, ratelimit, redis, zod, csrf, middleware, security]

# Dependency graph
requires:
  - phase: 12-01
    provides: lib/env.ts validated env vars, instrumentation, CSP headers
provides:
  - Rate limiting on /login, /reset-password, /api/auth (10 req/60s per IP, slidingWindow)
  - Graceful degradation: try/catch wrapping ratelimit.limit() so Upstash outages don't block users
  - CSRF audit comment documenting all route handler mutation auth status
  - Zod validation on resetClientPassword (cuid + min(8)) and toggleClientStatus (cuid)
  - Zod validation on updateNote, deleteClient, deleteNote in client detail actions
affects:
  - phase 12-04 (overall verification pass - rate limiting and Zod coverage confirmed)
  - future plans adding new server actions (pattern: Zod schema before auth check)

# Tech tracking
tech-stack:
  added:
    - "@upstash/ratelimit ^2.x — sliding window rate limiting for serverless"
    - "@upstash/redis ^1.x — Upstash HTTP Redis client (edge-compatible)"
  patterns:
    - "Rate limit before auth logic in middleware: check IP-keyed bucket, return 429 with Retry-After header"
    - "Graceful rate limiter degradation: try/catch wraps ratelimit.limit(), fall through on infrastructure failure"
    - "Zod parse + try/catch at top of server actions: parse validated vars, use validated vars in all DB calls"
    - "IP extraction from x-forwarded-for header: split(',')[0].trim() with '127.0.0.1' fallback"

key-files:
  created: []
  modified:
    - middleware.ts
    - app/admin/actions.ts
    - app/admin/clients/[clientId]/actions.ts
    - package.json

key-decisions:
  - "Upstash Redis for rate limiting: serverless HTTP client, no TCP connection pooling issues in Next.js middleware"
  - "slidingWindow(10, '60 s'): 10 requests per 60 seconds per IP on auth endpoints"
  - "try/catch wraps ratelimit.limit(): Upstash downtime must not block legitimate logins"
  - "x-forwarded-for header for IP: req.ip unreliable in middleware edge runtime; Vercel always sets x-forwarded-for"
  - "Matcher updated: removed api/* from negative lookahead, added explicit /api/auth/:path* entry"
  - "CSRF protection via Server Actions: Next.js Server Actions include built-in Origin/Host verification; no custom CSRF tokens needed"
  - "All mutation route handlers verified authenticated: upload routes use auth(), notifications use auth(), stripe webhook uses signature verification"
  - "/api/auth/register intentionally public: account creation endpoint"
  - "Zod parse returns validated copy of values: all downstream DB calls use validId/validClientId/validPassword variables"

patterns-established:
  - "Rate limiter pattern: const { success } = await ratelimit.limit(key) inside try/catch"
  - "Server action Zod pattern: module-level schema const → parse inside try/catch → use parsed vars"

# Metrics
duration: 6min
completed: 2026-02-22
---

# Phase 12 Plan 03: Rate Limiting, CSRF Audit, and Zod Validation Summary

**Upstash Redis sliding-window rate limiting on auth routes, CSRF audit confirming all mutations go through authenticated Server Actions or signed webhooks, and Zod schema validation added to all remaining unvalidated server action functions.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-02-22T09:24:37Z
- **Completed:** 2026-02-22T09:30:02Z
- **Tasks:** 2
- **Files modified:** 4 (middleware.ts, app/admin/actions.ts, app/admin/clients/[clientId]/actions.ts, package.json)

## Accomplishments

- Auth endpoints (/login, /reset-password, /api/auth/*) now rate limited to 10 req/60s per IP using Upstash slidingWindow; returns 429 + Retry-After: 60 on breach
- Rate limiter failure (Upstash down) degrades gracefully: try/catch falls through so legitimate users are never blocked by infrastructure issues
- CSRF audit complete: all 9 mutation route handlers verified authenticated (auth() session check or Stripe signature); /api/auth/register intentionally public for account creation
- resetClientPassword now validates clientId as CUID and newPassword as min(8) via Zod (replaces manual length check)
- toggleClientStatus validates clientId as CUID via Zod, uses validId in all DB calls
- updateNote, deleteClient, deleteNote all validated with Zod schemas using CUID checks on all ID parameters

## Task Commits

Each task was committed atomically:

1. **Task 1: Add rate limiting to auth endpoints and CSRF audit** - `8c28425` (feat)
2. **Task 2: Complete Zod validation on all server actions** - `35c4987` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `middleware.ts` - Added Upstash Redis + Ratelimit imports, rate limit check before auth routing logic, CSRF audit comment, updated matcher to include /api/auth/:path*
- `app/admin/actions.ts` - Added import z from zod, resetPasswordSchema (cuid + min(8)), toggleClientStatusSchema (cuid); both functions now parse+catch before DB calls
- `app/admin/clients/[clientId]/actions.ts` - Added updateNoteSchema, deleteClientSchema, deleteNoteSchema; updateNote, deleteClient, deleteNote all use validated variables in DB calls
- `package.json` / `package-lock.json` - Added @upstash/ratelimit and @upstash/redis

## Decisions Made

- **Upstash Redis selected**: Serverless HTTP client, no persistent TCP connections, edge runtime compatible, free tier sufficient for dashboard use
- **slidingWindow(10, '60 s')**: 10 requests per 60 seconds per IP - permissive enough for normal use, restrictive enough to prevent brute force
- **try/catch for graceful degradation**: Upstash downtime must not lock out legitimate users from the dashboard
- **x-forwarded-for for IP extraction**: `req.ip` is not reliably available in all middleware runtimes; Vercel always sets x-forwarded-for
- **Matcher updated to include /api/auth/:path***: The original `(?!api|...)` negative lookahead excluded all /api/* routes, meaning rate limiting would never fire for /api/auth/[...nextauth] calls
- **CSRF via Server Actions**: Next.js Server Actions include built-in Origin/Host verification on every POST, making manual CSRF tokens unnecessary for this architecture
- **All route handler mutations authenticated**: Admin upload (auth() + ADMIN role check), client upload (auth() + client ownership), document delete (auth() + isOwner || isAdmin), messages (auth()), notifications (auth()), user/settings (auth()), stripe webhook (stripe-signature verification)

## Deviations from Plan

None - plan executed exactly as written. The actual function signatures for updateNote and deleteNote matched the plan's assumptions (clientId + milestoneId + noteId params).

## Issues Encountered

None. TypeScript compilation passed on first attempt for both tasks.

## User Setup Required

**External services require manual configuration.** Upstash Redis credentials must be added to environment:

1. Go to [console.upstash.com](https://console.upstash.com) and create a free Redis database
2. Choose the region closest to your Vercel deployment (e.g., US-East-1 for US deployments)
3. From the database REST API tab, copy:
   - **REST URL** → `UPSTASH_REDIS_REST_URL`
   - **REST Token** → `UPSTASH_REDIS_REST_TOKEN`
4. Add both to Vercel project environment variables (Production + Preview)
5. Rate limiting will silently fall through (no errors) until Upstash is configured, so the app remains functional during setup

## Next Phase Readiness

- PROD-03 (rate limiting), PROD-04 (CSRF audit), and PROD-05 (Zod coverage) all complete
- Phase 12 Wave 2 plan 03 done — ready for final verification pass (12-04 if planned, or phase completion)
- No blockers

---
*Phase: 12-production-hardening*
*Completed: 2026-02-22*
