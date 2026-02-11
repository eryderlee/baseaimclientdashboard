# Project Research Summary

**Project:** BaseAim Client Dashboard - Progress Tracking Milestone
**Domain:** Agency client portal with Google Sheets integration
**Researched:** 2026-02-11
**Confidence:** MEDIUM-HIGH

## Executive Summary

This project adds milestone-based progress tracking to an existing Next.js 16 client dashboard for a paid ads agency serving 1-5 accounting firm clients. The research reveals a clear, proven architectural pattern: **Google Sheets as admin UI, PostgreSQL as source of truth, poll-based sync via cron job**. This is a well-established approach with minimal new dependencies needed.

The recommended implementation leverages the existing stack (Next.js 16, Prisma 7, shadcn/ui, PostgreSQL) and adds only Google's official `googleapis` library for Sheets integration. The architecture follows a unidirectional sync pattern where admins update progress in Google Sheets, a scheduled cron job syncs changes to PostgreSQL, and clients view data from the database. This prevents the critical pitfall of treating Sheets as a real-time database, which causes rate limit errors and poor performance.

Key risks center around three areas: (1) rate limiting if querying Sheets on every page load instead of syncing to DB, (2) schema validation failures when admins edit Sheet structure, and (3) authentication issues if using OAuth instead of service accounts. All three are preventable through proper architecture choices made in Phase 1. The feature set is intentionally simple—linear checklist-style progress tracking, not complex project management—which aligns perfectly with the target audience of busy accounting firm owners who need transparency without overhead.

## Key Findings

### Recommended Stack

The existing Next.js stack handles 90% of requirements. Only two new dependencies needed for Google Sheets integration:

**Core technologies:**
- **googleapis** (^152.0.0): Official Google Sheets API v4 client — provides full TypeScript support, handles auth and API calls, more transparent than wrapper libraries for production use
- **google-auth-library** (^9.0.0): Service account authentication — required peer dependency, enables server-to-server auth without OAuth flow complexity
- **Existing stack reuse**: Prisma 7.3.0 for DB sync, shadcn/ui Checkbox + Card for checklist UI, Lucide React icons for progress states, Next.js Server Actions for sync logic, Vercel Cron for scheduled polling

**Critical decision:** Use Service Account authentication (not OAuth) to avoid token expiration issues. Service accounts provide stable, long-lived credentials suitable for server-to-server integration without user interaction.

**Sync strategy:** Poll Google Sheets every 15 minutes via Vercel Cron (free tier). This is well within API quota limits for 1-5 clients (96 requests/day vs 300,000/day limit) and provides acceptable data freshness.

### Expected Features

**Must have (table stakes):**
- Linear milestone checklist — sequential list with checkmarks showing what's done, what's in progress, what's upcoming
- Overall progress percentage — single prominent number calculated from milestone completion ("60% complete")
- Status indicators — NOT_STARTED / IN_PROGRESS / COMPLETED / BLOCKED with color coding and icons
- Current milestone highlight — visual distinction showing where agency's attention is focused
- Milestone descriptions — 1-2 sentence explanations so clients understand what each step means
- Expected timeline — due dates for milestones (week-level precision with realistic buffers)
- Completion markers — clear "Completed ✓" badges with completion dates for trust-building

**Should have (competitive):**
- **Admin update via Google Sheets** — THE key differentiator; admin updates progress in Sheets where they already work, dashboard auto-syncs
- Standardized milestones — all clients see same proven process, no custom milestone creation per client
- Client action items — dashboard shows when ball is in client's court ("Action needed: Approve landing page design")
- Progress notes/updates — mini-changelog per milestone ("Updated 2 hours ago: Design approved, moving to development")
- Automated status email digests — weekly summary keeping portal top-of-mind

**Defer (v2+):**
- Gantt charts / Kanban boards — overkill for linear service process, confuses clients
- Time tracking / hours logged — creates wrong incentive, clients care about outcomes not hours
- Real-time updates — polling every 15 minutes is sufficient, real-time adds complexity
- Client-editable milestones — admin controls structure, clients view-only
- Comparative analytics — no cross-client comparisons, focus on absolute progress only

### Architecture Approach

**Core pattern:** Unidirectional sync with Google Sheets as source of truth for admin updates, PostgreSQL as source of truth for client views. Admin workflow is Sheets-based, client experience is database-backed.

**Major components:**

1. **Google Sheets Client** (`/lib/google-sheets/client.ts`) — Infrastructure layer handling API authentication, data fetching, rate limiting, error handling. Uses service account credentials from env vars.

2. **Milestone Sync Service** (`/lib/sync/milestone-sync-service.ts`) — Business logic orchestrating sync process: fetch from Sheets, compare with DB, detect changes via timestamp comparison, apply updates using Prisma upsert, log results.

3. **Sync API Routes** (`/app/api/sync/`) — Interface layer exposing sync operations as HTTP endpoints, handling admin authentication, triggering sync operations, returning status. Protected by NextAuth middleware.

4. **Database Extensions** — New `SyncLog` table tracking sync history (status, rows processed, errors, duration), existing `Milestone` table unchanged, `Client` table extended with `spreadsheetId`, `sheetName`, `syncEnabled` fields.

5. **Presentation Layer** — Client dashboard unchanged (reads from DB as before), new admin dashboard for manual sync triggers and status monitoring.

**Data flow:** Admin updates Google Sheets → Vercel Cron triggers every 15 min → API route calls Sync Service → Sync Service fetches via googleapis client → Change detection compares Sheets vs DB → Prisma upserts changed records → PostgreSQL updated → Client dashboard reads from DB.

**Critical patterns to follow:**
- Service account authentication (no OAuth token expiration)
- Idempotent sync operations (safe to retry, use upsert not delete+insert)
- Change detection with timestamps (efficient, only update what changed)
- Exponential backoff retry logic (handle transient API failures)
- Configuration per client in database (enable/disable sync, store Sheet IDs)

### Critical Pitfalls

1. **Treating Sheets as a real-time database** — Querying Sheets API on every page load causes rate limit errors (60 req/min/user), 2-5 second page loads, quota exhaustion. **Prevention:** Establish sync-to-DB pattern from Phase 1, serve all user requests from PostgreSQL, never query Sheets directly in client-facing routes.

2. **No schema validation on Sheets data** — Admins accidentally break app by renaming columns, deleting headers, changing data formats. App crashes or silently corrupts data. **Prevention:** Protect header rows in Sheets, validate expected columns before sync, fail gracefully with admin alerts if validation fails, keep serving old data until fixed.

3. **OAuth token expiration not handled** — Using user OAuth instead of service account causes sync to stop working after 1-7 days when tokens expire. No one notices until clients complain about stale data. **Prevention:** Use service account from start, share Sheets with service account email, monitor for 401/403 errors.

4. **Race conditions in concurrent syncs** — Multiple sync jobs running simultaneously cause duplicate records, partial updates, database integrity violations. **Prevention:** Implement distributed lock (PostgreSQL advisory locks), use idempotent upsert patterns, track in-progress syncs in database.

5. **Cell reference hell** — Using A1 notation (`A1:D10`) makes code brittle, breaks when admin inserts columns. **Prevention:** Use named ranges in Sheets ("MilestoneData") or header-based lookup, document what each range contains.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Core Progress Tracking (MVP)
**Rationale:** Establish foundational UI and data model before adding external integration complexity. Validates value proposition with manual data updates for 1-5 clients (totally manageable scale).

**Delivers:**
- Milestone checklist display component with status icons and progress bars
- Overall progress card showing completion percentage
- Status indicators (NOT_STARTED/IN_PROGRESS/COMPLETED/BLOCKED) with color coding
- Milestone descriptions and due dates
- Dashboard layout improvements (analytics chart moved, stat cards added)

**Addresses:** All table stakes features from FEATURES.md except Sheets integration

**Uses:** Existing stack only (Prisma, shadcn/ui, Lucide React, Tailwind)

**Avoids:** No external dependencies means no rate limiting, auth, or sync issues yet

**Implementation notes:** Can populate milestones manually via Prisma Studio initially. For 5 clients, this is faster than building Sheets integration upfront.

**Estimated effort:** 15-20 hours based on complexity analysis

### Phase 2: Google Sheets Sync (Automation)
**Rationale:** Once MVP proven valuable with manual updates, automate admin workflow via Sheets integration. This is the key differentiator that scales beyond 5 clients.

**Delivers:**
- Google Sheets client with service account authentication
- Milestone sync service with change detection and upsert logic
- Sync API routes with admin authentication
- Database schema extensions (SyncLog table, Client sync fields)
- Manual sync trigger for testing

**Addresses:** "Admin update via Google Sheets" differentiator from FEATURES.md

**Uses:** googleapis (^152.0.0), google-auth-library (^9.0.0) from STACK.md

**Implements:** GoogleSheetsClient, MilestoneSyncService, Sync API Routes from ARCHITECTURE.md

**Avoids:**
- Pitfall #3 (use service account, not OAuth)
- Pitfall #2 (schema validation from start)
- Pitfall #5 (use named ranges or header lookup)

**Implementation notes:** Build with manual trigger first, validate sync works correctly before adding cron automation.

**Estimated effort:** 15-20 hours

### Phase 3: Automated Sync (Production-Ready)
**Rationale:** Once manual sync proven reliable, add scheduled automation and admin tooling for production use.

**Delivers:**
- Vercel Cron job configuration (every 15 minutes)
- Distributed lock mechanism (PostgreSQL advisory locks)
- Admin sync dashboard (status display, log viewer, manual trigger)
- Client configuration UI (set spreadsheet ID per client)
- Error notifications and monitoring

**Addresses:** Automation gap between Sheets updates and dashboard visibility

**Uses:** Vercel Cron (free tier) from STACK.md

**Avoids:**
- Pitfall #4 (race conditions via distributed lock)
- Pitfall #10 (sync observability via logging and admin dashboard)
- Pitfall #1 (polling frequency well within rate limits)

**Implementation notes:** Test cron authentication with Vercel secret before enabling for all clients. Start with 15-minute polling, can adjust based on admin feedback.

**Estimated effort:** 10-15 hours

### Phase 4: Enhanced Features (Post-MVP)
**Rationale:** After core sync working reliably, add polish features that improve UX but aren't critical for launch.

**Delivers:**
- Client action items ("Action needed: Approve design")
- Progress notes timeline (milestone update history)
- Email digests (weekly progress summary)
- Enhanced error handling and partial sync recovery

**Addresses:** "Should have" differentiators from FEATURES.md

**Uses:** Email service integration (Resend/SendGrid), milestone update tracking

**Avoids:** Pitfall #6 (diff detection already in Phase 2, just expose in UI)

**Implementation notes:** Can be tackled incrementally, each feature is independent.

**Estimated effort:** 20-30 hours total

### Phase Ordering Rationale

- **MVP first approach:** Build simplest version that delivers value (Phase 1) before adding integration complexity. For 1-5 clients, manual milestone updates via Prisma Studio are faster than building Sheets integration immediately.

- **External dependency isolation:** Phase 1 uses only existing stack, Phase 2 adds Google Sheets integration, Phase 3 adds cron automation. Each phase adds one external dependency layer, making debugging easier.

- **Critical pitfall prevention:** Service account setup happens in Phase 2, before any production use. Schema validation and locking built into Phase 2/3 before enabling automated syncs. Rate limiting avoided by architecture (sync-to-DB pattern).

- **Validation gates:** Each phase has clear deliverable that can be validated before proceeding. Phase 1 proves UI/UX works, Phase 2 proves sync logic works, Phase 3 proves automation works, Phase 4 adds polish.

- **Scalability path:** Manual → Manual Sheets sync → Automated sync → Enhanced features. Can stop at any phase based on client count and admin feedback.

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 2 (Sheets Sync):** Google Cloud project setup process, service account permission scoping, exact googleapis API surface for Next.js 16. Will benefit from focused research on googleapis integration patterns.
- **Phase 4 (Email Digests):** Email service selection (Resend vs SendGrid vs alternatives), template design, deliverability best practices.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Core UI):** Well-documented shadcn/ui patterns, existing codebase has similar progress displays, straightforward React component work.
- **Phase 3 (Vercel Cron):** Official Vercel documentation covers this completely, standard Next.js pattern.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | googleapis is official Google library (verified pattern), existing Next.js stack proven, minimal new dependencies |
| Features | HIGH | Agency portal patterns well-established, table stakes vs differentiators clear, anti-features informed by PM tool overengineering |
| Architecture | HIGH | Sync-to-DB pattern is industry standard for external data sources, service account auth is recommended Google approach, component boundaries clean |
| Pitfalls | HIGH | Rate limiting, schema validation, OAuth issues are documented failure modes for Sheets integrations, prevention strategies proven |

**Overall confidence:** MEDIUM-HIGH

High confidence on architectural approach (sync-to-DB, service accounts, idempotent operations) and critical pitfall prevention. Medium confidence on exact version numbers for googleapis (stated as ^152.0.0 based on typical versioning, should verify with npm registry) and specific quota limits (may have changed since training data).

### Gaps to Address

**Version verification needed:**
- Confirm current googleapis package version on npm (research states ^152.0.0 based on training data)
- Verify google-auth-library current version (stated as ^9.0.0)
- Check if Google Sheets API v4 quota limits changed (training data says 300,000/day, 300/100sec)

**How to handle:** Run `npm info googleapis version` and `npm info google-auth-library version` during Phase 2 setup. Check official Google Sheets API documentation for current quota limits.

**Google Cloud setup specifics:**
- Exact steps for creating service account in Google Cloud Console (screenshots/guide would help)
- Proper permission scopes for read-only Sheets access
- How to share Sheet with service account email

**How to handle:** During Phase 2 planning, use `/gsd:research-phase` to get current Google Cloud service account setup guide via Context7 or official docs.

**Sheet structure standardization:**
- Exact column names and order for milestone tracking
- Data validation rules to enforce in Sheets UI
- Named range setup for resilient data fetching

**How to handle:** Document in Phase 2 planning, create Sheet template as deliverable. This is design work, not research gap.

**Cron job authentication:**
- Vercel Cron secret header format for Next.js 16
- Exact `vercel.json` syntax for App Router

**How to handle:** Reference Vercel official docs during Phase 3 implementation, standard pattern.

## Sources

### Primary (HIGH confidence)
- **Google Sheets API v4 documentation patterns** — Official Google documentation for googleapis library, service account authentication, API structure
- **Next.js 16 App Router documentation** — Official Next.js docs for Server Actions, API routes, middleware
- **Prisma ORM documentation** — Official patterns for upsert operations, transactions, schema design
- **Vercel Cron documentation** — Official Vercel feature for scheduled jobs in Next.js apps

### Secondary (MEDIUM confidence)
- **Agency client portal patterns** — Training knowledge of HubSpot Client Portal, Teamwork, Monday.com client-facing boards (2023-2025)
- **SaaS onboarding/progress tracking UX** — Stripe Dashboard, Vercel project status, Linear milestone tracking
- **Google Sheets integration best practices** — Community patterns for Sheets-as-backend architectures, sync strategies

### Tertiary (LOW confidence)
- **Specific version numbers** — googleapis ^152.0.0, google-auth-library ^9.0.0 based on training data versioning progression (verify with npm registry)
- **Exact quota limits** — 300,000 read requests/day stated based on training data (verify with current Google Sheets API docs)

### Verification Recommendations

Before implementation:
1. Check npm registry for current googleapis and google-auth-library versions
2. Review Google Sheets API v4 quota documentation for any limit changes
3. Confirm Vercel Cron syntax for Next.js 16 App Router in official docs
4. Test service account creation flow in Google Cloud Console (may have UI changes)

---

## Synthesis Notes

**Cross-cutting themes identified:**

1. **Simplicity over complexity:** All four research files emphasize keeping the solution simple. FEATURES.md explicitly lists complex PM features (Gantt charts, Kanban) as anti-features. STACK.md recommends reusing existing dependencies. ARCHITECTURE.md favors poll-based sync over webhook complexity. PITFALLS.md warns against overengineering.

2. **Admin experience as primary concern:** Google Sheets integration is highlighted across all files as THE differentiator. FEATURES.md calls it out specifically, STACK.md focuses new dependencies on it, ARCHITECTURE.md structures entire sync layer around it, PITFALLS.md warns about admin-introduced errors.

3. **Rate limiting as existential risk:** PITFALLS.md calls this "Critical Pitfall #1", STACK.md explains quota limits, ARCHITECTURE.md designs around it with sync pattern. This is the single biggest technical risk if architecture is wrong.

4. **Service account authentication non-negotiable:** STACK.md recommends it, ARCHITECTURE.md designs for it, PITFALLS.md marks OAuth as "Critical Pitfall #3". This decision must be made correctly in Phase 1 or causes production issues later.

**Contradictions resolved:**

- STACK.md suggests polling "every 5-15 minutes", ARCHITECTURE.md says "every 15 minutes", FEATURES.md says "real-time updates" are anti-feature. **Resolution:** 15-minute polling is the sweet spot, can adjust based on admin feedback.

- ARCHITECTURE.md shows complex change detection logic, PITFALLS.md warns about "No Diff Detection" being only a moderate pitfall. **Resolution:** Implement timestamp-based change detection from start (Phase 2), but full diff optimization can wait until proven necessary.

**Roadmap construction logic:**

Phases structured by external dependency layers:
- Phase 1: No external dependencies (UI only)
- Phase 2: Add Google Sheets (one external API)
- Phase 3: Add automation (Vercel Cron)
- Phase 4: Add enhancements (email service if needed)

This allows validation gates between each integration point and makes debugging easier by isolating failure domains.

---

*Research completed: 2026-02-11*
*Ready for roadmap: yes*
