---
phase: 20
plan: "02"
name: home-page-chart-rendering
subsystem: client-dashboard
tags: [charts, facebook-ads, searchParams, suspense, recharts]

dependency_graph:
  requires:
    - "20-01"  # getClientFbDailyTrendByRange, leadsChartEnabled, getClientAdConfig
    - "16-03"  # per-section Suspense streaming pattern
    - "14-02"  # FbTrendChart component (ComposedChart spend+leads)
    - "11-03"  # searchParams.range pattern, rangToDatePreset()
  provides:
    - "searchParams-driven home page chart with real API re-fetch on range change"
    - "SpendLeadsSection async server component in app/dashboard/page.tsx"
    - "DateRangeSelector client component with useSearchParams + Link href"
    - "FbTrendChart leadsEnabled prop for conditional leads line"
  affects:
    - "Any future plan modifying app/dashboard/page.tsx"
    - "Any plan building on FbTrendChart (leadsEnabled now defaults to true)"

tech_stack:
  added: []
  patterns:
    - "searchParams Promise (Next.js 15 async) drives date range on home page"
    - "SpendLeadsSection co-located async server component in page.tsx"
    - "DateRangeSelector in own Suspense boundary (required for useSearchParams)"
    - "SpendLeadsSection in separate Suspense boundary with skeleton fallback"
    - "leadsEnabled optional prop with true default for FbTrendChart backward compat"

key_files:
  created:
    - path: "components/dashboard/date-range-selector.tsx"
      purpose: "Client component with useSearchParams for active range styling + Link href navigation"
  modified:
    - path: "app/dashboard/page.tsx"
      purpose: "searchParams-driven page, SpendLeadsSection, DateRangeSelector wiring, removed FB daily transform"
    - path: "components/dashboard/dashboard-overview.tsx"
      purpose: "Removed AnalyticsOverview import/render/props (fbDailyData, isFbConfigured, heroStats grid)"
    - path: "components/dashboard/fb-trend-chart.tsx"
      purpose: "Added optional leadsEnabled prop; conditionally renders leads YAxis, Line, Legend"

decisions:
  - id: "20-02-A"
    decision: "DateRangeSelector gets its own Suspense boundary separate from SpendLeadsSection"
    rationale: "useSearchParams requires Suspense; DateRangeSelector must render immediately without waiting for FB API"
    alternatives: ["Wrap both in same Suspense — would delay range buttons until FB data loads"]
  - id: "20-02-B"
    decision: "SpendLeadsSection co-located in page.tsx as non-exported async function"
    rationale: "Consistent with Phase 16 pattern (FbAdsSection in analytics/page.tsx); avoids new file for page-specific component"
    alternatives: ["Separate file — unnecessary indirection for page-specific component"]
  - id: "20-02-C"
    decision: "leadsEnabled defaults to true in FbTrendChart"
    rationale: "Backward compatibility — analytics/page.tsx calls FbTrendChart without leadsEnabled, must continue showing both spend and leads"
    alternatives: ["Default to false — would break analytics page chart behavior"]

metrics:
  tasks_completed: 3
  tasks_total: 3
  deviations: 0
  duration: "~11 min"
  completed: "2026-03-26"
---

# Phase 20 Plan 02: Home Page Chart Rendering Summary

**One-liner:** searchParams-driven SpendLeadsSection with Suspense streaming replaces broken AnalyticsOverview; FbTrendChart leadsEnabled prop makes leads line conditional on per-client flag.

## What Was Built

Refactored `app/dashboard/page.tsx` to use Next.js 15 async `searchParams` for date range selection, replacing the broken client-side `AnalyticsOverview` with a server-rendered `SpendLeadsSection` that calls `getClientFbDailyTrendByRange(datePreset)` — triggering a real Facebook API fetch on range change.

**CHART-01:** Daily ad spend chart on home page — spend bars in `FbTrendChart` via `SpendLeadsSection`.

**CHART-02:** Leads chart conditional on `leadsChartEnabled` — `FbTrendChart` hides leads Line and right YAxis when `leadsEnabled=false`.

**CHART-03:** Combined chart with Legend when both metrics active — `ComposedChart` with Bar + Line + Legend when `leadsEnabled=true`.

**CHART-05:** Date range drives real API re-fetch — `?range=` searchParam passed to `rangToDatePreset()` then `getClientFbDailyTrendByRange(datePreset)`.

**CHART-06:** `AnalyticsOverview` fully removed from `DashboardOverview`; replaced by `SpendLeadsSection` in `page.tsx`.

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Remove AnalyticsOverview from DashboardOverview and create DateRangeSelector | a8b365f | dashboard-overview.tsx, date-range-selector.tsx |
| 2 | Wire page.tsx with searchParams, SpendLeadsSection, and DateRangeSelector | 1a537a3 | app/dashboard/page.tsx |
| 3 | Make FbTrendChart leads line conditional on leadsEnabled prop | 8f1de4b | fb-trend-chart.tsx |

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| 20-02-A | DateRangeSelector gets its own Suspense boundary | useSearchParams requires Suspense; must not block on FB API |
| 20-02-B | SpendLeadsSection co-located in page.tsx | Consistent with Phase 16 FbAdsSection pattern |
| 20-02-C | leadsEnabled defaults to true | Backward compat with analytics/page.tsx usage |

## Deviations from Plan

None — plan executed exactly as written.

## Next Phase Readiness

Phase 20 (both plans) is complete. The home page now has:
- Real searchParam-driven FB chart re-fetch
- Conditional leads line per leadsChartEnabled admin flag
- Proper Suspense streaming boundaries

Next steps if needed:
- `npx prisma db push` when Supabase is reachable (deferred from 20-01) to persist `leadsChartEnabled` schema change
- Phase 21+ (v1.1 Dashboard Improvements)
