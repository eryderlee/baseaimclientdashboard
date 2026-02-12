# Roadmap: BaseAim Client Dashboard

## Overview

This roadmap transforms the BaseAim client dashboard from mock-data displays into a production-ready progress tracking system. We start by restructuring the dashboard layout for clarity, add milestone-based progress tracking that clients can actually use, ensure client data isolation for security, then integrate Google Sheets as the admin backend for updating client progress. The journey delivers transparency for clients and simplicity for the BaseAim team.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Dashboard Layout** - Restructure dashboard for improved information hierarchy
- [ ] **Phase 2: Core Progress Tracking** - Milestone checklist system with status indicators
- [ ] **Phase 3: Client Data Isolation** - Per-client authentication and data access
- [ ] **Phase 4: Google Sheets Sync Foundation** - Build sync infrastructure for admin updates
- [ ] **Phase 5: Production Sync** - Automated polling and error handling

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
- [ ] 01-01-PLAN.md - Restructure layout with stat cards left, expandable analytics right

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
**Plans**: TBD

Plans:
- [ ] 02-01: TBD

### Phase 3: Client Data Isolation
**Goal**: Each client sees only their own data when logged in
**Depends on**: Phase 2
**Requirements**: AUTH-01, AUTH-02, AUTH-03
**Success Criteria** (what must be TRUE):
  1. Each client can log in with individual email/password credentials
  2. Client sees only their own progress data and cannot access other clients' data
  3. Admin users can view all clients' data when logged in with admin role
**Plans**: TBD

Plans:
- [ ] 03-01: TBD

### Phase 4: Google Sheets Sync Foundation
**Goal**: Admin can update client progress via Google Sheets with reliable sync to database
**Depends on**: Phase 3
**Requirements**: SHEET-01, SHEET-02, SHEET-04, SHEET-05
**Success Criteria** (what must be TRUE):
  1. Admin can update client milestone status in standardized Google Sheet template
  2. Sheet template includes required columns (Client ID, Milestone, Status, Progress %, Due Date, Notes)
  3. Sync service authenticates with service account (no manual OAuth flow)
  4. Data from Google Sheet writes successfully to PostgreSQL database
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

### Phase 5: Production Sync
**Goal**: Sync runs automatically with production-grade error handling
**Depends on**: Phase 4
**Requirements**: SHEET-03, SHEET-06
**Success Criteria** (what must be TRUE):
  1. Dashboard syncs from Google Sheet automatically every 15-60 minutes
  2. Sync handles errors gracefully (malformed data, missing columns, API rate limits) without crashing
  3. Clients continue seeing last known good data when sync fails
  4. Admin can see sync status and errors via dashboard or logs
**Plans**: TBD

Plans:
- [ ] 05-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Dashboard Layout | 0/1 | Planned | - |
| 2. Core Progress Tracking | 0/TBD | Not started | - |
| 3. Client Data Isolation | 0/TBD | Not started | - |
| 4. Google Sheets Sync Foundation | 0/TBD | Not started | - |
| 5. Production Sync | 0/TBD | Not started | - |
