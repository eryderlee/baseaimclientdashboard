# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** Clients can see exactly where their project stands without having to ask
**Current focus:** Phase 1 - Dashboard Layout

## Current Position

Phase: 6 of 6 (Admin Analytics)
Plan: 2 of 2 in current phase
Status: Phase complete
Last activity: 2026-02-15 — Completed 06-02-PLAN.md (Admin Analytics Integration)

Progress: [██████████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 14
- Average duration: 11 min
- Total execution time: 3.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-dashboard-layout | 1 | 20 min | 20 min |
| 02-core-progress-tracking | 3 | 19 min | 6 min |
| 03-client-data-isolation | 3 | 71 min | 24 min |
| 04-admin-milestone-editing | 2 | 27 min | 14 min |
| 05-client-onboarding-and-management | 3 | 31 min | 10 min |
| 06-admin-analytics | 2 | 8 min | 4 min |

**Recent Trend:**
- Last 5 plans: 4 min, 4 min, 23 min, 3 min, 3 min
- Trend: Phase 6 complete with consistent 4-minute execution per plan, analytics fully integrated

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Custom admin CRM instead of Google Sheets — Leverages existing admin auth from Phase 3, provides direct database control with better UX than spreadsheet editing
- Standard milestones for all clients — Same service process for every client, simplifies both admin and client experience
- Individual client logins — Each client gets their own credentials to see their own data
- Checklist-style progress (not timeline) — Simple, clear, easy to understand at a glance

**From Phase 01-01:**
- 2-column layout (50/50 split) — Equal space distribution between stat cards and analytics provides better balance
- Vertical stat card stacking — Taller left column matches analytics chart height better than 2x2 grid
- Expandable components pattern — Client-side toggle with conditional column spanning established for future UI features

**From Phase 02-01:**
- Notes stored as Json array instead of separate table — Simpler for MVP changelog, can migrate to table later if needed
- Standard 6-milestone template matches BaseAim service process — Consistent experience across all clients
- Seed function returns created milestones — Enables verification and further operations during client onboarding

**From Phase 02-02:**
- Color-blind-safe status indicators use icons + text labels — Accessibility requirement, not color alone
- Active milestone highlighted with ring-2 ring-primary — Clear visual hierarchy for current work
- Week-level date precision with Intl.DateTimeFormat — Matches business process, locale-safe formatting
- Overall progress as completion percentage — Simple metric, matches checklist mental model

**From Phase 02-03:**
- Client-side rendering for progress page — Defers auth/database complexity to Phase 3, allows UI testing now
- Mock milestone data matches BaseAim service process — 5 realistic milestones for demonstration
- Dashboard uses shared calculateOverallProgress utility — Ensures consistency across pages

**From Phase 03-01:**
- DAL pattern for centralized authorization — Centralizes session verification and client-scoped data access in one layer
- React cache() for deduplication — Every DAL function wrapped to deduplicate database calls within a single render pass
- Middleware as optimistic protection — Provides early redirect for UX, DAL verifySession() is true security boundary
- NextAuth type augmentation — Session includes user id and role for type-safe access in DAL functions

**From Phase 03-02:**
- Prisma 5.22.0 as stable version — Downgraded from Prisma 7.3.0 due to engine compatibility issues with Next.js 16
- Client-side auth with redirect: false — Login page uses signIn with redirect: false for client-side error handling
- Idempotent seed with upsert pattern — Seed script can run multiple times safely using upsert for all entities
- Test data with varied progress states — Client 1 has milestone progress (completed, in-progress), Client 2 has fresh milestones for contrast
- Self-hosted Supabase with custom schema — Connected to Supabase at 149.28.176.48:5433, uses `client_dashboard` schema to isolate from existing data

**From Phase 03-03:**
- Server + client component architecture — Pages are async server components that fetch via DAL, UI is client components receiving serialized props
- Date serialization for Next.js — Date objects converted to ISO strings for server→client transport, parsed back on client
- Logout functionality in dropdown — Added signOut() to user menu, critical for testing multiple accounts
- globalThis for Prisma singleton — Changed from global to globalThis for Next.js 16/Turbopack compatibility

**From Phase 04-01:**
- Time-based progress for IN_PROGRESS milestones — Calculated from elapsed days between start and due dates, clamped to 0-99 (never 100 until marked COMPLETED)
- Notes as append-only JSON array — New notes appended to existing array preserving full history for audit trail
- Auto-date transitions in Server Actions — startDate set on transition TO IN_PROGRESS, completedAt set on transition TO COMPLETED, both cleared on transition TO NOT_STARTED
- Progress stored in database — Server Action recalculates and stores progress percentage on each update for consistency

**From Phase 04-02:**
- Separated /admin route from /dashboard — Admin pages at /admin, client pages at /dashboard for clearer role distinction
- Inline table editing with batch save — Single "Save All Changes" button for efficient bulk updates across milestones
- Notes display latest from array with textarea for new — Read-only display of most recent note, textarea appends new notes to history
- Real-time progress calculation on edits — calculateMilestoneProgress runs on status/date changes for immediate feedback before save

**From Phase 05-01:**
- Hash password BEFORE transaction (not inside) — bcrypt.hash is CPU-intensive (~100ms). Calling it inside transaction holds database connection and locks unnecessarily. Hashing before transaction keeps transaction fast.
- Import STANDARD_MILESTONES array (not seedStandardMilestones function) — seedStandardMilestones instantiates its own PrismaClient, which would deadlock if called inside an existing transaction. Importing only the data array allows milestone creation using the transaction client.
- Use crypto.getRandomValues for password generation — Math.random() is NOT cryptographically secure. crypto.getRandomValues provides cryptographically strong random values required for password generation.
- Website field accepts valid URL OR empty string — Zod url() validation rejects empty strings. Using .or(z.literal('')) allows optional URL fields to match form UX expectations.

**From Phase 05-02:**
- Dual-mode form component (create/edit) with conditional email/password fields — Email is immutable after creation, password has separate reset flow. Reusing one component reduces duplication between create and edit UIs.
- Validation on blur for better UX — Shows errors when user leaves field instead of on every keystroke, reduces visual noise during typing.
- Type assertions for email/password errors in union type — TypeScript cannot narrow FieldErrors union type to access create-only fields, safe to use (errors as any) when guarded by mode === 'create' runtime check.
- Grid layout with responsive breakpoints — Desktop users benefit from compact 2-column layout for related fields, collapses to single column on mobile.

**From Phase 05-03:**
- Remove redirect() from Server Actions that need client-side redirect — redirect() throws NEXT_REDIRECT which try/catch treats as error. Instead return { success: true } and redirect client-side with router.push() after showing success toast.
- Separate StatusToggleButton as client component — Interactive table actions need client-side state (useTransition) for optimistic UI, imported into server component pages.
- Admin dashboard action pattern — Edit (pencil icon), Milestones (list icon), Status toggle (text button) provide complete client management per row.

**From Phase 06-01:**
- Risk detection uses overdue + stalled milestone heuristics with weighted severity — Stalled alone (IN_PROGRESS 14+ days, <50% progress) = low risk, 1 overdue = medium, 2+ overdue OR stalled + overdue = high
- Analytics reuses getAllClientsWithMilestones for efficient caching — getAdminAnalytics leverages React cache() deduplication via existing cached DAL function to avoid redundant queries
- Upcoming due dates limited to 7-day window — Filters milestones with dueDate between now and 7 days from now, excludes COMPLETED, sorted by date ascending
- Risk badge returns null for 'none' level — Avoids visual clutter when no risk detected, only renders badges for low/medium/high severity levels

**From Phase 06-02:**
- URL search params for filter/sort state — Enables bookmarkable filtered views (e.g., /admin?status=at-risk&sort=due-date) and browser back/forward navigation
- Suspense boundaries required for useSearchParams — Next.js App Router requires Suspense boundary for client components using useSearchParams to prevent runtime errors
- Filter and sort logic in useMemo on client — Derived state computed from serialized data for instant UI response without server roundtrip
- Empty filter state handled with clear filters button — Better UX than showing empty table when filters yield no results

### Pending Todos

2 todos pending. See `.planning/todos/pending/` or run `/gsd:check-todos`

- **Add floating chat widget** (ui) — Bottom-right button with popup chat window for quick access from any page
- **Notification panel for header bell icon** (ui) — Dropdown with real notifications, mark as read, navigation

### Blockers/Concerns

None. Database configured and seeded successfully.

## Session Continuity

Last session: 2026-02-15T07:42:30Z
Stopped at: Completed 06-02-PLAN.md (Admin Analytics Integration)
Resume file: None
Next: Phase 6 complete - All phases finished, ready for final polish and deployment
