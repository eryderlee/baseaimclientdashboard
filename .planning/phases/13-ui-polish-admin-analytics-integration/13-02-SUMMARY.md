---
phase: 13-ui-polish-admin-analytics-integration
plan: 02
subsystem: ui
tags: [stripe, facebook-ads, admin, analytics, dal, unstable_cache, react-cache]

# Dependency graph
requires:
  - phase: 10-payment-processing
    provides: Stripe subscriptions and invoices stored in DB
  - phase: 11-facebook-ads
    provides: getClientFbInsights DAL pattern and fetchFacebookInsights/getActionValue helpers
  - phase: 06-admin-analytics
    provides: getAdminAnalytics, AnalyticsSummary component (existing 4 cards)
provides:
  - getAdminRevenueAnalytics() DAL function — totalRevenue from PAID invoices + MRR from Stripe
  - getAdminFbAggregation() DAL function — aggregate FB spend/leads across all clients
  - Extended AnalyticsSummary component with Revenue & Marketing section (4 new cards)
  - Admin dashboard shows real financial and marketing data alongside milestone analytics
affects:
  - phase 14 deployment (Stripe + FB env vars must be set in production)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "verifySession() before unstable_cache boundary — session read before cache closure"
    - "Promise.allSettled for external APIs — individual failures don't crash the page"
    - "Promise.all for parallel DAL calls in server component — maximizes concurrency"
    - "parseFloat() for all FB API string values before arithmetic"
    - "Stripe unit_amount / 100 for cents-to-dollars conversion"
    - "Separate unstable_cache key per admin aggregate — admin-mrr-v1, admin-fb-aggregation-v1"

key-files:
  created: []
  modified:
    - lib/dal.ts
    - app/admin/page.tsx
    - components/admin/analytics-summary.tsx

key-decisions:
  - "getActionValue imported from facebook-ads (not reimplemented) — reuse existing helper"
  - "totalRevenue from local DB invoices (no Stripe API) — all PAID amounts stored in Invoice.amount as Float (dollars)"
  - "MRR cached separately from revenue — Stripe API call needed, 1hr TTL"
  - "FB aggregation cached at admin level — single 6hr cache key, not per-client"
  - "Promise.allSettled (not Promise.all) for Stripe subscriptions and FB fetches — failures isolated"

patterns-established:
  - "Admin aggregation DAL pattern: verifySession -> DB preflight -> unstable_cache(API calls)"
  - "AnalyticsSummary section pattern: labeled section header + 4-card grid"

# Metrics
duration: 6min
completed: 2026-02-23
---

# Phase 13 Plan 02: Admin Revenue & FB Analytics Summary

**Stripe revenue aggregation (total + MRR) and Facebook Ads spend/leads rollup added to admin dashboard via cached DAL functions and 4 new AnalyticsSummary cards**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-23T10:34:28Z
- **Completed:** 2026-02-23T10:40:18Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added `getAdminRevenueAnalytics()` DAL function: totalRevenue from all PAID invoices (local DB, no API), MRR from active Stripe subscriptions (1hr cache), payingClientCount and activeSubscriptionCount
- Added `getAdminFbAggregation()` DAL function: parallel FB API calls across all clients with adAccountId configured, aggregates totalSpend/totalLeads/totalImpressions (6hr cache)
- Extended `AnalyticsSummary` component with a "Revenue & Marketing" section containing 4 cards: Total Revenue, Monthly Recurring (MRR), Ad Spend (30d), Total Leads (30d)
- Wired `app/admin/page.tsx` to fetch new DAL functions in parallel via `Promise.all` and pass data to AnalyticsSummary

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Stripe and Facebook aggregation DAL functions** - `2cdfce6` (feat)
2. **Task 2: Wire admin page and extend AnalyticsSummary with revenue and ads cards** - `ef31c55` (feat)

**Plan metadata:** (see below — docs commit)

## Files Created/Modified

- `lib/dal.ts` - Added `getAdminRevenueAnalytics` and `getAdminFbAggregation` exports; added stripe and getActionValue imports
- `app/admin/page.tsx` - Parallel fetch with Promise.all; passes 7 new props to AnalyticsSummary
- `components/admin/analytics-summary.tsx` - Extended props interface; added DollarSign/Megaphone icons; new Revenue & Marketing 4-card section

## Decisions Made

- **totalRevenue uses local DB only** — Invoice.amount stored as Float (dollars, not cents), no Stripe API call needed for historical revenue
- **MRR requires Stripe API** — subscription price not stored locally; retrieve() gives current unit_amount; cached 1hr
- **Admin FB aggregation is a single cache key** — `admin-fb-aggregation-v1` covers all clients; simpler than per-client fan-out at this layer
- **Promise.allSettled throughout** — Stripe subscription retrieves and FB insight fetches both use allSettled; a bad token or invalid adAccountId for one client won't block others
- **getActionValue reused** — imported from `@/lib/facebook-ads` rather than duplicated

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npm run build` fails locally due to missing AUTH_SECRET, UPSTASH_REDIS_REST_URL, and other secrets — this is a pre-existing local dev environment issue (secrets only exist in Vercel). Build succeeds with `SKIP_ENV_VALIDATION=1`. TypeScript (`npx tsc --noEmit`) passes cleanly with exit 0.

## User Setup Required

None - no new environment variables or external service configuration required. Stripe and Facebook credentials were configured in Phase 10 and Phase 11.

## Next Phase Readiness

- Admin dashboard now shows real financial and marketing data — ADMIN-01, ADMIN-02, ADMIN-03 satisfied
- ADMIN-04 (risk detection) and ADMIN-05 (upcoming due dates) unchanged — no regressions
- Ready for Phase 13 Plan 03 (remaining UI polish tasks)

---
*Phase: 13-ui-polish-admin-analytics-integration*
*Completed: 2026-02-23*
