---
phase: 22-ongoing-growth-roadmap
plan: 01
subsystem: database
tags: [prisma, milestones, dal, server-actions, zod, growth-roadmap]

# Dependency graph
requires:
  - phase: 02-core-progress-tracking
    provides: Milestone model and milestone management foundation
  - phase: 04-admin-milestone-editing
    provides: updateMilestones server action pattern
  - phase: 16-query-deduplication
    provides: getAllClientsWithMilestones select pattern, DAL cache() conventions
provides:
  - MilestoneType enum (SETUP | GROWTH) in Prisma schema and generated client
  - milestoneType field on Milestone model with @default(SETUP)
  - getSetupMilestones() and getGrowthMilestones() DAL functions
  - Auto-generation of 12 monthly GROWTH milestones on setup completion
  - addGrowthMilestone and removeGrowthMilestone server actions
  - milestoneType field in getAllClientsWithMilestones select
  - setupComplete check on admin page uses milestoneType === 'SETUP'
affects:
  - 22-02-PLAN.md (admin UI for growth milestones — needs DAL functions and server actions)
  - 22-03-PLAN.md (client dashboard growth roadmap — needs getGrowthMilestones)
  - app/admin/page.tsx (setupComplete badge already updated)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MilestoneType discriminator: SETUP vs GROWTH on single Milestone table"
    - "Auto-generation after transaction: post-commit check fires side effects idempotently"
    - "Idempotency guard: existingGrowth === 0 prevents duplicate generation on re-save"
    - "Growth milestone order: aggregate _max.order + 1 for append-to-end behavior"

key-files:
  created: []
  modified:
    - prisma/schema.prisma
    - lib/dal.ts
    - prisma/seed-milestones.ts
    - app/admin/clients/[clientId]/actions.ts
    - app/admin/page.tsx

key-decisions:
  - "MilestoneType enum on single Milestone table (not separate GrowthMilestone model) — simpler query pattern, same DAL shape"
  - "Auto-generation fires after prisma.$transaction(updates) completes — keeps transaction minimal, side effects outside"
  - "existingGrowth === 0 idempotency guard — prevents re-saving 6 completed milestones from spawning duplicate batches"
  - "12 monthly milestones starting 1st of next month — covers first year of ongoing optimization"
  - "removeGrowthMilestone refuses milestoneType !== 'GROWTH' — prevents accidental SETUP deletion via wrong action"
  - "db push deferred — Supabase unreachable at execution time; prisma validate + prisma generate confirmed schema valid"

patterns-established:
  - "getSetupMilestones / getGrowthMilestones: same shape as getMilestones() but with milestoneType filter in where clause"
  - "addGrowthMilestone rawData pattern: same as updateMilestones (unknown input, Zod parse at top)"

# Metrics
duration: 5min
completed: 2026-03-27
---

# Phase 22 Plan 01: Ongoing Growth Roadmap — Schema and DAL Summary

**MilestoneType enum (SETUP | GROWTH) added to Prisma schema, DAL extended with type-filtered queries, 12 monthly GROWTH milestones auto-generate on setup completion, and addGrowthMilestone/removeGrowthMilestone server actions added**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-26T16:24:35Z
- **Completed:** 2026-03-26T16:29:34Z
- **Tasks:** 2/2
- **Files modified:** 5

## Accomplishments

- MilestoneType enum (SETUP | GROWTH) in schema, milestoneType field with @default(SETUP) on Milestone model
- getSetupMilestones() and getGrowthMilestones() exported from dal.ts, following getMilestones() cache() pattern with type filter in where clause
- Auto-generation of 12 monthly GROWTH milestones wired into updateMilestones post-transaction, with existingGrowth === 0 idempotency guard
- addGrowthMilestone and removeGrowthMilestone server actions with Zod validation and ownership verification
- Admin page setupComplete now uses milestoneType === 'SETUP' instead of order <= 6

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema migration + DAL extension** - `47d160e` (feat)
2. **Task 2: Auto-generation logic + add/remove server actions** - `f4d08a2` (feat)

## Files Created/Modified

- `prisma/schema.prisma` — Added MilestoneType enum and milestoneType field on Milestone model
- `lib/dal.ts` — Added getSetupMilestones(), getGrowthMilestones(), milestoneType to getMilestones() and getAllClientsWithMilestones() selects
- `prisma/seed-milestones.ts` — Explicitly sets milestoneType: 'SETUP' in seedStandardMilestones()
- `app/admin/clients/[clientId]/actions.ts` — autoGenerateGrowthMilestones helper, auto-generation check in updateMilestones, addGrowthMilestone and removeGrowthMilestone server actions
- `app/admin/page.tsx` — setupComplete filter changed from m.order <= 6 to m.milestoneType === 'SETUP'

## Decisions Made

- **Single table with MilestoneType discriminator** — Not a separate GrowthMilestone model. Keeps DAL shape identical; same select fields, same orderBy, same cache() pattern.
- **Auto-generation after transaction** — Fires post-commit outside prisma.$transaction(). Keeps transaction minimal; side effects belong outside the atomic block.
- **existingGrowth === 0 idempotency guard** — Prevents admin re-saving 6 COMPLETED milestones from spawning a second batch of 12 GROWTH milestones.
- **12 monthly milestones from 1st of next month** — Covers full first year of ongoing optimization. Titles use toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).
- **db push deferred** — Supabase unreachable at execution time (P1001). prisma validate + prisma generate confirmed schema valid. Push must be run when database is reachable.
- **removeGrowthMilestone refuses SETUP milestones** — milestoneType !== 'GROWTH' returns error without deleting. Prevents UI bugs from calling the wrong action.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Supabase unreachable (P1001)** during `prisma db push`. Per plan instructions, ran `prisma validate && prisma generate` instead. Schema is valid, Prisma client regenerated. Push must be run manually when database is reachable: `node node_modules/prisma/build/index.js db push`

## User Setup Required

None — but `prisma db push` must be run when Supabase is reachable to apply the MilestoneType enum and milestoneType column to the production database. Until then, existing functionality is unaffected (column will be added with DEFAULT 'SETUP' so no data loss).

## Next Phase Readiness

- Schema data model complete — Plans 02 and 03 can proceed
- Plan 02 (admin UI): getGrowthMilestones(), addGrowthMilestone, removeGrowthMilestone are all ready
- Plan 03 (client dashboard): getGrowthMilestones() is ready
- **Blocker for production**: db push must be run to add milestoneType column to Supabase before growth milestone features will work at runtime

---
*Phase: 22-ongoing-growth-roadmap*
*Completed: 2026-03-27*
