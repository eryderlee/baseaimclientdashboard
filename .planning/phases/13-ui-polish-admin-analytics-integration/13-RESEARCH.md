# Phase 13: UI Polish & Admin Analytics Integration - Research

**Researched:** 2026-02-23
**Domain:** Next.js 16 / React 19 dashboard UI refinement + Stripe/Facebook Ads admin data aggregation
**Confidence:** HIGH (codebase is the primary source — all patterns verified from actual files)

---

## Summary

Phase 13 combines two tracks: (1) UI polish of the client-facing dashboard and (2) populating the admin analytics dashboard with real Stripe revenue and Facebook Ads data. The codebase already has significant infrastructure in place from prior phases, so this phase is primarily an integration and refinement effort rather than a ground-up build.

**UI track.** The `DashboardNav` already has a Bell icon button with a hardcoded badge of "3" and no dropdown — it renders a ghost button with no interaction. The `NotificationCenter` component and the full notification API routes (`PATCH /api/notifications/[id]`, `POST /api/notifications/mark-all-read`) already exist and are complete. What's missing is wiring the Bell into a `DropdownMenu` in the nav and fetching real notification data in the layout. Empty states, loading states, and the chat page (`/dashboard/chat`) using `ChatButtons` are already implemented. The requirement to "replace chat widget with WhatsApp/Telegram buttons" refers to the header nav's notification/chat area — the `/dashboard/chat` page already uses `ChatButtons` correctly. The dashboard overview currently has placeholder empty arrays for `documents`, `notifications`, and `activities` — these sections render empty. Mobile responsiveness is largely inherited from Tailwind's responsive prefixes but needs audit.

**Admin analytics track.** The admin page already shows `AnalyticsSummary` (milestone-based: total clients, average progress, at-risk, upcoming due dates) and `ClientAnalyticsTable` (per-client milestone data). What's missing entirely is Stripe revenue aggregation (total revenue, MRR across clients) and Facebook Ads spend aggregation across all clients. These require new DAL functions. The Stripe SDK (`stripe` instance) and Facebook Ads fetch helpers (`fetchFacebookInsights`) are ready to use. The pattern to follow is: iterate all clients, fetch Stripe/FB data per client, aggregate — but this must be cached with `unstable_cache` to avoid per-render API hammering.

**Primary recommendation:** Follow the existing DAL cache pattern (`unstable_cache` wrapping API calls) for new admin aggregation functions; wire the notification bell as a `DropdownMenu` wrapping the existing `NotificationCenter` component; add real data to empty overview sections.

---

## Standard Stack

### Core (already installed — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App Router, Server Components, Server Actions | Project baseline |
| React | 19.2.3 | UI layer | Project baseline |
| Tailwind CSS | v4 | Styling | Project baseline |
| `radix-ui` | ^1.4.3 | `DropdownMenu`, `Popover`, etc. | Already used for nav dropdown |
| `lucide-react` | ^0.563.0 | Icons (Bell, Check, etc.) | Already used throughout |
| `stripe` | ^20.3.0 | Stripe API client | Already installed |
| `sonner` | ^2.0.7 | Toast notifications | Already used in forms |
| `recharts` | ^3.7.0 | Charts in analytics | Already used in AnalyticsOverview |
| `date-fns` | ^4.1.0 | Date formatting | Already used in risk-detection |
| `@upstash/redis` + `@upstash/ratelimit` | installed | Rate limiting | Already configured |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `unstable_cache` from `next/cache` | built-in | Cache admin API calls (Stripe, FB) | Admin analytics aggregation — MUST use |
| `cache` from `react` | built-in | Per-request DAL dedup | All DAL functions |
| `tw-animate-css` | ^1.4.0 | CSS animations | Already available for loading transitions |

### No new packages needed

All required functionality is achievable with the installed stack. Do NOT add:
- `framer-motion` — `tw-animate-css` and Tailwind transitions are sufficient for the polish level required
- Any notification real-time library — `router.refresh()` pattern already used in `NotificationCenter` is adequate

---

## Architecture Patterns

### Recommended Project Structure

No new directories needed. Changes are modifications to existing files:

```
app/
├── dashboard/
│   └── layout.tsx              # ADD: fetch notifications, pass to DashboardNav
├── admin/
│   └── page.tsx                # ADD: Stripe + FB aggregation to getAdminData()
components/
├── admin/
│   └── analytics-summary.tsx   # EXTEND: add Stripe revenue + FB spend cards
├── dashboard/
│   └── dashboard-nav.tsx       # MODIFY: Bell -> DropdownMenu with NotificationCenter
lib/
└── dal.ts                      # ADD: getAdminStripeAnalytics(), getAdminFbAnalytics()
```

### Pattern 1: Notification Bell as DropdownMenu in Nav

**What:** Transform the static Bell button in `DashboardNav` into a `DropdownMenu` that renders `NotificationCenter` in its content panel. Fetch notifications in the dashboard layout (server component), pass count + data as props to `DashboardNav`.

**When to use:** Standard pattern for header notification dropdowns in this codebase.

**Current state (dashboard-nav.tsx lines 97-106):**
```typescript
// Currently a static button — no real count, no dropdown
<Button variant="ghost" size="icon" className="relative rounded-full ...">
  <Bell className="h-5 w-5" />
  <Badge className="absolute -top-1 -right-1 ...">
    3  // HARDCODED — must become real unread count
  </Badge>
</Button>
```

**Target pattern:**
```typescript
// Source: existing DropdownMenu pattern in dashboard-nav.tsx (user avatar dropdown)
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon" className="relative rounded-full border ...">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge className="absolute -top-1 -right-1 ...">
          {unreadCount}
        </Badge>
      )}
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-96 p-0">
    <div className="p-4 border-b">
      <h3 className="font-semibold text-sm">Notifications</h3>
    </div>
    <div className="max-h-80 overflow-y-auto p-2">
      <NotificationCenter notifications={notifications} />
    </div>
  </DropdownMenuContent>
</DropdownMenu>
```

**DashboardNav props extension:**
```typescript
interface DashboardNavProps {
  user: { name?: string | null; email?: string | null; image?: string | null; role?: string }
  notifications?: Notification[]  // ADD
}
```

**Layout change (app/dashboard/layout.tsx):**
```typescript
// Source: pattern from app/dashboard/page.tsx + app/admin/page.tsx
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

const session = await auth()
const notifications = session?.user?.id
  ? await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
  : []

// Pass to DashboardNav
<DashboardNav user={user} notifications={notifications} />
```

### Pattern 2: Admin Stripe Revenue Aggregation

**What:** Fetch Stripe customer revenue data for all clients who have a `stripeCustomerId`. Aggregate into total revenue and MRR. Cache with `unstable_cache`.

**Critical constraint:** Only clients with `Subscription.stripeCustomerId` set have Stripe data. This is set lazily (first invoice triggers creation). Many clients may have no Stripe customer yet — handle gracefully.

**Data model:** Revenue lives in `Invoice` table locally (amount field). MRR comes from `Subscription.stripePriceId` (if subscription exists) + Stripe API. Simpler approach: use local DB data for total revenue (sum of PAID invoices across all clients) and MRR (sum of active subscriptions' monthly amounts).

**Recommended approach — local DB first, Stripe API for live MRR:**
```typescript
// Source: pattern from getAdminAnalytics() in lib/dal.ts
export const getAdminRevenueAnalytics = cache(async () => {
  const { userRole } = await verifySession()
  if (userRole !== 'ADMIN') throw new Error('Unauthorized')

  // Total revenue from local Invoice records (no Stripe API needed)
  const invoices = await prisma.invoice.findMany({
    where: { status: 'PAID' },
    select: { amount: true, currency: true, clientId: true },
  })

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.amount, 0)
  const clientCount = new Set(invoices.map(i => i.clientId)).size

  // MRR from active subscriptions — query Stripe for live price data
  // Only for clients with stripeSubscriptionId (not all will have this)
  const activeSubscriptions = await prisma.subscription.findMany({
    where: { status: 'active', stripeSubscriptionId: { not: null } },
    select: { stripeSubscriptionId: true, clientId: true },
  })

  // For MRR: fetch Stripe subscription amounts in parallel
  // Use unstable_cache to avoid re-fetching on every render
  const cachedMrr = await unstable_cache(
    async () => {
      let mrr = 0
      for (const sub of activeSubscriptions) {
        try {
          const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId!)
          const monthlyAmount = stripeSub.items.data[0]?.price?.unit_amount ?? 0
          mrr += monthlyAmount / 100 // convert cents to dollars/AUD
        } catch { /* skip if Stripe call fails */ }
      }
      return mrr
    },
    ['admin-mrr'],
    { revalidate: 3600 } // 1 hour cache
  )()

  return { totalRevenue, activeClientCount: clientCount, mrr: cachedMrr }
})
```

**Simpler alternative (no Stripe API for MRR):** Sum of `Invoice.amount` where `status = 'PAID'` divided by months active gives rough revenue. Use this if Stripe API calls are slow or unreliable. Flag as "based on recorded invoices."

### Pattern 3: Admin Facebook Ads Aggregation

**What:** For each client with `adAccountId` set, fetch FB insights and aggregate total spend, leads, and impressions. Cache aggressively — 6-hour TTL matches existing per-client cache.

**Critical constraint:** FB API is per-ad-account. Admin view requires N sequential or parallel calls (one per client with FB configured). Parallel fetch with `Promise.allSettled` is safe — failures don't block other clients.

```typescript
// Source: pattern from getClientFbInsights() in lib/dal.ts
export const getAdminFbAggregation = cache(async () => {
  const { userRole } = await verifySession()
  if (userRole !== 'ADMIN') throw new Error('Unauthorized')

  const settings = await prisma.settings.findFirst({
    select: { facebookAccessToken: true },
  })

  if (!settings?.facebookAccessToken) {
    return { totalSpend: 0, totalLeads: 0, totalImpressions: 0, configuredClients: 0 }
  }

  const clients = await prisma.client.findMany({
    where: { adAccountId: { not: null } },
    select: { id: true, adAccountId: true },
  })

  const cachedFetch = await unstable_cache(
    async () => {
      const results = await Promise.allSettled(
        clients.map(client =>
          fetchFacebookInsights(client.adAccountId!, 'last_30d', settings.facebookAccessToken!)
        )
      )

      let totalSpend = 0, totalLeads = 0, totalImpressions = 0
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          totalSpend += parseFloat(result.value.spend || '0')
          totalImpressions += parseFloat(result.value.impressions || '0')
          totalLeads += getActionValue(result.value.actions, 'lead')
        }
      }
      return { totalSpend, totalLeads, totalImpressions, configuredClients: clients.length }
    },
    ['admin-fb-aggregation'],
    { revalidate: 21600 } // 6 hours
  )()

  return cachedFetch
})
```

### Pattern 4: Empty States

**What:** Consistent empty state design for list views that have no data.

**Existing pattern (document-list.tsx):**
```tsx
// Source: components/dashboard/document-list.tsx
if (documents.length === 0) {
  return (
    <div className="text-center py-12">
      <FileText className="mx-auto h-12 w-12 text-neutral-400" />
      <p className="mt-4 text-sm text-neutral-500">
        No documents yet. Upload your first document above.
      </p>
    </div>
  )
}
```

**Existing pattern (milestone-checklist.tsx):**
```tsx
// Source: components/dashboard/milestone-checklist.tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <Calendar className="h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />
  <p className="text-muted-foreground max-w-md">
    No milestones yet. Your project manager will set them up soon.
  </p>
</div>
```

**Standard pattern to apply everywhere:** Icon (h-12 w-12 text-neutral-400) + message (text-sm text-neutral-500) centered in `py-12` container. Glass-card-styled list views should use the glass-card version: `rounded-2xl border border-dashed border-white/70 bg-white/60 p-6 text-center`.

**Views needing empty states:**
- `components/dashboard/dashboard-overview.tsx` — Recent Documents section (already has placeholder `documents = []`, renders nothing visually)
- `components/dashboard/dashboard-overview.tsx` — Recent Activity section (already has placeholder `activities = []`, renders nothing)
- Billing page (`app/dashboard/billing/page.tsx`) — invoices table when no invoices
- Notification dropdown — already has empty state in `NotificationCenter`

### Pattern 5: Mobile Responsive Audit

**What:** Ensure responsive breakpoints work on all pages.

**Existing breakpoints in use:**
- `sm:grid-cols-2`, `md:grid-cols-2 lg:grid-cols-4` — stats grid
- `lg:flex-row` — hero section
- `hidden md:flex` — nav pills (desktop only, mobile needs hamburger or simplified view)
- `min-w-[640px]` — Growth Roadmap horizontal timeline (scroll container)

**Known mobile gap:** `DashboardNav` hides nav pills with `hidden md:flex` but provides no mobile nav alternative (no hamburger, no sheet menu). The admin nav may have similar gaps. Phase 13 should audit all pages for `<md` breakpoint rendering and ensure the nav has a mobile fallback or at minimum is functional without the pill nav.

### Anti-Patterns to Avoid

- **Fetching Stripe/FB in render without cache:** ALWAYS wrap in `unstable_cache`. One render without cache = N API calls per page load.
- **Calling `verifySession()` inside `unstable_cache`:** ALWAYS call `verifySession()` BEFORE the `unstable_cache` boundary (established pattern in existing FB functions).
- **Hardcoding badge count in nav:** The Bell badge currently shows "3" hardcoded. This must be replaced with real unread count passed from layout.
- **Making `DashboardNav` async:** It's a `"use client"` component. Pass notification data as props from the server component layout.
- **Storing Stripe invoice URLs in DB:** Phase 10 decision — fetch on-demand only. Don't change this pattern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Notification dropdown | Custom popover component | Radix `DropdownMenu` (already in project) | Already used for user avatar dropdown in same nav |
| Toast feedback | Custom alert component | `sonner` toast (already in project) | Already installed and used in forms |
| MRR calculation | Custom billing logic | Stripe `subscriptions.retrieve()` + local DB sum | Stripe has authoritative subscription amounts |
| FB data per-client | Custom fetch loop | `fetchFacebookInsights()` from `lib/facebook-ads.ts` | Already abstracts error handling, null returns |
| Skeleton loading | Custom spinner | `Skeleton` from `@/components/ui/skeleton` | Already used in `app/dashboard/loading.tsx` |
| Animation transitions | framer-motion | `tw-animate-css` + Tailwind `transition-*` classes | Already installed, sufficient for this polish level |

**Key insight:** This codebase has near-complete infrastructure. The primary work is wiring existing pieces together (notifications to nav, FB/Stripe functions to admin analytics), not building new infrastructure.

---

## Common Pitfalls

### Pitfall 1: DashboardLayout Is a Server Component — Nav Is Client Component

**What goes wrong:** Developer tries to fetch notifications inside `DashboardNav` (`"use client"`), which can't do async DB calls.

**Why it happens:** The nav needs notification data but is a client component for pathname-based active state detection.

**How to avoid:** Fetch notifications in `app/dashboard/layout.tsx` (server component), pass as props: `<DashboardNav user={user} notifications={serializedNotifications} />`. Serialize dates to strings before passing (same pattern as milestones in dashboard page).

**Warning signs:** `useRouter`, `usePathname` imports in same file as `async` — that's a client component.

### Pitfall 2: Admin FB Aggregation Scales Poorly With Many Clients

**What goes wrong:** If there are 20 clients with FB configured, admin page makes 20 sequential FB API calls on each render = very slow.

**Why it happens:** No caching, sequential fetch.

**How to avoid:** Use `Promise.allSettled` for parallel fetching AND wrap entire aggregation in `unstable_cache` with 6-hour TTL. Individual client caches already exist; admin aggregate cache is separate.

**Warning signs:** Admin page load time > 3 seconds. Stripe and FB calls in waterfall in network tab.

### Pitfall 3: Notifications Date Serialization

**What goes wrong:** Passing `Date` objects from server to client component through props throws Next.js serialization error.

**Why it happens:** React Server Components cannot pass non-serializable values to Client Components.

**How to avoid:** Convert `notification.createdAt` to `.toISOString()` before passing to `DashboardNav`. The `NotificationCenter` component already handles `Date` objects — convert back with `new Date(notification.createdAt)` in the component.

**Warning signs:** "Only plain objects can be passed to Client Components" error in console.

### Pitfall 4: Stripe MRR Requires Active Subscription Records

**What goes wrong:** Admin sees MRR of $0 even when clients are paying, because `Subscription.stripeSubscriptionId` is null for invoice-only clients.

**Why it happens:** Phase 10 implemented two paths: one-off invoices and subscriptions. Invoice-only clients never create a `Subscription` record with `stripeSubscriptionId`.

**How to avoid:** For MRR, use only clients where `stripeSubscriptionId` is not null and status is 'active'. For total revenue, use the local `Invoice` table (`status = 'PAID'`). Document the distinction clearly in the admin UI ("Revenue from all paid invoices" vs "MRR from active subscriptions").

**Warning signs:** Total revenue shows 0 while invoice records exist.

### Pitfall 5: Mobile Nav Gap

**What goes wrong:** On mobile (`<md`), the pill nav items are hidden (`hidden md:flex`) but no alternative is shown. Users have no way to navigate.

**Why it happens:** Nav was built desktop-first and mobile fallback was deferred.

**How to avoid:** Add a mobile sheet menu using `Sheet` from `@/components/ui/sheet` (already in project). The sheet trigger is a hamburger button visible only at `<md`.

**Warning signs:** On 375px viewport, nav shows only logo + bell + avatar — no navigation links.

### Pitfall 6: Hardcoded Badge Count Not Removed

**What goes wrong:** Even after wiring real notifications, the badge shows wrong count because the hardcoded "3" was not replaced.

**Why it happens:** Simple oversight.

**How to avoid:** In `DashboardNav`, compute `const unreadCount = notifications.filter(n => !n.isRead).length` and render conditionally: `{unreadCount > 0 && <Badge>{unreadCount}</Badge>}`.

---

## Code Examples

### Fetching Notifications in Layout

```typescript
// Source: lib/dal.ts pattern (auth + prisma query)
// In app/dashboard/layout.tsx (server component)
const session = await auth()

const rawNotifications = session?.user?.id
  ? await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
  : []

// Serialize for client component prop
const notifications = rawNotifications.map(n => ({
  ...n,
  createdAt: n.createdAt.toISOString(), // serialize Date
}))
```

### Extending AnalyticsSummary for Stripe + FB Data

```typescript
// Source: components/admin/analytics-summary.tsx pattern
interface AnalyticsSummaryProps {
  totalClients: number
  activeClients: number
  averageProgress: number
  atRiskClients: number
  upcomingDueDates: Array<{ clientName: string; milestoneTitle: string; dueDate: string }>
  // ADD:
  totalRevenue: number
  mrr: number
  totalFbSpend: number
  totalFbLeads: number
  fbConfiguredClients: number
}
```

### Stripe Revenue Query (Local DB — No API Call)

```typescript
// Source: pattern from getAdminAnalytics() in lib/dal.ts
const paidInvoices = await prisma.invoice.findMany({
  where: { status: 'PAID' },
  select: { amount: true, currency: true },
})
const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0)
// Note: amounts are stored as Float in the schema (dollars/AUD, not cents)
```

### Stripe MRR from Subscriptions API

```typescript
// Source: lib/stripe.ts (stripe instance), billing.ts (pattern)
const activeSubscriptions = await prisma.subscription.findMany({
  where: {
    status: 'active',
    stripeSubscriptionId: { not: null },
  },
})

// Use unstable_cache — this is the ONLY safe pattern for admin-level caching
const cachedMrr = await unstable_cache(
  async () => {
    const results = await Promise.allSettled(
      activeSubscriptions.map(sub =>
        stripe.subscriptions.retrieve(sub.stripeSubscriptionId!, {
          expand: ['items.data.price'],
        })
      )
    )
    return results.reduce((sum, r) => {
      if (r.status === 'fulfilled') {
        const amount = r.value.items.data[0]?.price?.unit_amount ?? 0
        return sum + amount / 100
      }
      return sum
    }, 0)
  },
  ['admin-mrr-v1'],
  { revalidate: 3600 }
)()
```

### FB Aggregation Across All Clients

```typescript
// Source: lib/facebook-ads.ts (fetchFacebookInsights + getActionValue)
// Source: lib/dal.ts (unstable_cache pattern)
const clients = await prisma.client.findMany({
  where: { adAccountId: { not: null } },
  select: { id: true, adAccountId: true },
})

const fbResults = await unstable_cache(
  async () => {
    const responses = await Promise.allSettled(
      clients.map(c =>
        fetchFacebookInsights(c.adAccountId!, 'last_30d', accessToken)
      )
    )
    return responses.reduce(
      (acc, r) => {
        if (r.status === 'fulfilled' && r.value) {
          acc.spend += parseFloat(r.value.spend || '0')
          acc.leads += getActionValue(r.value.actions, 'lead')
        }
        return acc
      },
      { spend: 0, leads: 0 }
    )
  },
  [`admin-fb-agg-v1`],
  { revalidate: 21600 }
)()
```

### Empty State (Glass-Card Style for Dashboard)

```tsx
// Source: components/dashboard/dashboard-overview.tsx (existing dashed empty state)
// Use for Recent Documents and Recent Activity empty states
<div className="rounded-2xl border border-dashed border-white/70 bg-white/60 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
  <FileText className="mx-auto h-10 w-10 mb-3 text-slate-300 dark:text-slate-600" />
  <p className="font-medium">No documents yet</p>
  <p className="mt-1 text-xs">Your team will share files here once your project kicks off.</p>
</div>
```

### Mobile Nav Sheet (if implementing hamburger)

```tsx
// Source: components/ui/sheet.tsx (already in project)
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"

// In DashboardNav, visible only on mobile
<div className="md:hidden">
  <Sheet>
    <SheetTrigger asChild>
      <Button variant="ghost" size="icon">
        <Menu className="h-5 w-5" />
      </Button>
    </SheetTrigger>
    <SheetContent side="left" className="w-72">
      {/* Nav items in column */}
      {navItems.map(item => (
        <Link key={item.href} href={item.href} ...>
          <item.icon className="h-4 w-4" />
          {item.label}
        </Link>
      ))}
    </SheetContent>
  </Sheet>
</div>
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| Chat widget (removed) | WhatsApp/Telegram click-to-chat (`ChatButtons`) | Already done in Phase 7; `/dashboard/chat` page is complete |
| Static Bell badge "3" | Real unread count from DB | Must implement in Phase 13 |
| Mock admin analytics | Real milestone data (done Phase 6) + Stripe + FB (Phase 13) | Partial — milestone data is real, Stripe/FB is not yet wired |
| No mobile nav | Sheet-based hamburger | Not yet implemented — gap discovered |
| Empty lists render nothing | Illustrated empty states | Must implement for documents, activity, notifications sections |

**Deprecated/outdated:**
- `page-old.tsx` in `app/dashboard/` — old dashboard page file; ignore
- Hardcoded "3" badge in `DashboardNav` — replace with real count

---

## What Already Works (Do Not Rebuild)

This is critical context to avoid wasted effort:

| Feature | Status | File(s) |
|---------|--------|---------|
| Chat buttons (WhatsApp/Telegram) | Complete | `components/client/chat-buttons.tsx`, `app/dashboard/chat/page.tsx` |
| Notification API (mark read, mark all read) | Complete | `app/api/notifications/[id]/route.ts`, `app/api/notifications/mark-all-read/route.ts` |
| NotificationCenter component | Complete | `components/dashboard/notification-center.tsx` |
| Risk detection (overdue + stalled) | Complete | `lib/utils/risk-detection.ts`, used in `getAdminAnalytics()` |
| Upcoming due dates (7-day window) | Complete | `getAdminAnalytics()` in `lib/dal.ts` |
| Admin client table with risk badges | Complete | `components/admin/client-analytics-table.tsx` |
| Analytics summary (milestone-based) | Complete | `components/admin/analytics-summary.tsx` |
| Facebook Ads fetch (per-client) | Complete | `lib/facebook-ads.ts`, `getClientFbInsights()` in DAL |
| Stripe SDK setup | Complete | `lib/stripe.ts` |
| Loading skeleton (dashboard) | Complete | `app/dashboard/loading.tsx` |
| Error boundary (dashboard) | Complete | `app/dashboard/error.tsx` |
| ChangePasswordForm + action | Complete | `components/dashboard/change-password-form.tsx`, `app/actions/auth.ts` |
| DeleteClientSection | Complete | `components/admin/delete-client-section.tsx` |
| Phase labels on milestones | Complete (manual 2026-02-21) | `components/dashboard/milestone-item.tsx` |
| Horizontal Growth Roadmap timeline | Complete (manual 2026-02-21) | `components/dashboard/dashboard-overview.tsx` |
| Settings page + ChangePasswordForm | Complete (manual 2026-02-21) | `app/dashboard/settings/page.tsx` |

---

## Open Questions

1. **Requirement UI-01: "Chat widget replaced with WhatsApp/Telegram click-to-chat buttons"**
   - What we know: `/dashboard/chat` page already uses `ChatButtons`. The old "chat widget" (likely a third-party embed) was removed in Phase 7.
   - What's unclear: Does the nav still show a "Chat" nav link? Yes it does (`{ href: "/dashboard/chat", label: "Chat", icon: MessageSquare }`). The question is whether UI-01 is about removing a *different* chat widget (e.g., an Intercom/Crisp floating widget) that may not exist in this codebase.
   - Recommendation: Treat UI-01 as already complete at the `/dashboard/chat` page level. If a floating chat widget exists (not found in code review), that would need removing. Planner should verify no third-party chat script is in `app/layout.tsx`.

2. **MRR Calculation Accuracy**
   - What we know: `Subscription.stripePriceId` and `stripeSubscriptionId` exist in schema. Many clients may be invoice-only (no subscription record).
   - What's unclear: Whether subscriptions are actually being created (Phase 10 implemented `startSubscription` action but it may not have been used).
   - Recommendation: Show MRR from active subscriptions in the admin panel. If zero subscriptions exist, show "$0 MRR (0 active subscriptions)" rather than hiding the card. Add a note "Based on active Stripe subscription records."

3. **Mobile Nav Strategy**
   - What we know: Nav pills are `hidden md:flex` with no mobile fallback.
   - What's unclear: Whether mobile responsiveness was scoped out intentionally or is a known gap from prior phases.
   - Recommendation: Implement `Sheet`-based hamburger menu for `<md` viewports. This is in scope for UI-04. Use the existing `Sheet` component.

4. **Recent Documents and Recent Activity on Dashboard Overview**
   - What we know: `dashboard-overview.tsx` has placeholder empty arrays `documents = []` and `activities = []` at lines 87-89. These sections never show data.
   - What's unclear: Whether fetching real documents/activities for the overview is in scope for Phase 13 or just adding empty states.
   - Recommendation: Phase 13 should at minimum add polished empty states. Fetching real data (especially activities) would require extending the dashboard page server component — this is reasonable scope for UI-06.

---

## Sources

### Primary (HIGH confidence — verified from actual codebase)

- `components/dashboard/dashboard-nav.tsx` — current Bell button implementation, notification gap identified
- `components/dashboard/notification-center.tsx` — existing component, complete and functional
- `app/api/notifications/[id]/route.ts` + `mark-all-read/route.ts` — notification API complete
- `components/admin/analytics-summary.tsx` — current admin analytics structure
- `lib/dal.ts` — all DAL patterns including `unstable_cache`, `verifySession` placement
- `lib/facebook-ads.ts` — `fetchFacebookInsights()`, `getActionValue()` APIs
- `lib/stripe.ts` — Stripe client setup
- `prisma/schema.prisma` — data models (Invoice, Subscription, Notification, Client, Settings)
- `package.json` — installed dependency versions
- `STYLE_CHANGES.md` — authoritative record of 2026-02-21 manual changes
- `components/client/chat-buttons.tsx` — ChatButtons component (Phase 7, complete)
- `app/dashboard/chat/page.tsx` — chat page using ChatButtons (complete)

### Secondary (MEDIUM confidence)

- No WebSearch was needed — codebase is the authoritative source for this integration phase.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from `package.json`
- Architecture: HIGH — all patterns are from existing codebase, not hypothetical
- Pitfalls: HIGH — identified from direct code analysis (hardcoded badge, date serialization gap, mobile nav gap)
- Admin aggregation patterns: HIGH — follows exact `unstable_cache` pattern from `lib/dal.ts`

**Research date:** 2026-02-23
**Valid until:** 2026-03-25 (stable codebase; 30-day window appropriate)
