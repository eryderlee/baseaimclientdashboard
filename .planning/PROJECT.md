# BaseAim Client Dashboard

## What This Is

A client-facing dashboard for BaseAim, a paid ads and funnel agency serving local accounting firms. Clients log in to track the progress of their lead acquisition system being built, view campaign metrics once live, manage documents, and handle billing. The dashboard is the primary touchpoint between BaseAim and its clients.

## Core Value

Clients can see exactly where their project stands — what's been done, what's in progress, and what's next — without having to ask.

## Current Milestone: v1.1 Dashboard Improvements

**Goal:** Polish the client experience, fix data consistency issues, and create a believable demo environment ready for prospect presentations.

**Target features:**
- **Admin client preview**: "View as client" impersonation mode — admin sees the full client dashboard (all pages) with a sticky exit banner
- **Graph overhaul**: Ad spend (daily), leads (admin-toggleable per client), combined chart with legend — on both home page and analytics tab; fix date range bug (currently only affects display, not data)
- **ROAS metric**: Return on Ad Spend card (revenue from ads / ad spend) on home page and analytics
- **Ongoing growth roadmap**: After all 6 setup phases complete, auto-generate 12 monthly review milestones from completion date; admin can add/remove milestones per client
- **Demo environment**: Seed script creating 1 test admin + 5 realistic fake clients at varying stages, with believable fake FB metrics, invoices, and documents — no real Stripe/Facebook connections, no test indicators

## Requirements

### Validated

- ✓ Dashboard layout with sidebar navigation — existing
- ✓ Authentication system with email/password (NextAuth + credentials) — existing
- ✓ Role-based access (CLIENT / ADMIN) — existing
- ✓ Document upload system with Vercel Blob storage — existing
- ✓ Analytics page with chart visualizations (Recharts) — existing
- ✓ Billing page structure with Stripe integration — existing
- ✓ Chat interface component — existing
- ✓ Notification center component — existing
- ✓ Settings page with user preferences — existing
- ✓ Prisma schema with User, Client, Document, Milestone, Invoice, Message, Notification models — existing

### Active

- [ ] Admin "View as client" impersonation mode with sticky exit banner
- [ ] Daily ad spend graph on home page and analytics (respects date range)
- [ ] Leads graph on home page and analytics (admin-toggleable per client)
- [ ] Combined chart with legend showing all active metrics
- [ ] Fix: date range selector affects data fetch, not just chart display (home page + campaign performance)
- [ ] ROAS metric card (revenue from ads / ad spend) on home page and analytics
- [ ] Ongoing milestones: auto-generate 12 monthly reviews after setup completion; admin can add/remove
- [ ] Demo seed: 5 realistic fake clients with believable FB metrics, invoices, and documents

### Out of Scope

- Real-time chat system — defer to later milestone
- Campaign metrics/analytics from live ads — defer until after progress tracking is solid
- Mobile app — web-first
- Multi-agency support — BaseAim only
- CRM integration — Google Sheets is sufficient for 1-5 clients

## Context

- BaseAim is pre-launch — no clients yet, building the dashboard ahead of onboarding
- Client ICP: local accounting firms needing lead generation
- Service: paid ads + funnels to generate leads for clients
- Standard process: every client goes through the same milestones (onboarding → ad account setup → landing page → campaign build → launch → optimization)
- Admin workflow: BaseAim team updates progress in Google Sheets, dashboard syncs from there
- Scale: 1-5 clients initially
- Existing codebase has UI components and pages but most use mock/hardcoded data

## Constraints

- **Tech stack**: Next.js 16, React 19, Prisma, PostgreSQL, Tailwind/shadcn — already established
- **Auth**: NextAuth with credentials provider — already implemented
- **Admin simplicity**: Google Sheets as admin backend — team already uses Sheets for client data
- **Scale**: Optimized for 1-5 concurrent clients, not high scale

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Google Sheets as admin backend | Team already uses Sheets, no need for custom admin UI for 1-5 clients | — Pending |
| Standard milestones for all clients | Same service process for every client, simplifies both admin and client experience | — Pending |
| Individual client logins | Each client gets their own credentials to see their own data | — Pending |
| Checklist-style progress (not timeline) | Simple, clear, easy to understand at a glance | — Pending |

---
*Last updated: 2026-03-26 after milestone v1.1 initialization*
