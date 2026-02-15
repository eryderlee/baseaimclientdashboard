# Requirements: BaseAim Client Dashboard

**Defined:** 2026-02-11
**Core Value:** Clients can see exactly where their project stands without having to ask

## v1.0 Requirements (Production Launch)

Requirements for v1.0 Production Launch milestone. Each maps to roadmap phases.

### Email Notifications

- [ ] **EMAIL-01**: Client receives welcome email with login credentials when account created
- [ ] **EMAIL-02**: Client receives password reset email when requested
- [ ] **EMAIL-03**: Client receives email notification when new invoice is created
- [ ] **EMAIL-04**: Client receives payment confirmation email after successful payment
- [ ] **EMAIL-05**: Client receives email notification when new document is uploaded
- [ ] **EMAIL-06**: Client receives weekly progress digest email with milestone status summary
- [ ] **EMAIL-07**: All emails use professional React Email templates with BaseAim branding
- [ ] **EMAIL-08**: Email service (Resend) properly configured with SPF/DKIM/DMARC for deliverability

### Chat Integration

- [ ] **CHAT-01**: Client dashboard displays WhatsApp click-to-chat button
- [ ] **CHAT-02**: WhatsApp chat opens with pre-filled message including client context
- [ ] **CHAT-03**: Client dashboard displays Telegram click-to-chat button
- [ ] **CHAT-04**: Telegram chat opens with pre-filled message including client context
- [ ] **CHAT-05**: Admin can configure WhatsApp number and Telegram username in settings

### Document Storage (Google Drive)

- [ ] **DRIVE-01**: Client can view list of documents in their Google Drive folder
- [ ] **DRIVE-02**: Client can download documents (PDFs, images, videos, etc.)
- [ ] **DRIVE-03**: Client can upload documents to their Google Drive folder
- [ ] **DRIVE-04**: Admin can upload documents to any client's Google Drive folder
- [ ] **DRIVE-05**: Google Drive folders are automatically created when new client is onboarded
- [ ] **DRIVE-06**: Document UI in dashboard matches existing design (Google Drive is backend only)
- [ ] **DRIVE-07**: Service account authentication configured for Drive API access
- [ ] **DRIVE-08**: Existing Vercel Blob uploads migrated to Google Drive

### Payment Processing (Stripe)

- [ ] **STRIPE-01**: Client can view list of invoices with payment status
- [ ] **STRIPE-02**: Client can download invoice PDFs
- [ ] **STRIPE-03**: Client can access Stripe Customer Portal to manage payment methods
- [ ] **STRIPE-04**: Admin can create invoices for clients through dashboard
- [ ] **STRIPE-05**: Stripe webhook receives and processes payment.succeeded events
- [ ] **STRIPE-06**: Stripe webhook receives and processes payment.failed events
- [ ] **STRIPE-07**: Invoice status automatically updates in database when payment succeeds/fails
- [ ] **STRIPE-08**: Stripe webhook endpoint uses raw body parsing for signature verification

### Facebook Ads Analytics

- [ ] **FBADS-01**: Client can view 6 core metrics: ad spend, impressions, clicks, CTR, CPC, CPM
- [ ] **FBADS-02**: Client can switch between 7-day, 30-day, and all-time date ranges
- [ ] **FBADS-03**: Client can export/download campaign performance reports as CSV or PDF
- [ ] **FBADS-04**: Facebook Ads data is cached with 6-hour refresh cycle
- [ ] **FBADS-05**: Analytics page displays Facebook Ads data (replaces mock data)
- [ ] **FBADS-06**: Facebook Advanced Access approved and System User Token configured
- [ ] **FBADS-07**: Admin can configure Facebook Ad Account ID per client

### Production Hardening

- [ ] **PROD-01**: Sentry error monitoring configured and tracking errors in production
- [ ] **PROD-02**: All pages display loading states/skeleton screens during data fetching
- [ ] **PROD-03**: Rate limiting implemented on authentication endpoints
- [ ] **PROD-04**: CSRF protection verified on all Server Actions
- [ ] **PROD-05**: Input validation using Zod on all user-submitted data
- [ ] **PROD-06**: Security headers configured (CSP, X-Frame-Options, etc.)
- [ ] **PROD-07**: Error boundaries catch and display user-friendly error messages
- [ ] **PROD-08**: Environment variables validated on startup (no test keys in production)

### UI Polish

- [ ] **UI-01**: Chat widget replaced with WhatsApp/Telegram click-to-chat buttons
- [ ] **UI-02**: Notification panel displays real notifications in header dropdown
- [ ] **UI-03**: Notification panel allows marking notifications as read
- [ ] **UI-04**: Mobile/tablet responsive design refined across all pages
- [ ] **UI-05**: Loading animations and transitions polished throughout dashboard
- [ ] **UI-06**: Empty states designed for all list views (no documents, no invoices, etc.)

### Admin Analytics

- [ ] **ADMIN-01**: Admin analytics dashboard populated with real client data (not mock)
- [ ] **ADMIN-02**: Admin can see total revenue and MRR across all clients (from Stripe)
- [ ] **ADMIN-03**: Admin can see aggregate Facebook Ads spend and performance across clients
- [ ] **ADMIN-04**: Admin analytics shows risk detection based on overdue milestones
- [ ] **ADMIN-05**: Admin analytics displays upcoming due dates within 7-day window

## Validated Requirements (Pre-v1.0)

Completed in previous milestone phases. These are locked baseline features.

### Dashboard Layout

- ✓ **DASH-01**: Dashboard overview shows 4 stat cards on the left side — Phase 1
- ✓ **DASH-02**: Dashboard overview shows analytics chart on the right, smaller than current size — Phase 1
- ✓ **DASH-03**: Analytics chart can be expanded to full-width (current size) via toggle/button — Phase 1
- ✓ **DASH-04**: Dashboard layout is responsive (stacks on mobile) — Phase 1

### Progress Tracking

- ✓ **PROG-01**: Client sees a linear milestone checklist showing all project steps in order — Phase 2
- ✓ **PROG-02**: Each milestone shows status indicator (Not Started / In Progress / Completed) with color coding — Phase 2
- ✓ **PROG-03**: Dashboard shows overall progress percentage calculated from milestone completion — Phase 2
- ✓ **PROG-04**: Currently active milestone is visually highlighted/distinguished from others — Phase 2
- ✓ **PROG-05**: Each milestone has a 1-2 sentence description explaining what it means — Phase 2
- ✓ **PROG-06**: Each milestone shows expected due date (week-level precision) — Phase 2
- ✓ **PROG-07**: Completed milestones show completion date — Phase 2
- ✓ **PROG-08**: All clients share the same standard milestone template — Phase 2
- ✓ **PROG-09**: Each milestone can have progress notes — Phase 2

### Client Data Isolation

- ✓ **AUTH-01**: Each client logs in with individual email/password credentials — Phase 3
- ✓ **AUTH-02**: Client only sees their own project progress and data — Phase 3
- ✓ **AUTH-03**: Admin can see all clients' data — Phase 3

### Admin Management

- ✓ **ADMIN-MGT-01**: Admin can add new clients with company details — Phase 5
- ✓ **ADMIN-MGT-02**: Admin can create user accounts for client access — Phase 5
- ✓ **ADMIN-MGT-03**: Admin can edit client details — Phase 5
- ✓ **ADMIN-MGT-04**: Admin can deactivate/reactivate client accounts — Phase 5
- ✓ **ADMIN-MGT-05**: Admin can edit milestone status, dates, and notes — Phase 4
- ✓ **ADMIN-MGT-06**: New clients automatically get standard 6-milestone template — Phase 5

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Features

- **ADV-01**: Estimated launch date calculated from current progress rate
- **ADV-02**: Expected vs actual timeline comparison per milestone
- **ADV-03**: Client action items displayed on dashboard ("Your turn: grant ad account access")
- **ADV-04**: Celebratory animation/styling when major milestones complete
- **ADV-05**: Benchmark indicators for Facebook Ads (show "good" vs "needs improvement")
- **ADV-06**: Automated billing on milestone completion
- **ADV-07**: Multi-month trend visualization for Facebook Ads
- **ADV-08**: Lead cost projection calculator

## Out of Scope

Explicitly excluded features. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Google Sheets integration | Replaced with custom admin CRM in previous milestone — direct database control is simpler |
| Real-time chat widget | External chat apps (WhatsApp/Telegram) avoid building real-time infrastructure |
| Campaign editing from dashboard | High liability risk — keep Facebook Ads read-only, editing in Ads Manager |
| Client-customizable email preferences | Adds complexity, keep notifications simple for v1.0 |
| Gantt charts / dependency graphs | Overkill for linear process, confuses non-technical clients |
| Kanban boards | Too granular, clients don't need internal task visibility |
| Time tracking / hours logged | Wrong incentive — clients care about outcomes not hours |
| Real-time progress updates | Milestone-level updates are sufficient |
| Cross-client comparisons | Demoralizing and context-free |
| Custom milestones per client | All clients follow same standard process |
| Mobile app | Web-first |
| SMS notifications | Email sufficient for target audience, SMS adds costs |
| Google Drive search | Organized folders sufficient initially |
| Full Drive feature parity | Link to "Open in Google Drive" for advanced features |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

### Pre-v1.0 Phases (Completed)

| Requirement | Phase | Status |
|-------------|-------|--------|
| DASH-01 | Phase 1 | Complete |
| DASH-02 | Phase 1 | Complete |
| DASH-03 | Phase 1 | Complete |
| DASH-04 | Phase 1 | Complete |
| PROG-01 | Phase 2 | Complete |
| PROG-02 | Phase 2 | Complete |
| PROG-03 | Phase 2 | Complete |
| PROG-04 | Phase 2 | Complete |
| PROG-05 | Phase 2 | Complete |
| PROG-06 | Phase 2 | Complete |
| PROG-07 | Phase 2 | Complete |
| PROG-08 | Phase 2 | Complete |
| PROG-09 | Phase 2 | Complete |
| AUTH-01 | Phase 3 | Complete |
| AUTH-02 | Phase 3 | Complete |
| AUTH-03 | Phase 3 | Complete |
| ADMIN-MGT-05 | Phase 4 | Complete |
| ADMIN-MGT-01 | Phase 5 | Complete |
| ADMIN-MGT-02 | Phase 5 | Complete |
| ADMIN-MGT-03 | Phase 5 | Complete |
| ADMIN-MGT-04 | Phase 5 | Complete |
| ADMIN-MGT-06 | Phase 5 | Complete |

### v1.0 Phases (To be mapped by roadmap)

| Requirement | Phase | Status |
|-------------|-------|--------|
| EMAIL-01 through EMAIL-08 | TBD | Pending |
| CHAT-01 through CHAT-05 | TBD | Pending |
| DRIVE-01 through DRIVE-08 | TBD | Pending |
| STRIPE-01 through STRIPE-08 | TBD | Pending |
| FBADS-01 through FBADS-07 | TBD | Pending |
| PROD-01 through PROD-08 | TBD | Pending |
| UI-01 through UI-06 | TBD | Pending |
| ADMIN-01 through ADMIN-05 | TBD | Pending |

**Coverage:**
- Validated requirements: 25 total (all complete)
- v1.0 requirements: 52 total
- Mapped to phases: 0 (roadmap will assign)
- Unmapped: 52 ⚠️ (will be resolved during roadmap creation)

---
*Requirements defined: 2026-02-11*
*Last updated: 2026-02-15 after v1.0 milestone definition*
