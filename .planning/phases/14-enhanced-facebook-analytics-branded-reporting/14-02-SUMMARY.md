---
phase: 14-enhanced-facebook-analytics-branded-reporting
plan: "02"
subsystem: facebook-ads-ui
tags: [facebook-ads, recharts, analytics, ui-components, metrics, data-visualization]

dependency-graph:
  requires:
    - "14-01"  # Extended FbInsights type, FbCampaignInsight, FbPlatformRow, DAL functions
  provides:
    - "12-card metrics grid with QualityPill component"
    - "FbTrendChart: 30-day ComposedChart dual-axis spend+leads"
    - "FbCampaignTable: top 5 campaign breakdown table"
    - "FbPlatformSplit: per-platform spend/impressions/clicks"
    - "Analytics page with parallel data fetching"
  affects:
    - "14-03"  # ExportButtons now receives campaigns/platforms props — ready for enhanced PDF/CSV

tech-stack:
  added: []
  patterns:
    - "recharts ComposedChart with dual YAxis (left spend, right leads)"
    - "QualityPill: ABOVE_AVERAGE→emerald, AVERAGE→amber, BELOW_AVERAGE*→red, UNKNOWN→hidden"
    - "Promise.all parallel fetch: fbInsights + campaigns + platforms + dailyTrend"
    - "buildTrendData() transformer: FbDailyInsight[] → TrendDataPoint[]"
    - "HTML table with Tailwind (not shadcn Table) for campaign breakdown"

key-files:
  created:
    - components/dashboard/fb-trend-chart.tsx
    - components/dashboard/fb-campaign-table.tsx
    - components/dashboard/fb-platform-split.tsx
  modified:
    - components/dashboard/fb-ads-metrics.tsx
    - app/dashboard/analytics/page.tsx
    - app/dashboard/analytics/export-buttons.tsx

decisions:
  - id: "dual-axis-chart"
    choice: "recharts ComposedChart with Bar (spend) + Line (leads) on separate YAxis"
    reason: "Different scales — spend in dollars, leads as integers — dual axis prevents compression"
  - id: "campaign-html-table"
    choice: "Plain HTML table with Tailwind instead of shadcn Table"
    reason: "Simpler for read-only data display, avoids shadcn table import overhead"
  - id: "tooltip-formatter-removed"
    choice: "Removed custom Tooltip formatter to satisfy recharts TypeScript overloaded signature"
    reason: "Recharts Formatter<V,N> expects value: V (number not number|undefined) — default tooltip is sufficient"
  - id: "sections-guard"
    choice: "Trend/campaigns/platform sections guarded by isConfigured && fbInsights"
    reason: "Prevents rendering chart components with no data — trend data is always last_30d regardless of range selector"

metrics:
  duration: "4m 36s"
  completed: "2026-02-24"
---

# Phase 14 Plan 02: Enhanced FB Analytics UI Summary

**One-liner:** Expanded FB analytics from 6 to 12 metric cards, added QualityPill component (emerald/amber/red), 30-day ComposedChart spend+leads trend, campaign breakdown table, and platform split — all wired to parallel DAL fetches.

## What Was Built

### fb-ads-metrics.tsx — 12-Card Grid + Quality Pills

The FbAdsMetrics component was substantially expanded:

**6 new metric cards added** (existing 6 kept):
- Reach — `formatNumber(insights.reach)` with Users icon
- Frequency — `parseFloat(insights.frequency).toFixed(2)` with Repeat icon
- Leads — summed from actions array via `getActionValue('lead') + getActionValue('offsite_conversion.fb_pixel_lead')`
- Cost Per Lead — `$spend / leads` or `--` if zero leads
- Outbound Clicks — reduced from `outbound_clicks: FbAction[]` array (not string)
- Landing Page Views — extracted from actions array via `getActionValue(actions, 'landing_page_view')`

**QualityPill component:** Returns null when value is undefined/UNKNOWN. Color map:
- ABOVE_AVERAGE → `bg-emerald-100 text-emerald-800`
- AVERAGE → `bg-amber-100 text-amber-800`
- BELOW_AVERAGE_35/20 → `bg-red-100 text-red-800`
- BELOW_AVERAGE_10 → `bg-red-200 text-red-900`

**Grid layout updated:** `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`

**New props accepted:** `campaigns?: FbCampaignInsight[]` and `platforms?: FbPlatformRow[]` forwarded to ExportButtons (Plan 03 ready).

### fb-trend-chart.tsx — Dual-Axis Spend + Leads Chart

- `TrendDataPoint` type: `{ date: string; spend: number; leads: number }`
- `buildTrendData()` helper: transforms `FbDailyInsight[]` with short date format ("Jan 5")
- `FbTrendChart` component: `ResponsiveContainer` wrapping `ComposedChart`
  - Left YAxis for spend (dollar formatted via tick)
  - Right YAxis for leads (integers only, no decimals)
  - Blue `Bar` (spend, barSize=20) + Emerald `Line` (leads, strokeWidth=2, dot=false)
  - Empty state shows dashed border card with message

### fb-campaign-table.tsx — Top 5 Campaigns

- HTML table (not shadcn) with Tailwind styling
- Columns: Campaign, Spend, Impressions, Clicks, Leads
- Leads derived from `getActionValue(actions, 'lead') + getActionValue(actions, 'offsite_conversion.fb_pixel_lead')`
- Truncated campaign names (`max-w-[200px] truncate`)
- Empty state with dashed border card

### fb-platform-split.tsx — Platform Breakdown

- Responsive grid: `sm:grid-cols-2 lg:grid-cols-3`
- Per-platform cards showing: spend, impressions, clicks
- Spend % badge: `(platform.spend / totalSpend * 100).toFixed(1)%`
- `capitalize()` helper: "facebook" → "Facebook"
- Empty state with dashed border card

### app/dashboard/analytics/page.tsx — Parallel Fetching

Updated to fetch all data in parallel:
```typescript
const [fbInsights, campaigns, platforms, dailyTrend] = await Promise.all([
  getClientFbInsights(datePreset),
  getClientFbCampaigns(datePreset),
  getClientFbPlatformBreakdown(datePreset),
  getClientFbDailyTrend(),
])
```

New sections rendered inside `isConfigured && fbInsights` guard:
- 30-Day Spend & Leads Trend
- Top Campaigns
- Platform Breakdown

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Recharts Tooltip formatter TypeScript incompatibility**

- **Found during:** Task 2 TypeScript check
- **Issue:** Recharts `Formatter<number, string>` expects `value: number` (not `number | undefined`) and `name: string | undefined` — the overloaded function signature could not be satisfied
- **Fix:** Removed custom formatter entirely; default recharts tooltip is sufficient for displaying spend/leads values
- **Files modified:** `components/dashboard/fb-trend-chart.tsx`
- **Commit:** `5dd8c8d`

## Commits

| Hash | Message |
|------|---------|
| `4590fce` | feat(14-02): expand fb-ads-metrics to 12 cards with quality pills |
| `5dd8c8d` | feat(14-02): add trend chart, campaign table, platform split + wire analytics page |

## Next Phase Readiness

**Plan 14-03** (Branded PDF/CSV Export) can proceed immediately:
- ExportButtons already accepts `campaigns?: FbCampaignInsight[]` and `platforms?: FbPlatformRow[]`
- Data flows: analytics page → FbAdsMetrics → ExportButtons
- jspdf-autotable@5.0.7 already installed (from Plan 01)
- All new metric values (reach, frequency, leads, CPL, outbound clicks, landing page views) are available in the FbInsights type for export
