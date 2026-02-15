# Roadmap: BaseAim Client Dashboard

## Overview

This roadmap transforms the BaseAim client dashboard from mock-data displays into a production-ready progress tracking system. We start by restructuring the dashboard layout for clarity, add milestone-based progress tracking that clients can actually use, ensure client data isolation for security, then build a custom admin CRM for BaseAim team to manage client progress directly. The journey delivers transparency for clients and powerful management tools for the BaseAim team.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Dashboard Layout** - Restructure dashboard for improved information hierarchy
- [x] **Phase 2: Core Progress Tracking** - Milestone checklist system with status indicators
- [x] **Phase 3: Client Data Isolation** - Per-client authentication and data access
- [x] **Phase 4: Admin Milestone Editing** - Custom admin interface for updating client milestones
- [x] **Phase 5: Client Onboarding & Management** - Admin tools for adding/managing clients and users
- [ ] **Phase 6: Admin Analytics** - Overview dashboard for admin to track all clients

## Phase Details

### Phase 1: Dashboard Layout
**Goal**: Dashboard overview presents information clearly with proper visual hierarchy
**Depends on**: Nothing (first phase)
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04
**Success Criteria** (what must be TRUE):
  1. User sees 4 stat cards on left side of dashboard showing key metrics
  2. User sees analytics chart on right side smaller than current full-width size
  3. User can expand analytics chart to full-width with single click
  4. Dashboard layout stacks correctly on mobile devices without horizontal scroll
**Plans:** 1 plan

Plans:
- [x] 01-01-PLAN.md - Restructure layout with stat cards left, expandable analytics right

### Phase 2: Core Progress Tracking
**Goal**: Clients see their project progress through a clear milestone checklist
**Depends on**: Phase 1
**Requirements**: PROG-01, PROG-02, PROG-03, PROG-04, PROG-05, PROG-06, PROG-07, PROG-08, PROG-09
**Success Criteria** (what must be TRUE):
  1. User sees linear milestone checklist showing all project steps in order
  2. Each milestone displays status (Not Started / In Progress / Completed) with color-coded indicators
  3. Dashboard shows overall progress percentage calculated from milestone completion
  4. Currently active milestone is visually highlighted and easy to identify
  5. Each milestone includes description and expected due date
**Plans:** 3 plans

Plans:
- [x] 02-01-PLAN.md - Add notes field to schema and create standard milestone template
- [x] 02-02-PLAN.md - Build milestone UI components with accessibility and highlighting
- [x] 02-03-PLAN.md - Wire up progress page to real data and integrate components

### Phase 3: Client Data Isolation
**Goal**: Each client sees only their own data when logged in
**Depends on**: Phase 2
**Requirements**: AUTH-01, AUTH-02, AUTH-03
**Success Criteria** (what must be TRUE):
  1. Each client can log in with individual email/password credentials
  2. Client sees only their own progress data and cannot access other clients' data
  3. Admin users can view all clients' data when logged in with admin role
**Plans:** 3 plans

Plans:
- [x] 03-01-PLAN.md - Auth infrastructure: DAL, middleware, NextAuth types
- [x] 03-02-PLAN.md - Login page and database seed with test users
- [x] 03-03-PLAN.md - Wire dashboard and progress pages to real session and DAL data

### Phase 4: Admin Milestone Editing
**Goal**: Admin can update client milestone status, due dates, and notes through custom admin interface
**Depends on**: Phase 3
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04
**Success Criteria** (what must be TRUE):
  1. Admin can log in and access admin-only interface (/admin or similar route)
  2. Admin sees list of all clients and can select a client to manage
  3. Admin can edit milestone status (Not Started/In Progress/Completed), due dates, and notes in table/spreadsheet interface
  4. Progress percentage auto-calculates (Not Started=0%, In Progress=time-based, Completed=100%)
  5. Changes save to database and client sees updated milestones immediately in their dashboard
**Plans:** 2 plans

Plans:
- [x] 04-01-PLAN.md — Backend: DAL admin functions, progress utility, Server Action with Zod validation
- [x] 04-02-PLAN.md — UI: Admin client list with links, milestone edit table with inline editing and batch save

### Phase 5: Client Onboarding & Management
**Goal**: Admin can add new clients, create user accounts, and manage client details
**Depends on**: Phase 4
**Requirements**: ADMIN-05, ADMIN-06, ADMIN-07
**Success Criteria** (what must be TRUE):
  1. Admin can add new client with company name, project details, and contact info
  2. Admin can create client user account (email/password) for dashboard access
  3. Admin can edit client details and project information
  4. Admin can deactivate/reactivate client accounts
  5. New clients automatically get standard 6-milestone template initialized
**Plans:** 3 plans

Plans:
- [x] 05-01-PLAN.md — Backend: Zod schemas, Server Actions (create/update/toggle), DAL function, Sonner setup
- [x] 05-02-PLAN.md — UI: ClientForm component with RHF+Zod validation, /admin/clients/new page
- [x] 05-03-PLAN.md — Client edit page, deactivate/reactivate toggle, end-to-end verification

### Phase 6: Admin Analytics
**Goal**: Admin has overview dashboard showing all client progress and project health
**Depends on**: Phase 5
**Requirements**: ADMIN-08, ADMIN-09
**Success Criteria** (what must be TRUE):
  1. Admin sees dashboard with all clients and their overall progress percentages
  2. Admin can identify at-risk projects (overdue milestones, stalled progress)
  3. Admin can filter/sort clients by progress status, due dates, or other criteria
  4. Admin sees summary metrics (total clients, average progress, upcoming due dates)
**Plans:** 2 plans

Plans:
- [ ] 06-01-PLAN.md — Backend: Risk detection utility, DAL analytics function, summary cards and risk badge components
- [ ] 06-02-PLAN.md — UI: Client filters, analytics table with sorting/filtering, admin page integration

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Dashboard Layout | 1/1 | ✓ Complete | 2026-02-12 |
| 2. Core Progress Tracking | 3/3 | ✓ Complete | 2026-02-12 |
| 3. Client Data Isolation | 3/3 | ✓ Complete | 2026-02-13 |
| 4. Admin Milestone Editing | 2/2 | ✓ Complete | 2026-02-15 |
| 5. Client Onboarding & Management | 3/3 | ✓ Complete | 2026-02-15 |
| 6. Admin Analytics | 0/2 | Not started | - |
