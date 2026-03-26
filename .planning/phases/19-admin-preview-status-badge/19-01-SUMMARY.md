---
phase: 19-admin-preview-status-badge
plan: 01
subsystem: auth
tags: [cookies, server-actions, next-auth, prisma, dal, preview-mode]

# Dependency graph
requires:
  - phase: 16-query-deduplication
    provides: DAL pattern with getClientAdConfig, getCurrentClientId as canonical functions
  - phase: 03-client-data-isolation
    provides: verifySession, DAL authorization pattern
provides:
  - httpOnly cookie-based admin preview mode
  - enterPreview/exitPreview Server Actions with returnTo mechanism
  - Patched DAL functions supporting ADMIN-in-preview impersonation
  - AdminPreviewBanner sticky component on all dashboard pages
  - Refactored admin/preview/[clientId]/page.tsx (cookie-based, no inline rendering)
affects:
  - 19-admin-preview-status-badge (plan 02 — status badge uses same phase)
  - Future phases touching dal.ts or dashboard layout

# Tech tracking
tech-stack:
  added: []
  patterns:
    - httpOnly cookie impersonation pattern for admin preview mode
    - exitAction Server Action reference passed as prop to client component (form action pattern)
    - Preview-aware DAL: getCurrentClientId checks admin_preview_clientId cookie before returning null

key-files:
  created:
    - lib/actions/preview.ts
    - components/dashboard/admin-preview-banner.tsx
  modified:
    - lib/dal.ts
    - app/dashboard/layout.tsx
    - app/admin/preview/[clientId]/page.tsx
    - app/dashboard/documents/page.tsx
    - components/admin/client-analytics-table.tsx

key-decisions:
  - "httpOnly cookie approach for preview state — no DB state, no session mutation, cleared on exit"
  - "getCurrentClientId is the single preview-awareness hook — all DAL functions chain through it"
  - "FB DAL functions: throw changed to return null/[] for non-CLIENT roles — allows ADMIN-in-preview to flow through getClientAdConfig"
  - "getClientAdConfig patched to query by previewId when ADMIN + cookie set"
  - "AdminPreviewBanner uses form action pattern (not onClick) — works with Server Actions and progressive enhancement"
  - "exitPreview validates returnTo starts with '/' — prevents open redirect"
  - "documents/page.tsx refactored to use getCurrentClientId instead of auth() + userId"

patterns-established:
  - "Preview cookie check in getCurrentClientId: ADMIN role reads admin_preview_clientId cookie before returning null"
  - "Server Action ref as prop: layout passes exitPreview Server Action as prop to client banner component"
  - "Safe returnTo: always validate returnTo.startsWith('/') before using as redirect target"

# Metrics
duration: 4min
completed: 2026-03-26
---

# Phase 19 Plan 01: Admin Preview Mode Summary

**httpOnly cookie impersonation for admin preview: enterPreview/exitPreview Server Actions, patched DAL (getCurrentClientId/getClientAdConfig/analytics/activities/username), sticky amber banner on all dashboard pages, returnTo mechanism**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-26T10:03:08Z
- **Completed:** 2026-03-26T10:07:12Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Admin can now click "View" on any client and land on that client's full dashboard with real data
- All 5 dashboard pages (home, progress, analytics, billing, documents) render preview client data via patched DAL
- Sticky amber "Viewing as [Client Name]" banner appears on every dashboard page during preview
- Exit Preview reads stored returnTo cookie and returns admin to the exact page they came from

## Task Commits

Each task was committed atomically:

1. **Task 1: Preview cookie mechanism, DAL patches, and documents page fix** - `095b64c` (feat)
2. **Task 2: Preview banner, layout integration, and route refactor** - `947d2e5` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `lib/actions/preview.ts` - enterPreview and exitPreview Server Actions with cookie management
- `lib/dal.ts` - Patched: getCurrentClientId, getClientAdConfig, getClientAnalytics, getClientDashboardProfile, getCurrentUserName, getRecentActivities; FB functions softened from throw to return null/[]
- `components/dashboard/admin-preview-banner.tsx` - Sticky amber banner with form action exit button
- `app/dashboard/layout.tsx` - Reads preview cookie, conditionally renders AdminPreviewBanner before DashboardNav
- `app/admin/preview/[clientId]/page.tsx` - Stripped inline rendering; now sets cookies + redirects
- `app/dashboard/documents/page.tsx` - Refactored to use getCurrentClientId (was direct auth() + prisma.user)
- `components/admin/client-analytics-table.tsx` - View link now includes returnTo param via usePathname()

## Decisions Made
- **httpOnly cookie approach**: No DB state needed, no session mutation, admin's own session is preserved. Two cookies: `admin_preview_clientId` (the client being viewed) and `admin_preview_return_to` (where to go on exit).
- **getCurrentClientId as the single hook**: All client-scoped DAL functions chain through `getCurrentClientId()`, so patching it once propagates preview awareness to billing, invoices, milestones, documents, recent docs, and analytics.
- **getClientAdConfig patched for preview**: The FB DAL functions all call `getClientAdConfig()` — patching it to return the preview client's config makes all 5 FB functions work in preview mode without touching each one individually.
- **FB throws softened to return null/[]**: Changed `throw new Error('Unauthorized: Client access required')` to `return null/[]` in the 5 FB DAL functions. This lets ADMIN-in-preview flow through `getClientAdConfig()` to get data. ADMIN without preview returns "not configured" state gracefully.
- **Form action pattern for exit**: `AdminPreviewBanner` receives `exitPreview` Server Action as a prop and uses `<form action={exitAction}>` — works with progressive enhancement, no client-side JS required.
- **Open redirect prevention**: Both `enterPreview` and `exitPreview` validate that `returnTo` starts with `/` before storing/using it.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Preview mode fully functional. Admin can verify all 5 dashboard pages from any client's perspective.
- No blockers for Phase 19 Plan 02 (Status Badge).
- The DAL preview infrastructure is in place for any future admin impersonation needs.

---
*Phase: 19-admin-preview-status-badge*
*Completed: 2026-03-26*
