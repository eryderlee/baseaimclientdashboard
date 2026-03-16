---
phase: 16-performance-optimization
plan: 02
subsystem: database
tags: [prisma, react-cache, dal, deduplication, query-optimization]

# Dependency graph
requires:
  - phase: 14-enhanced-facebook-analytics
    provides: FB DAL functions (getClientFbInsights, getClientFbCampaigns, getClientFbPlatformBreakdown, getClientFbDailyTrend) that were refactored
  - phase: 16-performance-optimization plan 01
    provides: DB connection pooling via directUrl — prerequisite for query optimization work

provides:
  - getSettings() cache()-wrapped singleton — settings.findFirst deduped from 7 to 1 per render pass
  - getClientAdConfig() cache()-wrapped singleton — client adAccountId deduped from 5 to 1 per render pass
  - getClientAnalytics() — lean DAL replacing inline getAnalyticsData() in analytics page (uses select instead of include)
  - getClientDashboardProfile(), getCurrentUserName(), getClientRecentDocuments(), getRecentActivities() — dashboard home DAL helpers
  - analytics/page.tsx and dashboard/page.tsx with no direct prisma imports

affects:
  - 16-03-PLAN (Suspense streaming) — these pages now have clean DAL-only data fetching, ready for Suspense decomposition
  - 16-04-PLAN (Prisma optimization) — getClientAnalytics uses select instead of include, demonstrates lean query pattern

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Shared cached settings singleton via getSettings() — all FB DAL functions call this instead of their own prisma.settings.findFirst()
    - Shared cached client config via getClientAdConfig() — all client FB DAL functions call this instead of their own prisma.client.findUnique()
    - Single Promise.all in analytics page covering all 5 fetches (4 FB + 1 project analytics) for full parallelism
    - Dashboard home page all 7 fetches in single top-level Promise.all

key-files:
  created: []
  modified:
    - lib/dal.ts
    - app/dashboard/analytics/page.tsx
    - app/dashboard/page.tsx

key-decisions:
  - "getSettings() has no auth check — settings are public config (facebookAccessToken, whatsappNumber, telegramUsername), not sensitive user data"
  - "getClientAdConfig() throws on non-CLIENT role — matches pattern of all other client-scoped DAL functions"
  - "getClientAnalytics() uses select on documents/milestones/activities instead of include — avoids fetching full records when only counts and metadata are needed"
  - "getClientDashboardProfile reuses getClientAdConfig pattern but adds companyName — acceptable duplication since dashboard home needs company name for display"
  - "Dashboard home uses getCurrentUserName() from DB instead of session.user.name — session name may be stale, DB is source of truth"
  - "Remaining prisma imports in chat/page.tsx, documents/page.tsx, layout.tsx, settings/page.tsx noted but out of scope for this plan"

patterns-established:
  - "Shared settings singleton: any function needing facebookAccessToken/whatsappNumber/telegramUsername calls getSettings() — never prisma.settings.findFirst() directly"
  - "Shared client config singleton: any function needing client.id + adAccountId calls getClientAdConfig() — never prisma.client.findUnique({ where: { userId } }) directly"
  - "Analytics page single Promise.all: all data fetches consolidated into one parallel call — no sequential awaits for independent data"

# Metrics
duration: 4min
completed: 2026-03-16
---

# Phase 16 Plan 02: Settings Deduplication Summary

**React cache() singletons for settings and client config cut DB queries from 12 to 2 per analytics page render, with full parallel fetch via single Promise.all**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-16T04:39:38Z
- **Completed:** 2026-03-16T04:43:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Settings queries deduplicated from 7 to 1 per render pass — `getSettings()` cache singleton replaces inline `prisma.settings.findFirst()` in all 6 FB DAL functions and `getChatSettings()`
- Client adAccountId queries deduplicated from 5 to 1 per render pass — `getClientAdConfig()` cache singleton replaces inline `prisma.client.findUnique()` in all 5 client FB DAL functions
- Analytics page refactored to single `Promise.all` with all 5 fetches in parallel — removed inline `getAnalyticsData()`, direct prisma and auth imports
- Dashboard home page refactored to 7-fetch `Promise.all` — removed direct prisma and auth imports, all data via DAL

## Task Commits

1. **Task 1: Extract getSettings, getClientAdConfig, getClientAnalytics** - `d3d90e3` (feat)
2. **Task 2: Refactor analytics and dashboard home to use DAL only** - `7986369` (feat)

**Plan metadata:** (docs commit after this summary)

## Files Created/Modified

- `lib/dal.ts` — Added `getSettings()`, `getClientAdConfig()`, `getClientAnalytics()`, `getClientDashboardProfile()`, `getCurrentUserName()`, `getClientRecentDocuments()`, `getRecentActivities()`; replaced all inline settings/client queries in FB DAL functions
- `app/dashboard/analytics/page.tsx` — Removed prisma/auth imports, removed inline `getAnalyticsData()`, consolidated to single `Promise.all([...5 fetches...])`
- `app/dashboard/page.tsx` — Removed prisma/auth imports, replaced 3 inline prisma queries with DAL calls, all 7 fetches in single `Promise.all`

## Decisions Made

- `getSettings()` has no auth check — settings (facebookAccessToken, whatsappNumber, telegramUsername) are global config, not user-scoped data. Consistent with `getChatSettings()` existing pattern.
- `getClientAdConfig()` throws on non-CLIENT role — matches all other client-scoped DAL function patterns.
- `getClientAnalytics()` uses `select` on documents/milestones/activities instead of `include` — avoids fetching full records; only ids, dates, titles, statuses needed for analytics computation.
- Dashboard home uses `getCurrentUserName()` from DB rather than `session.user.name` — DB is source of truth, session name may be stale after profile updates.
- Remaining direct prisma imports in `chat/page.tsx`, `documents/page.tsx`, `layout.tsx`, `settings/page.tsx` noted but deferred to a future plan or 16-04.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added dashboard home DAL helpers not in original task spec**

- **Found during:** Task 2 (dashboard/page.tsx refactor)
- **Issue:** Plan called for removing direct prisma from dashboard/page.tsx but did not enumerate the specific DAL functions needed (`getClientDashboardProfile`, `getCurrentUserName`, `getClientRecentDocuments`, `getRecentActivities`)
- **Fix:** Added all four functions to `dal.ts` following established DAL patterns (cache-wrapped, verifySession, select-only queries)
- **Files modified:** `lib/dal.ts`
- **Verification:** TypeScript compiles clean, dashboard/page.tsx has no prisma imports
- **Committed in:** `7986369` (Task 2 commit)

---

**Total deviations:** 1 auto-added (missing DAL helpers required to complete the task)
**Impact on plan:** Necessary to fulfill the plan's must_have truth "app/dashboard/page.tsx no longer imports prisma directly". No scope creep — functions follow exact same patterns as existing DAL.

## Issues Encountered

None — TypeScript compiled cleanly after both changes with no errors.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `lib/dal.ts` now has clean cached singletons for settings and client config — all FB functions use shared cache, reducing DB load significantly on analytics-heavy renders
- Analytics page and dashboard home are DAL-only — ready for Suspense decomposition in 16-03
- Remaining prisma imports in chat, documents, layout, settings pages are not blocking 16-03 (Suspense) or 16-04 (Prisma select audit)
- `getClientAnalytics()` uses `select` pattern — consistent with what 16-04 will enforce across other DAL functions

---
*Phase: 16-performance-optimization*
*Completed: 2026-03-16*
