---
phase: 21
plan: 02
subsystem: facebook-ads-analytics
tags: [recharts, facebook-ads, roas, analytics, charts]

dependency-graph:
  requires: ["21-01"]
  provides: ["daily-roas-in-trend-chart", "three-series-fb-trend-chart"]
  affects: []

tech-stack:
  added: []
  patterns:
    - "ROAS Y axis hidden (hide=true) for independent scale without visual clutter"
    - "getActionValue reused for action_values — same FbAction[] shape as actions"
    - "Daily ROAS computed server-side in buildTrendData, passed as prop to chart"

key-files:
  created: []
  modified:
    - lib/facebook-ads.ts
    - components/dashboard/fb-trend-chart.tsx

decisions:
  - "Tooltip formatter omitted — default tooltip avoided TypeScript overload issues (Phase 14 precedent)"
  - "YAxis for ROAS set hide=true — avoids visual axis clutter while enabling independent scale"
  - "Three action_type fallbacks for purchaseValue: offsite_conversion.fb_pixel_purchase → omni_purchase → purchase"

metrics:
  duration: "~5 min"
  completed: "2026-03-27"
---

# Phase 21 Plan 02: Daily ROAS in FbTrendChart Summary

**One-liner:** Extended FbTrendChart with amber dashed ROAS line (third series) by fetching action_values daily and computing purchaseValue/spend per day in buildTrendData.

## What Was Built

Added daily ROAS as a third data series on the analytics tab FbTrendChart. The Facebook API now fetches `action_values` alongside existing daily fields, enabling per-day purchase revenue extraction. `buildTrendData` computes `roas = purchaseRevenue / spend` (zero-guarded) for each day and includes it in `TrendDataPoint`. The chart renders a hidden ROAS Y axis for independent scaling, and an amber dashed Line for ROAS alongside the existing spend bar and leads line.

## Tasks Completed

| Task | Commit | Description |
|------|--------|-------------|
| Task 1: Extend daily FB data with action_values and compute ROAS | 3be2474 | DAILY_FIELDS, FbDailyInsight, TrendDataPoint, buildTrendData |
| Task 2: Add ROAS line series to FbTrendChart | 8ce539d | Hidden YAxis, amber dashed Line, legend |

## Changes Made

### lib/facebook-ads.ts

- Added `action_values` to `DAILY_FIELDS` constant — Facebook API now returns purchase revenue per day
- Added `action_values?: FbAction[]` field to `FbDailyInsight` interface
- Added `roas: number` field to `TrendDataPoint` interface
- Updated `buildTrendData` to compute daily ROAS with three action_type fallbacks and zero-division guard

### components/dashboard/fb-trend-chart.tsx

- Added `<YAxis yAxisId="roas" orientation="right" hide={true} />` for independent ROAS scaling
- Added `<Line yAxisId="roas" dataKey="roas" stroke="#f59e0b" strokeDasharray="5 3" name="ROAS" />` for amber dashed ROAS series

### app/dashboard/analytics/page.tsx

No changes needed — `buildTrendData(dailyTrend)` already returns `roas` in each point; chart picks it up automatically.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| No custom Tooltip formatter | Default tooltip avoids TypeScript Formatter<V,N> overload incompatibility (Phase 14 precedent) |
| hide={true} on ROAS Y axis | Avoids visual clutter of three stacked axis labels on right side; values visible in tooltip |
| Three fallback action_types for purchaseValue | Covers offsite pixel purchase, omni purchase (website+app), and generic purchase event |

## Requirements Satisfied

- **CHART-04:** Spend chart, leads chart, and combined chart visible on analytics tab
- **CHART-08:** ROAS included in analytics tab charts as a visible data series

## Deviations from Plan

None — plan executed exactly as written.

## Next Phase Readiness

Phase 21 is now complete. Both plans delivered:
- Plan 01: `purchase_roas` field + `getRoas()` helper + ROAS metric cards on home + analytics pages
- Plan 02: Daily ROAS series in FbTrendChart

Next phase per roadmap: Phase 22 (planned).
