---
phase: 18-complete-analytics-page-on-the-admin-dashboard
plan: 02
subsystem: ui
tags: [recharts, suspense, skeleton, facebook-ads, admin-dashboard, streaming]

# Dependency graph
requires:
  - phase: 18-01
    provides: getAdminFbPerClient and getAdminFbDailyAggregation DAL functions
  - phase: 14-enhanced-facebook-analytics
    provides: recharts ComposedChart spend+leads pattern in fb-trend-chart.tsx
  - phase: 16-query-deduplication
    provides: Suspense streaming architecture pattern for admin page
provides:
  - FB Spend and FB Leads columns in the admin client analytics table (hidden on mobile)
  - AdminFbTrendChart client component — recharts ComposedChart for admin aggregate 30-day trend
  - AdminFbTrendSection async server component with independent Suspense boundary
  - Styled skeleton fallbacks for all Suspense boundaries on the admin page
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AdminFbTrendSection as co-located async server component — local (non-exported) async function components for streaming sections"
    - "AdminFbTrendSkeleton as co-located local skeleton — inline skeleton mirrors chart Card shape"
    - "Inline Suspense fallback JSX for filter/table skeletons — avoids separate skeleton component files for simple shapes"

key-files:
  created:
    - components/admin/admin-fb-trend-chart.tsx
    - .planning/phases/18-complete-analytics-page-on-the-admin-dashboard/18-02-SUMMARY.md
  modified:
    - components/admin/client-analytics-table.tsx
    - app/admin/page.tsx

key-decisions:
  - "AdminFbTrendSkeleton and AdminFbTrendSection co-located in app/admin/page.tsx as local (non-exported) functions — avoids new files for short, page-specific components"
  - "AdminFbTrendChart formats dates inline via toLocaleDateString — no extra state or range selector needed since data is always 30d from the DAL"
  - "Inline Suspense fallback JSX for filter and table skeletons — shapes are simple enough to define inline without dedicated skeleton component files"
  - "FB columns use hidden md:table-cell — prevents horizontal overflow on mobile without breaking existing table structure"
  - "Build failure was pre-existing Windows EINVAL (node:inspector chunk, colon-in-filename) — all 24 pages compiled and generated successfully; unrelated to plan changes"

patterns-established:
  - "AdminFbTrendChart: simplified variant of FbTrendChart without range selector — when DAL always returns fixed range, omit range UI"

# Metrics
duration: 8min
completed: 2026-03-26
---

# Phase 18 Plan 02: FB Analytics UI and Suspense Streaming Summary

**Per-client FB Spend/Leads columns in admin table, recharts aggregate trend chart with independent Suspense streaming, and styled skeleton fallbacks replacing all bare-text Suspense fallbacks**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-26T06:16:34Z
- **Completed:** 2026-03-26T06:24:00Z
- **Tasks:** 2
- **Files modified:** 3 (+ 1 created)

## Accomplishments
- Added `fbSpend` and `fbLeads` optional fields to the `ClientData` interface and table — two responsive columns hidden on mobile
- Created `AdminFbTrendChart` client component with recharts `ComposedChart` (spend bars + leads line, dual Y-axis, empty state)
- Wired `getAdminFbPerClient` into admin page `Promise.all` and mapped `fbSpend`/`fbLeads` onto each processed client
- Added `AdminFbTrendSection` async server component + `AdminFbTrendSkeleton`, placed between AnalyticsSummary and the Clients Table in its own `Suspense` boundary
- Replaced `<div>Loading filters...</div>` and `<div>Loading clients...</div>` with styled `Skeleton` fallbacks matching the shape of `ClientFilters` and the table

## Task Commits

Each task was committed atomically:

1. **Task 1: Add FB columns to ClientAnalyticsTable and create AdminFbTrendChart** - `e27bf33` (feat)
2. **Task 2: Wire everything in admin page — FB data, trend Suspense, styled fallbacks** - `6e82872` (feat)

## Files Created/Modified
- `components/admin/client-analytics-table.tsx` - Extended `ClientData` interface with `fbSpend`/`fbLeads`; added two responsive `hidden md:table-cell` table columns
- `components/admin/admin-fb-trend-chart.tsx` - New `'use client'` recharts `ComposedChart` component for admin aggregate FB spend + leads trend (30d, no range selector)
- `app/admin/page.tsx` - Added `getAdminFbPerClient` to `Promise.all`, mapped FB data onto processed clients, added `AdminFbTrendSection` async component + `AdminFbTrendSkeleton`, placed trend section in Suspense, replaced bare-text Suspense fallbacks with `Skeleton` UI

## Decisions Made
- `AdminFbTrendSkeleton` and `AdminFbTrendSection` defined as local non-exported functions in `app/admin/page.tsx` — they are page-specific, short, and co-location avoids unnecessary extra files
- `AdminFbTrendChart` formats dates inline, no range state — data is always 30 days from `getAdminFbDailyAggregation`, range selector would be redundant
- Inline Suspense fallback JSX (not separate files) for filter and table skeletons — shapes are simple enough to express inline

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

`npm run build` exited with EINVAL when copying `[externals]_node:inspector_7a4283c6._.js` to the standalone output directory. This is a pre-existing Windows issue (colons in Turbopack-generated filenames are invalid on Windows NTFS). TypeScript compiled cleanly (`npx tsc --noEmit` passed), all 24 pages were generated successfully, and the admin page bundle exists at `.next/server/app/admin/page.js`. The error is unrelated to plan changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 18 is now fully complete:
- Plan 18-01: `getAdminFbPerClient` and `getAdminFbDailyAggregation` DAL functions
- Plan 18-02: FB columns in table, aggregate trend chart, Suspense streaming, styled skeletons

All analytics gaps are closed. The admin dashboard now shows per-client FB performance and a 30-day aggregate trend chart alongside the existing summary cards.

---
*Phase: 18-complete-analytics-page-on-the-admin-dashboard*
*Completed: 2026-03-26*
