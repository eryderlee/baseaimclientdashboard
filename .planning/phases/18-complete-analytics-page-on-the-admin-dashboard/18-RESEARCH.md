# Phase 18: Complete Analytics Page on the Admin Dashboard - Research

**Researched:** 2026-03-26
**Domain:** Admin dashboard analytics — Next.js 16 server components, recharts, Prisma, Facebook Ads aggregation
**Confidence:** HIGH

---

## Summary

The admin analytics page (`app/admin/page.tsx`) is functionally present but incomplete. It has 8 summary metric cards (clients, progress, risk, revenue, MRR, FB spend, FB leads), an upcoming milestones list, and a client table with search/filter/sort. What it is missing — compared to what the app's data layer can already support — is: (1) per-client FB ads performance columns in the table, (2) a cross-client spend/leads trend chart using real aggregated data, (3) proper Suspense streaming with meaningful skeleton states (current Suspense fallbacks are bare `<div>Loading...</div>` strings), and (4) minor structural gaps in the loading.tsx (the 8-card Revenue & Marketing row is absent from the skeleton, only 4 card slots are rendered).

The per-client FB metrics column is the most valuable addition. The DAL's `getAdminFbAggregation()` already calls the FB API per client in parallel (`Promise.allSettled`), but the admin page never exposes per-client results — it collapses everything to totals. No new FB API surface is needed; the pattern from the client-facing analytics page (Phase 14) can be adapted. The existing `recharts` ComposedChart pattern (already in `FbTrendChart`) can drive an admin trend chart with no new library installs.

**Primary recommendation:** Add per-client FB spend/leads columns to the table, add an admin-level trend chart showing aggregate spend+leads over 30 days, replace the two bare `<div>Loading...</div>` fallbacks with proper skeleton components, and fix the loading.tsx to match the actual 8-card layout. No new libraries are needed — recharts 3.7.0, shadcn/ui, and the existing DAL are sufficient.

---

## Standard Stack

All libraries are already installed. No new dependencies required.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 3.7.0 | Admin trend chart | Already used in `FbTrendChart`; ComposedChart pattern is proven |
| shadcn/ui (Card, Table, Badge, Skeleton) | current | UI components | Already used throughout the admin page |
| Next.js Suspense | 16.1.6 | Streaming per-section | Established pattern in Phase 16 (analytics page) |
| Prisma + DAL pattern | 5.22.0 | All data access | Established project constraint |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.563.0 | Icons for new metric columns | All existing metric cards use it |
| date-fns | 4.1.0 | Date formatting in trend data | Already a project dependency |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| recharts ComposedChart | Tremor charts | Tremor not in project; adds bundle weight — don't add |
| Per-row FB API calls in table | Cached aggregation query | Per-row calls would hit FB rate limits — use cached aggregation |

**Installation:** No new packages required.

---

## Architecture Patterns

### Current File Structure (admin analytics)
```
app/admin/
├── page.tsx                    # Server component — fetches 4 parallel DAL calls
├── loading.tsx                 # Route-level skeleton (INCOMPLETE — missing 4 cards)
└── error.tsx                   # Error boundary — functional

components/admin/
├── analytics-summary.tsx       # 8 metric cards + upcoming milestones list
├── client-analytics-table.tsx  # Client table — client component, no FB columns
└── client-filters.tsx          # Search/status/sort filters — client component

lib/
├── dal.ts                      # getAdminFbAggregation, getAdminRevenueAnalytics, etc.
└── facebook-ads.ts             # FbInsights type, buildTrendData(), getActionValue()
```

### Pattern 1: Streaming Admin Sections with Suspense

The Phase 16 client analytics page established the correct pattern: split the page into async server component sections, wrap each in `<Suspense fallback={<Skeleton />}>`, and let Next.js stream them independently. The admin page currently wraps `ClientFilters` and `ClientAnalyticsTable` in `<Suspense>` but with only bare `<div>Loading...</div>` fallbacks — not skeleton components.

**When to use:** Any data-fetching section that can resolve independently.

**Example (from existing `app/dashboard/analytics/page.tsx`):**
```typescript
// Source: existing app/dashboard/analytics/page.tsx
<Suspense fallback={<FbAdsSkeleton />}>
  <FbAdsSection dateRange={dateRange} />
</Suspense>
```

The admin page should apply this pattern for the trend chart section (slow — FB API) vs. the table section (fast — DB query).

### Pattern 2: Per-Client FB Data via Extended DAL Function

`getAdminFbAggregation()` collapses all client FB data to totals. For per-client FB columns in the table, a new DAL function `getAdminFbPerClient()` should return a map of `clientId → { spend, leads }` by reusing the same `fetchFacebookInsights` call but NOT collapsing. The existing `Promise.allSettled` loop should remain — it already handles per-client failures gracefully.

**Key constraint:** verifySession() MUST be called before `unstable_cache` boundary. This is already done correctly in `getAdminFbAggregation()` — copy that pattern exactly.

```typescript
// Pattern from dal.ts getAdminFbAggregation() — apply to per-client version:
export const getAdminFbPerClient = cache(async () => {
  const { userRole } = await verifySession()
  if (userRole !== 'ADMIN') throw new Error('Unauthorized: Admin access required')
  // ... verifySession OUTSIDE unstable_cache
  const result = await unstable_cache(
    async () => { /* fetch per client, return Map */ },
    ['admin-fb-per-client-v1'],
    { revalidate: 21600 }
  )()
  return result
})
```

### Pattern 3: Admin Trend Chart

Use the existing `FbTrendChart` component or create an `AdminFbTrendChart` variant. The data shape is `TrendDataPoint[]` (date, spend, leads) from `buildTrendData()` in `lib/facebook-ads.ts`. For the admin, the trend data is the SUM across all clients' daily data — not per-client.

**What's needed in DAL:** A new `getAdminFbDailyAggregation()` function that fetches daily insights per client and sums spend+leads per date. This parallels `getAdminFbAggregation()` but at daily granularity.

**What's NOT needed:** A new chart library. `FbTrendChart` renders via recharts `ComposedChart` with `Bar` (spend) and `Line` (leads). The admin chart can reuse this component directly.

### Pattern 4: Fix loading.tsx to Match Actual Layout

Current `loading.tsx` renders only 4 skeleton cards and a filter bar. The actual page has 8 summary cards (two rows of 4), an upcoming milestones list, and a clients table. The skeleton should mirror the full layout.

### Anti-Patterns to Avoid

- **Calling FB API per table row in a loop:** Each row rendering a Suspense boundary that calls FB API independently would create N concurrent API calls per page load, hitting rate limits. Fetch all client FB data in a single DAL call with `Promise.allSettled`, then pass as a map prop to the table.
- **Fetching FB data without unstable_cache:** The per-client FB data call must be wrapped in `unstable_cache` with 6-hour TTL, matching the existing pattern. Raw fetch without caching would re-hit the FB API on every admin page load.
- **Merging per-client FB fetch into getAllClientsWithMilestones():** Don't add FB API calls inside the Prisma query. Keep DAL functions single-concern — FB data in its own function, Prisma data in its own function.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Trend chart | Custom SVG chart | recharts ComposedChart (already in FbTrendChart) | Already implemented, same data shape |
| Skeleton loading states | Custom CSS animations | shadcn/ui `<Skeleton>` component | Already used in loading.tsx and FbAdsSkeleton |
| FB data formatting | Custom formatters | Reuse `formatCurrency`, `formatPercent`, `getActionValue` from `fb-ads-metrics.tsx` | These are already correct and handle edge cases |
| Per-client FB caching | Manual cache map | `unstable_cache` with `tags: ['fb-insights-${clientId}']` | Matches existing invalidation surface |

**Key insight:** Every piece of infrastructure needed for this phase already exists. The work is composition and wiring, not new building blocks.

---

## Common Pitfalls

### Pitfall 1: Suspense Fallback Mismatch with Actual Layout

**What goes wrong:** The current `loading.tsx` renders 4 skeleton cards, but the real page has 8 + an upcoming milestones card + a client table. The skeleton disappears and the full layout pops in, causing layout shift.
**Why it happens:** The loading.tsx was written early (Phase 6 era) and never updated when Phase 13 added revenue and FB aggregate cards.
**How to avoid:** After any layout additions in Phase 18, update `loading.tsx` to match the new layout exactly — same grid column count, same number of card placeholders.
**Warning signs:** Layout shift when navigating to `/admin` from another route.

### Pitfall 2: FB Per-Client Data Blocking Table Render

**What goes wrong:** If per-client FB data is fetched inside `ClientAnalyticsTable` as a server component, the entire table waits for the FB API (6h cached but still: first call after cache miss hits FB). This defeats the point of the streaming architecture.
**Why it happens:** Co-locating data fetch with the component that renders it seems clean but is wrong here because FB API is slow.
**How to avoid:** Fetch FB per-client data in the same `getAdminData()` call in `page.tsx` (parallel with other DAL calls), or wrap the FB section of the table in a separate Suspense boundary that streams in after the table skeleton is shown.
**Warning signs:** Admin page blocks on `/admin` route load for several seconds.

### Pitfall 3: verifySession() Inside unstable_cache

**What goes wrong:** Calling `verifySession()` (which calls `auth()` → reads cookies) inside `unstable_cache` throws: "Dynamic server usage: cookies() cannot be called inside unstable_cache."
**Why it happens:** `unstable_cache` runs in a context that doesn't have access to the request headers/cookies.
**How to avoid:** Call `verifySession()` BEFORE the `unstable_cache` closure. See pattern in every existing FB DAL function — the comment `// Auth OUTSIDE the cache boundary` is explicit.
**Warning signs:** Runtime error on the admin page: "Dynamic server usage: cookies".

### Pitfall 4: FB Data Not Shown for Clients Without adAccountId

**What goes wrong:** If `getAdminFbPerClient()` only returns data for configured clients, the table shows empty/null for unconfigured clients — but there's no visual distinction between "FB not configured" and "FB had an error."
**Why it happens:** The data shape doesn't carry a `configured` flag — just absence of data.
**How to avoid:** Pass the set of `adAccountId`-configured client IDs alongside the metrics map. In the table, render "Not configured" for clients with no adAccountId, and "0" or "--" for clients with adAccountId but no data returned (API failure).

### Pitfall 5: Bare Text Suspense Fallbacks Cause Flash

**What goes wrong:** `<Suspense fallback={<div>Loading filters...</div>}>` shows unstyled text then jumps to the styled UI.
**Why it happens:** The fallbacks in the current admin page are placeholder strings, not skeleton components.
**How to avoid:** Replace both bare `<div>Loading...</div>` fallbacks with dedicated skeleton components that match the actual shape of the component being loaded.

---

## Code Examples

### Admin Trend Chart Data Shape (reuse existing pattern)

```typescript
// Source: lib/facebook-ads.ts — buildTrendData already exists
export interface TrendDataPoint {
  date: string  // e.g. "Mar 1"
  spend: number
  leads: number
}

export function buildTrendData(daily: FbDailyInsight[]): TrendDataPoint[]
```

For the admin aggregate chart, sum across all clients per date:
```typescript
// New admin daily aggregation — follows same pattern as getAdminFbAggregation
// Returns Record<dateStr, { spend: number; leads: number }>
// Then client code builds TrendDataPoint[] from that map
```

### Reusing FbTrendChart for Admin

```typescript
// FbTrendChart accepts TrendDataPoint[] — works for admin aggregate
// Source: components/dashboard/fb-trend-chart.tsx
import { FbTrendChart } from '@/components/dashboard/fb-trend-chart'

// Pass aggregate TrendDataPoint[] built from summed daily data
<FbTrendChart data={trendData} />
```

### Correct Suspense Pattern for Admin Page

```typescript
// Source: existing app/dashboard/analytics/page.tsx pattern
// Streaming: FB data (slow) loads independently from table (fast)
<Suspense fallback={<AdminTrendChartSkeleton />}>
  <AdminTrendSection trendData={trendData} />
</Suspense>

<Card>
  <CardContent>
    <Suspense fallback={<ClientTableSkeleton />}>
      <ClientAnalyticsTable clients={clients} fbData={fbPerClientMap} />
    </Suspense>
  </CardContent>
</Card>
```

### Per-Client FB Column in Table

```typescript
// ClientData interface extension — add optional FB columns
interface ClientData {
  // ... existing fields
  fbSpend?: number      // null = not configured, 0 = configured but no data
  fbLeads?: number
  fbConfigured: boolean // explicit flag for "not configured" display
}

// Table column rendering
<TableCell>
  {!client.fbConfigured
    ? <span className="text-xs text-neutral-400">—</span>
    : <span>${client.fbSpend?.toFixed(0) ?? '—'}</span>
  }
</TableCell>
```

---

## What "Complete" Means for This Phase

Based on codebase audit, the following gaps exist and define what "completing" the admin analytics page means:

### Gap 1: No FB Performance in Client Table (HIGH VALUE)
The `ClientAnalyticsTable` has no FB columns. The admin cannot see at a glance which clients are running ads, how much they're spending, or how many leads they're generating per client. The DAL already does per-client FB fetches in `getAdminFbAggregation()` — the results are just collapsed. Adding `fbSpend` and `fbLeads` columns to the table (with "—" for unconfigured clients) directly answers the question the admin has when reviewing clients.

### Gap 2: No Admin Trend Chart (MEDIUM VALUE)
The aggregate FB metrics (spend, leads) are shown as 30-day totals only. There's no visualization of how spend and leads are trending over time across all clients. The client-facing page has `FbTrendChart` — the admin should have an equivalent for aggregate data. Requires a new `getAdminFbDailyAggregation()` DAL function.

### Gap 3: Bare Suspense Fallbacks in Admin Page (HIGH POLISH)
Both `<ClientFilters />` and `<ClientAnalyticsTable />` are wrapped in `<Suspense fallback={<div>Loading...</div>}>`. These should be skeleton components that match the shape of the rendered content.

### Gap 4: loading.tsx Missing Revenue & Marketing Row (MEDIUM POLISH)
`app/admin/loading.tsx` only renders 4 skeleton cards but the page renders 8 (two rows of 4). The Revenue & Marketing section (Total Revenue, MRR, Ad Spend, Total Leads) is completely missing from the skeleton.

### Gap 5: Upcoming Milestones Card Missing from Skeleton (LOW)
The upcoming milestones list card is not in `loading.tsx`.

### Gap 6: No Sort by FB Spend in ClientFilters (LOW VALUE)
The sort options are: name, progress, due-date. Adding "fb-spend" sort would let the admin quickly identify highest/lowest spending clients.

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| All data in one blocking fetch | Parallel `Promise.all` in `getAdminData()` | Already implemented correctly |
| Per-page Suspense only | Granular section-level Suspense | Phase 16 established this; admin page uses it for filters/table but with bare fallbacks |
| No FB per-client visibility | Needs to be added | Primary gap in Phase 18 |

**Not deprecated, working correctly:**
- DAL caching pattern (React `cache()` + `unstable_cache`) — keep as-is
- `getAllClientsWithMilestones()` + `getAdminAnalytics()` deduplication — working correctly
- Error boundary (`app/admin/error.tsx`) — complete and functional

---

## Open Questions

1. **Should the admin trend chart stream independently via Suspense?**
   - What we know: FB daily aggregation hits the FB API (6h cache) — could be slow on cache miss
   - What's unclear: Whether the cache miss latency is acceptable for a blocking load
   - Recommendation: Yes, wrap in Suspense with a skeleton — same pattern as FbAdsSkeleton on client analytics

2. **Should per-client FB data block the table render?**
   - What we know: Table currently renders synchronously with the page's getAdminData() call
   - What's unclear: Whether FB per-client data should be fetched alongside the table data or in a separate streaming section
   - Recommendation: Fetch FB per-client data in parallel with other data in getAdminData(). If it misses cache it will be slow, but the 6h cache means this is rare. Alternatively, stream FB columns in separately.

3. **How many FB columns in the table?**
   - What we know: The table already has 8 columns + Actions. FB spend + leads = 2 more = 10 columns + Actions — this may be crowded on mobile
   - Recommendation: Add FB Spend (30d) and FB Leads (30d) as two columns; consider showing them only when the viewport is wide enough (hidden on mobile)

---

## Sources

### Primary (HIGH confidence)
- Direct codebase audit of `app/admin/page.tsx`, `components/admin/analytics-summary.tsx`, `components/admin/client-analytics-table.tsx`, `components/admin/client-filters.tsx` — complete read
- Direct codebase audit of `lib/dal.ts` — all admin DAL functions read
- Direct codebase audit of `lib/facebook-ads.ts` — complete read
- Direct codebase audit of `app/admin/loading.tsx` and `app/admin/error.tsx` — complete read
- Direct codebase audit of `components/dashboard/fb-trend-chart.tsx` and `fb-ads-metrics.tsx` — complete read for chart patterns
- `prisma/schema.prisma` — Activity model, Client model (adAccountId field) confirmed
- `package.json` — all library versions confirmed

### Secondary (MEDIUM confidence)
- None required — all findings are codebase-sourced

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- What exists in the admin page: HIGH — direct code audit
- What's missing: HIGH — direct comparison of data available vs data displayed
- Architecture patterns: HIGH — directly from working code in the same project (Phase 14/16 analytics page)
- FB per-client DAL pattern: HIGH — `getAdminFbAggregation()` source code read directly

**Research date:** 2026-03-26
**Valid until:** 2026-04-25 (30 days — codebase is stable, no third-party API changes expected)
