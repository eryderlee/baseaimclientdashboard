---
phase: 11-facebook-ads-analytics
plan: 03
subsystem: ui
tags: [facebook-ads, analytics, jspdf, csv-export, pdf-export, react, next.js, searchParams]

# Dependency graph
requires:
  - phase: 11-01
    provides: getClientFbInsights DAL function, FbInsights type, DatePreset type, 6-hour unstable_cache
  - phase: 11-02
    provides: Admin FB token settings UI, per-client adAccountId field in edit form

provides:
  - FbAdsMetrics client component with 3 states (not-configured, no-data, 6-card metrics grid)
  - ExportButtons component with CSV (Blob API) and PDF (jspdf dynamic import)
  - Updated analytics page: FB Ads section at top, existing Project Metrics + Charts preserved below
  - URL-driven date range switching (?range=7d|30d|all), defaulting to 30d

affects: [12-production-readiness, 13-ui-polish]

# Tech tracking
tech-stack:
  added: [jspdf@3.x (client-side PDF generation, dynamic import only)]
  patterns:
    - Dynamic import for browser-only libraries (jspdf via import('jspdf') inside onClick handler)
    - URL search params for date range state (useSearchParams + router.push for re-fetch)
    - Server component reads searchParams as Promise (Next.js 15 async pattern)
    - isConfigured check via prisma.client.findUnique({ select: { adAccountId } }) at page level

key-files:
  created:
    - components/dashboard/fb-ads-metrics.tsx
    - app/dashboard/analytics/export-buttons.tsx
  modified:
    - app/dashboard/analytics/page.tsx
    - package.json
    - package-lock.json

key-decisions:
  - "Dynamic import('jspdf') inside onClick handler — avoids SSR bundle, only loads on demand"
  - "isConfigured check at page level (not in FbAdsMetrics) — keeps component stateless, easier to test"
  - "searchParams.range defaults to '30d' when absent — consistent with plan default"
  - "rangToDatePreset() maps '7d'→'last_7d', 'all'→'maximum', '30d'→'last_30d' for DAL"

patterns-established:
  - "FbAdsMetrics receives isConfigured prop — component renders 3 states, server decides which"
  - "ExportButtons rendered inside FbAdsMetrics (in date range row) only when insights != null"
  - "FB section with h2 heading above Project Metrics — consistent section hierarchy"

# Metrics
duration: ~12min
completed: 2026-02-21
---

# Phase 11 Plan 03: Client Analytics Page - FB Ads Metrics, Export Buttons Summary

**Client-facing analytics page with real FB Ads 6-metric grid, URL-driven date range switcher, and CSV/PDF export via jspdf dynamic import**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-02-21T12:00:00Z
- **Completed:** 2026-02-21T12:12:00Z
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint — approved)
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments
- Installed jspdf and created FbAdsMetrics component handling 3 states: not-configured, no-data, 6-card metrics grid
- ExportButtons with CSV (native Blob API) and PDF (jspdf dynamic import to avoid SSR bundle)
- Updated analytics page: reads searchParams.range, calls getClientFbInsights, renders FB section above existing content
- Build succeeds, TypeScript compiles clean (npx tsc --noEmit passed)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install jspdf and create FbAdsMetrics + ExportButtons components** - `8b686c0` (feat)
2. **Task 2: Update analytics page — real data, searchParams date range, FB section above existing content** - `2720d9f` (feat)

3. **Task 3: Human verification checkpoint — user approved** - `—` (checkpoint)

## Files Created/Modified
- `components/dashboard/fb-ads-metrics.tsx` - FbAdsMetrics client component: date range switcher, 3-state rendering (not-configured / no-data / 6-card grid), renders ExportButtons when data present
- `app/dashboard/analytics/export-buttons.tsx` - ExportButtons client component: CSV Blob download, PDF via dynamic jspdf import
- `app/dashboard/analytics/page.tsx` - Server component reading async searchParams, calling getClientFbInsights, checking isConfigured, rendering FB section above Project Metrics + AnalyticsCharts
- `package.json` - Added jspdf dependency
- `package-lock.json` - Lock file updated

## Decisions Made
- Dynamic `import('jspdf')` inside the `exportPdf` onClick handler — jspdf is browser-only, dynamic import prevents SSR bundle inclusion
- `isConfigured` resolved at page level via `prisma.client.findUnique({ select: { adAccountId } })` — keeps FbAdsMetrics purely presentational
- searchParams defaults to `'30d'` when `range` param is absent or invalid — most useful default for ad performance review
- `rangToDatePreset()` helper maps UI range strings to Facebook API `DatePreset` values

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no new external service configuration required for Plan 03. Facebook token and adAccountId configuration was handled in Plans 01 and 02.

## Next Phase Readiness

Phase 11 fully complete. Human verification approved 2026-02-22.

Verified working:
1. Admin settings FB token field — saves and persists correctly
2. Client edit adAccountId field with act_ validation — validates and saves correctly
3. Analytics page not-configured state — renders without error when adAccountId absent
4. Date range URL switching — ?range=7d|30d|all updates active button and re-fetches
5. Build — succeeds clean

Note from user: Dashboard home page chart is not synced with the analytics page date range. Acknowledged as a separate issue, not blocking Phase 12.

Phase 12 (Production Readiness) can begin.

---
*Phase: 11-facebook-ads-analytics*
*Completed: 2026-02-21*
