---
phase: 11-facebook-ads-analytics
plan: 01
subsystem: api
tags: [facebook, meta, prisma, dal, zod, unstable_cache, fetch]

# Dependency graph
requires:
  - phase: 10-payment-processing
    provides: Settings singleton pattern, DAL architecture, Prisma schema conventions
  - phase: 07-chat-integration
    provides: Settings model (whatsappNumber, telegramUsername) that we extend
provides:
  - adAccountId field on Client model (Facebook Ad Account ID)
  - facebookAccessToken field on Settings model (Meta System User token)
  - lib/facebook-ads.ts — typed fetch wrapper for Marketing API Insights endpoint
  - lib/dal.ts getClientFbInsights() — 6-hour cached DAL function (CLIENT role)
  - lib/schemas/settings.ts fbSettingsSchema and FbSettingsData type
affects:
  - 11-02 (settings admin UI — needs fbSettingsSchema and facebookAccessToken field)
  - 11-03 (client dashboard FB ads widget — needs getClientFbInsights)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "unstable_cache with verifySession() OUTSIDE the cache boundary (session headers cannot be read inside cache)"
    - "fetch with cache: 'no-store' in API helper — caching delegated to DAL layer with unstable_cache"
    - "cache key per (clientId, datePreset) — separate TTL per date range, tagged for invalidation"

key-files:
  created:
    - lib/facebook-ads.ts
  modified:
    - prisma/schema.prisma
    - lib/dal.ts
    - lib/schemas/settings.ts

key-decisions:
  - "verifySession() called before unstable_cache — unstable_cache cannot access session cookies/headers"
  - "No Facebook SDK — single fetch call to Marketing API v22.0 (no bundle overhead)"
  - "cache: 'no-store' on fetch — caching responsibility delegated entirely to unstable_cache in DAL"
  - "6-hour TTL (revalidate: 21600) — balances data freshness with Facebook API rate limits"
  - "All FbInsights values are strings — Facebook API returns numbers as strings, always parseFloat() before arithmetic"
  - "Returns null (not throw) when adAccountId or facebookAccessToken not configured — UI shows 'not configured' state"

patterns-established:
  - "unstable_cache pattern: read session BEFORE entering cache lambda, pass values as closed-over variables"
  - "Tagged cache entries: tags: ['fb-insights-{clientId}'] enables targeted revalidation per client"

# Metrics
duration: 5min
completed: 2026-02-21
---

# Phase 11 Plan 01: Facebook Ads Foundation Summary

**Prisma schema fields (adAccountId + facebookAccessToken), typed Marketing API fetch wrapper, and 6-hour cached DAL function with session-safe unstable_cache architecture**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-21T11:35:40Z
- **Completed:** 2026-02-21T11:41:07Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Added `adAccountId` (String?) to Client model and `facebookAccessToken` (String?) to Settings model; pushed to database with `prisma db push`
- Created `lib/facebook-ads.ts` — zero-dependency fetch wrapper with `FbInsights` interface, `DatePreset` type, and graceful null returns on API/network errors
- Added `getClientFbInsights()` to DAL with `verifySession()` outside `unstable_cache` boundary, 6-hour TTL, per-client cache tags
- Added `fbSettingsSchema` and `FbSettingsData` to settings schema for admin token validation

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema migration** - `0fdf795` (feat)
2. **Task 2: Facebook API helper** - `3308c84` (feat)
3. **Task 3: DAL function + settings schema** - `5da273e` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added `adAccountId` to Client, `facebookAccessToken` to Settings
- `lib/facebook-ads.ts` - FbInsights interface, DatePreset type, fetchFacebookInsights() with cache: no-store
- `lib/dal.ts` - getClientFbInsights() with unstable_cache architecture, imports for unstable_cache and fetchFacebookInsights
- `lib/schemas/settings.ts` - fbSettingsSchema (Zod) and FbSettingsData type

## Decisions Made
- **verifySession() before unstable_cache**: `unstable_cache` cannot call `headers()` or `cookies()` — session must be read before entering the cache lambda. This is a Next.js constraint.
- **No Facebook SDK**: Marketing API has one endpoint we need. A plain `fetch` call is 65 lines vs adding a heavy SDK dependency.
- **cache: 'no-store' on fetch**: The fetch helper delegates all caching to `unstable_cache` in the DAL. Double-caching would cause stale data.
- **6-hour TTL**: Facebook Insights data updates ~3 times/day. 6 hours avoids rate limits while keeping data reasonably fresh.
- **FbInsights values as strings**: Facebook API returns all numeric values as strings. Consumers must `parseFloat()` before arithmetic — documented in interface comments.
- **Null return pattern**: `getClientFbInsights()` returns `null` (not error) when unconfigured. UI handles "not configured" state without error boundaries.

## Deviations from Plan

None - plan executed exactly as written.

The one deviation worth noting: `prisma migrate dev` is interactive-only and cannot run non-interactively in this shell environment. Used `prisma db push` instead (which this project already uses — no migrations folder exists). The database schema was synced successfully.

## Issues Encountered
- `prisma migrate dev` failed with "non-interactive environment" error. Resolved by using `prisma db push` which is already this project's migration approach (no `/prisma/migrations/` folder existed).
- `prisma generate` failed with EPERM (DLL locked by dev server). The `prisma db push` auto-generated the client types as part of its sync step — confirmed `adAccountId` and `facebookAccessToken` were present in `node_modules/.prisma/client/index.d.ts` before attempting the explicit generate.

## User Setup Required
None - no external service configuration required at this step. Facebook access token is stored via the admin settings UI (Phase 11-02). Per-client `adAccountId` is configured via the client edit page (Phase 11-03).

## Next Phase Readiness
- Schema foundation complete — `adAccountId` and `facebookAccessToken` fields exist in DB
- `getClientFbInsights(datePreset)` is ready to call from any server component (Phase 11-03)
- `fbSettingsSchema` ready for the admin settings form (Phase 11-02)
- All TypeScript compiles clean (`npx tsc --noEmit` = 0 errors)

---
*Phase: 11-facebook-ads-analytics*
*Completed: 2026-02-21*
