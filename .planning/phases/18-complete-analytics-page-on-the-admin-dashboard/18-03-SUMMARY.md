---
phase: 18
plan: 03
subsystem: admin-analytics
tags: [analytics, facebook-ads, dal, tables, dashboard]
requires: [18-02]
provides: [comprehensive-admin-analytics-page]
affects: []
tech-stack:
  added: []
  patterns: [parallel-data-fetch, per-task-commits, streaming-suspense]
key-files:
  created:
    - components/admin/admin-client-fb-table.tsx
    - components/admin/admin-campaigns-table.tsx
  modified:
    - lib/dal.ts
    - app/admin/analytics/page.tsx
decisions:
  - "getAdminFbMetricsPerClient uses Promise.allSettled + unstable_cache, identical pattern to getAdminFbPerClient"
  - "getAdminAllCampaigns reuses fetchFacebookCampaignInsights already imported in dal.ts"
  - "CPL computed at render time (spend / leads) — not stored in DAL return type"
  - "RISK_LEVEL_ORDER const for sort comparator — avoids per-call object creation"
  - "Build error confirmed pre-existing Windows EINVAL on node:inspector chunk — not introduced by this work"
metrics:
  duration: "~8 min"
  completed: "2026-03-26"
---

# Phase 18 Plan 03: Comprehensive Admin Analytics Page Summary

**One-liner:** Full analytics dashboard with per-client FB metrics table, all-campaigns table, KPI row, trend chart, and project health panel — backed by two new DAL functions.

## What Was Built

Replaced the thin analytics page (just `<AnalyticsSummary>` + trend chart) with a five-section analytics dashboard:

1. **KPI Row** — 6 compact cards in `grid-cols-6`: Active Clients, Total Revenue, MRR, FB Spend (30d), Total Leads (30d), At Risk
2. **Facebook Ads — Per Client** — `AdminClientFbTable` showing Spend / Leads / CPL / Impressions / CTR / CPC per client
3. **Campaign Performance** — `AdminCampaignsTable` showing all campaigns across all clients, sorted by spend, with client badge chips
4. **Trend Chart** — existing `AdminFbTrendChart` in a Suspense boundary, now with a CardDescription subtext
5. **Project Health** — two-column grid: At-Risk Clients (top 5 by severity, with color-coded risk level badges) + Upcoming Milestones (next 7 days)

## New DAL Functions

### `getAdminFbMetricsPerClient()`
- Returns `Record<clientId, { spend, leads, impressions, clicks, ctr, cpc, cpm, reach }>`
- `verifySession()` called before `unstable_cache` boundary (Next.js constraint)
- 6h TTL, cache key `admin-fb-metrics-per-client-v1`
- Uses `Promise.allSettled` — individual client failures are silently skipped

### `getAdminAllCampaigns()`
- Returns sorted array of campaign rows with `clientName` included
- Reuses `fetchFacebookCampaignInsights` (already imported)
- CTR computed inline: `clicks / impressions * 100`
- Sorted by spend descending
- 6h TTL, cache key `admin-all-campaigns-v1`

## New Components

### `AdminClientFbTable`
- `'use client'` — Table from `@/components/ui/table`
- Mobile-responsive: impressions/CTR/CPC columns use `hidden md:table-cell`
- Empty state: glass-card dashed border pattern per STATE.md convention
- CPL shows `—` when leads === 0

### `AdminCampaignsTable`
- `'use client'` — same table primitives
- `ClientBadge` sub-component: small rounded pill with `bg-blue-50 text-blue-700`
- Campaign name cell: `max-w-[200px] truncate` with `title` for full text on hover
- Same empty state and mobile-responsive pattern

## Data Flow

```
Page (server async)
  → Promise.all([getAdminAnalytics, getAdminRevenueAnalytics, getAdminFbAggregation,
                 getAdminFbMetricsPerClient, getAdminAllCampaigns, getAllClientsWithMilestones])
  → Build clientNameMap from allClients
  → Build fbClientRows with CPL computed
  → Build campaignRows with CPL computed
  → Build atRiskClients via detectClientRisk, sort by RISK_LEVEL_ORDER, slice 5
  → Render sections
  → Suspense boundary wraps TrendChartSection (getAdminFbDailyAggregation)
```

## Deviations from Plan

None — plan executed exactly as written.

## Build Notes

The `npm run build` command exits with code 1 due to a pre-existing Windows filesystem error:
```
EINVAL: invalid argument, copyfile '...chunks\[externals]_node:inspector_7a4283c6._.js' -> '...standalone\...'
```
Colons are invalid in Windows file paths but Next.js/Turbopack generates a chunk named after `node:inspector`. This error is unrelated to this work — verified by running the same build on the prior commit (same error). Compilation and page generation complete successfully (`✓ Compiled`, `✓ Generating static pages`).

## Commits

| Hash    | Message |
|---------|---------|
| ccdda4a | feat(analytics): add getAdminFbMetricsPerClient and getAdminAllCampaigns DAL functions |
| 2ea7736 | feat(analytics): add per-client FB metrics and campaigns table components |
| 62661da | feat(analytics): comprehensive admin analytics page with FB metrics, campaigns, and project health |
