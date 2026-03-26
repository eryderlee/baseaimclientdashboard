---
phase: 23-demo-environment
plan: 02
subsystem: database
tags: [prisma, seeding, demo-environment, bcrypt]

# Dependency graph
requires:
  - phase: 23-demo-environment
    plan: 01
    provides: isDemo and demoStableId fields on Client model, resolveClientIsDemoFilter
provides:
  - scripts/seed-demo.ts — idempotent seed script for 1 demo admin + 5 demo clients
  - npm run seed:demo command
  - npm run seed:demo --clean for removal
affects: [23-03-PLAN — E2E verification depends on seeded data]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Upsert by demoStableId for idempotent client creation
    - Delete-then-createMany for milestones/invoices/documents (clean re-seed)
    - Single bcrypt hash reused across all demo client passwords
---

# Plan 23-02 Summary: Demo Seed Script

## What shipped

| Commit | Type | What |
|--------|------|------|
| 66487c6 | chore | Add seed:demo npm script to package.json |
| c2222e6 | feat | Create demo seed script with 5 client profiles |

## Artifacts

- **scripts/seed-demo.ts** (1037 lines): Complete demo seed script with all 5 client profiles, milestones, invoices, and documents
- **package.json**: `seed:demo` script added (`npx tsx --env-file=.env scripts/seed-demo.ts`)

## Key details

**Demo clients created (5):**
1. Calloway & Klein CPAs — early setup (phases 1-2), 6 SETUP milestones (1 complete, 1 in-progress)
2. Summit Ridge Accounting — mid setup (phases 3-4), 6 SETUP milestones (3 complete, 1 in-progress)
3. Meridian Financial Group — recently launched (~1 month), all setup complete + 2 GROWTH milestones, 2 invoices, 3 documents
4. Apex Tax & Advisory — active (~4 months), all setup complete + 4 GROWTH milestones with review notes, 5 invoices, 5 documents
5. Hargrove & Associates — mature (~7 months), all setup complete + 7 GROWTH milestones with review notes, 8 invoices, 10 documents

**Demo admin:** Zara Khan (khan@baseaim.co / BaseAim2026!)

**Features:**
- Idempotent: upserts users/clients by email/demoStableId, deletes+recreates milestones/invoices/docs
- `--clean` flag: removes all demo data without affecting real records
- Console summary with credentials printed after seeding

## Deviations

- **DB push deferred**: Supabase unreachable (consistent with Plan 01). Script is ready but cannot run against remote DB until connectivity is restored. Script syntax verified via tsx import — fails at runtime only due to missing isDemo column.

## Duration

~3 min (Task 1) + inherited from prior agent session
