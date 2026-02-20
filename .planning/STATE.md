# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** Clients can see exactly where their project stands without having to ask
**Current focus:** Phase 9 - Document Storage Migration (v1.0 Production Launch)

## Current Position

Phase: 9 of 13 (Document Storage Migration)
Plan: 3 of 4 complete
Status: Phase 9 in progress
Last activity: 2026-02-20 — Completed 09-03-PLAN.md (Download proxy + Drive delete: streaming proxy route, DocumentList updated, delete route migrated off Vercel Blob)

Progress: [█████████████░░░░░░░░░░░░░] 70% (21/30 total plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 19 (14 v0.9 Foundation + 5 v1.0 Production Launch)
- Average duration: 8.4 min
- Total execution time: ~3.32 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-dashboard-layout | 1 | 20 min | 20 min |
| 02-core-progress-tracking | 3 | 19 min | 6 min |
| 03-client-data-isolation | 3 | 71 min | 24 min |
| 04-admin-milestone-editing | 2 | 27 min | 14 min |
| 05-client-onboarding-and-management | 3 | 31 min | 10 min |
| 06-admin-analytics | 2 | 8 min | 4 min |
| 07-chat-integration | 2 | 5 min | 2.5 min |
| 08-email-infrastructure | 2 | 9 min | 4.5 min |
| 09-document-storage-migration | 3 | 16 min | 5.3 min |

**Recent Trend:**
- Last 5 plans: 3 min, 3 min, 6 min, 4 min, 4 min
- Trend: Fast — v1.0 Production Launch momentum

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

**From v0.9 Foundation:**
- Custom admin CRM instead of Google Sheets — Leverages existing admin auth, provides direct database control
- Standard milestones for all clients — Same service process for every client, simplifies both admin and client experience
- Individual client logins — Each client gets their own credentials to see their own data
- Checklist-style progress (not timeline) — Simple, clear, easy to understand at a glance
- DAL pattern for centralized authorization — Centralizes session verification and client-scoped data access
- React cache() for deduplication — Every DAL function wrapped to deduplicate database calls
- Server + client component architecture — Pages are async server components that fetch via DAL, UI is client components
- Time-based progress for IN_PROGRESS milestones — Calculated from elapsed days, clamped to 0-99
- Hash password BEFORE transaction — bcrypt.hash is CPU-intensive, keep transaction fast
- Risk detection with weighted severity — Overdue + stalled milestone heuristics for project health
- URL search params for filter/sort state — Enables bookmarkable filtered views

**For v1.0 Production Launch:**
- Build order follows dependency chain: Chat → Email → Drive → Stripe → FB Ads → Production/UI
- Facebook Advanced Access must be submitted at start (2-6 week approval blocks Phase 11)
- Google Drive replaces Vercel Blob for document storage (migration required)
- Stripe webhooks need raw body parsing for signature verification
- Email infrastructure (Phase 8) enables notifications across other integrations
- Settings model is singleton (one row for global app config) — upsert pattern for updates
- getChatSettings has no auth check — settings are public for client chat buttons
- WhatsApp requires digits-only phone (international format without +)
- Telegram does NOT support pre-filled messages for regular users (only bots)
- ChatButtons layout prop ('row' | 'column') for flexible UI integration
- Conditional rendering in dashboard: shows chat buttons when configured, fallback link otherwise
- Fire-and-forget email sending — Email failures don't block client creation flow
- Inline styles for email templates — Email clients don't support Tailwind/external CSS
- Resend for email delivery — Modern API, React Email integration, generous free tier
- Password reset tokens expire after 60 minutes — Balance between security and convenience
- Email enumeration prevention — Same response whether email exists or not (security best practice)
- One active reset token per email — Old tokens deleted on new request
- Build email templates upfront — Phase 9/10 templates created in Phase 8 for faster future execution

**Phase 9 - Google Drive (from 09-01):**
- Use @googleapis/drive subpackage (not full googleapis) — avoids Vercel 250 MB bundle limit
- Store service account credentials as two env vars (GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) — prevents private key newline corruption
- privateKey.replace(/\\n/g, '\n') required for Vercel env var newline restoration
- Drive client singleton uses `let driveClient: drive_v3.Drive | undefined` (not null) for TypeScript narrowing compatibility
- import { drive } from '@googleapis/drive' — subpackages export named function directly, not google namespace
- driveFolderId nullable (String?) on Client model — existing clients start null, populated by migration script
- fileUrl column in Document model kept as-is (Option A from research) — will store Drive file IDs post-migration

**Phase 9 - Google Drive (from 09-03):**
- Download proxy at /api/documents/download/[fileId] — streaming response (not buffered) avoids Vercel 4.5 MB limit
- isOwner || isAdmin auth pattern on download AND delete — admins need full document management access
- Drive delete is graceful: catch error, always proceed with DB deletion
- findFirst({ where: { fileUrl: fileId } }) to resolve Drive file ID to a Document record

### Pending Todos

1 todo pending from v0.9. See `.planning/todos/pending/` or run `/gsd:check-todos`

- **Notification panel for header bell icon** (ui) — Will be addressed in Phase 13 (UI Polish)

**Resolved:**
- ✓ Add floating chat widget — Addressed in Phase 7 with WhatsApp/Telegram buttons (ChatButtons component)

### Blockers/Concerns

**CRITICAL for Phase 11 (Facebook Ads):**
- Facebook Advanced Access requires 2-6 weeks approval
- Application MUST be submitted at start of Phase 7, not when Phase 11 begins
- Without Advanced Access, Phase 11 cannot complete

**For Phase 9 (Google Drive) - remaining plans:**
- Google Cloud setup required before end-to-end testing (service account, Drive API, root folder, env vars)
- Existing Vercel Blob file count/size unknown — audit in Plan 09-05 before migration
- BLOB_READ_WRITE_TOKEN is empty in .env — production may have zero Blob files to migrate

**For Phase 10 (Stripe):**
- Webhook signature verification critical — must use raw body parsing (await req.text())
- Separate .env.production with live-mode secret needed

## Session Continuity

Last session: 2026-02-20T09:44:31Z
Stopped at: Completed 09-03-PLAN.md (Phase 9 Plan 3 - Download proxy + Drive delete)
Resume file: None
Next: 09-04-PLAN.md (File Upload to Drive)
