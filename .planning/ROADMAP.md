# Roadmap: BaseAim Client Dashboard

## Milestones

- ✅ **v0.9 Foundation** - Phases 1-6 (shipped 2026-02-15)
- 🚧 **v1.0 Production Launch** - Phases 7-13 (in progress)

## Phases

<details>
<summary>✅ v0.9 Foundation (Phases 1-6) - SHIPPED 2026-02-15</summary>

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
**Requirements**: ADMIN-MGT-05
**Success Criteria** (what must be TRUE):
  1. Admin can log in and access admin-only interface (/admin or similar route)
  2. Admin sees list of all clients and can select a client to manage
  3. Admin can edit milestone status (Not Started/In Progress/Completed), due dates, and notes in table/spreadsheet interface
  4. Progress percentage auto-calculates (Not Started=0%, In Progress=time-based, Completed=100%)
  5. Changes save to database and client sees updated milestones immediately in their dashboard
**Plans:** 2 plans

Plans:
- [x] 04-01-PLAN.md - Backend: DAL admin functions, progress utility, Server Action with Zod validation
- [x] 04-02-PLAN.md - UI: Admin client list with links, milestone edit table with inline editing and batch save

### Phase 5: Client Onboarding & Management
**Goal**: Admin can add new clients, create user accounts, and manage client details
**Depends on**: Phase 4
**Requirements**: ADMIN-MGT-01, ADMIN-MGT-02, ADMIN-MGT-03, ADMIN-MGT-04, ADMIN-MGT-06
**Success Criteria** (what must be TRUE):
  1. Admin can add new client with company name, project details, and contact info
  2. Admin can create client user account (email/password) for dashboard access
  3. Admin can edit client details and project information
  4. Admin can deactivate/reactivate client accounts
  5. New clients automatically get standard 6-milestone template initialized
**Plans:** 3 plans

Plans:
- [x] 05-01-PLAN.md - Backend: Zod schemas, Server Actions (create/update/toggle), DAL function, Sonner setup
- [x] 05-02-PLAN.md - UI: ClientForm component with RHF+Zod validation, /admin/clients/new page
- [x] 05-03-PLAN.md - Client edit page, deactivate/reactivate toggle, end-to-end verification

### Phase 6: Admin Analytics
**Goal**: Admin has overview dashboard showing all client progress and project health
**Depends on**: Phase 5
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05
**Success Criteria** (what must be TRUE):
  1. Admin sees dashboard with all clients and their overall progress percentages
  2. Admin can identify at-risk projects (overdue milestones, stalled progress)
  3. Admin can filter/sort clients by progress status, due dates, or other criteria
  4. Admin sees summary metrics (total clients, average progress, upcoming due dates)
**Plans:** 2 plans

Plans:
- [x] 06-01-PLAN.md - Backend: Risk detection utility, DAL analytics function, summary cards and risk badge components
- [x] 06-02-PLAN.md - UI: Client filters, analytics table with sorting/filtering, admin page integration

</details>

### 🚧 v1.0 Production Launch (In Progress)

**Milestone Goal:** Transform the dashboard from development MVP into a production-ready platform with all critical integrations, polished UX, and enterprise-grade reliability.

**Phase Numbering:**
- Integer phases (7, 8, 9, etc.): Planned milestone work
- Decimal phases (7.1, 7.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

#### Phase 7: Chat Integration
**Goal**: Clients can contact BaseAim team directly via WhatsApp or Telegram from dashboard
**Depends on**: Phase 6 (v0.9 complete)
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05
**Success Criteria** (what must be TRUE):
  1. Client sees WhatsApp click-to-chat button in dashboard that opens WhatsApp with pre-filled message
  2. Client sees Telegram click-to-chat button in dashboard that opens Telegram with pre-filled message
  3. Pre-filled messages include client context (name, company) for immediate identification
  4. Admin can configure WhatsApp number and Telegram username through admin settings
  5. Chat buttons replace placeholder chat widget in UI
**Plans:** 2 plans

Plans:
- [x] 07-01-PLAN.md — Backend: Settings model, DAL, Server Action, Zod schema, chat URL utilities, admin settings page
- [x] 07-02-PLAN.md — Client: ChatButtons component, dashboard integration, chat page replacement

#### Phase 8: Email Infrastructure
**Goal**: Dashboard sends professional transactional emails for key client actions
**Depends on**: Phase 7
**Requirements**: EMAIL-01, EMAIL-02, EMAIL-03, EMAIL-04, EMAIL-05, EMAIL-06, EMAIL-07, EMAIL-08
**Success Criteria** (what must be TRUE):
  1. Client receives welcome email with login credentials when account is created
  2. Client receives password reset email with secure reset link when requested
  3. Client receives email notification when new invoice is created
  4. Client receives payment confirmation email after successful Stripe payment
  5. Client receives email notification when new document is uploaded to their Drive folder
  6. All emails use professional React Email templates with BaseAim branding
  7. Email service (Resend) is properly configured with SPF/DKIM/DMARC for high deliverability
**Plans:** TBD

Plans:
- [ ] 08-01: TBD
- [ ] 08-02: TBD

#### Phase 9: Document Storage Migration
**Goal**: Google Drive replaces Vercel Blob for document storage with proper folder organization
**Depends on**: Phase 8
**Requirements**: DRIVE-01, DRIVE-02, DRIVE-03, DRIVE-04, DRIVE-05, DRIVE-06, DRIVE-07, DRIVE-08
**Success Criteria** (what must be TRUE):
  1. Client can view list of documents stored in their Google Drive folder
  2. Client can download documents (PDFs, images, videos) from dashboard
  3. Client can upload new documents to their Google Drive folder through dashboard
  4. Admin can upload documents to any client's Google Drive folder through admin interface
  5. Google Drive folders are automatically created when new client is onboarded
  6. Document UI in dashboard maintains existing design (Google Drive is backend replacement only)
  7. All existing Vercel Blob documents have been migrated to Google Drive
  8. Client receives email notification when new document is uploaded (uses Phase 8 email infrastructure)
**Plans:** TBD

Plans:
- [ ] 09-01: TBD
- [ ] 09-02: TBD
- [ ] 09-03: TBD

#### Phase 10: Payment Processing
**Goal**: Clients can view invoices and pay through Stripe integration
**Depends on**: Phase 9
**Requirements**: STRIPE-01, STRIPE-02, STRIPE-03, STRIPE-04, STRIPE-05, STRIPE-06, STRIPE-07, STRIPE-08
**Success Criteria** (what must be TRUE):
  1. Client can view list of invoices with payment status (pending, paid, overdue)
  2. Client can download invoice PDFs from dashboard
  3. Client can access Stripe Customer Portal to manage payment methods
  4. Admin can create invoices for clients through admin dashboard
  5. Invoice status automatically updates in database when Stripe webhook receives payment.succeeded event
  6. Invoice status automatically updates when payment.failed event is received
  7. Stripe webhook endpoint properly verifies signatures using raw body parsing
  8. Client receives email notifications for new invoices and payment confirmations (uses Phase 8 email)
**Plans:** TBD

Plans:
- [ ] 10-01: TBD
- [ ] 10-02: TBD

#### Phase 11: Facebook Ads Analytics
**Goal**: Clients can view their Facebook Ads campaign performance metrics in dashboard
**Depends on**: Phase 10
**Requirements**: FBADS-01, FBADS-02, FBADS-03, FBADS-04, FBADS-05, FBADS-06, FBADS-07
**Success Criteria** (what must be TRUE):
  1. Client sees 6 core Facebook Ads metrics in analytics page (ad spend, impressions, clicks, CTR, CPC, CPM)
  2. Client can switch between 7-day, 30-day, and all-time date ranges for metrics
  3. Client can export campaign performance reports as CSV or PDF
  4. Facebook Ads data is cached with 6-hour refresh cycle to avoid rate limits
  5. Analytics page displays real Facebook Ads data (replaces mock data from Phase 1)
  6. Admin can configure Facebook Ad Account ID per client through admin interface
  7. Facebook Advanced Access is approved and System User Token is configured

**CRITICAL NOTE:** Facebook Advanced Access requires 2-6 weeks approval. Application must be submitted at start of Phase 7, not when this phase begins.

**Plans:** TBD

Plans:
- [ ] 11-01: TBD
- [ ] 11-02: TBD

#### Phase 12: Production Hardening
**Goal**: Dashboard is secure, reliable, and production-ready with proper error handling and monitoring
**Depends on**: Phase 11
**Requirements**: PROD-01, PROD-02, PROD-03, PROD-04, PROD-05, PROD-06, PROD-07, PROD-08
**Success Criteria** (what must be TRUE):
  1. Sentry error monitoring is configured and tracking errors in production environment
  2. All pages display loading states or skeleton screens during data fetching
  3. Rate limiting is implemented on authentication endpoints to prevent brute force attacks
  4. CSRF protection is verified on all Server Actions
  5. Input validation using Zod is implemented on all user-submitted data
  6. Security headers are configured (CSP, X-Frame-Options, HSTS, etc.)
  7. Error boundaries catch and display user-friendly error messages instead of crashes
  8. Environment variables are validated on startup (no test keys in production)
**Plans:** TBD

Plans:
- [ ] 12-01: TBD
- [ ] 12-02: TBD

#### Phase 13: UI Polish & Admin Analytics Integration
**Goal**: Dashboard UI is polished with refined components and admin analytics shows real integration data
**Depends on**: Phase 12
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05
**Success Criteria** (what must be TRUE):
  1. Chat widget is replaced with WhatsApp/Telegram click-to-chat buttons (from Phase 7)
  2. Notification panel displays real notifications in header dropdown
  3. Notification panel allows marking individual notifications as read
  4. Mobile/tablet responsive design is refined across all pages
  5. Loading animations and transitions are polished throughout dashboard
  6. Empty states are designed for all list views (no documents, no invoices, no notifications, etc.)
  7. Admin analytics dashboard shows real client data aggregated from integrations (Stripe revenue, Facebook Ads spend)
  8. Admin can see total revenue and MRR across all clients from Stripe data
  9. Admin can see aggregate Facebook Ads spend and performance metrics across all clients
  10. Admin analytics shows risk detection based on overdue milestones (from Phase 6)
  11. Admin analytics displays upcoming milestone due dates within 7-day window (from Phase 6)
**Plans:** TBD

Plans:
- [ ] 13-01: TBD
- [ ] 13-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13

**v0.9 Foundation:**

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Dashboard Layout | 1/1 | ✓ Complete | 2026-02-12 |
| 2. Core Progress Tracking | 3/3 | ✓ Complete | 2026-02-12 |
| 3. Client Data Isolation | 3/3 | ✓ Complete | 2026-02-13 |
| 4. Admin Milestone Editing | 2/2 | ✓ Complete | 2026-02-15 |
| 5. Client Onboarding & Management | 3/3 | ✓ Complete | 2026-02-15 |
| 6. Admin Analytics | 2/2 | ✓ Complete | 2026-02-15 |

**v1.0 Production Launch:**

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 7. Chat Integration | 2/2 | ✓ Complete | 2026-02-16 |
| 8. Email Infrastructure | 0/TBD | Not started | - |
| 9. Document Storage Migration | 0/TBD | Not started | - |
| 10. Payment Processing | 0/TBD | Not started | - |
| 11. Facebook Ads Analytics | 0/TBD | Not started | - |
| 12. Production Hardening | 0/TBD | Not started | - |
| 13. UI Polish & Admin Analytics Integration | 0/TBD | Not started | - |
