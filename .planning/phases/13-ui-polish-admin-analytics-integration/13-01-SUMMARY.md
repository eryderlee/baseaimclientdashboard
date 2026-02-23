---
phase: 13-ui-polish-admin-analytics-integration
plan: 01
subsystem: ui
tags: [notifications, mobile, responsive, sheet, dropdown-menu, prisma, dashboard-nav]

# Dependency graph
requires:
  - phase: 01-dashboard-layout
    provides: DashboardNav component and layout shell that this task modifies
  - phase: 08-email-infrastructure
    provides: Notification model exists in Prisma schema for findMany queries
provides:
  - Real notification dropdown in header bell icon (DropdownMenu with NotificationCenter)
  - Dynamic unread notification badge (actual count, hidden when zero)
  - Mobile hamburger nav (Sheet slide-in at <md breakpoints)
  - Notifications fetched in DashboardLayout server component and passed as serialized props
affects:
  - 13-02, 13-03 (subsequent UI polish plans)
  - Any future plans touching DashboardNav or DashboardLayout

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server layout fetches DB data, serializes dates (toISOString), passes to client nav component via props"
    - "DropdownMenu wrapping NotificationCenter for bell icon — same pattern as avatar dropdown"
    - "md:hidden Sheet for mobile nav, hidden md:flex for desktop pills — responsive breakpoint split"

key-files:
  created: []
  modified:
    - app/dashboard/layout.tsx
    - components/dashboard/dashboard-nav.tsx

key-decisions:
  - "DashboardNav stays 'use client' — all data fetched in layout server component and passed as serialized props"
  - "createdAt serialized as ISO string before passing to client component (Date not serializable across boundary)"
  - "unreadCount derived from props in client component (not re-fetched) — avoids useEffect/fetch complexity"
  - "Mobile Sheet side='left' — standard nav pattern, consistent with typical mobile navigation UX"
  - "onCloseAutoFocus preventDefault on DropdownMenuContent — prevents focus returning to bell button after close"

patterns-established:
  - "Notification badge: conditional rendering (unreadCount > 0) — badge absent when zero, not shown with 0"
  - "Server layout → client nav data flow: fetch in layout.tsx, serialize dates, pass as typed props"

# Metrics
duration: 6min
completed: 2026-02-23
---

# Phase 13 Plan 01: Notification Bell Dropdown and Mobile Nav Summary

**Bell icon in DashboardNav now opens a real notification dropdown (DropdownMenu + NotificationCenter) with dynamic unread badge, plus mobile hamburger Sheet nav at <md breakpoints**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-23T10:33:23Z
- **Completed:** 2026-02-23T10:39:36Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Replaced static Bell button (hardcoded badge "3") with DropdownMenu wrapping NotificationCenter
- DashboardLayout now fetches real notifications from DB via `prisma.notification.findMany` (20 most recent, ordered newest-first)
- Unread badge shows actual count, hidden entirely when zero
- Mobile hamburger Menu icon (md:hidden) opens left-side Sheet with all nav links
- Desktop pill nav unchanged at md+ breakpoints — zero visual regression on desktop

## Task Commits

Each task was committed atomically:

1. **Task 1: Fetch notifications in layout and wire to DashboardNav** - `5c006ec` (feat)

**Plan metadata:** (to be committed with SUMMARY.md)

## Files Created/Modified
- `app/dashboard/layout.tsx` - Added prisma import, notification fetch (findMany), date serialization, notifications prop on DashboardNav
- `components/dashboard/dashboard-nav.tsx` - Added SerializedNotification type, notifications prop, unreadCount derivation, Bell DropdownMenu with NotificationCenter, mobile Sheet hamburger nav

## Decisions Made
- DashboardNav stays `"use client"` — server data passed via props from layout (as specified in plan and STATE.md context)
- `createdAt` serialized to ISO string before crossing server→client boundary (Date objects are not serializable)
- `unreadCount` derived from `propNotifications` inside the component — no separate fetch needed
- `onCloseAutoFocus={(e) => e.preventDefault()}` on DropdownMenuContent to prevent focus jumping back to bell trigger after closing
- Mobile Sheet uses `side="left"` — canonical hamburger nav pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Build initially failed with env var validation errors (AUTH_SECRET, UPSTASH_REDIS_REST_URL, etc.) — this is the known local environment constraint from Phase 12. Used `SKIP_ENV_VALIDATION=true npm run build` per the established pattern. Build compiled successfully with no TypeScript errors.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- UI-02 (notification panel in header dropdown): Complete
- UI-03 (mark notifications as read): Complete via existing NotificationCenter component
- UI-04 (mobile responsive nav): Partially complete — hamburger menu implemented
- Ready for 13-02 (next UI polish plan)

---
*Phase: 13-ui-polish-admin-analytics-integration*
*Completed: 2026-02-23*
