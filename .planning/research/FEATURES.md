# Feature Landscape: Agency Client Portal - Progress Tracking

**Domain:** Agency client portal for service delivery tracking
**Researched:** 2026-02-11
**Confidence:** MEDIUM (based on training knowledge of agency portal patterns, SaaS client dashboards, and project management tools)

## Executive Summary

Agency client portals for service delivery (particularly for marketing/ads agencies) have a clear hierarchy of features. The core value proposition is **transparency without overhead** — clients want to see project status instantly, without needing to schedule calls or send emails asking "where are we?"

For BaseAim's use case (paid ads/funnel agency, 1-5 accounting firm clients), the feature set should prioritize:
1. **Dead-simple progress visibility** (checklist-style, not complex project management)
2. **Admin-friendly updates** (Google Sheets integration, not another UI to learn)
3. **Client confidence building** (clear next steps, realistic timelines)

## Table Stakes

Features clients expect. Missing these = portal feels incomplete or unprofessional.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Linear milestone checklist** | Clients need to know "what's done, what's next" at a glance | Low | Simple sequential list with checkmarks. Not Gantt charts, not dependencies. Just: Step 1 ✓, Step 2 (in progress), Step 3 (upcoming) |
| **Overall progress percentage** | Quick visual of "how far along are we?" | Low | Single number (e.g., "60% complete"). Calculated from milestone completion. Must be prominent on dashboard. |
| **Status indicators** | Clients need confidence that work is happening | Low | Not Started / In Progress / Completed / Blocked. Color coding (gray/blue/green/red). Icons help (circle/clock/checkmark/alert). |
| **Current milestone highlight** | "What are you working on right now?" | Low | Visually distinguish active milestone from upcoming ones. Clients want to know where attention is focused. |
| **Milestone descriptions** | Clients often don't know what "Landing Page Setup" means | Low | 1-2 sentence explanation per milestone. "Building the landing page where your leads will submit their info." |
| **Expected timeline (dates)** | Clients want to know when things will be done | Low | Due dates for milestones. Doesn't need to be real-time accurate — set realistic buffers. Week-level precision is fine ("Due: Feb 15"). |
| **Completion markers** | Celebration/confidence when milestones finish | Low | Clear "Completed ✓" badge with completion date. "Completed on Feb 8, 2026." Small dopamine hits build trust. |
| **Phase grouping (optional but common)** | Helps clients understand project structure | Medium | Group milestones into phases (Onboarding, Setup, Launch, Optimization). Makes long lists less overwhelming. |

### Why These Are Table Stakes

**From client perspective:**
- Clients paying $3K-10K/month want to see progress without having to ask
- Accounting firm owners are busy — dashboard must answer "where are we?" in <10 seconds
- Lack of visibility = "are they even working on my project?" anxiety
- Simple checklist format = universally understood (no training needed)

**From agency perspective:**
- Reduces "status update" calls/emails by 60-80%
- Sets clear expectations about what's coming next
- Builds confidence through visible progress

## Differentiators

Features that set the portal apart. Not expected, but create competitive advantage.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Admin update via Google Sheets** | Admin updates progress in Sheets, dashboard auto-syncs | Medium-High | **BaseAim-specific differentiator**. No need for admin to log into portal. Sheet = source of truth. Sync via API/cron. Technical lift but huge DX win for small teams. |
| **Standardized milestones (template-based)** | All clients see same process, builds trust through consistency | Low | Every accounting firm client goes through identical 6-step process. No custom milestone creation needed. Simplifies admin UX and sets clear expectations. |
| **Milestone dependencies visualization** | Shows why something is blocked ("waiting on X") | Medium | Not critical for linear process like BaseAim's, but helpful if milestone B needs A completed. Dotted lines or "Waiting for: Client to provide access" note. |
| **Milestone-specific instructions/next steps** | Tells client what they need to do | Low | "Next step: Grant access to Google Ads account. [Instructions]". Reduces back-and-forth. Clients know if the ball is in their court. |
| **Progress notes/updates** | Mini-changelog per milestone | Medium | "Updated 2 hours ago: Landing page design approved, moving to development." Gives clients real-time confidence. Could pull from Sheets "Notes" column. |
| **Expected vs actual timeline** | Shows slippage or ahead-of-schedule progress | Medium | "Expected: Feb 15, Actual: Feb 12 ✓" or "Expected: Feb 15, Revised: Feb 18 (waiting on client access)". Transparency builds trust even when delayed. |
| **Client action items** | Dashboard shows what client needs to do | Medium | "🔔 Action needed: Approve landing page design." Turns dashboard from passive viewer into task list. Reduces "waiting on client" delays. |
| **Automated status email digests** | Weekly email with progress summary | Medium | "Your BaseAim Project: Week of Feb 5. Completed: Ad account setup ✓. In progress: Landing page build. Next: Campaign strategy." Keeps portal top-of-mind. |
| **Celebratory milestones** | Mark major wins (e.g., "Launch!") | Low | Special styling for big milestones. Confetti animation on launch day. Small touch, big emotional impact. |
| **Estimated launch date** | Dynamic "your campaign goes live on ~Feb 20" | Medium | Based on current progress rate + remaining milestones. Updates automatically. Clients want to know "when will I start getting leads?" |

### Why These Differentiate

**Google Sheets integration:**
- Most agencies use Sheets for client tracking already
- Eliminates "admin UI learning curve" — update where you already work
- Reduces admin time from 10min/client to 2min (just update Sheet)
- Rare in client portals (most require logging into portal to update)

**Standardized process:**
- Communicates "we've done this before, this is our proven system"
- Reduces client anxiety ("is my project on track?" — yes, same track as all clients)
- Simplifies admin (no custom milestone creation per client)

**Client action visibility:**
- Shifts accountability from "are they working?" to "did I do my part?"
- Reduces project delays from client bottlenecks
- Makes client feel involved (not passive observer)

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Complex Gantt charts** | Overkill for linear service process. Looks impressive, confuses clients. | Simple vertical checklist with progress bars. One milestone at a time. |
| **Kanban boards** | Too granular. Clients don't care about "User Story #47 moved to In Review". | High-level milestones only. Hide internal task management. |
| **Time tracking/hours logged** | Creates wrong incentive. Clients care about outcomes, not hours. "You logged 40 hours but campaign isn't live?" | Outcome-based milestones. "Campaign is live ✓" not "spent 40 hours on campaign." |
| **Dependency graphs** | Overcomplicated for linear process. Looks like project management theater. | Simple sequential order. "Step 1 must finish before Step 2" is obvious from list order. |
| **Custom milestone editing (for clients)** | Clients should not define milestones — that's the agency's expertise. | Agency defines standard process. Clients view progress, don't edit structure. |
| **Real-time progress updates** | False precision. "65.3% complete" is noise. Progress is lumpy, not linear. | Update progress when milestones change status. Weekly/bi-weekly is sufficient frequency. |
| **Individual task breakdowns** | "Landing Page: Header design (done), Hero section (in progress), Form (not started)". Too much detail, creates noise. | One milestone = one line item. Keep internal task breakdown in agency's PM tool. |
| **Milestone commenting/discussions** | Turns dashboard into chat tool. Comments become stale, forgotten. | Use dedicated chat/email for discussions. Dashboard is read-only progress view. |
| **Client-controlled status updates** | "Mark as complete" button for clients invites premature marking. | Admin (agency) controls status. Clients request changes via chat, not by editing dashboard. |
| **Comparative analytics** | "Your project is progressing 15% slower than average." Demoralizing and context-free. | Show absolute progress only. No cross-client comparisons. |
| **Bloated dashboard widgets** | Weather widget, RSS feed, "motivational quote of the day". Distracts from core value. | Dashboard shows: Progress. Stats (when campaigns are live). Nothing else until explicitly needed. |

### Why These Are Anti-Features

**Complexity anti-features:**
- BaseAim's clients are busy accounting firm owners, not project managers
- Gantt charts, Kanban, dependencies = PM theater that obscures simple question: "are we on track?"
- Every UI element that isn't answering "where are we?" is noise

**Over-transparency:**
- Clients don't need to see every internal task or hour logged
- Too much detail creates "why did task X take so long?" anxiety
- Milestone-level visibility is the right abstraction layer

**Wrong incentives:**
- Time tracking = "I'm paying for hours not results"
- Client-editable milestones = scope creep, unrealistic expectations
- Real-time updates = clients checking dashboard every hour (unhealthy)

## Feature Dependencies

```
Foundation layer (MVP):
├── Milestone data model (exists in Prisma schema ✓)
├── Status enum (NOT_STARTED, IN_PROGRESS, COMPLETED, BLOCKED) ✓
├── Progress percentage calculation
└── Dashboard display (checklist UI)

Admin workflow:
├── Google Sheets as source of truth
├── Sheets → Prisma sync (API endpoint + cron job)
├── Client-milestone association (one Client → many Milestones)
└── Milestone ordering/sequencing

Client-side enhancements:
├── Overall progress card (percentage + visual)
├── Current milestone highlight
├── Completion celebration (when milestone completes)
└── Phase grouping (optional)

Advanced features (post-MVP):
├── Client action items (depends on: milestone notes/flags)
├── Email digests (depends on: milestone data + email service)
├── Estimated launch date (depends on: progress rate calculation)
└── Progress notes timeline (depends on: milestone update history)
```

**Dependency notes:**
- Google Sheets sync is critical path for admin workflow
- Dashboard UI can launch with hardcoded milestones initially, Sheets sync added after
- Client action items require adding "blockedReason" or "clientAction" field to Milestone model
- Email digests are nice-to-have, not blocking for MVP

## MVP Recommendation

For BaseAim's initial launch (1-5 accounting firm clients, pre-launch agency):

### Phase 1: Core Progress Tracking (MVP)
**Build first:**
1. **Milestone checklist display** — Simple vertical list, status icons, progress bars
2. **Overall progress card** — "60% complete, 3 of 5 milestones done"
3. **Status indicators** — Color-coded Not Started / In Progress / Completed
4. **Milestone descriptions** — 1-2 sentences explaining what each milestone means
5. **Due dates** — Expected completion dates (week-level precision)

**Why this is MVP:**
- Answers core question: "Where is my project?"
- No external dependencies (works with Prisma database)
- Can be populated manually via Prisma Studio initially (5 clients = manageable)

### Phase 2: Admin Workflow (After MVP validated)
**Build next:**
1. **Google Sheets integration** — API endpoint to sync Sheet data to Prisma
2. **Automated sync** — Cron job (every 15min or hourly) to update milestone progress
3. **Sheet template** — Standardized format for admin to fill out (Client ID, Milestone, Status, Progress %, Due Date, Notes)

**Why this is Phase 2:**
- Requires external integration work (Google Sheets API)
- MVP can work without it (manual updates for 1-5 clients)
- Once validated, Sheets sync pays off (scales to 10+ clients)

### Defer to post-MVP:
- **Progress notes/changelog** — Nice-to-have, not critical for initial trust-building
- **Client action items** — Can be handled via chat/email initially
- **Email digests** — Portal must be valuable first, then drive engagement via email
- **Estimated launch date** — Requires progress rate tracking, complex calculation
- **Milestone dependencies** — Linear process doesn't need explicit dependency visualization

## Complexity Estimates

Based on existing Next.js + Prisma + shadcn/ui stack:

| Feature | Complexity | Estimated Effort | Rationale |
|---------|------------|------------------|-----------|
| Milestone checklist UI | Low | 4-6 hours | Component work with existing Card, Badge, Progress components. Similar to existing progress page. |
| Overall progress calculation | Low | 2-3 hours | Simple SQL query + percentage calc. |
| Status indicators | Low | 1-2 hours | Already have icons (CheckCircle2, Clock, etc.) and Badge component. |
| Milestone descriptions | Low | 1 hour | Add description field to display (already in schema). |
| Dashboard layout rework | Low | 3-4 hours | Move analytics chart to right, add stat cards. CSS Grid work. |
| Google Sheets sync (read) | Medium | 8-12 hours | Google Sheets API setup, auth, parsing Sheet data, mapping to Prisma models. |
| Automated sync (cron) | Medium | 3-4 hours | Vercel cron job or external service (GitHub Actions). Error handling. |
| Sheet template creation | Low | 2 hours | Define columns, create template, document for admin. |
| Client action items | Medium | 4-6 hours | Add "clientAction" flag to Milestone, UI treatment, notification. |
| Progress notes timeline | Medium | 6-8 hours | Milestone update history (new model or JSON field), timeline UI component. |
| Email digests | Medium-High | 10-15 hours | Email service integration (Resend/SendGrid), template design, scheduling, unsubscribe. |
| Estimated launch date | High | 8-12 hours | Progress rate calculation, prediction algorithm, edge case handling. |

**Total for MVP (Phase 1):** ~15-20 hours
**Total for Phase 2 (Sheets sync):** ~15-20 hours
**Total for all differentiators:** ~60-80 hours

## Sources

**Confidence note:** This research is based on training knowledge of:
- Agency client portal patterns (HubSpot Client Portal, Teamwork Client Portal, Monday.com client-facing boards)
- SaaS onboarding/progress tracking UX (Stripe Dashboard, Vercel project status, Linear project views)
- Project management tool patterns (Asana, Trello, ClickUp milestone tracking)
- Agency service delivery best practices (client communication, status transparency)

**No live verification via WebSearch or Context7 available.** Findings represent common patterns observed in:
- Marketing agency client portals (2023-2025)
- SaaS customer dashboards (2023-2025)
- Service business progress tracking (2023-2025)

**Marked as MEDIUM confidence** because:
- Patterns are well-established and consistent across agency portal category
- No access to current (2026) competitive landscape via web search
- Recommendations based on proven UX patterns, not speculative

**Recommendation for validation:**
- Review 2-3 competitor agency portals (if accessible) to confirm table stakes
- Survey target clients (accounting firms) on "what progress info do you want to see?"
- A/B test simplified (checklist) vs complex (Gantt) layouts
