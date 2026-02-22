---
phase: 12-production-hardening
plan: 01
subsystem: infra
tags: [sentry, error-monitoring, security-headers, csp, env-validation, zod, t3-env]

# Dependency graph
requires:
  - phase: 11-facebook-ads-analytics
    provides: completed v1.0 production feature set
provides:
  - Sentry SDK configured for server, client, and edge runtimes
  - Security headers (CSP, HSTS, X-Frame-Options, Permissions-Policy, Referrer-Policy) on all routes
  - Type-safe env var validation at build time via @t3-oss/env-nextjs
  - Stripe test key rejection in production
  - Global error boundary (app/global-error.tsx) reporting to Sentry
affects: [12-02-rate-limiting, 12-03-error-boundaries, deployment, vercel-config]

# Tech tracking
tech-stack:
  added: ["@sentry/nextjs@10.x", "@t3-oss/env-nextjs"]
  patterns:
    - "Sentry instrumentation.ts pattern (register() + onRequestError) for Next.js 16"
    - "withSentryConfig wrapper in next.config.ts for source map uploads"
    - "createEnv() from @t3-oss/env-nextjs for type-safe build-time env validation"
    - "Static CSP with unsafe-inline (not nonce-based) for internal dashboard"

key-files:
  created:
    - instrumentation.ts
    - instrumentation-client.ts
    - sentry.server.config.ts
    - sentry.edge.config.ts
    - app/global-error.tsx
    - lib/env.ts
    - .planning/phases/12-production-hardening/12-USER-SETUP.md
  modified:
    - next.config.ts
    - package.json

key-decisions:
  - "Static CSP with unsafe-inline chosen over nonce-based — nonce forces dynamic rendering, unjustified cost for internal dashboard"
  - "Sentry DSN is optional in env.ts — only set in production Vercel env, not locally"
  - "SKIP_ENV_VALIDATION flag for CI flexibility when not all env vars are available"
  - "Stripe key refine uses production-only check — test keys still work in dev"

patterns-established:
  - "lib/env.ts: single source of truth for all env vars — import instead of process.env directly"
  - "instrumentation.ts: Next.js 16 pattern for Sentry server/edge init (no experimental.instrumentationHook)"

# Metrics
duration: 28min
completed: 2026-02-22
---

# Phase 12 Plan 01: Sentry + Security Headers + Env Validation Summary

**Sentry SDK configured for all Next.js 16 runtimes, CSP/HSTS/X-Frame-Options security headers on all routes, and Zod-validated env vars at build time via @t3-oss/env-nextjs**

## Performance

- **Duration:** ~28 min
- **Started:** 2026-02-22T20:08:00Z
- **Completed:** 2026-02-22T20:36:00Z
- **Tasks:** 2/2
- **Files modified:** 9

## Accomplishments

- Installed `@sentry/nextjs` and `@t3-oss/env-nextjs`; Sentry SDK ready to track errors in server, client, and edge runtimes when DSN is configured
- Security headers configured on all routes: CSP (dev: unsafe-eval, prod: no unsafe-eval), HSTS (2yr with preload), X-Frame-Options DENY, nosniff, Permissions-Policy, Referrer-Policy, X-DNS-Prefetch-Control
- Type-safe env validation: all 18 env vars validated with Zod schemas at build time; Stripe key rejects `sk_test_` in production; build fails fast on misconfiguration
- `app/global-error.tsx` root error boundary captures unhandled exceptions and reports to Sentry via `captureException`
- Build passes with `SKIP_ENV_VALIDATION=1` (CI-friendly); TypeScript strict mode passes with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create Sentry configuration files** - `9b678b5` (feat)
2. **Task 2: Add security headers and environment variable validation** - `924710d` (feat)

## Files Created/Modified

- `instrumentation.ts` - Sentry server/edge registration + `onRequestError` export for Next.js 16
- `instrumentation-client.ts` - Client-side Sentry init with SessionReplay integration
- `sentry.server.config.ts` - Server-side Sentry config (0.1 sample rate in prod, 1.0 in dev)
- `sentry.edge.config.ts` - Edge runtime Sentry config
- `app/global-error.tsx` - Root error boundary with `Sentry.captureException` in `useEffect`
- `lib/env.ts` - `@t3-oss/env-nextjs` createEnv() with Zod schemas for all 18 env vars
- `next.config.ts` - Added `withSentryConfig` wrapper, `headers()` with security headers, `import "./lib/env"` trigger
- `package.json` / `package-lock.json` - Added `@sentry/nextjs`, `@t3-oss/env-nextjs`
- `.planning/phases/12-production-hardening/12-USER-SETUP.md` - Sentry setup instructions

## Decisions Made

1. **Static CSP with `unsafe-inline` (not nonce-based):** Nonce-based CSP requires dynamic rendering on every page, disabling ISR/static optimization. For an internal dashboard the security/performance tradeoff doesn't justify it. Research confirmed this is standard recommendation for internal dashboards.

2. **Sentry DSN is optional in `lib/env.ts`:** Marked as `z.string().url().optional()`. Only set in Vercel production environment. Local dev works without Sentry configured.

3. **`SKIP_ENV_VALIDATION=1` for CI:** Allows build to run in CI/CD environments without all production env vars present (e.g. Sentry DSN, Upstash keys not needed at build time).

4. **Stripe key validation is refine-based (not warn):** `sk_test_` keys cause build failure in `NODE_ENV=production`. In development/staging they pass through. This enforces PROD-08 correctly.

5. **No `experimental.instrumentationHook` in next.config.ts:** Per Next.js 16 + Sentry 10.x docs, instrumentationHook is stable and the flag causes warnings. Omitted as directed by plan.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Build succeeded on first attempt. TypeScript strict mode passed with zero errors.

## User Setup Required

**External services require manual configuration.** See [12-USER-SETUP.md](./12-USER-SETUP.md) for:
- Sentry account creation and project setup
- 5 Sentry environment variables to add (SENTRY_DSN, NEXT_PUBLIC_SENTRY_DSN, SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN)
- Auth token scopes required for source map uploads

## Next Phase Readiness

- Ready for `12-02-PLAN.md` (rate limiting with Upstash Redis)
- Upstash Redis env vars (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) are now validated in `lib/env.ts` — must be set before production deployment
- Sentry DSN not required for next plan but should be configured in Vercel for production monitoring

---
*Phase: 12-production-hardening*
*Completed: 2026-02-22*
