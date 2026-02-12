# Requirements: BaseAim Client Dashboard

**Defined:** 2026-02-11
**Core Value:** Clients can see exactly where their project stands without having to ask

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Dashboard Layout

- [x] **DASH-01**: Dashboard overview shows 4 stat cards on the left side
- [x] **DASH-02**: Dashboard overview shows analytics chart on the right, smaller than current size
- [x] **DASH-03**: Analytics chart can be expanded to full-width (current size) via toggle/button
- [x] **DASH-04**: Dashboard layout is responsive (stacks on mobile)

### Progress Tracking

- [ ] **PROG-01**: Client sees a linear milestone checklist showing all project steps in order
- [ ] **PROG-02**: Each milestone shows status indicator (Not Started / In Progress / Completed) with color coding
- [ ] **PROG-03**: Dashboard shows overall progress percentage calculated from milestone completion
- [ ] **PROG-04**: Currently active milestone is visually highlighted/distinguished from others
- [ ] **PROG-05**: Each milestone has a 1-2 sentence description explaining what it means
- [ ] **PROG-06**: Each milestone shows expected due date (week-level precision)
- [ ] **PROG-07**: Completed milestones show completion date
- [ ] **PROG-08**: All clients share the same standard milestone template (onboarding → ad account → landing page → campaign → launch → optimization)
- [ ] **PROG-09**: Each milestone can have progress notes (mini-changelog entries like "Landing page approved, moving to dev")

### Google Sheets Integration

- [ ] **SHEET-01**: Admin can update client milestone status via a Google Sheet
- [ ] **SHEET-02**: Google Sheet follows a standardized template (Client ID, Milestone, Status, Progress %, Due Date, Notes)
- [ ] **SHEET-03**: Dashboard syncs from Google Sheet automatically via scheduled job (every 15-60 min)
- [ ] **SHEET-04**: Sync uses service account authentication (not OAuth)
- [ ] **SHEET-05**: Sync writes to PostgreSQL database (Sheets is admin UI, DB is source of truth for dashboard)
- [ ] **SHEET-06**: Sync handles errors gracefully (malformed data, missing columns, API rate limits)

### Client Data Isolation

- [ ] **AUTH-01**: Each client logs in with individual email/password credentials
- [ ] **AUTH-02**: Client only sees their own project progress and data
- [ ] **AUTH-03**: Admin can see all clients' data

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Engagement

- **ENGAGE-01**: Weekly email digest with progress summary sent to client
- **ENGAGE-02**: Client action items displayed on dashboard ("Your turn: grant ad account access")
- **ENGAGE-03**: Celebratory animation/styling when major milestones complete

### Advanced Progress

- **ADV-01**: Estimated launch date calculated from current progress rate
- **ADV-02**: Expected vs actual timeline comparison per milestone

### Admin

- **ADMIN-01**: Admin dashboard page showing sync status, last sync time, errors
- **ADMIN-02**: Manual sync trigger button for admin

## Out of Scope

| Feature | Reason |
|---------|--------|
| Gantt charts / dependency graphs | Overkill for linear process, confuses non-technical clients |
| Kanban boards | Too granular, clients don't need internal task visibility |
| Time tracking / hours logged | Wrong incentive — clients care about outcomes not hours |
| Client-editable milestones | Agency defines the process, clients view progress |
| Real-time progress updates | False precision; milestone-level updates are sufficient |
| Individual task breakdowns within milestones | Too much detail, creates noise |
| Cross-client comparisons | Demoralizing and context-free |
| Custom milestones per client | All clients follow same standard process |
| Real-time chat system | Defer to later milestone |
| Campaign metrics from live ads | Defer until progress tracking is solid |
| Mobile app | Web-first |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DASH-01 | Phase 1 | Complete |
| DASH-02 | Phase 1 | Complete |
| DASH-03 | Phase 1 | Complete |
| DASH-04 | Phase 1 | Complete |
| PROG-01 | Phase 2 | Pending |
| PROG-02 | Phase 2 | Pending |
| PROG-03 | Phase 2 | Pending |
| PROG-04 | Phase 2 | Pending |
| PROG-05 | Phase 2 | Pending |
| PROG-06 | Phase 2 | Pending |
| PROG-07 | Phase 2 | Pending |
| PROG-08 | Phase 2 | Pending |
| PROG-09 | Phase 2 | Pending |
| AUTH-01 | Phase 3 | Pending |
| AUTH-02 | Phase 3 | Pending |
| AUTH-03 | Phase 3 | Pending |
| SHEET-01 | Phase 4 | Pending |
| SHEET-02 | Phase 4 | Pending |
| SHEET-04 | Phase 4 | Pending |
| SHEET-05 | Phase 4 | Pending |
| SHEET-03 | Phase 5 | Pending |
| SHEET-06 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0

---
*Requirements defined: 2026-02-11*
*Last updated: 2026-02-12 after Phase 1 completion*
