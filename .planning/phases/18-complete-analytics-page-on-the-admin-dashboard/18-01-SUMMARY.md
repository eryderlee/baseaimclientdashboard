---
phase: 18-complete-analytics-page-on-the-admin-dashboard
plan: 01
subsystem: api
tags: [facebook-ads, dal, skeleton, admin, nextjs, react-cache, unstable_cache]

requires:
  - phase: 11-facebook-ads-foundation
    provides: fetchFacebookInsights, fetchFacebookDailyInsights, getActionValue, FbDailyInsight types
  - phase: 16-query-deduplication
    provides: getSettings canonical pattern, verifySession outside cache convention

provides:
  - getAdminFbPerClient DAL function — Record<clientId, {spend, leads}> for last 30d
  - getAdminFbDailyAggregation DAL function — sorted {date, spend, leads}[] across all clients
  - Updated admin loading skeleton matching real page shape (2 rows of 4 cards + table)

affects:
  - 18-02 (wires FB columns into admin table using getAdminFbPerClient and getAdminFbDailyAggregation)

tech-stack:
  added: []
  patterns:
    - "Admin FB DAL: verifySession outside cache, getSettings for token, findMany where adAccountId not null, Promise.allSettled, 6h TTL"
    - "Per-client map pattern: index results by clients[i].id using loop counter to correlate allSettled results"
    - "Daily aggregation pattern: Map<date, {spend, leads}> accumulator, then sort entries and map to array"

key-files:
  created:
    - .planning/phases/18-complete-analytics-page-on-the-admin-dashboard/18-01-SUMMARY.md
  modified:
    - lib/dal.ts
    - app/admin/loading.tsx

key-decisions:
  - "Loop counter (not client.id from result) to correlate Promise.allSettled results with client list — allSettled preserves index order"
  - "Map<string, {spend, leads}> accumulator for daily aggregation — simpler than reduce for multi-client date merging"
  - "Skeleton table uses inline className widths (w-32, w-20, etc.) rather than arbitrary values — stays within Tailwind defaults"

patterns-established:
  - "Admin bulk FB fetch: clients array fetched before cache boundary, accessToken extracted, passed into unstable_cache closure"

duration: 3min
completed: 2026-03-26
---

# Phase 18 Plan 01: Admin FB DAL Functions and Loading Skeleton Summary

**Two admin DAL functions (getAdminFbPerClient and getAdminFbDailyAggregation) added to lib/dal.ts with Promise.allSettled parallel fetching and 6h cache, plus admin loading.tsx rebuilt with 2 rows of 4 metric cards and a table skeleton**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-26T06:10:31Z
- **Completed:** 2026-03-26T06:13:29Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `getAdminFbPerClient` exported from `lib/dal.ts` — returns `Record<string, {spend, leads}>` keyed by client ID, fetches all configured clients in parallel via `Promise.allSettled`, skips failures silently
- `getAdminFbDailyAggregation` exported from `lib/dal.ts` — returns `Array<{date, spend, leads}>` sorted by date, aggregates daily spend/leads across all clients into a single Map before converting to sorted array
- `app/admin/loading.tsx` rebuilt: header, row 1 (4 client metric cards), row 2 (section heading + 4 revenue/marketing cards), clients table skeleton (header + filter bar + header row + 5 body rows with 8 cells each)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add getAdminFbPerClient and getAdminFbDailyAggregation DAL functions** - `915218c` (feat)
2. **Task 2: Fix admin loading.tsx skeleton to match real page shape** - `e9d4b31` (fix)

## Files Created/Modified

- `lib/dal.ts` — Added 115 lines: getAdminFbPerClient and getAdminFbDailyAggregation functions (lines 849–960)
- `app/admin/loading.tsx` — Rebuilt from 29 to 69 lines: 2 metric card rows, section heading, table skeleton with 5 body rows

## Decisions Made

- Loop counter approach to correlate `Promise.allSettled` results with client IDs: `clients[i].id` at index `i` matches `results[i]`. This works because `allSettled` preserves order — no client ID extraction from result needed.
- `Map<date, accumulator>` pattern for daily aggregation: simpler than reduce for multi-source date merging, naturally deduplicates dates across clients before final sort.
- Loading table skeleton uses standard Tailwind width classes (w-10 through w-32) rather than arbitrary values to stay within the generated CSS without needing JIT safelist.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `getAdminFbPerClient` and `getAdminFbDailyAggregation` are exported and TypeScript-clean, ready for Plan 02 to import and use in the admin analytics table and trend chart
- Loading skeleton now mirrors the real page shape, eliminating layout shift when data loads
- No blockers for Plan 02

---
*Phase: 18-complete-analytics-page-on-the-admin-dashboard*
*Completed: 2026-03-26*
