# Phase 20: Home Page Charts + Bug Fixes - Research

**Researched:** 2026-03-26
**Domain:** Next.js App Router searchParams pattern, Recharts ComposedChart, Prisma schema extension, date-range-driven API re-fetch
**Confidence:** HIGH (all findings from direct codebase inspection; stack already installed and in use)

---

## Summary

The home page (`app/dashboard/page.tsx`) currently fetches 90 days of daily FB insights via `getClientFbDailyInsights()` and passes the data to `DashboardOverview` as a static prop. `DashboardOverview` is a `"use client"` component that passes the data to `AnalyticsOverview`, which has range buttons (7D / 30D / 90D / All) that only slice existing in-memory data — they never re-fetch from the API. The bug is that the date range selector on the home page is cosmetic, not functional.

The analytics page (`app/dashboard/analytics/page.tsx`) already solves this correctly: it reads `searchParams.range`, passes a `DateRange` to async `FbAdsSection`, which calls `getClientFbInsights(datePreset)` and `getClientFbCampaigns(datePreset)`. Changing the URL param causes a full server re-render, hitting the 6h-TTL `unstable_cache` with the new `datePreset` key. This is the exact pattern to replicate on the home page.

The home page needs to be refactored to accept `searchParams`, extract `dateRange`, pass it to a new `SpendLeadsSection` async server component (Suspense-wrapped), and replace the current `getClientFbDailyInsights` / `AnalyticsOverview` system with `getClientFbDailyTrend` (which already exists) filtered by the selected date range. `AnalyticsOverview` should be replaced or augmented with a focused `SpendLeadsChart` that uses the existing `FbTrendChart` (ComposedChart with Bar+Line, legend, dual Y-axis — already built and working in the analytics page).

The `leadsChartEnabled` feature requires one new field on the `Client` model in Prisma (Boolean, default false), a `prisma db push`, a new admin toggle in the Facebook Ads Configuration card in `ClientForm`, and a DAL function that reads the flag. The existing `getClientAdConfig` function already fetches from the `Client` model and is the right place to piggyback.

**Primary recommendation:** Replicate the analytics page's searchParams → async section → Suspense pattern on the home page. Use `getClientFbDailyTrend` (not `getClientFbDailyInsights`) and the existing `FbTrendChart` component for the spend+leads chart. `DashboardOverview` should be broken up so only truly client-interactive parts remain `"use client"`.

---

## Standard Stack

No new packages needed. Everything is already installed.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | ^3.7.0 | Charts (ComposedChart, Bar, Line, Legend, YAxis) | Already installed; `FbTrendChart` uses it |
| Next.js App Router | 16.1.6 | searchParams → async server component re-fetch | Already the architecture on analytics page |
| Prisma | ^5.22.0 | Add `leadsChartEnabled` Boolean field to Client | Already the DB layer; `prisma db push` used |
| react-hook-form + zod | ^7.71.1 | Extend `updateClientSchema` and `ClientForm` for new flag | Already the form pattern in admin |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `unstable_cache` (Next.js) | 16.1.6 | Cache FB API calls per (clientId, datePreset) | Used in every existing DAL FB function |
| React `cache()` | 19.2.3 | Deduplicate session reads within a request | Used throughout DAL |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| searchParams URL param | Client-state `useState` + `useEffect` fetch | URL params enable SSR + caching; useState would require a separate API route and lose Suspense streaming |
| `getClientFbDailyTrend` | `getClientFbDailyInsights` | Both exist; `getClientFbDailyTrend` returns `FbDailyInsight[] | null` (null = not configured); `getClientFbDailyInsights` does the same but is cached under a different key (`fb-daily-90d-*`). They are functionally identical. Use `getClientFbDailyTrend` (more explicit return contract) |
| Existing `FbTrendChart` | New custom chart | `FbTrendChart` already uses ComposedChart with Bar spend + Line leads + Legend + dual YAxis — exactly what's needed |

**Installation:** None required.

---

## Architecture Patterns

### Recommended Project Structure

The home page currently passes all data via props from a fully-rendered server page into `DashboardOverview` (a `"use client"` component). The refactor splits this:

```
app/dashboard/
├── page.tsx                          # Non-async, reads searchParams, renders sections
├── layout.tsx                        # Unchanged (adds preview banner in Phase 19)
components/dashboard/
├── dashboard-overview.tsx            # Remove FB chart concerns; keep milestones/documents/activity
├── home-spend-chart.tsx (new)        # "use client" wrapper for FbTrendChart with date range
├── fb-trend-chart.tsx                # Already exists — reuse as-is
lib/dal.ts                            # Add getClientLeadsChartEnabled(); extend getClientAdConfig
prisma/schema.prisma                  # Add leadsChartEnabled Boolean @default(false) to Client
lib/schemas/client.ts                 # Add leadsChartEnabled Boolean to updateClientSchema
app/admin/actions.ts                  # Handle leadsChartEnabled in updateClient()
components/admin/client-form.tsx      # Add toggle UI to Facebook Ads Configuration card
```

### Pattern 1: searchParams → Async Section → Suspense (Home Page Re-fetch)

**What:** Non-async page reads `searchParams.range`, passes `dateRange` as prop to an async `SpendLeadsSection` server component. Changing URL causes full re-render of the async section, which calls `getClientFbDailyTrend()` with the new date context. The FB data is cached per `(clientId, datePreset)` in `unstable_cache`.

**When to use:** Any time a date range change should trigger fresh API data rather than just filtering existing data.

**Key insight:** `getClientFbDailyTrend()` does NOT currently accept a `datePreset` param — it's hardcoded to `last_90d`. For the date range bug fix to work (re-fetching different amounts of data), either:
1. Create a new DAL function `getClientFbDailyTrendByRange(datePreset)` that accepts a param (mirrors `getClientFbInsights` pattern), OR
2. Keep fetching 90d and just filter/slice client-side (acceptable if the goal is just "re-fetch on range change" rather than "fetch exactly N days")

**Recommendation:** Option 1 (new parameterized function) for correctness. Pattern already exists in `getClientFbInsights`.

```typescript
// Source: app/dashboard/analytics/page.tsx — working pattern to replicate

// In app/dashboard/page.tsx (non-async page)
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const resolvedParams = await searchParams
  const rawRange = resolvedParams?.range
  const dateRange: DateRange =
    rawRange === '7d' || rawRange === '30d' || rawRange === 'all'
      ? rawRange
      : '30d'

  return (
    <>
      {/* milestones, documents, activity fetched here (not date-range-sensitive) */}
      <Suspense fallback={<SpendLeadsSkeleton />}>
        <SpendLeadsSection dateRange={dateRange} />
      </Suspense>
    </>
  )
}

// Async server component (co-located in page.tsx or separate file)
async function SpendLeadsSection({ dateRange }: { dateRange: DateRange }) {
  const datePreset = rangeToDatePreset(dateRange)
  const [dailyTrend, clientAdConfig] = await Promise.all([
    getClientFbDailyTrendByRange(datePreset), // new parameterized version
    getClientAdConfig(),
  ])
  const trendData = dailyTrend ? buildTrendData(dailyTrend) : []
  const leadsEnabled = clientAdConfig?.leadsChartEnabled ?? false

  return (
    <HomeSpendChart
      data={trendData}
      leadsEnabled={leadsEnabled}
      dateRange={dateRange}
      isConfigured={!!clientAdConfig?.adAccountId}
    />
  )
}
```

### Pattern 2: Date Range Selector that Changes URL (not useState)

The analytics page does NOT have a date range selector UI — it relies on external navigation to change `?range=`. The home page needs a UI button group that calls `router.push` or `<Link href="?range=7d">` to update the searchParam.

Use `<Link href={`?range=7d`}>` for zero-JS fallback, or `useRouter().push` for smooth transitions. Both work; `Link` is simpler.

```typescript
// Source: Extrapolated from analytics/page.tsx + Next.js App Router docs
// In a "use client" DateRangeSelector component:
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export function DateRangeSelector() {
  const params = useSearchParams()
  const current = params.get('range') ?? '30d'
  return (
    <div className="flex gap-1">
      {(['7d', '30d', 'all'] as const).map((r) => (
        <Link
          key={r}
          href={`?range=${r}`}
          className={cn('rounded px-2.5 py-1 text-xs font-medium',
            current === r ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
          )}
        >
          {r.toUpperCase()}
        </Link>
      ))}
    </div>
  )
}
```

**Important:** `useSearchParams` requires `<Suspense>` boundary around the component using it. Wrap in Suspense at the page level.

### Pattern 3: leadsChartEnabled Flag

**What:** A Boolean flag per Client that the admin toggles. When true, the leads Line appears in the chart; when false, only the spend Bar is shown.

**Database change:**
```prisma
// In prisma/schema.prisma, add to model Client:
leadsChartEnabled  Boolean   @default(false)
```
Run `prisma db push` (not `migrate dev` — project uses push approach).

**DAL change:** `getClientAdConfig` already selects from Client; add `leadsChartEnabled` to its select.

**Admin UI:** The `ClientForm` "Facebook Ads Configuration" card (edit mode only) already has `adAccountId`. Add a `Switch` or `Checkbox` input for `leadsChartEnabled`. The Zod schema and Server Action must also accept the new field.

**Chart conditional:**
```typescript
// In FbTrendChart or HomeSpendChart:
{leadsEnabled && (
  <Line yAxisId="leads" dataKey="leads" stroke="#10b981" ... />
)}
```

### Pattern 4: Combined Chart with Legend

`FbTrendChart` already implements ComposedChart + Bar (spend) + Line (leads) + Legend + dual YAxis. It can be used directly. The `leadsEnabled` toggle simply conditionally renders the Line element. When only spend is shown and `leadsEnabled=false`, the right YAxis and Line are hidden.

```typescript
// Source: components/dashboard/fb-trend-chart.tsx — working implementation
// Already uses: Bar yAxisId="spend", Line yAxisId="leads", Legend, ResponsiveContainer
```

### Anti-Patterns to Avoid

- **Client-side slicing only:** The `AnalyticsOverview` / `analytics-overview.tsx` component currently uses `sliceRange(data, range)` to filter data in-memory. This does NOT fix the "fetches fresh data" requirement. Remove or bypass this component for the home page chart.
- **Putting data fetching inside `"use client"` components:** Fetch in async server components, pass data as props to client components for interactivity. This is the existing analytics page pattern.
- **Calling `getClientFbDailyTrend` inside `unstable_cache` without a datePreset key:** The current `getClientFbDailyTrend` always fetches `last_90d` and caches under `fb-daily-trend-90d-${client.id}`. A new `getClientFbDailyTrendByRange(datePreset)` must use cache key `fb-daily-trend-${datePreset}-${client.id}` so different ranges get separate cache entries.
- **Using `migrate dev` for schema changes:** This project uses `prisma db push`. Never run `prisma migrate dev`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Spend + Leads chart | Custom SVG or canvas chart | `FbTrendChart` (already exists) | ComposedChart with Bar+Line+Legend already implemented, tested, and styled |
| Date range UI that re-fetches | `useState` + `useEffect` + API route | `<Link href="?range=X">` + searchParams | URL approach works with SSR, Suspense, and 6h cache; no API route needed |
| FB data caching per range | Manual cache map | `unstable_cache` with key `[fn-name, clientId, datePreset]` | Already the established pattern; handles TTL, revalidation, and race conditions |
| Boolean admin toggle | Custom checkbox component | Shadcn `Switch` component (already in project) | Consistent with existing form pattern |

**Key insight:** The working pattern already exists on the analytics page. The home page needs to match it, not invent a new approach.

---

## Common Pitfalls

### Pitfall 1: `getClientFbDailyTrend` Hardcoded to `last_90d`

**What goes wrong:** Developer re-uses `getClientFbDailyTrend` unchanged, thinking range changes will cause different data. The DAL function is hardcoded to `last_90d` regardless of what's passed.

**Why it happens:** The function signature is `cache(async (): Promise<FbDailyInsight[] | null>)` — no params.

**How to avoid:** Create `getClientFbDailyTrendByRange(datePreset: DatePreset)` that accepts a param and includes `datePreset` in the unstable_cache key. Pattern is identical to `getClientFbInsights(datePreset)`.

**Warning signs:** Changing the date range button shows different chart window but all requests show `last_90d` in server logs.

### Pitfall 2: `useSearchParams` Without Suspense Boundary

**What goes wrong:** Next.js 16 throws a build/runtime error: "useSearchParams() should be wrapped in a Suspense boundary".

**Why it happens:** `useSearchParams` is a client hook that reads URL state. Next.js requires a Suspense boundary to handle the async URL read during SSR.

**How to avoid:** Wrap any component using `useSearchParams` in `<Suspense>`. The `DateRangeSelector` component itself can be the leaf component inside Suspense.

### Pitfall 3: Preview Mode and `getClientFbDailyTrendByRange`

**What goes wrong:** After Phase 19 ships, admin preview mode sets `admin_preview_clientId` cookie. The new DAL function must respect this cookie the same way `getCurrentClientId` does. If the new function calls `getClientAdConfig()` (which already handles preview), this is automatic. But if it re-implements client lookup independently, it will break preview.

**How to avoid:** Always resolve the clientId via `getClientAdConfig()` or `getCurrentClientId()` — never call `prisma.client.findUnique` directly using `verifySession().userId` in new FB DAL functions.

### Pitfall 4: `DashboardOverview` Is `"use client"` — Can't Fetch Directly

**What goes wrong:** Developer tries to add date range fetch logic inside `DashboardOverview` by adding `async`; TypeScript/Next.js errors because `"use client"` components cannot be async.

**Why it happens:** `DashboardOverview` has `"use client"` at the top because it uses `useState` for `isChartExpanded`.

**How to avoid:** Extract the FB chart section into its own async server component. `DashboardOverview` keeps its non-FB content. The page renders the async chart section independently.

### Pitfall 5: Campaign Performance Section Date Range (Requirement 5)

**What goes wrong:** The campaign performance section referred to in success criterion 5 is on the analytics page (`FbAdsSection`) — but that section already works correctly (it reads `searchParams.range`). The bug to fix may specifically be about the `AnalyticsOverview` component on the home page, which has its OWN range selector that does NOT change URL params. Confirm which "campaign performance section" is meant.

**Recommendation:** "Campaign performance section" in success criterion 5 most likely refers to `AnalyticsOverview` on the home page (the section with Impressions/Clicks/Leads/Booked Calls tabs). This component's range buttons change `useState` — not URL params. The fix is to either (a) wire these buttons to change URL params like the analytics page, or (b) remove/replace `AnalyticsOverview` with the simpler `FbTrendChart`-based component.

---

## Code Examples

### DAL: Parameterized Daily Trend Function

```typescript
// Source: lib/dal.ts — new function mirroring getClientFbInsights pattern
export const getClientFbDailyTrendByRange = cache(async (
  datePreset: DatePreset = 'last_30d'
): Promise<FbDailyInsight[] | null> => {
  const { userRole } = await verifySession()
  if (userRole !== 'CLIENT') throw new Error('Unauthorized')

  const client = await getClientAdConfig()
  if (!client?.adAccountId) return null

  const settings = await getSettings()
  if (!settings?.facebookAccessToken) return null

  const cachedFetch = unstable_cache(
    async () => fetchFacebookDailyInsights(
      client.adAccountId!,
      settings.facebookAccessToken!,
      datePreset
    ),
    [`fb-daily-trend-${datePreset}-${client.id}`],
    { revalidate: 21600, tags: [`fb-insights-${client.id}`] }
  )
  return cachedFetch()
})
```

### Prisma Schema: leadsChartEnabled Field

```prisma
// Source: prisma/schema.prisma — add to model Client
model Client {
  // ... existing fields ...
  leadsChartEnabled  Boolean   @default(false)
  // ... rest ...
}
```

After edit, run: `npx prisma db push`

### Zod Schema Extension

```typescript
// Source: lib/schemas/client.ts — add to updateClientSchema
export const updateClientSchema = z.object({
  // ... existing fields ...
  leadsChartEnabled: z.boolean().optional(),
})
```

### ClientForm: Toggle for leadsChartEnabled

```typescript
// Source: components/admin/client-form.tsx — add inside "Facebook Ads Configuration" card
// Uses existing Shadcn Switch component pattern
<div className="flex items-center gap-3">
  <Switch
    id="leadsChartEnabled"
    checked={watchedLeadsEnabled}
    onCheckedChange={(checked) => setValue('leadsChartEnabled', checked)}
  />
  <Label htmlFor="leadsChartEnabled">Show Leads Chart</Label>
</div>
```

### Conditional Leads Line in Chart

```typescript
// Source: components/dashboard/fb-trend-chart.tsx — modify to accept leadsEnabled prop
// If leadsEnabled is false, hide the Line and right YAxis
{leadsEnabled && (
  <YAxis yAxisId="leads" orientation="right" ... />
)}
{leadsEnabled && (
  <Line yAxisId="leads" dataKey="leads" ... />
)}
```

---

## Key Facts About Existing Code

### `getClientFbDailyInsights` vs `getClientFbDailyTrend`

Both functions do the same thing: call `fetchFacebookDailyInsights(adAccountId, token, 'last_90d')`. The difference:
- `getClientFbDailyInsights` — used by `app/dashboard/page.tsx` (home page), cached under key `fb-daily-90d-${client.id}`
- `getClientFbDailyTrend` — used by `app/dashboard/analytics/page.tsx`, cached under key `fb-daily-trend-90d-${client.id}`

They are functionally identical. The home page should migrate to a new parameterized version and stop using `getClientFbDailyInsights`.

### `AnalyticsOverview` Component (Home Page)

`components/dashboard/analytics-overview.tsx` is a `"use client"` component with:
- Tabs: Impressions / Clicks / Leads / Booked Calls
- Range buttons: 7D / 30D / 90D / All (stored in `useState<ChartRange>`)
- Range filtering via `sliceRange()` (client-side slice, no API re-fetch)
- Uses `LineChart` from recharts (not ComposedChart)

This component does NOT meet the Phase 20 requirements. It should be replaced (for the FB charts section of the home page) with the Suspense streaming pattern using `FbTrendChart`.

### `FbTrendChart` Component (Analytics Page)

`components/dashboard/fb-trend-chart.tsx`:
- `"use client"` component
- Uses `ComposedChart` with `Bar` (spend, left Y) + `Line` (leads, right Y) + `Legend`
- Range buttons (7D / 30D / 90D / All) — these are client-side slice, NOT URL-driven
- The range buttons here are acceptable because this is inside an async server section that already fetched 90d; slicing within 90d is fine

This component can be used directly on the home page. Its internal range selector is client-side slice (acceptable for within the already-fetched 90d window).

### `DashboardOverview` Component

`components/dashboard/dashboard-overview.tsx`:
- `"use client"` component (has `useState` for `isChartExpanded`)
- Accepts `fbDailyData: FbDayData[] | null` prop (pre-transformed)
- Passes data to `AnalyticsOverview` component
- Contains milestones, hero stats, documents, activities sections

The `AnalyticsOverview` import and related chart logic should be removed from this component. The FB chart section should be rendered from `page.tsx` as a separate Suspense-wrapped async section, OUTSIDE of `DashboardOverview`.

### Admin Preview Page

`app/admin/preview/[clientId]/page.tsx` currently renders `DashboardOverview` with `fbDailyData={null}`. After Phase 20, the home page chart is in a separate async section. The preview page will need to render (or stub) the new chart section too, OR the chart section can detect preview mode via `getClientAdConfig()` (which Phase 19 patches to return the preview client's config).

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side slicing for date range | searchParams URL param → async server section re-fetch | Analytics page already uses this (Phase 16) | Must replicate on home page |
| Single monolithic server component | Granular Suspense boundaries per slow section | Phase 16 | Home page chart should follow same pattern |

---

## Open Questions

1. **Which "campaign performance section" does success criterion 5 refer to?**
   - What we know: `AnalyticsOverview` on the home page has Impressions/Clicks/Leads/Booked Calls tabs with range buttons. The analytics page's `FbAdsSection` already works.
   - What's unclear: Does criterion 5 mean the `AnalyticsOverview` tabs on the home page, or something else?
   - Recommendation: Treat criterion 5 as "the AnalyticsOverview section on the home page must also re-fetch on range change" — either replace it with a URL-param-driven section or wire its buttons to push to URL.

2. **Should `AnalyticsOverview` be completely removed or kept alongside the new chart?**
   - What we know: `AnalyticsOverview` has tabs for 4 metrics; `FbTrendChart` only shows spend+leads.
   - What's unclear: Requirements CHART-01 through CHART-06 specifics (only CHART-01, CHART-02, CHART-03, CHART-05, CHART-06 are listed — CHART-04 is absent, which may mean the 4-tab impressions/clicks view is intentionally dropped).
   - Recommendation: Replace `AnalyticsOverview` with the spend+leads chart plus conditionally the combined chart. Remove the impressions/clicks tabs as out of scope.

3. **Phase 19 status — is preview mode cookie active when Phase 20 is planned?**
   - What we know: Phase 20 depends on Phase 19. Phase 19 plans are written but may not be executed.
   - What's unclear: Whether `getClientAdConfig()` will have preview mode support when Phase 20 executes.
   - Recommendation: Phase 20 plans should include a note that `getClientFbDailyTrendByRange` MUST use `getClientAdConfig()` for client resolution (not raw prisma calls) to inherit Phase 19's preview mode support. If Phase 19 isn't done yet, the plans should be sequenced after it.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `app/dashboard/page.tsx` (home page data flow)
- Direct codebase inspection — `app/dashboard/analytics/page.tsx` (working searchParams pattern)
- Direct codebase inspection — `components/dashboard/analytics-overview.tsx` (broken range selector)
- Direct codebase inspection — `components/dashboard/fb-trend-chart.tsx` (existing ComposedChart)
- Direct codebase inspection — `components/dashboard/dashboard-overview.tsx` (structure)
- Direct codebase inspection — `lib/dal.ts` lines 514–717 (all FB DAL functions)
- Direct codebase inspection — `lib/facebook-ads.ts` (FbDailyInsight type, buildTrendData, fetchFacebookDailyInsights)
- Direct codebase inspection — `prisma/schema.prisma` (Client model, no leadsChartEnabled yet)
- Direct codebase inspection — `components/admin/client-form.tsx` (admin toggle pattern)
- Direct codebase inspection — `lib/schemas/client.ts` (updateClientSchema)
- Direct codebase inspection — `app/admin/actions.ts` updateClient (existing field handling pattern)
- Direct codebase inspection — `app/admin/preview/[clientId]/page.tsx` (preview renders DashboardOverview with null FB data)

### Secondary (MEDIUM confidence)
- `.planning/phases/19-admin-preview-status-badge/19-RESEARCH.md` — Phase 19 preview cookie design (cookie name: `admin_preview_clientId`, DAL patches `getCurrentClientId`)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — recharts 3.7.0 and all patterns directly observed in codebase
- Architecture: HIGH — analytics page provides exact working template to replicate
- Pitfalls: HIGH — root causes identified from direct code inspection, not guesswork
- leadsChartEnabled schema change: HIGH — Prisma schema read directly, push approach confirmed

**Research date:** 2026-03-26
**Valid until:** 2026-04-25 (stable stack — no fast-moving dependencies)
