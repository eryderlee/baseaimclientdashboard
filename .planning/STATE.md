# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-26)

**Core value:** Clients can see exactly where their project stands without having to ask
**Current focus:** Milestone v1.1 — Dashboard Improvements

## Current Position

Phase: 19 — Admin Preview + Status Badge
Plan: —
Status: Planned, ready to execute
Last activity: 2026-03-26 — v1.1 roadmap created (phases 19–23)

Progress: ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ v1.1: 0/5 phases complete

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
| 09-document-storage-migration | 4 | ~21 min | ~5.3 min |

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

**Phase 9 - Google Drive (from 09-02):**
- Drive folder creation is fire-and-forget in createClient() — .then().catch() chain after transaction, not await
- Transaction now returns newClient so client.id is available for Drive call outside transaction
- Lazy Drive folder initialization in admin upload route — creates folder on-demand for clients missing driveFolderId
- Admin-uploaded documents have status APPROVED — no approval workflow for admin-sourced content
- fileUrl column repurposed to store Google Drive file ID (was Vercel Blob URL) — Option A from research

**Phase 9 - Google Drive (from 09-03):**
- Download proxy at /api/documents/download/[fileId] — streaming response (not buffered) avoids Vercel 4.5 MB limit
- isOwner || isAdmin auth pattern on download AND delete — admins need full document management access
- Drive delete is graceful: catch error, always proceed with DB deletion
- findFirst({ where: { fileUrl: fileId } }) to resolve Drive file ID to a Document record

**Phase 9 - Google Drive (from 09-04):**
- Zero Blob files existed (BLOB_READ_WRITE_TOKEN was always empty) — Phase 9 migration was purely Drive folder provisioning
- Migration script uses inline Drive client to bypass server-only module import restrictions
- @vercel/blob fully removed; no rollback path needed

### Roadmap Evolution

- Phase 18 added (2026-03-26): Complete analytics page on the admin dashboard
- Phases 19–23 added (2026-03-26): v1.1 Dashboard Improvements milestone

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

**Phase 10 - Stripe Backend (from 10-01):**
- Webhook returns 200 for handler errors (after sig verification) — prevents Stripe retry storms
- Lazy Stripe customer creation — first invoice triggers customer.create(), stored in Subscription.stripeCustomerId
- Invoice URLs (hosted_invoice_url, invoice_pdf) fetched on-demand from Stripe — never stored in DB (they expire)
- createInvoice accepts FormData with items as JSON string for server action + fetch() compatibility
- Idempotent webhook handlers — check status before updating (e.g. skip if already PAID)

**For Phase 10 remaining plans:**
- STRIPE_WEBHOOK_SECRET must be configured for webhook to function
- Stripe webhook endpoint needs registering in Stripe Dashboard (events: invoice.paid, invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted)

**Phase 10 - Stripe Client UI (from 10-03):**
- Stripe URLs fetched on-demand at click time via /api/invoices/[id]/urls — not cached client-side (they expire)
- ManageBillingButton shown in page header AND per-subscription card (conditional on stripeCustomerId)
- Download PDF shown for all non-DRAFT statuses; Pay Now only for SENT|OVERDUE
- Intl.NumberFormat used per-invoice with invoice.currency field

**Phase 10 - Stripe Admin UI (from 10-02):**
- z.number() not z.coerce.number() for form amounts — coerce breaks react-hook-form Resolver type inference
- useTransition for server action submit state — cleaner than formState.isSubmitting for async actions
- Admin client detail page now has Edit+Documents+Invoices action buttons row

**Phase 10 - Subscription Backend (from 10-04):**
- clientId not unique on Subscription model — startSubscription uses findFirst+update/create instead of upsert where:{ clientId }
- current_period_end cast via (as unknown as { current_period_end: number }) — avoids TypeScript any warning while keeping noEmit clean
- cancelSubscription finds by stripeSubscriptionId not null — works regardless of current status string
- getAdminClientSubscription returns most recent by createdAt desc — handles multiple historical records

**Phase 10 - Subscription Admin UI (from 10-05):**
- SubscriptionManager renders two distinct states (no-subscription vs active/cancelling) — avoids prop-drilling complex mode flags
- useTransition for both startSubscription and cancelSubscription calls — consistent loading UX pattern
- Subscription dates serialized (Date → ISO string) at server component boundary — required for React serialization
- window.confirm for cancel confirmation — simple, no extra dialog component needed

**Phase 11 - Facebook Ads Client Analytics (from 11-03) — VERIFIED:**
- Dynamic import('jspdf') inside exportPdf onClick — jspdf is browser-only, prevents SSR bundle
- isConfigured check at page level via prisma.client.findUnique — keeps FbAdsMetrics purely presentational
- searchParams.range defaults to '30d' when absent/invalid — most useful FB ad review window
- rangToDatePreset() maps UI range strings ('7d'|'30d'|'all') to Facebook DatePreset values
- Dashboard home page chart not synced with analytics page date range — noted as separate issue, not blocking

**Phase 11 - Facebook Ads Admin UI (from 11-02):**
- FbSettingsForm is a separate component in same file as ChatSettingsForm — each form submits independently
- settings/page.tsx queries prisma.settings.findFirst() directly for facebookAccessToken — getChatSettings may not select it
- adAccountId stored as null (not empty string) when cleared — consistent with other nullable DB fields
- ClientFormProps.defaultValues typed as Partial<CreateClientInput & UpdateClientInput> — allows adAccountId in edit mode without casting

**Phase 11 - Facebook Ads Foundation (from 11-01):**
- verifySession() called BEFORE unstable_cache boundary — unstable_cache cannot access session cookies/headers (Next.js constraint)
- No Facebook SDK — single fetch to Marketing API v22.0 (no bundle overhead)
- cache: 'no-store' on fetchFacebookInsights — caching entirely delegated to unstable_cache in DAL layer
- 6-hour TTL (revalidate: 21600) — balances data freshness with Facebook API rate limits
- All FbInsights values are strings — Facebook API returns numbers as strings, always parseFloat() before arithmetic
- Returns null (not throw) when adAccountId or facebookAccessToken not configured — UI shows "not configured" state
- prisma db push used (not migrate dev) — project uses schema-first push approach, no migrations folder exists

**Phase 12 - Production Hardening (from 12-01):**
- Static CSP with unsafe-inline chosen over nonce-based — nonce forces dynamic rendering, unjustified for internal dashboard
- Sentry DSN is optional in env.ts — only set in production Vercel env, not locally
- SKIP_ENV_VALIDATION flag for CI flexibility
- Stripe key refine: production rejects sk_test_, dev passes through
- lib/env.ts is now single source of truth for all env vars — import instead of process.env directly
- instrumentation.ts follows Next.js 16 pattern — no experimental.instrumentationHook needed

**Phase 12 - Loading States & Error Boundaries (from 12-02):**
- loading.tsx files are server components (no 'use client') — Next.js wraps them in Suspense automatically
- error.tsx files must be client components — 'use client' first line, useEffect for logging, onClick for reset()
- Skeleton layouts mirror page shape roughly (not pixel-perfect) — conveys page structure during load
- Inline SVG in error boundaries — avoids lucide-react import overhead in error boundary context

**Phase 12 - Rate Limiting, CSRF Audit, Zod (from 12-03):**
- Upstash Redis selected for rate limiting — serverless HTTP client, edge-compatible, free tier sufficient
- slidingWindow(10, '60 s') on /login, /reset-password, /api/auth — permissive for normal use, blocks brute force
- try/catch wraps ratelimit.limit() — Upstash downtime must not lock out legitimate users
- x-forwarded-for for IP extraction — req.ip unreliable in middleware edge runtime; Vercel always sets x-forwarded-for
- Matcher updated to include /api/auth/:path* — original api/* negative lookahead excluded auth API routes
- CSRF protection via Server Actions — built-in Origin/Host verification, no manual tokens needed
- All route handler mutations verified authenticated (auth() or Stripe signature); /api/auth/register intentionally public
- Zod parse + try/catch at top of server actions — validated copies of variables used in all DB calls

**Phase 12 - Zod Gap Closure (from 12-04):**
- updateSettingsSchema added to app/api/user/settings/route.ts — 6 user profile fields validated before prisma.user.update()
- createMessageSchema added to app/api/messages/route.ts — content min1/max5000/trim, receiverId z.string().cuid().optional()
- companyName: optional only (not nullable) — Prisma Client.companyName is String (non-nullable), null is rejected by generated type
- All 7 Server Actions + 2 API route handlers = 100% Zod coverage; PROD-05 fully verified

**Phase 13 - Empty States & Transitions (from 13-03):**
- Glass-card dashed border empty state pattern: `rounded-2xl border border-dashed border-white/70 bg-white/60 p-6 text-center` — used for all list view empty states
- Empty state layout: centered lucide-react icon (h-10 w-10 text-slate-300) + font-medium heading + xs subtext
- Clock icon (lucide-react) for activity/time-related empty states; FileText for document empty states
- Hover transitions: `transition-all duration-200 hover:shadow-lg` on stat cards, `hover:shadow-md` on phase cards
- UI-05 and UI-06 requirements now met

**Manual UI Changes (2026-02-21 — pre-Phase 13):**
- Phase labels added to milestone checklist and items — `components/dashboard/milestone-checklist.tsx` + `milestone-item.tsx`
- Hero CTA now links to "Review Project Phases" instead of chat shortcuts — `components/dashboard/dashboard-overview.tsx`
- Growth Roadmap redesigned as horizontal timeline with arrows between phase cards, pulled above analytics widgets — `dashboard-overview.tsx`
- "Contact Team" stat card removed; chat lives exclusively at `/dashboard/chat` — `app/dashboard/page.tsx`
- Analytics page: "Messages Sent" metric and all `<AnalyticsCharts>` visualizations removed — `app/dashboard/analytics/page.tsx`
- "Notifications" card on overview replaced with compact "Recent Activity" feed — `dashboard-overview.tsx`
- Secondary "Recent Activity" card beside Growth Roadmap removed so timeline owns the full row
- Arrow centering fix applied to connect phase cards linearly
- Settings page updated (unknown change) — `app/dashboard/settings/page.tsx`
- Admin components updated: `create-invoice-form.tsx`, `client-analytics-table.tsx`
- New untracked components: `components/admin/delete-client-section.tsx`, `components/dashboard/change-password-form.tsx`

**Phase 14 - Enhanced Facebook Analytics & Branded Reporting (from 14-01):**
- 3 plans, 2 waves: Plan 1 (API+DAL) → Plans 2+3 parallel (UI + PDF)
- Extended FbInsights: reach, frequency, outbound_clicks (FbAction[] not string), quality_ranking, engagement_rate_ranking, conversion_rate_ranking
- Extended FbDailyInsight: reach and outbound_clicks added to DAILY_FIELDS
- New fetch functions: fetchFacebookCampaignInsights (top 5 by spend, level=campaign), fetchFacebookPlatformBreakdown (publisher_platform breakdown)
- FbPlatformRow does NOT include reach — June 2025 API restriction: reach cannot combine with publisher_platform breakdown
- New DAL functions: getClientFbCampaigns, getClientFbPlatformBreakdown, getClientFbDailyTrend — all verifySession-outside-cache, 6h TTL
- getClientFbDailyTrend returns null (not configured) vs getClientFbCampaigns/getClientFbPlatformBreakdown return [] (not configured)
- Cache keys: fb-campaigns-{id}-{preset}, fb-platform-{id}-{preset}, fb-daily-trend-{id} — all tagged fb-insights-{id}
- jspdf-autotable@5.0.7 installed for Plan 03 PDF export
- PDF: branded #2563eb header bar, "BASEAIM" text logo in white, all metric sections, campaign table, platform split
- Brand tokens: primary #2563eb, quality pills emerald/amber/red, glass-card style on UI cards
- recharts ComposedChart for spend+leads trend (already installed)

**Phase 14 - Enhanced Facebook Analytics UI (from 14-02):**
- FbAdsMetrics expanded to 12 cards: 6 existing + Reach, Frequency, Leads, CPL, Outbound Clicks, Landing Page Views
- QualityPill component: ABOVE_AVERAGE→emerald, AVERAGE→amber, BELOW_AVERAGE*→red, UNKNOWN→hidden (returns null)
- outbound_clicks summed via FbAction[] reduce — NOT parseFloat on the array
- landing_page_view extracted from actions array via getActionValue — NOT a top-level field
- recharts Tooltip custom formatter removed — causes TypeScript incompatibility with Formatter<V,N> overload; default tooltip sufficient
- Promise.all parallel fetch in analytics page: fbInsights + campaigns + platforms + dailyTrend
- Trend/campaigns/platform sections guarded by isConfigured && fbInsights (trend always shows last_30d regardless of range selector)
- ExportButtons now accepts campaigns/platforms as optional props — forwarding ready for Plan 03 PDF enhancement

**Phase 16 - Query Deduplication (from 16-02):**
- getSettings() is the single settings.findFirst canonical call — all DAL functions call getSettings(), never prisma.settings.findFirst() directly
- getClientAdConfig() is the single client adAccountId canonical call — all client FB DAL functions call getClientAdConfig(), never their own prisma.client.findUnique()
- getSettings() has no auth check — settings are global config (facebookAccessToken, whatsappNumber, telegramUsername), not user-scoped data
- getClientAnalytics() uses select (not include) on documents/milestones/activities — fetch only needed fields for analytics computation
- Dashboard home getCurrentUserName() reads from DB not session — DB is source of truth for display name

**Phase 18 - Comprehensive Analytics Page (ad-hoc 18-03):**
- getAdminFbMetricsPerClient returns full metrics map (spend/leads/impressions/clicks/ctr/cpc/cpm/reach) per clientId — 6h TTL
- getAdminAllCampaigns returns all campaigns across all clients sorted by spend; CTR computed inline (clicks/impressions*100)
- CPL computed at page render time (spend/leads), not stored in DAL return types — keeps DAL pure
- RISK_LEVEL_ORDER const map for sort comparator on at-risk clients: { high:0, medium:1, low:2, none:3 }
- ClientBadge in AdminCampaignsTable: bg-blue-50 text-blue-700 pill, same as blue-50/700 brand pattern

**Phase 18 - Admin FB UI (from 18-02):**
- AdminFbTrendSkeleton and AdminFbTrendSection co-located in app/admin/page.tsx as local (non-exported) functions — avoids new files for short, page-specific components
- AdminFbTrendChart formats dates inline, no range selector — data is always 30d from getAdminFbDailyAggregation, range UI would be redundant
- FB columns use hidden md:table-cell — prevents horizontal overflow on mobile without breaking existing table structure
- Inline Suspense fallback JSX for filter/table skeletons — shapes are simple enough to express inline without dedicated skeleton files

**Phase 18 - Admin FB DAL (from 18-01):**
- getAdminFbPerClient: loop counter (not extracted ID) to correlate Promise.allSettled results with client list — allSettled preserves index order
- getAdminFbDailyAggregation: Map<date, accumulator> pattern for multi-source date merging, then sort entries → array
- Admin FB functions query prisma.client.findMany({ where: { adAccountId: { not: null } } }) before cache boundary, pass accessToken into closure

**Phase 16 - Suspense Streaming (from 16-03):**
- Non-async page component reads searchParams then passes dateRange as prop to FbAdsSection — avoids blocking streaming
- FbAdsSection and ProjectMetricsSection async components co-located in page.tsx — per-section Suspense pattern
- FbAdsSkeleton mirrors 12-card grid + trend/campaigns/platform shape; ProjectMetricsSkeleton mirrors 3-card grid

**Phase 16 - Prisma Optimization (from 16-04):**
- previewFeatures = ["relationJoins"] required in schema.prisma for Prisma 5.x relationLoadStrategy TypeScript types — without it 'join' is typed as 'never'
- getAllClientsWithMilestones uses select (not include) — excludes notes Json from milestones; analytics/list only needs status/dueDate/startDate/progress/order/title
- getClientWithMilestones keeps notes in include — admin milestone editor reads milestone.notes for editing
- relationLoadStrategy: 'join' added to: getAllClientsWithMilestones, getClientWithMilestones, getClientForEdit, getClientBillingData, getAdminClientForBilling
- Bundle baseline: jspdf (408KB) and recharts (3x 393KB) are largest app-specific client chunks, both scoped to FB analytics route
- @googleapis/drive confirmed server-only — not present in any client-side chunks

**Phase 14 - Branded PDF/CSV Export (from 14-03):**
- autoTable(doc, opts) named export pattern for jspdf-autotable v5 — NOT doc.autoTable() method (doesn't exist in v5)
- (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY for next Y after table — avoids TypeScript any
- setFillColor(37, 99, 235) uses RGB numbers — jsPDF does not accept hex strings
- Dynamic import inside exportPdf function body — jspdf and jspdf-autotable are browser-only, must not enter SSR bundle
- Helper functions (getLeads, getOutboundClicks, getCplValue) duplicated in export-buttons.tsx — acceptable for standalone client component
- baseaim-fb-report-{dateRange}-{date} filename prefix on both CSV and PDF exports (was facebook-ads-)
- PDF layout: full-width blue rect at y=0 h=22, metrics two-column at y=38 spacing 8mm, rankings at y=92, tables below

**Phase 17 - VPS CI/CD Pipeline (from 17-02):**
- Single-job GitHub Actions workflow — build on runner (not VPS) to avoid RAM pressure
- SCP artifact target: `/var/www/dashboard/_deploy`, SSH step moves to `.next/standalone`
- `pm2 reload ecosystem.config.js --env production` for zero-downtime rolling restart
- ecosystem.config.js NOT copied from artifact — PM2 uses VPS-local committed copy (placed in Plan 17-03)
- 7 required GitHub secrets: VPS_HOST, VPS_USER, VPS_SSH_KEY, SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT, NEXT_PUBLIC_SENTRY_DSN
- `.env*` glob in .gitignore already covers .env.production; ecosystem.config.js correctly NOT gitignored

**Deployment (Phase 15 - planned):**
- Netlify selected for hosting (user preference)
- Supabase selected for production PostgreSQL database
- User has not created hosting account yet — Phase 15 will cover account setup + env var configuration
- Human verification items from Phase 12 (Sentry live, rate limit live, security headers) to be completed in Phase 15

## Session Continuity

Last session: 2026-03-26
Stopped at: Roadmap created for v1.1 (phases 19–23) — ready to begin Phase 19
Resume file: None
Next: Begin Phase 19 — Admin Preview + Status Badge. Run `/gsd:plan-phase 19`

**Phase 13 - UI Polish (from 13-01):**
- DashboardNav stays "use client" — all notification data fetched in layout server component, passed as serialized props
- createdAt serialized as ISO string before crossing server→client boundary (Date not serializable)
- unreadCount derived from props in client component — avoids useEffect/fetch complexity
- onCloseAutoFocus preventDefault on bell DropdownMenuContent — prevents focus jumping after close
- Mobile Sheet side="left" with md:hidden wrapper — canonical hamburger nav pattern
- Notification bell todo from v0.9 is now resolved via Phase 13-01
