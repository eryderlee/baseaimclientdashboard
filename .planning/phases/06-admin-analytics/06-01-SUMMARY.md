---
phase: 06-admin-analytics
plan: 01
subsystem: analytics
tags: [risk-detection, admin-dashboard, date-fns, analytics, shadcn-ui]

# Dependency graph
requires:
  - phase: 05-client-onboarding-and-management
    provides: Admin dashboard structure with client table and management features
  - phase: 04-admin-milestone-editing
    provides: Milestone progress calculation and status management
  - phase: 02-core-progress-tracking
    provides: calculateOverallProgress utility for aggregate metrics
provides:
  - Risk detection system identifying overdue and stalled milestones with severity levels
  - Admin analytics aggregation via DAL with caching
  - Reusable analytics summary cards component
  - Risk badge component for visual risk indicators
affects: [06-02-admin-analytics-integration, admin-reporting, client-health-monitoring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Risk detection with multi-level severity (none/low/medium/high)
    - Analytics aggregation reusing cached DAL functions
    - Upcoming due dates calculation with 7-day window
    - Server component analytics cards with serialized date transport

key-files:
  created:
    - lib/utils/risk-detection.ts
    - components/admin/analytics-summary.tsx
    - components/admin/at-risk-indicator.tsx
  modified:
    - lib/dal.ts

key-decisions:
  - "Risk detection uses overdue + stalled milestone heuristics with weighted severity"
  - "Stalled detection: IN_PROGRESS 14+ days with <50% progress indicates low risk alone"
  - "Overdue severity: 1 overdue = medium, 2+ overdue = high, stalled+overdue = high"
  - "Analytics reuses getAllClientsWithMilestones for efficient caching via React cache()"
  - "Upcoming due dates limited to 7-day window, sorted by date ascending"
  - "Risk badge returns null for 'none' level to avoid visual noise"

patterns-established:
  - "Risk detection pattern: detectClientRisk accepts client with milestones array, returns RiskIndicators with level and reasons"
  - "Analytics summary uses 4-card grid layout (md:grid-cols-2 lg:grid-cols-4) matching existing admin dashboard pattern"
  - "Date serialization: DAL returns Date objects, components accept ISO string props for server-to-client transport"

# Metrics
duration: 4min
completed: 2026-02-15
---

# Phase 6 Plan 1: Admin Analytics Foundation Summary

**Risk detection system with overdue/stalled heuristics, cached analytics aggregation, and reusable metric card components**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-15T18:30:03Z
- **Completed:** 2026-02-15T18:34:25Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Built risk detection utility identifying overdue milestones (past due date, not COMPLETED) and stalled milestones (IN_PROGRESS 14+ days with <50% progress)
- Created getAdminAnalytics DAL function aggregating 7 metrics: total/active clients, average progress, at-risk count, upcoming due dates, total/completed milestones
- Developed AnalyticsSummary component with 4 metric cards and upcoming milestones list
- Created RiskBadge component with color-coded severity levels (low/medium/high) and AlertTriangle icon

## Task Commits

Each task was committed atomically:

1. **Task 1: Risk detection utility and DAL analytics function** - `388fd91` (feat)
2. **Task 2: Analytics summary cards and risk badge components** - `b357000` (feat)

## Files Created/Modified

- `lib/utils/risk-detection.ts` - Exports detectClientRisk function and RiskIndicators interface, implements overdue/stalled detection with severity levels
- `lib/dal.ts` - Added getAdminAnalytics function with React cache(), aggregates 7 metrics across all clients with milestones
- `components/admin/analytics-summary.tsx` - Server component rendering 4 metric cards (Total Clients, Average Progress, At Risk, Upcoming Due Dates) plus upcoming milestones list
- `components/admin/at-risk-indicator.tsx` - Server component rendering risk badges with color variants (yellow/orange/red) and AlertTriangle icon

## Decisions Made

**Risk detection uses weighted heuristics for severity:**
- Stalled alone (IN_PROGRESS 14+ days, <50% progress) = low risk
- 1 overdue milestone = medium risk
- 2+ overdue OR stalled + overdue = high risk
- Reasons array provides human-readable explanations for admin review

**Analytics reuses cached DAL functions:**
- getAdminAnalytics calls getAllClientsWithMilestones (already cached)
- Leverages React cache() deduplication to avoid redundant database queries
- Iterates over cached client data for aggregate calculations

**Upcoming due dates limited to 7-day window:**
- Filters milestones with dueDate between now and 7 days from now
- Excludes COMPLETED milestones
- Sorted by date ascending for priority order
- Returns array with clientName, milestoneTitle, dueDate for display

**Risk badge returns null for 'none' level:**
- Avoids visual clutter when no risk detected
- Only renders badges for low/medium/high severity
- Uses shadcn Badge variants: secondary (yellow), outline (orange), destructive (red)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all TypeScript types resolved correctly, existing utilities (date-fns, calculateOverallProgress) worked as expected.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Analytics foundation complete. Ready for Plan 02 to integrate these components into the admin dashboard page.

**What's ready:**
- getAdminAnalytics provides all aggregate metrics
- AnalyticsSummary component ready to render on admin page
- RiskBadge component ready to enhance client table rows
- Risk detection logic available for filtering/sorting clients

**Integration needs:**
- Replace or supplement existing stat cards on app/admin/page.tsx with AnalyticsSummary
- Add RiskBadge to client table rows based on detectClientRisk results
- Update admin dashboard to fetch and display analytics data

---
*Phase: 06-admin-analytics*
*Completed: 2026-02-15*
