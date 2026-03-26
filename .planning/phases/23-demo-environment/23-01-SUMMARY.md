---
phase: 23-demo-environment
plan: 01
subsystem: database
tags: [prisma, postgresql, facebook-ads, dal, demo-environment]

# Dependency graph
requires:
  - phase: 14-enhanced-fb-analytics
    provides: getClientFbInsights, getClientFbCampaigns, getClientFbDailyTrend, getClientFbDailyTrendByRange functions
  - phase: 18-admin-analytics
    provides: getAdminFbAggregation, getAdminFbPerClient, getAdminFbDailyAggregation, getAdminFbMetricsPerClient, getAdminAllCampaigns, getAdminAllAds functions
  - phase: 22-ongoing-growth-roadmap
    provides: MilestoneType enum, getAllClientsWithMilestones
provides:
  - isDemo and demoStableId fields on Client Prisma model
  - resolveClientIsDemoFilter() helper in lib/dal.ts
  - isDemo filtering in all 8 admin DAL functions
  - Static FB demo data in lib/demo-data.ts for 3 demo clients
  - Demo short-circuit in 4 client-facing FB DAL functions
affects: [23-02-PLAN, 23-03-PLAN, any future admin DAL additions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - resolveClientIsDemoFilter helper pattern for dual-view admin filtering
    - demoStableId keyed static data lookup for FB API short-circuit
    - Demo admin early-return branches before real API calls in admin FB functions

key-files:
  created:
    - lib/demo-data.ts
  modified:
    - prisma/schema.prisma
    - lib/dal.ts

key-decisions:
  - "demo admin (khan@baseaim.co) sees only isDemo: true clients; real admin sees only isDemo: false — complete isolation"
  - "resolveClientIsDemoFilter is NOT cached (React cache) — always reads fresh email to avoid cross-request contamination"
  - "Admin FB functions return static data directly for demo admin (no unstable_cache boundary needed)"
  - "FbDailyInsight uses action_values (not purchase_roas) for daily ROAS — action_values = purchase revenue; ROAS computed at render"
  - "getAdminAllAds returns empty array for demo admin — ads breakdown is least critical admin view"
  - "demoStableId enables deterministic lookup of static demo data without coupling to Prisma client.id"

patterns-established:
  - "isDemo filtering pattern: isDemoAdmin = await resolveClientIsDemoFilter() → where: { isDemo: isDemoAdmin }"
  - "Demo short-circuit pattern: if (client?.isDemo && client?.demoStableId) return DEMO_*[client.demoStableId]"
  - "Admin FB demo branch: check isDemoAdmin first, return static aggregated data before any API calls"

# Metrics
duration: 10min
completed: 2026-03-27
---

# Phase 23 Plan 01: Demo Environment Schema and Data Isolation Summary

**isDemo/demoStableId schema fields, resolveClientIsDemoFilter helper, and static FB data constants providing complete demo/real client isolation across all 8 admin DAL functions and 4 client FB functions**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-26T17:03:52Z
- **Completed:** 2026-03-26T17:13:41Z
- **Tasks:** 3
- **Files modified:** 3 (prisma/schema.prisma, lib/dal.ts, lib/demo-data.ts created)

## Accomplishments
- Added `isDemo Boolean @default(false)` and `demoStableId String? @unique` to Client model — zero data loss, all existing clients get isDemo = false
- Created `lib/demo-data.ts` with static FB data for 3 demo clients (Meridian Financial, Apex Tax, Hargrove & Associates) — 30-day daily trends, campaign breakdowns, and aggregated insights
- All 8 admin DAL functions now filter by `isDemo: isDemoAdmin` — demo admin sees only demo clients, real admin sees only real clients
- All 4 client-facing FB DAL functions short-circuit with static data for demo clients — no FB API calls, no "not configured" empty states

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema migration — add isDemo and demoStableId to Client model** - `c72db60` (feat)
2. **Task 2: Create lib/demo-data.ts and add resolveClientIsDemoFilter helper + getClientAdConfig update** - `8cb5087` (feat)
3. **Task 3: Add isDemo filtering to all 8 admin DAL functions and demo short-circuit to 4 client FB functions** - `8d47ab1` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `prisma/schema.prisma` - Added isDemo Boolean @default(false) and demoStableId String? @unique to Client model
- `lib/demo-data.ts` - New file: DEMO_ADMIN_EMAIL, DEMO_FB_INSIGHTS, DEMO_FB_CAMPAIGNS, DEMO_FB_DAILY_TREND for 3 demo clients keyed by demoStableId
- `lib/dal.ts` - Import DEMO_* constants, resolveClientIsDemoFilter helper, isDemo filter in 8 admin functions, demo short-circuit in 4 client FB functions, isDemo/demoStableId in getClientAdConfig selects

## Decisions Made
- `resolveClientIsDemoFilter` is a plain `async function` (not `cache()`-wrapped) — each admin function call resolves fresh to prevent cross-request email contamination
- Admin FB functions (getAdminFbAggregation etc.) use early-return demo branches before the `getSettings()` / `unstable_cache` path — demo admin never touches real FB API or Stripe-adjacent code
- `FbDailyInsight.action_values` (not `purchase_roas`) used for daily ROAS values — action_values represents purchase revenue per day; ROAS is computed at render from spend / purchaseValue
- `getAdminAllAds` returns `[]` for demo admin — ads breakdown is least critical admin view; no static ad-level data added to keep demo-data.ts lean
- `demoStableId` acts as a stable lookup key independent of DB row ID — enables deterministic static data retrieval regardless of when demo clients are seeded

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed FbDailyInsight type mismatch: purchase_roas not valid on FbDailyInsight**
- **Found during:** Task 2 (Create lib/demo-data.ts)
- **Issue:** Plan specified `purchase_roas` on daily entries, but `FbDailyInsight` interface uses `action_values` for revenue data — `purchase_roas` exists only on `FbInsights` (aggregated)
- **Fix:** Changed `makeDay()` to produce `action_values: [{ action_type: 'omni_purchase', value: purchaseRevenue }]` computed as `spend * roasMultiplier`; changed roasValue param from string to number
- **Files modified:** lib/demo-data.ts
- **Verification:** `npx tsc --noEmit` passed after fix
- **Committed in:** `8cb5087` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Type-correctness fix required for compilation. No scope change.

## Issues Encountered
- `npx prisma db push` unavailable — Supabase database unreachable (same as Phases 20 and 22). Resolved with `prisma validate` + `prisma generate`. Schema push required before production use.

## User Setup Required
None — no external service configuration required. Schema push to database is deferred (Supabase unreachable) and will be applied when connection is restored.

## Next Phase Readiness
- Schema foundation complete for demo environment — isDemo and demoStableId fields are defined and Prisma client is regenerated
- lib/demo-data.ts provides all static FB data needed for plans 23-02 and 23-03
- 23-02 can now seed demo clients with isDemo: true and demoStableId values
- 23-03 can now build the demo admin account aware that filtering is fully in place

---
*Phase: 23-demo-environment*
*Completed: 2026-03-27*
