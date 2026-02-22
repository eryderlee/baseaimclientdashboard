---
phase: 12-production-hardening
plan: 02
subsystem: ui
tags: [nextjs, skeleton, loading-states, error-boundary, react]

# Dependency graph
requires:
  - phase: 12-01-production-hardening
    provides: CSP headers, Sentry instrumentation, env validation foundation
provides:
  - 10 loading.tsx skeleton screens for all dashboard and admin routes
  - 3 error.tsx boundaries for dashboard, admin, and app root
  - User-friendly error recovery with retry and navigation fallback
affects: [phase-13-ui-polish, production-deployment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Next.js loading.tsx convention: server component files auto-wrapped by React Suspense"
    - "Next.js error.tsx convention: must be 'use client', receives error + reset props"
    - "Skeleton layout mirroring: loading UI matches approximate shape of actual page content"

key-files:
  created:
    - app/dashboard/loading.tsx
    - app/dashboard/analytics/loading.tsx
    - app/dashboard/billing/loading.tsx
    - app/dashboard/progress/loading.tsx
    - app/dashboard/documents/loading.tsx
    - app/dashboard/settings/loading.tsx
    - app/dashboard/chat/loading.tsx
    - app/admin/loading.tsx
    - app/admin/clients/loading.tsx
    - app/admin/clients/[clientId]/loading.tsx
    - app/dashboard/error.tsx
    - app/admin/error.tsx
    - app/error.tsx
  modified: []

key-decisions:
  - "loading.tsx files are server components (no 'use client') — Next.js wraps them in Suspense automatically"
  - "error.tsx files must be client components — useEffect for logging, onClick for reset()"
  - "Skeleton layouts mirror page shape roughly (not pixel-perfect) — conveys page structure during load"
  - "error.message shown when available, fallback to generic message — avoids technical jargon for most errors"
  - "SVG inline icon instead of lucide-react in error boundaries — avoids import overhead in error boundary"

patterns-established:
  - "Loading skeleton pattern: import Skeleton, export default function, no 'use client'"
  - "Error boundary pattern: 'use client', useEffect log, reset button with onClick, Link for nav fallback"

# Metrics
duration: 3min
completed: 2026-02-22
---

# Phase 12 Plan 02: Loading States and Error Boundaries Summary

**10 Next.js skeleton loading screens and 3 error boundaries added — users see structured loading UI instead of nothing, and friendly error recovery instead of white screens**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-22T09:24:05Z
- **Completed:** 2026-02-22T09:27:13Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments

- Created 10 loading.tsx files covering all dashboard and admin routes — each mirrors the approximate shape of the actual page (stat cards, charts, tables, form fields)
- Created 3 error.tsx boundaries at dashboard, admin, and app root — each shows user-friendly message with retry button and navigation link
- TypeScript clean (npx tsc --noEmit passes), no "use client" in any loading.tsx, all error.tsx have "use client" as first line

## Task Commits

Each task was committed atomically:

1. **Task 1: Create loading.tsx skeleton screens for all routes** - `ea057b1` (feat)
2. **Task 2: Create error.tsx boundaries for dashboard, admin, and app root** - `a34cffe` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `app/dashboard/loading.tsx` - 4 stat card skeletons + chart + checklist area
- `app/dashboard/analytics/loading.tsx` - 6 FB metric card skeletons + chart + 3 project metric cards
- `app/dashboard/billing/loading.tsx` - page header + 3 stats + invoice table with 5 row skeletons
- `app/dashboard/progress/loading.tsx` - 6 milestone items with circular icon placeholder + content bar
- `app/dashboard/documents/loading.tsx` - upload area dashed border + 4 file row skeletons
- `app/dashboard/settings/loading.tsx` - profile form (3 inputs + button) + password form (3 inputs + button)
- `app/dashboard/chat/loading.tsx` - glass card + centered content placeholder
- `app/admin/loading.tsx` - 4 summary cards + filter bar + large table skeleton
- `app/admin/clients/loading.tsx` - 6 client rows with avatar circle + action button skeletons
- `app/admin/clients/[clientId]/loading.tsx` - back button + name + 3 action buttons + milestone table
- `app/dashboard/error.tsx` - dashboard error boundary, retry + /dashboard link
- `app/admin/error.tsx` - admin error boundary, retry + /admin link
- `app/error.tsx` - global error boundary, retry + / link

## Decisions Made

- **loading.tsx are server components** — Next.js wraps loading.tsx in Suspense automatically; no "use client" needed or desired
- **error.tsx must be client components** — Next.js requirement; "use client" must be the first line; useEffect handles side-effect logging
- **Inline SVG in error boundaries** — Avoids importing lucide-react into an error boundary (keeps boundary lightweight)
- **error.message surfaced to user** — Most Next.js errors are developer-friendly strings; showing them helps debugging while fallback text handles obscure cases

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PROD-02 (loading states) and PROD-07 (error boundaries) are addressed
- All routes now have graceful loading and error UX
- Ready for 12-03-PLAN.md (rate limiting with Upstash Redis)

---
*Phase: 12-production-hardening*
*Completed: 2026-02-22*
