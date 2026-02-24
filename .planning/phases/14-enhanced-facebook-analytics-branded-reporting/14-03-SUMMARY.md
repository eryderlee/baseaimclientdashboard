---
phase: 14-enhanced-facebook-analytics-branded-reporting
plan: "03"
subsystem: ui
tags: [jspdf, jspdf-autotable, pdf-export, csv-export, facebook-ads, reporting, branded]

# Dependency graph
requires:
  - phase: 14-01
    provides: FbCampaignInsight, FbPlatformRow, FbAction, getActionValue types and helpers
  - phase: 14-02
    provides: ExportButtons component with campaigns/platforms props wired from FbAdsMetrics
provides:
  - Branded PDF export with #2563eb header bar and BASEAIM white text logo
  - 12-metric PDF layout in two columns (spend, impressions, clicks, CTR, CPC, CPM, reach, frequency, leads, CPL, outbound clicks, LPV)
  - Quality rankings text line in PDF
  - Campaign breakdown table via jspdf-autotable with blue header row
  - Platform split table via jspdf-autotable with blue header row
  - Extended CSV with 17 rows covering all metrics, quality rankings, and date range
  - baseaim-fb-report- filename prefix on both exports
affects: [15-production-deployment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dynamic import of jspdf-autotable inside async function — browser-only lib, avoids SSR bundle"
    - "autoTable(doc, opts) named export pattern for jspdf-autotable v5 — NOT doc.autoTable()"
    - "(doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY for next Y position after table"
    - "Helper functions getLeads/getOutboundClicks/getCplValue duplicated in client component (acceptable for client-side-only file)"

key-files:
  created: []
  modified:
    - app/dashboard/analytics/export-buttons.tsx

key-decisions:
  - "autoTable is a NAMED EXPORT function in jspdf-autotable v5 — use autoTable(doc, opts), NOT doc.autoTable()"
  - "(doc as unknown as {...}).lastAutoTable.finalY preferred over (doc as any) — avoids lint warning while maintaining noEmit clean build"
  - "Helper functions (getLeads, getOutboundClicks, getCplValue) duplicated in export-buttons.tsx — acceptable since this is a client component file separate from fb-ads-metrics.tsx"
  - "setFillColor(37, 99, 235) uses RGB numbers — jsPDF does not accept hex strings"
  - "Dynamic import inside exportPdf function body — jspdf and jspdf-autotable are browser-only, must not enter SSR bundle"

patterns-established:
  - "Branded PDF pattern: full-width colored rect at y=0 + white text logo for BaseAim reports"
  - "Two-column metrics layout: left 6 at x=10/50, right 6 at x=110/155, starting y=38, 8mm row spacing"
  - "baseaim-fb-report-{dateRange}-{date} filename prefix for all export artifacts"

# Metrics
duration: 1min
completed: 2026-02-24
---

# Phase 14 Plan 03: Branded PDF Export & Extended CSV Summary

**jspdf-autotable branded PDF with #2563eb BASEAIM header, 12-metric two-column layout, campaign/platform tables, and 17-row extended CSV export**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-24T11:54:51Z
- **Completed:** 2026-02-24T11:55:52Z
- **Tasks:** 1 of 1
- **Files modified:** 1

## Accomplishments

- Rewrote exportPdf with full branded layout: #2563eb header bar, BASEAIM white text, date subtitle, 12 metrics in two columns, quality rankings line, campaign autoTable, platform autoTable, and footer
- Extended exportCsv from 8 rows to 17 rows: all 12 metrics (including reach, frequency, leads, CPL, outbound clicks, LPV) plus 3 quality rankings and date range
- Added helper functions getLeads, getOutboundClicks, getCplValue to support all new metric computations in client component
- Updated filename prefix from `facebook-ads-` to `baseaim-fb-report-` on both CSV and PDF exports
- Wired campaigns and platforms through to exportPdf call — graceful when undefined (tables only render if non-empty)

## Task Commits

Each task was committed atomically:

1. **Task 1: Upgrade ExportButtons with branded PDF and extended CSV** - `85e417d` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `app/dashboard/analytics/export-buttons.tsx` - Rewrote exportPdf with branded header, 12 metrics, autoTable campaign/platform tables, and extended exportCsv with 17 rows

## Decisions Made

- `autoTable(doc, opts)` named export call pattern for jspdf-autotable v5 — the old doc.autoTable() method API does not exist in v5
- Used `(doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY` instead of `(doc as any)` for typed access to jspdf-autotable's finalY value — avoids TypeScript any warning while keeping noEmit clean
- Duplicated getLeads/getOutboundClicks/getCplValue helpers in export-buttons.tsx rather than importing from fb-ads-metrics.tsx — export-buttons is a standalone client component, duplication is acceptable and avoids cross-component coupling
- `setFillColor(37, 99, 235)` with RGB numbers — jsPDF API does not accept hex strings
- Dynamic import inside exportPdf async function body ensures jspdf and jspdf-autotable never enter the server-side bundle

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 14 is now complete: all 3 plans done (14-01 API+DAL, 14-02 UI components, 14-03 exports)
- Branded PDF export with professional BaseAim header ready for client use (FBADS-EXT-05 fulfilled)
- Phase 15 (Production Deployment) can proceed — all dashboard features are complete

---
*Phase: 14-enhanced-facebook-analytics-branded-reporting*
*Completed: 2026-02-24*
