# Project Research Summary

**Project:** BaseAim Client Dashboard - v1.0 Production Launch Integrations
**Domain:** Next.js 16 Agency Dashboard with External Service Integrations
**Researched:** 2026-02-15
**Confidence:** HIGH

## Executive Summary

The v1.0 Production Launch milestone integrates five external services into an existing Next.js 16 App Router dashboard: Facebook Ads API (campaign metrics), Google Drive (document storage), Stripe (payments), Resend (transactional email), and chat links (Telegram/WhatsApp). This research validates that all integrations leverage Next.js 16's Server Components and Server Actions architecture, keeping API secrets server-side and maintaining the existing Data Access Layer (DAL) pattern.

The recommended approach follows a dependency-driven build order: start with simple chat links (pure data storage), implement email infrastructure early (enables onboarding notifications across other integrations), migrate from Vercel Blob to Google Drive, add Stripe payment processing (depends on email for receipts), and finish with Facebook Ads analytics (requires client ad accounts). All recommended libraries are current as of February 2026 and explicitly support Next.js 16 App Router patterns. Total integration implementation time is estimated at 21-33 hours across five integrations.

The critical risks center on production deployment mistakes: Stripe webhook signature verification failures (caused by body parsing middleware), Facebook Advanced Access delays (2-6 week approval process that blocks launch if not started early), and OAuth token refresh race conditions in serverless environments. Mitigation requires architectural patterns established in Phase 1 (proper webhook routing, database-level locking) and proactive third-party approvals started immediately (Facebook Business Verification and Advanced Access applications).

## Key Findings

### Recommended Stack

Five new integrations extend the existing validated stack (Next.js 16, React 19, Prisma, PostgreSQL, NextAuth v5, Tailwind, shadcn/ui) without replacements. All integration libraries are production-ready, actively maintained, and specifically built for modern React/Next.js patterns.

**Core integration technologies:**
- **facebook-nodejs-business-sdk 24.0.1+** — Official Meta Marketing API client supporting v22.0+ API, handles campaign metrics, pagination, and versioning automatically
- **googleapis 145.0.0+** — Official Google APIs Node.js client for Drive API v3, supports OAuth 2.0 and service accounts, updated February 13, 2026
- **stripe 20.3.1+ (already installed)** — Official Stripe Node.js library with excellent Next.js App Router integration, no new dependencies needed
- **resend 4.0.1+ & react-email 3.0.1+** — Modern transactional email built for Next.js with type-safe React templates, simpler DX than SendGrid/Nodemailer
- **No SDK required for chat** — Telegram/WhatsApp use simple URL generation patterns (wa.me/phone, t.me/username)

**Authentication patterns by service:**
- Facebook: System User Token (long-lived, 60-day refresh cycle, stored in environment variables)
- Google Drive: Service Account with JSON key file (drive.file scope, shared folder access)
- Stripe: API keys server-side only + webhook signature verification with raw body parsing
- Resend: API key server-side only (fire-and-forget pattern, no OAuth needed)

**Critical version requirements:**
- Next.js 16.x fully supported by all integrations
- Node.js 18+ required for most packages
- React 19 compatible (react-email supports React 18+, backwards compatible)

### Expected Features

Research identifies clear MVP boundaries for v1.0 launch vs post-launch iterations based on agency dashboard patterns for small-scale deployments (1-5 clients).

**Must have (table stakes for v1.0 launch):**
- Facebook Ads: 6-8 core metrics (spend, impressions, clicks, CTR, CPC, CPM), 30-day and all-time date ranges, cached data (6-hour refresh)
- Google Drive: List files in shared folder, PDF/image preview, download links, view-only permissions, folder organization by type
- Stripe: Invoice list with status, invoice details (line items, amounts, dates), download PDF, payment method management via Customer Portal, payment status badges
- Transactional Email: Welcome on signup, password reset, invoice ready notification, payment confirmation, new document notification
- Chat Links: WhatsApp click-to-chat, Telegram click-to-chat, pre-filled message with client context, business hours indicator

**Should have (add in v1.1-v1.3 after validation):**
- Milestone-linked document display (connects docs to progress tracking)
- Weekly progress digest email (proactive client updates)
- Benchmark indicators for ad metrics (educate users on "good" vs "needs improvement")
- Spend vs budget tracking (proactive cost management)
- Onboarding email sequence (Day 1, 3, 7 drip campaign)
- Automatic folder provisioning (reduces manual Google Drive setup)

**Defer to v2+ (low value-to-effort ratio):**
- Multi-month trend visualization for ads (complex querying, current state focus for v1)
- Payment plan options (unlikely need for small agency)
- Lead cost projection calculator (requires conversion tracking setup)
- Google Drive search functionality (organized folders sufficient initially)
- Client-customizable email preferences (adds complexity, keep notifications simple)
- SMS notifications (email sufficient for target audience, SMS adds costs)

**Anti-features identified (commonly requested but problematic):**
- Real-time Facebook Ads updates (API rate limits, data doesn't change that fast — 4-6 hour refresh sufficient)
- Campaign editing from dashboard (huge liability, keep read-only)
- In-dashboard chat widget (requires real-time infrastructure — external chat apps are simpler)
- Full Drive feature parity (scope creep — link to "Open in Google Drive" for advanced features)

### Architecture Approach

All integrations follow Next.js 16 App Router best practices: Server Components for data fetching, Server Actions for mutations, Route Handlers only for external webhooks. This leverages automatic request deduplication, keeps secrets server-side, and avoids unnecessary API routes. The existing DAL pattern (verifySession, getCurrentClientId, React cache wrappers) extends to integration service layer without changes.

**Major components:**
1. **Integration Service Layer** (`/lib/integrations/[service]/client.ts`) — External API communication, token management, stateless client classes or singletons depending on statefulness
2. **Server Components** (dashboard pages) — Direct fetching from integration services using DAL for session verification, rendering without intermediate API routes
3. **Server Actions** (co-located in `/app` routes) — Mutation operations (uploads, payments, CRUD), revalidation with revalidatePath(), form submissions
4. **Route Handlers** (`/app/api/webhooks/[service]/route.ts`) — External webhook endpoints requiring signature verification (Stripe only for this project)
5. **Email Templates** (`/lib/integrations/resend/templates/`) — React Email components for transactional emails, type-safe template variables

**Data flow example (Document Upload):**
```
Client Component → Server Action (uploadDocument) → verifySession() (DAL)
→ GoogleDriveClient.uploadFile() → Prisma.document.create()
→ revalidatePath('/dashboard/documents') → Return success
```

**Critical architectural patterns:**
- **Pattern 1:** Server Component Direct Fetching — No API routes for read operations, secrets stay server-side, automatic cache deduplication
- **Pattern 2:** Server Actions for Mutations — CSRF protection, type-safe, progressive enhancement, easy cache revalidation
- **Pattern 3:** Route Handlers for Webhooks — Signature verification, raw body parsing (await req.text()), idempotent event processing
- **Pattern 4:** Service Client Singleton — Stateless clients (Stripe, Resend) use singleton pattern, stateful clients get fresh instances
- **Pattern 5:** Caching with 'use cache' — Next.js 16 directive for expensive external API calls (Facebook metrics cached 15 min)

### Critical Pitfalls

Research identified six critical pitfalls that cause complete integration failures, security breaches, or production launch delays.

1. **Stripe Webhook Signature Verification Failure** — Next.js body parser corrupts raw request body before signature verification. Prevention: Use `await req.text()` for RAW body, verify signature BEFORE any JSON parsing, return 400 on invalid signature. This breaks 100% of webhooks if wrong.

2. **Wrong Stripe Webhook Secret in Production** — Using test mode secret in production environment causes 100% verification failure. Prevention: Separate .env.production with live-mode secret (whsec_live_...), verify environment variables at startup, test webhooks in staging first.

3. **Missing Idempotency in Stripe Webhook Handlers** — Stripe retries webhooks for 3 days, without idempotency duplicate events create duplicate records. Prevention: Track processed event IDs in database with unique constraint on stripeEventId, use upsert operations, wrap in database transactions.

4. **Facebook Ads API Advanced Access Trap** — Standard Access is "demo mode" with severe rate limits, can't access client ad accounts. Advanced Access requires Business Verification (2-4 weeks) + App Review (2-7 days per permission). Prevention: Apply for Advanced Access in Phase 1, not when feature is ready. Blocks launch by 1-2 months if delayed.

5. **Exposed API Keys in Client-Side Code** — Storing secrets in NEXT_PUBLIC_* environment variables embeds them in browser bundle. Prevention: Never prefix secrets with NEXT_PUBLIC_, use Server Components/Actions for all external API calls, only expose publishable keys (Stripe pk_...).

6. **OAuth Token Refresh Race Conditions** — Multiple serverless instances refresh same expired token simultaneously, first succeeds and invalidates old token, others fail with "invalid_grant". Prevention: Database-level locking with SELECT FOR UPDATE in transactions, check if token refreshed while waiting for lock, or use Redis distributed locks for multi-instance coordination.

**Additional high-severity pitfalls:**
- Email Authentication Missing (SPF/DKIM/DMARC) — Gmail/Yahoo reject emails in 2026 without proper DNS records, 50-80% deliverability loss
- Google Drive API Rate Limits Not Handled — 12,000 queries/60 seconds per user, needs exponential backoff and retry logic
- Google Drive File Permissions Not Managed — Files default to private (service account only), users see "You need access" errors
- Mixing Test and Production Stripe Modes — Database corruption with mixed test_/live_ IDs, accidental real charges in development

## Implications for Roadmap

Based on research, suggested 5-phase structure follows dependency order and avoids critical pitfalls:

### Phase 1: Foundation - Chat Links & Email Infrastructure
**Rationale:** Chat links require zero external dependencies (pure data storage + URL generation). Email infrastructure enables onboarding notifications across all other integrations, so implement early to support subsequent phases.

**Delivers:**
- WhatsApp/Telegram click-to-chat links with pre-filled messages
- Resend transactional email service with React Email templates
- Welcome email on client signup
- Password reset email (if not already implemented)
- Email sending utilities for other integrations

**Addresses (from FEATURES.md):**
- Chat: WhatsApp link, Telegram link, business hours indicator
- Email: Welcome email, password reset

**Avoids (from PITFALLS.md):**
- Email Authentication Missing — Configure SPF/DKIM/DMARC before sending production emails
- Exposed API Keys — Establish Resend server-side pattern from start

**Stack elements:** resend 4.0.1+, react-email 3.0.1+, @react-email/components 0.0.27+

**Estimated time:** 3-6 hours (chat: 1 hour, email: 2-4 hours, templates: 1 hour)

### Phase 2: Document Storage - Google Drive Migration
**Rationale:** Google Drive replaces Vercel Blob for document storage, core functionality needed before production. Requires migration of existing files, so best to tackle early before more documents accumulate.

**Delivers:**
- Google Drive API integration with service account auth
- File upload/download/delete Server Actions
- Document list and preview (PDF/images)
- Migration script from Vercel Blob to Google Drive
- Per-client folder structure with proper permissions
- New document notification emails (uses Phase 1 email infrastructure)

**Addresses (from FEATURES.md):**
- Google Drive: File list, preview, download, folder organization, view-only permissions
- Email: New document notification

**Avoids (from PITFALLS.md):**
- Google Drive File Permissions Not Managed — Set explicit permissions on upload (viewer role for clients)
- Google Drive API Rate Limits Not Handled — Implement exponential backoff from start
- OAuth Token Refresh Race Conditions — Use service account (not OAuth) to avoid token issues

**Stack elements:** googleapis 145.0.0+, @google-cloud/local-auth 3.0.1+ (dev only)

**Schema changes:** Add driveFileId, driveFolderId to Document model

**Estimated time:** 8-12 hours (client setup: 3 hours, Server Actions: 3 hours, migration: 2-4 hours, permissions: 1-2 hours)

### Phase 3: Payment Processing - Stripe Integration
**Rationale:** Stripe integration is complex with webhooks and requires email infrastructure (invoice notifications, payment confirmations). Build after email and document storage are stable.

**Delivers:**
- Stripe checkout session creation (Server Actions)
- Invoice list and detail views
- Payment method management via Stripe Customer Portal
- Webhook handler for subscription/invoice events (app/api/webhooks/stripe/route.ts)
- Invoice sent and payment confirmation emails (uses Phase 1 email)
- Idempotent webhook event processing with database tracking

**Addresses (from FEATURES.md):**
- Stripe: Invoice list, invoice details, payment method management, download PDF, payment status
- Email: Invoice notification, payment confirmation

**Avoids (from PITFALLS.md):**
- Stripe Webhook Signature Verification Failure — Use await req.text() for raw body, verify BEFORE parsing
- Wrong Stripe Webhook Secret in Production — Environment-specific validation, test staging webhooks
- Missing Idempotency in Webhook Handlers — Track stripeEventId with unique constraint
- Mixing Test and Production Stripe Modes — Startup validation rejects test keys in production

**Stack elements:** stripe 20.3.1+ (already installed), @stripe/stripe-js 8.7.0+ (already installed)

**Schema changes:** Add stripeCustomerId to Client model, possibly WebhookEvent model for idempotency tracking

**Estimated time:** 6-10 hours (checkout: 2 hours, webhooks: 3-4 hours, invoice UI: 2 hours, testing: 2-3 hours)

### Phase 4: Campaign Analytics - Facebook Ads API
**Rationale:** Facebook Ads requires client ad accounts (not available initially) and Advanced Access approval (2-6 weeks). Build last so approval process can run in parallel with earlier phases. Metrics are nice-to-have, not blocking for launch.

**Delivers:**
- Facebook Ads API client with System User Token
- Campaign metrics display (6-8 core metrics)
- Date range filtering (30-day, all-time)
- Cached metrics (15-minute revalidation with 'use cache')
- Campaign-level breakdown
- Last updated timestamp

**Addresses (from FEATURES.md):**
- Facebook Ads: Core metrics (spend, impressions, clicks, CTR, CPC, CPM), date ranges, campaign breakdown

**Avoids (from PITFALLS.md):**
- Facebook Ads API Advanced Access Trap — Apply for Advanced Access in Phase 1 (2-6 week approval)
- Missing Facebook Ads Rate Limit Monitoring — Monitor x-business-use-case-usage headers, implement circuit breaker
- Facebook Ads API Data Staleness — Validate date ranges (13-month limit as of Jan 2026), archive old data

**Stack elements:** facebook-nodejs-business-sdk 24.0.1+

**Schema changes:** Add facebookAdAccountId, facebookLastSyncAt to Client model

**Estimated time:** 6-10 hours (client setup: 2 hours, metrics fetch: 2-3 hours, caching: 1-2 hours, UI: 2-3 hours)

**CRITICAL:** Start Advanced Access application immediately (Phase 1), not when this phase begins. 2-6 week approval blocks production launch.

### Phase 5: Production Hardening & Deployment
**Rationale:** Final phase ensures all integrations work in production environment with proper monitoring, error handling, and security configurations.

**Delivers:**
- Environment variable validation (startup checks for required secrets)
- Production DNS configuration (SPF/DKIM/DMARC for email)
- Stripe webhook testing in staging
- Facebook Advanced Access verification (should be approved by now)
- Google Drive quota monitoring
- Error tracking setup (optional: Sentry)
- Load testing for rate limits
- Documentation of API keys and rotation procedures

**Addresses:**
- Production deployment checklist
- Third-party service configurations
- Security hardening

**Avoids (from PITFALLS.md):**
- All environment-specific pitfalls (wrong webhook secrets, test keys in production, missing DNS records)

**Estimated time:** 4-8 hours (environment setup: 2 hours, testing: 2-3 hours, monitoring: 1-2 hours, documentation: 1 hour)

### Phase Ordering Rationale

1. **Email First** — Enables notifications across all other integrations (document uploads, invoices, payments), simplest integration after chat links
2. **Google Drive Second** — Core functionality replacement, needed before production, migration easier when fewer documents exist
3. **Stripe Third** — Depends on email for receipts and notifications, complex webhooks need stable foundation
4. **Facebook Ads Last** — Requires client ad accounts (not available initially), Advanced Access approval runs in parallel with other phases, metrics are enhancement not blocker
5. **Production Hardening Final** — Validates all integrations work together in production environment

**Dependency chain:**
```
Chat Links (no deps) → Email Infrastructure → Google Drive (uses email for notifications)
                                           ↓
                                      Stripe (uses email for receipts)
                                           ↓
                                   Facebook Ads (independent, nice-to-have)
                                           ↓
                              Production Hardening (validates all)
```

**Pitfall avoidance:**
- Critical pitfalls (webhooks, secrets, OAuth) addressed in Phase 1 architecture decisions
- Facebook Advanced Access started immediately, approved by Phase 4 implementation
- Email authentication configured in Phase 1 before sending production emails
- Environment separation enforced from Phase 1 onward

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 2 (Google Drive):** Migration strategy from Vercel Blob requires investigation of existing file structure, folder organization patterns may need user research
- **Phase 4 (Facebook Ads):** Client-specific ad account IDs and permissions need discovery, metric selection may need validation with actual client needs

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Chat/Email):** Well-documented Resend integration, established patterns from official docs
- **Phase 3 (Stripe):** Extensive Next.js 16 examples, official Stripe docs cover App Router patterns thoroughly
- **Phase 5 (Production):** Deployment checklist, standard DevOps practices

**Research completed proactively:**
- All four integrations researched in parallel (STACK, FEATURES, ARCHITECTURE, PITFALLS)
- No additional research needed unless implementation uncovers edge cases
- Facebook Advanced Access process well-documented, no unknowns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All libraries verified from official sources, versions confirmed current as of Feb 2026, Next.js 16 compatibility explicit |
| Features | MEDIUM-HIGH | Based on agency dashboard patterns and competitor analysis, table stakes validated across multiple sources, MVP boundaries clear |
| Architecture | HIGH | Next.js 16 App Router patterns documented in official docs, integration service layer follows established patterns, webhook handling verified in multiple sources |
| Pitfalls | HIGH | Critical pitfalls sourced from official docs (Stripe, Facebook, Google), security issues verified with 2026-dated sources, recent policy changes (Jan 2026) captured |

**Overall confidence:** HIGH

Research quality is strong across all areas. Stack recommendations come from official documentation and verified package registries. Architecture patterns align with Next.js 16.1.6 official documentation (Feb 2026). Critical pitfalls sourced from vendor documentation and recent real-world experience articles. Features validated against agency dashboard competitors and standard SaaS patterns.

Lower confidence on feature prioritization (MEDIUM-HIGH) reflects inherent uncertainty in product decisions — what's "table stakes" vs "differentiator" requires user validation. However, research provides clear framework for making these decisions based on industry patterns.

### Gaps to Address

**Facebook Advanced Access timing uncertainty:**
- Research shows 2-6 week approval timeline, but actual duration varies
- Mitigation: Apply immediately in Phase 1, plan to launch Phase 4 with or without (manual data export fallback if delayed)
- Validation: Track application status weekly, escalate if approaching 4 weeks

**Google Drive migration data volume unknown:**
- Existing Vercel Blob file count/size not researched
- Mitigation: Audit existing files in Phase 2 planning, estimate migration time based on actual data
- Could impact Phase 2 timeline if hundreds of large files exist

**Client ad account access permissions:**
- Unclear if clients will grant ad account access willingly
- Research assumes agency has access, but user acceptance not validated
- Mitigation: User research before Phase 4, prepare "request access" flow if needed

**Email deliverability testing needed:**
- SPF/DKIM/DMARC configuration is documented, but actual deliverability requires testing
- Mitigation: Use mail-tester.com (aim for 10/10 score) in Phase 1, send test emails to Gmail/Outlook/Yahoo

**Rate limit thresholds for actual usage:**
- Research documents rate limits (Facebook: 200 calls/hour, Google Drive: 12K/60s), but actual usage patterns unknown
- Mitigation: Monitor headers in production, implement circuit breakers proactively, request quota increases if needed

## Sources

### Primary (HIGH confidence)

**Official Documentation:**
- Stripe Node.js library (v20.3.1) — Webhook patterns, App Router integration
- Facebook Marketing API Node.js SDK (v24.0.1) — Campaign metrics, rate limits
- Google APIs Node.js client (v145.0.0) — Drive API v3, service accounts
- Resend documentation — Next.js integration guide
- Next.js 16.1.6 documentation (Feb 2026) — Server Components, Server Actions, Route Handlers, Data Security Guide
- Meta Ads API Integration Guide (2026) — Advanced Access requirements, Business Verification
- Google Drive API Usage Limits — Quota documentation

**Integration Guides (MEDIUM-HIGH confidence):**
- "Stripe Checkout and Webhook in Next.js 15" (Medium, 2025) — App Router webhook patterns
- "Meta Ads API Integration Guide: Complete Setup 2026" (AdStellar) — Advanced Access process
- "Node.js quickstart | Google Drive" (Google for Developers) — Official quickstart guide
- "Send emails with Next.js" (Resend official docs) — Transactional email setup

**Security & Best Practices (HIGH confidence):**
- Next.js Security Hardening: Five Steps to Bulletproof Your App in 2026 (Medium)
- Handling Payment Webhooks Reliably: Idempotency, Retries, Validation (Medium)
- Email Authentication Crisis 2026: Why Emails Fail & Fixes (Mailbird)
- Facebook Marketing API: The Advanced Access Trap (Medium, firsthand account)

### Secondary (MEDIUM confidence)

**Agency Dashboard Patterns:**
- AgencyAnalytics feature comparison — Competitor analysis for table stakes features
- DashThis documentation — White-label dashboard patterns
- "Automated Facebook Ads Reporting: A Complete Guide for 2026" (Improvado) — Standard metrics for agency reporting

**Community Patterns (verified with official docs):**
- "How to handle concurrency with OAuth token refreshes" (Nango) — Race condition prevention
- "How to Handle Google Drive API Rate Limits" (FolderPal) — Exponential backoff examples
- "Stripe webhook signature verification" (various Medium articles) — App Router specific issues

### Tertiary (LOW confidence, needs validation)

**Chat Integration:**
- Generic patterns for WhatsApp/Telegram links — Standard URL schemes (wa.me, t.me)
- No platform-specific research beyond basic documentation

**Version Information (WebSearch):**
- npm package latest versions — Current as of Feb 2026 research date, verify during implementation

---
*Research completed: 2026-02-15*
*Ready for roadmap: yes*
