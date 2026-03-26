---
phase: 21-roas-analytics-tab-charts
plan: 01
subsystem: ui
tags: [facebook-ads, roas, metrics, dashboard, analytics]

# Dependency graph
requires:
  - phase: 14-enhanced-fb-analytics
    provides: FbInsights type, getActionValue helper, FbAdsMetrics 12-card grid
  - phase: 11-facebook-ads-client-analytics
    provides: getClientFbInsights DAL function, fetchFacebookInsights API wrapper
provides:
  - purchase_roas in INSIGHTS_FIELDS fetched from Facebook Ads API
  - getRoas() exported helper with omni_purchase priority fallback chain
  - ROAS card as 4th workflowHighlight on client home page (emerald accent)
  - ROAS as Card 13 in FbAdsMetrics analytics grid
  - Null guard on both cards — displays dash for lead-gen clients without purchase pixel
affects: [21-02-PLAN, fb-ads-metrics, dashboard-overview]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - getRoas() returns number|null (not 0) — enables dash display vs zero for lead-gen clients
    - purchase_roas is FbAction[] not string — Facebook returns ROAS as action array like outbound_clicks
    - roas computed at server component level (page.tsx) and passed as prop — keeps client component pure
    - roas computed with optional chaining (insights?.purchase_roas) in fb-ads-metrics for null-safe access before !insights guard

key-files:
  created: []
  modified:
    - lib/facebook-ads.ts
    - app/dashboard/page.tsx
    - components/dashboard/dashboard-overview.tsx
    - components/dashboard/fb-ads-metrics.tsx

key-decisions:
  - "getRoas returns null (not 0) when purchase_roas array absent — distinguishes unconfigured pixel from zero ROAS"
  - "omni_purchase action_type prioritized over offsite_conversion.fb_pixel_purchase — aggregates website+app purchases"
  - "roas computed in server component (page.tsx) via getClientFbInsights('last_30d') parallel fetch — no extra waterfall"
  - "workflowHighlights grid changed sm:grid-cols-3 to sm:grid-cols-2 lg:grid-cols-4 to accommodate 4th card"
  - "roas var computed before main return in fb-ads-metrics using optional chaining — avoids IIFE in JSX"

patterns-established:
  - "ROAS display pattern: roas !== null ? toFixed(2)x : isFbConfigured ? contextual message : dash"
  - "FbAction[] extraction pattern for non-actions fields: same getRoas pattern can apply to future action-array fields"

# Metrics
duration: 5min
completed: 2026-03-27
---

# Phase 21 Plan 01: ROAS API Field + Metric Cards Summary

**purchase_roas added to Facebook Ads API fetch with getRoas() helper, ROAS metric card displayed on client home page (4th workflowHighlight) and analytics grid (Card 13)**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-27T00:32:26Z
- **Completed:** 2026-03-27T00:37:43Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added purchase_roas to INSIGHTS_FIELDS so Facebook API returns it; typed as optional FbAction[] on FbInsights interface
- Exported getRoas() helper with omni_purchase > pixel_purchase > first-entry fallback chain, returns null for lead-gen clients
- Home page fetches account-level FB insights in parallel and passes roas prop to DashboardOverview; ROAS displayed as 4th workflowHighlight card with emerald accent
- Analytics FbAdsMetrics grid now shows 13 cards including ROAS with dash fallback for missing purchase data

## Task Commits

Each task was committed atomically:

1. **Task 1: Add purchase_roas to FB API types and create getRoas helper** - `bf6301c` (feat)
2. **Task 2: Add ROAS card to home page and analytics page** - `69569fe` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `lib/facebook-ads.ts` - Added purchase_roas to INSIGHTS_FIELDS and FbInsights interface; added getRoas() export
- `app/dashboard/page.tsx` - Added getClientFbInsights('last_30d') to parallel fetch, computed roas, passed as prop
- `components/dashboard/dashboard-overview.tsx` - Added roas prop to interface and params; added ROAS workflowHighlight card; updated grid to lg:grid-cols-4
- `components/dashboard/fb-ads-metrics.tsx` - Added getRoas import; computed roas before return; added Card 13 ROAS

## Decisions Made
- getRoas returns null (not 0) when purchase_roas is absent — allows UI to display "—" vs "0.00x" for lead-gen clients without purchase pixel
- omni_purchase action_type prioritized over offsite_conversion.fb_pixel_purchase — aggregates both website and app purchases for most accurate ROAS
- ROAS computed in the server component (page.tsx) via a parallel getClientFbInsights call — no extra client-side fetch waterfall
- workflowHighlights grid updated from sm:grid-cols-3 to sm:grid-cols-2 lg:grid-cols-4 to accommodate all 4 cards responsively

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `npm run build` failed with pre-existing Sentry dependency error (`@apm-js-collab/code-transformer` missing) unrelated to this plan's changes. TypeScript check (`node node_modules/typescript/bin/tsc --noEmit`) confirmed no errors in any of the 4 modified files.

## User Setup Required
None - no external service configuration required. The new purchase_roas field will be returned automatically from Facebook's API when the client's ad account has purchase pixel events configured.

## Next Phase Readiness
- ROAS field and extraction helper are ready for Plan 21-02 (analytics tab charts)
- getRoas() can be reused in any other component that receives FbInsights
- Both ROAS cards handle null gracefully — safe for lead-gen clients without purchase tracking

---
*Phase: 21-roas-analytics-tab-charts*
*Completed: 2026-03-27*
