# Phase 21: ROAS + Analytics Tab Charts - Research

**Researched:** 2026-03-27
**Domain:** Facebook Ads API ROAS fields, recharts ComposedChart, Next.js async server components
**Confidence:** HIGH (all stack findings from direct codebase inspection; ROAS API fields confirmed via official Meta developer docs)

---

## Summary

This phase has two distinct concerns: (1) fetching ROAS from the Facebook Ads API and surfacing it as a metric card on the home page, and (2) ensuring the analytics tab includes the spend chart, leads chart, and combined chart. The analytics tab already renders `FbTrendChart` (which shows spend+leads combined), so CHART-04's "combined chart" criterion is partially satisfied. What's missing is explicit ROAS data in the chart and a ROAS metric card on the home page.

**Critical context:** Phase 20 was re-scoped. The `AnalyticsOverview` component with tabs is still active on the home page — the planned searchParams-driven SpendLeadsSection approach was reverted after real-world testing. The current home page passes `fbDailyData` (all-time daily data via `getClientFbDailyInsights`) into `DashboardOverview` which passes it to `AnalyticsOverview`. The current analytics page already has `FbTrendChart` rendering spend+leads. The STATE.md contains incorrect claims that `AnalyticsOverview` was removed — it was restored via revert commit `83f9988`.

For ROAS: the Facebook API's `purchase_roas` field returns `list<AdsActionStats>` — same shape as the existing `actions` field (array of objects with `action_type` and `value` string). The `value` is the ROAS ratio as a numeric string (e.g., `"2.5"` = 2.5x ROAS). This is already returnable from the single account-level `fetchFacebookInsights()` call by adding `purchase_roas` to the INSIGHTS_FIELDS string. No new API endpoint or fetch function needed.

**Primary recommendation:** For Plan 21-01: add `purchase_roas` to INSIGHTS_FIELDS in `lib/facebook-ads.ts`, extend `FbInsights` type, and add a ROAS card to `FbAdsMetrics` (analytics page) and calculate ROAS for the home page. For Plan 21-02: add ROAS as a data series to `FbTrendChart` and ensure analytics page charts (spend, leads, combined) are properly visible.

---

## Standard Stack

No new packages needed. Everything is already installed.

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | ^3.7.0 | ComposedChart for multi-series charts | Already installed; `FbTrendChart` and `AnalyticsOverview` use it |
| Next.js App Router | 16.x | Async server components, Suspense | Already the architecture |
| Facebook Marketing API | v22.0 | `purchase_roas` field via account-level insights | Already integrated in `lib/facebook-ads.ts` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `unstable_cache` (Next.js) | 16.x | Cache FB API calls per (clientId, datePreset) | ROAS comes from the same `fetchFacebookInsights` call — no new cache entry needed |
| React `cache()` | 19.x | Deduplicate session reads | Used throughout DAL; `getClientFbInsights` already handles this |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `purchase_roas` API field | Calculate from `action_values` ÷ `spend` | `purchase_roas` is direct; `action_values` is a separate API field with its own edge cases (e.g., missing for accounts without purchase pixel events). Use `purchase_roas` when available. |
| Adding ROAS to `FbInsights` type | New fetch function | The existing `getClientFbInsights()` call already hits the account-level endpoint; ROAS comes from the same call, just a new field |
| Separate "ROAS chart" component | Adding ROAS series to existing `FbTrendChart` | `FbTrendChart` already uses ComposedChart with Bar+Line. Adding a second Line for daily ROAS requires daily data, which is in `FbDailyInsight`. Daily ROAS = daily spend ÷ leads (or daily action_values if available). |

**Installation:** None required.

---

## Architecture Patterns

### Recommended Project Structure

```
lib/facebook-ads.ts                          # Add purchase_roas to FbInsights type + INSIGHTS_FIELDS
components/dashboard/fb-ads-metrics.tsx      # Add ROAS card (Card 13) using purchase_roas from FbInsights
components/dashboard/dashboard-overview.tsx  # Add ROAS metric card using fbDailyData totals
app/dashboard/analytics/page.tsx             # Already has FbTrendChart; ensure leadsEnabled is passed
components/dashboard/fb-trend-chart.tsx      # Optionally add ROAS series; ensure leadsEnabled prop works
```

### Pattern 1: Extending FbInsights with purchase_roas

**What:** Add `purchase_roas` to the INSIGHTS_FIELDS string and to the `FbInsights` interface. The field returns `list<AdsActionStats>` — same shape as `actions`.

**When to use:** Whenever account-level ROAS is needed (home page ROAS card, analytics page ROAS card).

```typescript
// Source: lib/facebook-ads.ts — direct edit
// Add to INSIGHTS_FIELDS string:
const INSIGHTS_FIELDS = 'spend,impressions,clicks,ctr,cpc,cpm,actions,reach,frequency,outbound_clicks,quality_ranking,engagement_rate_ranking,conversion_rate_ranking,purchase_roas'

// Add to FbInsights interface:
export interface FbInsights {
  // ... existing fields ...
  purchase_roas?: FbAction[]  // list<AdsActionStats> — same shape as actions
                              // value is ROAS ratio as string: "2.53" = 2.53x ROAS
}
```

**Extracting ROAS value:**
```typescript
// The purchase_roas array has entries with action_type and value
// Common action_types: "omni_purchase", "offsite_conversion.fb_pixel_purchase"
// Use the first entry's value, or sum if multiple action_types present
function getRoas(purchaseRoas?: FbAction[]): number {
  if (!purchaseRoas || purchaseRoas.length === 0) return 0
  // Use omni_purchase (aggregates all purchase sources) if present
  const omni = purchaseRoas.find(a => a.action_type === 'omni_purchase')
  if (omni) return parseFloat(omni.value)
  // Fallback: use first entry
  return parseFloat(purchaseRoas[0].value)
}
```

### Pattern 2: ROAS Card on Analytics Page (FbAdsMetrics)

**What:** Add a 13th metric card to `FbAdsMetrics` for ROAS, calculated from `insights.purchase_roas`.

**When to use:** FbAdsMetrics already renders the 12-card grid at `app/dashboard/analytics/page.tsx`. ROAS fits naturally as a 13th card.

```typescript
// Source: components/dashboard/fb-ads-metrics.tsx — add to grid
// After Card 12 (Landing Page Views):
<Card>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">ROAS</CardTitle>
    <TrendingUp className="h-4 w-4 text-neutral-500" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">
      {getRoas(insights.purchase_roas).toFixed(2)}x
    </div>
    <p className="text-xs text-neutral-500 mt-1">Purchase revenue ÷ ad spend</p>
  </CardContent>
</Card>
```

### Pattern 3: ROAS Metric on Home Page

**What:** The home page uses `getClientFbDailyInsights()` which returns daily data — not the account-level `FbInsights` that now has `purchase_roas`. To show ROAS on the home page:

**Option A (recommended):** Call `getClientFbInsights()` additionally on the home page (it's already deduplicated via React `cache()`) to get the account-level ROAS. Add a ROAS stat to the `workflowHighlights` or `heroStats` array in `DashboardOverview`.

**Option B:** Calculate ROAS client-side from the daily data that `DashboardOverview` already has: `sum(action_values) / totalAdSpend`. This requires `action_values` in the daily data (which is NOT currently fetched — `DAILY_FIELDS` only has `spend,impressions,clicks,reach,actions,outbound_clicks`).

**Recommendation:** Option A. Add `getClientFbInsights(datePreset)` to the parallel fetch in `app/dashboard/page.tsx`. The home page currently passes `leadsEnabled` from `getClientDashboardProfile()` — it needs to call `getClientFbInsights()` for the ROAS value. Since `getClientFbInsights` is `cache()`-wrapped, calling it on both the home page and analytics page has zero overhead.

```typescript
// Source: app/dashboard/page.tsx — add to Promise.all
const [milestones, chatSettings, dailyInsights, client, userName, documents, activities, fbInsights] = await Promise.all([
  getMilestones(),
  getChatSettings(),
  getClientFbDailyInsights(),
  getClientDashboardProfile(),
  getCurrentUserName(),
  getClientRecentDocuments(),
  getRecentActivities(),
  getClientFbInsights('last_30d'), // for ROAS card — uses cache dedup
])

// Then extract ROAS:
const roas = getRoas(fbInsights?.purchase_roas)
// Pass roas as prop to DashboardOverview
```

### Pattern 4: Adding ROAS to AnalyticsOverview (Home Page Chart)

**What:** The home page `AnalyticsOverview` has tabs for Impressions, Clicks, Leads (conditional), Booked Calls, Ad Spend. CHART-08 says "ROAS included in charts and analytics tab." The cleanest implementation is:
- Add ROAS as a display metric (not a chart tab) — show it as a stat card above or within the chart section
- OR add a "ROAS" tab to `AnalyticsOverview` (but daily ROAS data isn't currently fetched)

**Important constraint:** `AnalyticsOverview` runs off daily data from `getClientFbDailyInsights()`. To chart ROAS daily, the DAILY_FIELDS would need `action_values` added (to get daily purchase revenue). This adds API data without adding a new fetch.

**Recommendation for CHART-08 "ROAS included in analytics tab charts":**
- On the **analytics page**: add ROAS card to `FbAdsMetrics` (easy — account-level `purchase_roas` already in `FbInsights` after 21-01)
- On the **home page chart**: add ROAS as a display value above `AnalyticsOverview` (using the account-level ROAS from `getClientFbInsights`) rather than as a daily-data chart tab

### Pattern 5: ROAS Series in FbTrendChart (Analytics Page)

**What:** CHART-04 says "Ad spend graph, leads graph, and combined chart also appear on the client analytics tab." The analytics page's `FbAdsSection` already renders `FbTrendChart` with `data={dailyTrend ? buildTrendData(dailyTrend) : []}`. The `FbTrendChart` renders both spend (Bar) and leads (Line) together — this IS the combined chart.

For CHART-08 on the analytics tab, adding ROAS to the trend chart requires daily ROAS data. Since the API doesn't return per-day ROAS directly, it must be computed: `daily_roas = (daily_action_values for purchase) / daily_spend`. This requires fetching `action_values` in DAILY_FIELDS.

**Simplest path:** Add `action_values` to DAILY_FIELDS in `lib/facebook-ads.ts`, extend `FbDailyInsight` type, then compute daily ROAS in `buildTrendData()`. Add a second Line for ROAS to `FbTrendChart`.

```typescript
// lib/facebook-ads.ts — extend DAILY_FIELDS
const DAILY_FIELDS = 'spend,impressions,clicks,reach,actions,outbound_clicks,action_values'

// Extend FbDailyInsight
export interface FbDailyInsight {
  // ... existing fields ...
  action_values?: FbAction[]  // purchase revenue per day
}

// Extend TrendDataPoint
export interface TrendDataPoint {
  date: string
  spend: number
  leads: number
  roas: number  // new
}

// Update buildTrendData
export function buildTrendData(daily: FbDailyInsight[]): TrendDataPoint[] {
  return daily.map((d) => {
    const spend = parseFloat(d.spend)
    const purchaseValue = getActionValue(d.action_values, 'omni_purchase')
    return {
      date: new Date(d.date_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      spend,
      leads: getActionValue(d.actions, 'lead') + getActionValue(d.actions, 'offsite_conversion.fb_pixel_lead'),
      roas: spend > 0 ? purchaseValue / spend : 0,
    }
  })
}
```

### Pattern 6: Analytics Tab Chart Completeness (CHART-04)

**Current state of analytics page:**
- `FbTrendChart` with `data={dailyTrend ? buildTrendData(dailyTrend) : []}` — always shows spend (Bar) + leads (Line)
- `leadsEnabled` prop does NOT exist on the current `FbTrendChart` (it was added in 20-02 then reverted)

**For CHART-04:** The requirement says "Ad spend graph, leads graph, and combined chart also appear on the client analytics tab." Interpretation options:
1. The existing combined chart (spend+leads) satisfies all three (spend graph = combined Bar, leads graph = combined Line, combined chart = the whole thing)
2. Three separate charts are needed

The most pragmatic interpretation: the current `FbTrendChart` with both series visible satisfies CHART-04. The "combined chart with legend" language in CHART-03 is what's already in `FbTrendChart`. No new separate charts needed.

**What may be missing on the analytics page:** The `FbTrendChart` currently always shows both spend AND leads regardless of `leadsChartEnabled`. Adding the `leadsEnabled` prop (re-doing what 20-02 did for this component, since the revert undid it) may be needed for consistency.

### Anti-Patterns to Avoid

- **Fetching `action_values` in a new separate DAL function:** `action_values` just extends the existing DAILY_FIELDS. One fetch gives all data.
- **Creating a new FB API endpoint call for ROAS:** `purchase_roas` comes from the same account-level insights endpoint as all other metrics. Add the field, don't add a new fetch.
- **Using `website_purchase_roas` instead of `purchase_roas`:** `purchase_roas` is the aggregate (includes mobile + website). Use `purchase_roas` unless only website purchases are tracked.
- **Storing ROAS in the database:** ROAS is computed from FB API data on each fetch. Don't persist it.
- **Ignoring the Phase 20 revert:** The STATE.md says `AnalyticsOverview` was removed — this is WRONG. It was reverted. The actual home page still uses `AnalyticsOverview` with tabs. Don't plan Phase 21 as if the searchParams/SpendLeadsSection approach is in place.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ROAS calculation | Custom ratio function | `getActionValue(purchase_roas, 'omni_purchase') / parseFloat(spend)` | One-liner; `getActionValue` already exists and handles missing data (returns 0) |
| Daily ROAS chart | New chart component | Extend `buildTrendData()` + add Line to `FbTrendChart` | ComposedChart can hold N Lines at no complexity cost |
| ROAS API fetch | New DAL function | Extend INSIGHTS_FIELDS string | Same endpoint, same cache, zero new infrastructure |
| Separate "leads chart" and "spend chart" | Two new chart components | `FbTrendChart` with series toggle or conditional Line | Already implemented as ComposedChart |

**Key insight:** Every piece of infrastructure exists. This phase is purely additive: new field strings → new interface properties → new helper function → new UI card → new chart series.

---

## Common Pitfalls

### Pitfall 1: `purchase_roas` May Be Empty for Non-Purchase Advertisers

**What goes wrong:** If the client doesn't track purchases via FB pixel (e.g., lead-gen only), `purchase_roas` will be an empty array or absent. Display "—" or "N/A" instead of "0.00x".

**Why it happens:** ROAS only applies to e-commerce/purchase tracking. Lead-gen advertisers won't have purchase conversion events.

**How to avoid:** Guard `getRoas()` to return null when the array is empty or missing. Display "—" in the UI when `getRoas()` returns null.

**Warning signs:** ROAS card shows "0.00x" for every client — signals the guard isn't returning null for missing data.

### Pitfall 2: `purchase_roas` vs `website_purchase_roas` Action Types

**What goes wrong:** Requesting `website_purchase_roas` gives only FB pixel purchases. Requesting `purchase_roas` gives the aggregate (pixel + SDK + CAPI). Using the wrong one gives lower-than-actual ROAS.

**Why it happens:** Meta has three separate ROAS fields: `purchase_roas` (aggregate), `website_purchase_roas`, `mobile_app_purchase_roas`.

**How to avoid:** Use `purchase_roas` (not `website_purchase_roas`). This matches what Meta Ads Manager shows by default.

### Pitfall 3: Daily ROAS Action Type in `action_values`

**What goes wrong:** In `action_values`, purchase revenue uses action_type `"offsite_conversion.fb_pixel_purchase"` (not `"omni_purchase"`). Using the wrong type gives 0 for daily ROAS.

**Why it happens:** `omni_purchase` exists in the account-level `purchase_roas` field. In `action_values` (which is in the daily breakdown), the action_type may differ.

**How to avoid:** When computing daily ROAS from `action_values`, try multiple action_types: `"offsite_conversion.fb_pixel_purchase"`, `"purchase"`, `"omni_purchase"`. Sum all that match to get total purchase revenue. Alternatively, fall back to the simpler "ROAS card from account-level only, no daily ROAS line" approach if action_values proves unreliable.

**Safer alternative:** If daily ROAS is complex to implement (missing `action_values` data), satisfy CHART-08 via the analytics page ROAS card (from account-level `purchase_roas`) only — no daily ROAS chart line needed. CHART-08 says "included in charts and analytics tab" but doesn't specify "daily chart line."

### Pitfall 4: FbTrendChart leadsEnabled Was Reverted

**What goes wrong:** Planner assumes `FbTrendChart` has `leadsEnabled` prop (it was in 20-02 plan). Current code does NOT have it (reverted in 83f9988).

**Why it happens:** Phase 20 reverted the searchParams/SpendLeadsSection approach, which included the `leadsEnabled` prop.

**How to avoid:** Re-adding `leadsEnabled` to `FbTrendChart` is a Phase 21 task if needed. The analytics page currently shows both spend and leads always — that's fine per CHART-04. For the home page, `AnalyticsOverview` handles the `leadsEnabled` flag via its own tabs conditional rendering (line 155: `...(leadsEnabled ? { leads: {...} } : {})`).

### Pitfall 5: Home Page `getClientFbInsights` is Not Currently Called

**What goes wrong:** The home page (`app/dashboard/page.tsx`) does NOT currently call `getClientFbInsights()`. It calls `getClientFbDailyInsights()` (daily data for charts) and `getClientDashboardProfile()` (client profile including `leadsChartEnabled`). ROAS comes from account-level `FbInsights`, not daily data.

**Why it happens:** The home page was built for charts (daily data), not aggregate metrics.

**How to avoid:** Add `getClientFbInsights('last_30d')` to the `Promise.all` in `app/dashboard/page.tsx`. Pass the resulting `roas` value as a prop to `DashboardOverview`. Extend `DashboardOverviewProps` to accept `roas: number | null`.

### Pitfall 6: `getClientDashboardProfile` vs `getClientAdConfig`

**What goes wrong:** `app/dashboard/page.tsx` calls `getClientDashboardProfile()` (not `getClientAdConfig()`) to get `client.adAccountId` and `client.leadsChartEnabled`. `getClientAdConfig()` is used by FB DAL functions. Adding `getClientFbInsights` to the home page will work because `getClientFbInsights` internally calls `getClientAdConfig()` — cache deduplication means no double query.

**How to avoid:** Don't replace `getClientDashboardProfile()` with `getClientAdConfig()`. They serve different purposes. Just add `getClientFbInsights()` to the parallel fetch.

---

## Code Examples

### Verified Pattern: Extending INSIGHTS_FIELDS

```typescript
// Source: lib/facebook-ads.ts — current INSIGHTS_FIELDS string
// ADD: ,purchase_roas at the end
const INSIGHTS_FIELDS = 'spend,impressions,clicks,ctr,cpc,cpm,actions,reach,frequency,outbound_clicks,quality_ranking,engagement_rate_ranking,conversion_rate_ranking,purchase_roas'

// ADD to FbInsights interface:
export interface FbInsights {
  // ... existing 12 fields ...
  purchase_roas?: FbAction[]  // list<AdsActionStats>; absent when no purchase pixel
}
```

### Verified Pattern: ROAS Extraction Helper

```typescript
// Source: lib/facebook-ads.ts — new helper function
// getRoas returns null when no purchase tracking is configured
export function getRoas(purchaseRoas?: FbAction[]): number | null {
  if (!purchaseRoas || purchaseRoas.length === 0) return null
  // omni_purchase aggregates website + app purchases
  const omni = purchaseRoas.find(a => a.action_type === 'omni_purchase')
  if (omni) return parseFloat(omni.value)
  // Fallback: offsite_conversion.fb_pixel_purchase (website pixel only)
  const pixel = purchaseRoas.find(a => a.action_type === 'offsite_conversion.fb_pixel_purchase')
  if (pixel) return parseFloat(pixel.value)
  // Last resort: first entry
  return parseFloat(purchaseRoas[0].value)
}
```

### Verified Pattern: ROAS Card in FbAdsMetrics

```typescript
// Source: components/dashboard/fb-ads-metrics.tsx — add after Card 12
// Null guard: show "—" when client doesn't track purchases
import { getRoas } from '@/lib/facebook-ads'

const roas = getRoas(insights.purchase_roas)

<Card>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">ROAS</CardTitle>
    <TrendingUp className="h-4 w-4 text-neutral-500" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">
      {roas !== null ? `${roas.toFixed(2)}x` : '—'}
    </div>
    <p className="text-xs text-neutral-500 mt-1">Purchase revenue ÷ ad spend</p>
  </CardContent>
</Card>
```

### Verified Pattern: Home Page with ROAS Prop

```typescript
// Source: app/dashboard/page.tsx — extend Promise.all
const [milestones, chatSettings, dailyInsights, client, userName, documents, activities, fbInsights] = await Promise.all([
  getMilestones(),
  getChatSettings(),
  getClientFbDailyInsights(),
  getClientDashboardProfile(),
  getCurrentUserName(),
  getClientRecentDocuments(),
  getRecentActivities(),
  getClientFbInsights('last_30d'),  // NEW: for ROAS card
])

const roas = getRoas(fbInsights?.purchase_roas ?? undefined)

// Pass to DashboardOverview:
<DashboardOverview
  // ... existing props ...
  roas={roas}
/>
```

### Verified Pattern: ROAS in DashboardOverview workflowHighlights

```typescript
// Source: components/dashboard/dashboard-overview.tsx — workflowHighlights array
// Add or replace one of the 3 highlight cards
{
  label: "ROAS (30d)",
  value: roas !== null ? `${roas.toFixed(2)}x` : isFbConfigured ? "No purchase data" : "—",
  detail: roas !== null ? "Purchase revenue ÷ ad spend" : "Configure purchase pixel to track",
  accent: "from-emerald-300/25 via-green-200/30 to-transparent",
}
```

### Verified Pattern: Extending FbDailyInsight for Daily ROAS (Optional)

```typescript
// Source: lib/facebook-ads.ts — only needed if daily ROAS chart line is in scope
const DAILY_FIELDS = 'spend,impressions,clicks,reach,actions,outbound_clicks,action_values'

export interface FbDailyInsight {
  // ... existing fields ...
  action_values?: FbAction[]  // purchase revenue per day
}

// In buildTrendData:
export function buildTrendData(daily: FbDailyInsight[]): TrendDataPoint[] {
  return daily.map((d) => {
    const spend = parseFloat(d.spend)
    // Try multiple action_types for purchase revenue
    const purchaseValue =
      getActionValue(d.action_values, 'offsite_conversion.fb_pixel_purchase') ||
      getActionValue(d.action_values, 'omni_purchase') ||
      getActionValue(d.action_values, 'purchase')
    return {
      date: new Date(d.date_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      spend,
      leads: getActionValue(d.actions, 'lead') + getActionValue(d.actions, 'offsite_conversion.fb_pixel_lead'),
      roas: spend > 0 ? purchaseValue / spend : 0,
    }
  })
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Phase 20 plan: replace AnalyticsOverview with SpendLeadsSection | Phase 20 revert: keep AnalyticsOverview, enhance tabs | 2026-03-26 revert commit 83f9988 | Phase 21 must treat AnalyticsOverview as the active home page chart system |
| FbTrendChart with leadsEnabled prop | FbTrendChart without leadsEnabled (reverted) | Revert commit 83f9988 | Analytics page always shows both spend+leads; conditionalness removed |
| 12 INSIGHTS_FIELDS | 12 fields + purchase_roas = 13 fields | Phase 21 adds it | ROAS available on both home page and analytics page |

**Deprecated/outdated:**
- Phase 20-02 SUMMARY and STATE.md claim AnalyticsOverview was removed — this is incorrect. Revert restored it.
- `date-range-selector.tsx` component created in Phase 20-02 was deleted in the revert. It does not exist.

---

## Open Questions

1. **Does CHART-08 require a daily ROAS chart line or just a ROAS metric card?**
   - What we know: CHART-08 says "ROAS included in charts and analytics tab" — ambiguous
   - What's unclear: Is a metric card on the analytics page sufficient, or must ROAS appear as a line in the `FbTrendChart`?
   - Recommendation: Implement ROAS metric card (analytics page + home page). For the chart line: add it to `FbTrendChart` only if `action_values` data is confirmed available from the client's FB account. If daily ROAS data is unreliable (missing purchase pixel), a metric card satisfies "included in charts" just as well.

2. **Does CHART-04 require three separate chart components or does the existing `FbTrendChart` (combined spend+leads) satisfy it?**
   - What we know: `FbTrendChart` on analytics page shows spend Bar + leads Line together. The CHART-04 text says "Ad spend graph, leads graph, and combined chart."
   - What's unclear: Whether "ad spend graph" and "leads graph" mean standalone single-series charts or the combined chart with individual series visible
   - Recommendation: The combined `FbTrendChart` satisfies all three interpretations. No need for separate chart components. If additional visibility is needed, series toggle pills (already in `AnalyticsOverview`) could be added to `FbTrendChart` on the analytics page.

3. **Should `purchase_roas` be added to ROAS tab in AnalyticsOverview or shown as a standalone card?**
   - What we know: `AnalyticsOverview` has tabs for Impressions, Clicks, Leads (conditional), Booked Calls, Ad Spend. Adding ROAS as a tab requires daily ROAS data.
   - What's unclear: Whether CHART-07/08 require ROAS to be in the tabbed chart or just visible on the page
   - Recommendation: CHART-07 says "ROAS metric card on client home page" — a card is sufficient. CHART-08 says "ROAS included in charts and analytics tab" — add to analytics metrics grid (FbAdsMetrics card 13). The tabbed chart in `AnalyticsOverview` is a bonus if time permits, not a requirement.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `lib/facebook-ads.ts` (INSIGHTS_FIELDS, FbInsights, FbDailyInsight types, fetchFacebookInsights, buildTrendData)
- Direct codebase inspection — `lib/dal.ts` lines 572–818 (getClientFbInsights, getClientFbDailyInsights, getClientFbDailyTrendByRange patterns)
- Direct codebase inspection — `app/dashboard/page.tsx` (current home page — still uses getClientFbDailyInsights, DashboardOverview with fbDailyData/leadsEnabled props)
- Direct codebase inspection — `components/dashboard/analytics-overview.tsx` (still active, leadsEnabled-conditional Leads tab, tabs for Overview/Impressions/Clicks/Leads/BookedCalls/AdSpend)
- Direct codebase inspection — `components/dashboard/dashboard-overview.tsx` (workflowHighlights structure, heroStats, AnalyticsOverview render at line 404)
- Direct codebase inspection — `components/dashboard/fb-ads-metrics.tsx` (12-card grid pattern to extend)
- Direct codebase inspection — `components/dashboard/fb-trend-chart.tsx` (current state: no leadsEnabled prop — reverted)
- Direct codebase inspection — `app/dashboard/analytics/page.tsx` (FbAdsSection with FbTrendChart, no leadsEnabled prop passed)
- Git log analysis — commit 83f9988 revert message and --stat confirming AnalyticsOverview restoration
- Meta developer docs (WebFetch) — `purchase_roas` is `list<AdsActionStats>`, value is numeric string; same shape as `actions` field

### Secondary (MEDIUM confidence)
- Meta Ad Rules documentation — confirmed `website_purchase_roas` vs `purchase_roas` distinction
- Meta Graph API Reference v25.0 (AdsActionStats) — confirmed `value` is numeric string, default attribution window
- `.planning/phases/20-home-page-charts-bug-fixes/20-02-SUMMARY.md` — Phase 20-02 plan (built then reverted)
- `.planning/ROADMAP.md` — Implementation note on Phase 20 re-scope confirms revert happened

### Tertiary (LOW confidence)
- Meta developer community thread re: `action_values` for purchases — suggests `action_values` may not always return purchase data; daily ROAS from action_values is inherently less reliable than account-level `purchase_roas`

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools already installed, no new dependencies
- Architecture: HIGH — based on direct codebase inspection of current (post-revert) state
- ROAS API fields: MEDIUM — confirmed via official Meta developer docs that purchase_roas returns list<AdsActionStats> with numeric string values; specific action_type strings (omni_purchase vs offsite_conversion.fb_pixel_purchase) are MEDIUM confidence based on documentation + AdsActionStats reference
- Daily ROAS via action_values: LOW — action_values availability in daily breakdown depends on client's pixel configuration; not all accounts will have purchase events tracked

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable stack; Facebook API field names don't change without major version bump)
