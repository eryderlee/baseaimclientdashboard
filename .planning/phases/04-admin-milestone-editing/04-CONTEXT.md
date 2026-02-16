# Phase 4: Admin Milestone Editing - Context

**Gathered:** 2026-02-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin interface for updating client milestone data. Admin logs in with admin role, selects a client from list, views/edits that client's milestone information (status, due dates, notes), and saves changes directly to database. This replaces the originally planned Google Sheets sync approach (Phases 4-5) with a custom admin CRM interface.

**In scope:** Milestone editing only
**Out of scope:** Client onboarding/management (Phase 5), admin analytics (Phase 6), user account creation (Phase 5)

</domain>

<decisions>
## Implementation Decisions

### Strategic Direction
- **Custom admin CRM** instead of Google Sheets sync
- Direct database writes from admin interface (no sync layer needed)
- Leverages existing admin role authentication from Phase 3
- Three-phase admin roadmap: Milestone Editing (Phase 4) → Client Onboarding (Phase 5) → Analytics (Phase 6)

### Core Workflow
- Admin selects client from list
- Views client-specific form with all milestones
- Edits and saves changes
- Client sees updated progress in their dashboard immediately

### Milestone Form Design

**Layout:**
- Table/spreadsheet style interface
- Rows = each of 6 milestones
- Columns = Milestone Name, Status, Due Date, Notes, Progress %
- Inline editing (click cell to edit)

**Editable Fields:**
- Status: Dropdown (Not Started / In Progress / Completed)
- Due Date: Date picker
- Notes: Text area for admin notes or milestone description
- Progress %: **Read-only, auto-calculated** (see below)

**Progress Calculation (Hybrid):**
- Not Started = 0%
- In Progress = Time-based auto-calculation
  - Formula considers time elapsed from start to due date
  - Example: Milestone 50% through its timeline → shows ~50%
- Completed = 100%
- Updates automatically based on current date and status

**Save Behavior:**
- Manual save button (e.g., "Save All Changes")
- Admin can edit multiple cells/milestones before saving
- Single API call commits all changes to database
- Batch updates for efficiency

### Claude's Discretion
- Admin routing structure (/admin, /admin/clients/[id], etc.)
- Client selection/navigation UI (search, filters, sorting)
- Middleware protection implementation for admin-only routes
- Visual design (match client dashboard styling or create distinct admin feel)
- Validation rules (date constraints, required fields, status transitions)
- Loading states and optimistic updates
- Error handling and user feedback
- Mobile responsiveness for admin interface

</decisions>

<specifics>
## Specific Ideas

- Table/spreadsheet feel for quick, familiar editing (like Airtable or Notion tables)
- Batch save reduces API calls and gives admin control over when changes commit
- Time-based progress for "In Progress" milestones gives realistic view of timeline without manual updates
- Leverage existing auth from Phase 3 (admin role already implemented)

</specifics>

<deferred>
## Deferred Ideas

**Phase 5 - Client Onboarding & Management:**
- Add new clients (company name, project details)
- Create client login credentials
- Edit/deactivate client accounts
- User account management

**Phase 6 - Admin Analytics:**
- Dashboard showing all clients and progress overview
- Identify at-risk projects
- Overdue milestone alerts

**Backlog (no phase assigned):**
- Google Sheets import/export functionality
- Bulk milestone updates across multiple clients
- Milestone templates for new clients
- Automated notifications to clients on milestone updates

</deferred>

---

*Phase: 04-admin-milestone-editing*
*Context gathered: 2026-02-14*
