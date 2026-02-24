# Phase 14: Enhanced Facebook Analytics & Branded Reporting - Research

**Researched:** 2026-02-24
**Domain:** Facebook Marketing API v22.0, recharts ComposedChart, jsPDF v4, jspdf-autotable v5
**Confidence:** HIGH (API structure, library APIs); MEDIUM (landing_page_views field status, quality ranking enums)

---

## Summary

Phase 14 extends the existing Facebook Ads integration (Phase 11) with six new API fields, three new DAL fetch functions, a 12-card metric grid, a 30-day dual-axis trend chart, a campaign breakdown table, a platform split section, and a branded PDF export. The codebase already has `fetchFacebookInsights`, `fetchFacebookDailyInsights`, `getActionValue`, and the 6-card `FbAdsMetrics` component fully wired up with `unstable_cache` at 6-hour TTL.

The standard approach is: (1) extend `lib/facebook-ads.ts` with new types and fetch functions for campaigns, platform breakdown, and enhanced daily data; (2) add three new DAL functions to `lib/dal.ts` following the identical `verifySession-outside-cache` pattern; (3) expand `components/dashboard/fb-ads-metrics.tsx` to a 12-card grid with quality-pill sub-components; (4) add a new `FbTrendChart` client component using `recharts` `ComposedChart`; (5) add campaign table and platform split sections; (6) upgrade `export-buttons.tsx` with a branded jsPDF header and `jspdf-autotable` for campaign table output.

**Primary recommendation:** Install `jspdf-autotable@^5` (not installed yet). All other dependencies — recharts 3.7, jspdf 4.2 — are already installed. The publisher_platform breakdown must be a **separate API call**, not merged into the main insights request.

---

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 3.7.0 | Trend chart | Already installed; ComposedChart supports Bar+Line dual-axis |
| jspdf | 4.2.0 | PDF generation | Already installed; dynamic import prevents SSR bundle |
| next | 16.1.6 | App framework | Project standard |
| prisma | 5.22.0 | DAL/DB layer | Project standard |

### Must Install
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| jspdf-autotable | ^5.0.7 | PDF table generation | NOT installed. jsPDF 4.x has no built-in table API; manual cell drawing requires 100+ lines per table. autoTable v5 supports jsPDF 4 as peer dep (`"jspdf": "^2 || ^3 || ^4"`). |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jspdf-autotable | Manual rect/text table drawing | 150+ lines of coordinate math per table — error-prone, fragile |
| recharts ComposedChart | Custom SVG chart | recharts already installed; ComposedChart is the correct component |

**Installation:**
```bash
npm install jspdf-autotable
```

---

## Architecture Patterns

### Recommended Project Structure

The phase extends existing files rather than adding new directories:

```
lib/
  facebook-ads.ts          # Extend: new types + 3 new fetch functions
  dal.ts                   # Extend: 3 new exported DAL functions

components/dashboard/
  fb-ads-metrics.tsx       # Extend: 6 -> 12 cards + quality pills
  fb-trend-chart.tsx       # NEW: recharts ComposedChart client component
  fb-campaign-table.tsx    # NEW: top 5 campaign table
  fb-platform-split.tsx    # NEW: platform breakdown display

app/dashboard/analytics/
  page.tsx                 # Extend: add new DAL calls + new sections
  export-buttons.tsx       # Extend: branded PDF + CSV with new fields
```

### Pattern 1: Extended Facebook Fetch Functions

All new functions follow the same pattern as `fetchFacebookInsights`: plain `fetch` with `cache: 'no-store'`, returning `null` or `[]` on error, never throwing.

**Campaign-level insights** — same endpoint (`/act_ID/insights`), but `level=campaign` + `sort=spend_descending` + `limit=5`:

```typescript
// Source: damiengonot.com/blog/guide-facebook-insights-api-2 + Python SDK
export interface FbCampaignInsight {
  campaign_id: string
  campaign_name: string
  spend: string
  impressions: string
  clicks: string
  reach: string
  actions?: FbAction[]
  date_start: string
  date_stop: string
}

export async function fetchFacebookCampaignInsights(
  adAccountId: string,
  datePreset: DatePreset,
  accessToken: string
): Promise<FbCampaignInsight[]> {
  const url = new URL(
    `https://graph.facebook.com/v22.0/${adAccountId}/insights`
  )
  url.searchParams.set('fields', 'campaign_id,campaign_name,spend,impressions,clicks,reach,actions')
  url.searchParams.set('date_preset', datePreset)
  url.searchParams.set('level', 'campaign')
  url.searchParams.set('sort', 'spend_descending')
  url.searchParams.set('limit', '5')
  url.searchParams.set('access_token', accessToken)

  const res = await fetch(url.toString(), { cache: 'no-store' })
  const json = await res.json()
  if (!res.ok) { console.error('[facebook-ads] campaign insights error:', json.error ?? json); return [] }
  return (json.data as FbCampaignInsight[]) ?? []
}
```

**Publisher platform breakdown** — separate request, `breakdowns=publisher_platform`, returns facebook/instagram/audience_network/messenger rows:

```typescript
// Source: damiengonot.com/blog/guide-facebook-insights-api-2
export interface FbPlatformRow {
  publisher_platform: string  // 'facebook' | 'instagram' | 'audience_network' | 'messenger'
  impressions: string
  spend: string
  clicks: string
  reach: string
  date_start: string
  date_stop: string
}

export async function fetchFacebookPlatformBreakdown(
  adAccountId: string,
  datePreset: DatePreset,
  accessToken: string
): Promise<FbPlatformRow[]> {
  const url = new URL(
    `https://graph.facebook.com/v22.0/${adAccountId}/insights`
  )
  url.searchParams.set('fields', 'publisher_platform,impressions,spend,clicks,reach')
  url.searchParams.set('date_preset', datePreset)
  url.searchParams.set('level', 'account')
  url.searchParams.set('breakdowns', 'publisher_platform')
  url.searchParams.set('access_token', accessToken)

  const res = await fetch(url.toString(), { cache: 'no-store' })
  const json = await res.json()
  if (!res.ok) { console.error('[facebook-ads] platform breakdown error:', json.error ?? json); return [] }
  return (json.data as FbPlatformRow[]) ?? []
}
```

**Enhanced daily insights** — extend existing `FbDailyInsight` type with reach and outbound_clicks fields:

```typescript
// Extend existing FbDailyInsight in lib/facebook-ads.ts
export interface FbDailyInsight {
  spend: string
  impressions: string
  clicks: string
  reach?: string           // NEW: add to daily fields string
  actions?: FbAction[]
  outbound_clicks?: FbAction[]  // NEW: list<AdsActionStats> — extract [0].value
  date_start: string
  date_stop: string
}
// Update DAILY_FIELDS const:
// 'spend,impressions,clicks,reach,actions,outbound_clicks'
```

### Pattern 2: Enhanced Main Insights Type

The existing `fetchFacebookInsights` needs new fields added. Extend `FbInsights` and `INSIGHTS_FIELDS`:

```typescript
// Additions to existing FbInsights interface
export interface FbInsights {
  // ... existing fields ...
  reach: string                      // NEW: top-level string
  frequency: string                  // NEW: top-level string
  outbound_clicks?: FbAction[]       // NEW: list<AdsActionStats>
  quality_ranking?: string           // NEW: enum string (see below)
  engagement_rate_ranking?: string   // NEW: enum string (see below)
  conversion_rate_ranking?: string   // NEW: enum string (see below)
}
// Update INSIGHTS_FIELDS:
// 'spend,impressions,clicks,ctr,cpc,cpm,actions,reach,frequency,outbound_clicks,quality_ranking,engagement_rate_ranking,conversion_rate_ranking'
```

### Pattern 3: DAL Functions for New Data

Three new DAL functions, all follow identical `verifySession-outside-cache` pattern:

```typescript
// lib/dal.ts — add after getClientFbDailyInsights
export const getClientFbCampaigns = cache(async (datePreset: DatePreset = 'last_30d') => {
  const { userId, userRole } = await verifySession()
  if (userRole !== 'CLIENT') throw new Error('Unauthorized: Client access required')

  const client = await prisma.client.findUnique({ where: { userId }, select: { id: true, adAccountId: true } })
  if (!client?.adAccountId) return []

  const settings = await prisma.settings.findFirst({ select: { facebookAccessToken: true } })
  if (!settings?.facebookAccessToken) return []

  const cachedFetch = unstable_cache(
    async () => fetchFacebookCampaignInsights(client.adAccountId!, datePreset, settings.facebookAccessToken!),
    [`fb-campaigns-${client.id}-${datePreset}`],
    { revalidate: 21600, tags: [`fb-insights-${client.id}`] }
  )
  return cachedFetch()
})

export const getClientFbPlatformBreakdown = cache(async (datePreset: DatePreset = 'last_30d') => {
  // ... same pattern, calls fetchFacebookPlatformBreakdown ...
  // cache key: `fb-platform-${client.id}-${datePreset}`
})

// getClientFbDailyTrend — replaces getClientFbDailyInsights if daily fields are extended,
// OR is a new function using the extended daily fetch
```

### Pattern 4: recharts ComposedChart with Dual Y-Axes

```typescript
// Source: recharts.github.io/en-US/api/ComposedChart + YAxis docs
'use client'
import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

// Data shape: { date: 'Jan 25', spend: 142.50, leads: 3 }
export function FbTrendChart({ data }: { data: TrendDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="spend" orientation="left" tickFormatter={(v) => `$${v}`} />
        <YAxis yAxisId="leads" orientation="right" allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Bar yAxisId="spend" dataKey="spend" fill="#2563eb" name="Spend ($)" />
        <Line yAxisId="leads" dataKey="leads" stroke="#10b981" dot={false} name="Leads" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
```

**Key recharts rules:**
- `yAxisId` on YAxis must match `yAxisId` on Bar/Line exactly (string or number, default is `0`)
- Two YAxis needed: one left (`yAxisId="spend"`), one right (`yAxisId="leads"`)
- `ResponsiveContainer` wraps ComposedChart for fluid width
- `allowDecimals={false}` on leads axis since leads are whole numbers

### Pattern 5: jsPDF Branded PDF with Table

```typescript
// Source: parallax/jsPDF docs + jspdf-autotable v5 README
// Dynamic import only — browser-only library
async function exportPdf(/* params */) {
  const { jsPDF } = await import('jspdf')
  const { autoTable } = await import('jspdf-autotable')  // NEW import
  const doc = new jsPDF()

  // 1. Branded header bar — full-width blue rectangle
  // setFillColor accepts hex string (jsPDF 4 feature)
  doc.setFillColor('#2563eb')
  doc.rect(0, 0, 210, 20, 'F')  // A4 width = 210mm

  // 2. Company name in white on blue bar
  doc.setTextColor('#ffffff')
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('BASEAIM', 10, 13)

  // 3. Report title below header
  doc.setTextColor('#000000')
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('Facebook Ads Performance Report', 10, 30)

  // 4. Metrics section (existing approach — label/value pairs)
  // ... metric rows at y=45+ ...

  // 5. Campaign table using autoTable
  autoTable(doc, {
    startY: currentY,
    head: [['Campaign', 'Spend', 'Impressions', 'Leads']],
    body: campaigns.map(c => [
      c.campaign_name,
      `$${parseFloat(c.spend).toFixed(2)}`,
      parseFloat(c.impressions).toLocaleString('en-US'),
      String(getActionValue(c.actions, 'lead') + getActionValue(c.actions, 'offsite_conversion.fb_pixel_lead'))
    ]),
    headStyles: { fillColor: '#2563eb', textColor: '#ffffff', fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    margin: { left: 10, right: 10 },
  })

  // 6. Platform split table
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Platform', 'Impressions', 'Spend', 'Clicks']],
    body: platforms.map(p => [...]),
    headStyles: { fillColor: '#2563eb', textColor: '#ffffff' },
  })

  doc.save(`baseaim-fb-report-${dateRange}-${new Date().toISOString().slice(0, 10)}.pdf`)
}
```

**Critical jspdf-autotable v5 note:** `autoTable` is a named export function, not a method on the doc instance. Pass doc as first arg. After table renders, next table's `startY` should be `(doc as any).lastAutoTable.finalY + spacing`.

### Pattern 6: Quality Score Pills

Quality ranking fields are top-level strings on the `FbInsights` object. Map enum to pill color:

```typescript
const RANKING_COLORS: Record<string, string> = {
  ABOVE_AVERAGE: 'bg-emerald-100 text-emerald-800',
  AVERAGE: 'bg-amber-100 text-amber-800',
  BELOW_AVERAGE_35: 'bg-red-100 text-red-800',
  BELOW_AVERAGE_20: 'bg-red-100 text-red-800',
  BELOW_AVERAGE_10: 'bg-red-200 text-red-900',
  UNKNOWN: 'bg-neutral-100 text-neutral-600',
}

function QualityPill({ label, value }: { label: string; value?: string }) {
  if (!value || value === 'UNKNOWN') return null
  const colorClass = RANKING_COLORS[value] ?? 'bg-neutral-100 text-neutral-500'
  const displayLabel = value.startsWith('ABOVE') ? 'Above Avg'
    : value === 'AVERAGE' ? 'Average'
    : 'Below Avg'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}: {displayLabel}
    </span>
  )
}
```

### Anti-Patterns to Avoid

- **Merging breakdown with actions in one request:** The publisher_platform breakdown cannot be combined with the actions action breakdown in a single request. Always make platform breakdown a separate fetch.
- **Calling quality_ranking at level=account without 500+ impressions:** These fields return `UNKNOWN` when ad has fewer than 500 impressions. Handle `UNKNOWN` gracefully (hide pill or show "–").
- **Requesting quality_ranking at campaign/adset level:** These three ranking fields only apply at the **ad level** in Facebook's system. When requested at account level, the API returns a single value representing the best-performing ad. This is acceptable for dashboard display but should be documented.
- **Requesting landing_page_views as a top-level field:** It is NOT a top-level field in `FbInsights`. It exists as an action type in the `actions` array (action_type = `'landing_page_view'`). Use `getActionValue(actions, 'landing_page_view')` same as leads.
- **Forgetting `parseFloat()` on reach and frequency:** All numeric values from FB API are strings. Reach and frequency are no exception.
- **Building manual jsPDF tables without autoTable:** Requires tracking Y position, column widths, page overflow manually. 150+ lines for a 4-column table.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF table rendering | Manual rect+text grid | jspdf-autotable v5 | Column width math, page breaks, header repetition are handled automatically |
| Dual-axis chart | Custom SVG or canvas | recharts ComposedChart | Already installed; dual YAxis via `yAxisId` prop is built-in |
| Quality pill color logic | Complex if/else chains | Simple `Record<string, string>` map | The five enum values are fixed; map covers all cases |
| Campaign sort by spend | Client-side sort of all campaigns | `sort=spend_descending&limit=5` in API request | Server-side sort avoids fetching all campaigns |

**Key insight:** The Facebook Insights API does the heavy lifting for sorting (spend_descending) and limiting (limit=5). Push aggregation to the API, not client code.

---

## Common Pitfalls

### Pitfall 1: outbound_clicks is a List, Not a Top-Level String

**What goes wrong:** Including `outbound_clicks` in the fields string and then doing `parseFloat(insights.outbound_clicks)` fails at runtime because it returns a `list<AdsActionStats>` array, not a string.

**Why it happens:** The Python SDK types it as `list<AdsActionStats>` — same structure as the `actions` array but returned as a named top-level field with its own array.

**How to avoid:** Treat `outbound_clicks` like `actions`: it returns `[{ action_type: 'link_click', value: '42' }]` where `action_type` will be `'link_click'` for standard outbound clicks. Sum all entries' values, or use `outbound_clicks?.[0]?.value`.

**Pattern:**
```typescript
// In FbInsights interface:
outbound_clicks?: FbAction[]  // NOT string

// In display code:
const outboundClicks = insights.outbound_clicks
  ? insights.outbound_clicks.reduce((sum, a) => sum + parseFloat(a.value), 0)
  : 0
```

### Pitfall 2: landing_page_views Is an Action Type, Not a Top-Level Field

**What goes wrong:** Adding `landing_page_views` to `INSIGHTS_FIELDS` causes an API error or returns null/zero data. The field does not exist as a top-level field in the Insights API.

**Why it happens:** Landing page views are tracked by the Facebook Pixel and surfaced as an action type in the `actions` array, not as a standalone metric.

**How to avoid:** Use `getActionValue(insights.actions, 'landing_page_view')`. Note: requires Pixel to be installed on client's landing page. Returns 0 if no pixel. Document this limitation in the UI.

**Warning signs:** API returns 0 or null for LPV even when client has active campaigns — likely no pixel installed.

### Pitfall 3: Quality Rankings Return UNKNOWN Before 500 Impressions

**What goes wrong:** New ads or short date ranges show `UNKNOWN` for all three ranking fields, causing pills to render confusingly.

**Why it happens:** Facebook requires 500+ impressions before assigning rankings.

**How to avoid:** Hide quality pills entirely when value is `UNKNOWN` or `undefined`. The `QualityPill` component should return `null` for these cases.

### Pitfall 4: Publisher Platform Breakdown Cannot Combine with Action Breakdowns

**What goes wrong:** Adding `breakdowns=publisher_platform` to a request that also includes `breakdowns=action_type` causes a Facebook API error (code 100: "Cannot mix standard breakdowns...").

**Why it happens:** Facebook prohibits combining publisher_platform with action breakdowns in a single request.

**How to avoid:** Make platform breakdown its own separate `fetchFacebookPlatformBreakdown` function. Do not merge it into the main insights request. Three separate API calls: (1) main insights, (2) campaigns, (3) platform breakdown — each gets its own `unstable_cache` entry.

### Pitfall 5: jspdf-autotable lastAutoTable Cast

**What goes wrong:** TypeScript error on `doc.lastAutoTable.finalY` — not in jsPDF type definitions.

**Why it happens:** `autoTable` adds this property dynamically to the doc instance after render.

**How to avoid:** Cast: `(doc as any).lastAutoTable.finalY`. Alternative: capture return value — `autoTable` returns the table options including `finalY` in v5.

### Pitfall 6: reach Field Not Available with Some Breakdowns (June 2025 API Change)

**What goes wrong:** `reach` returns null when combined with certain breakdown dimensions and date ranges exceeding 13 months.

**Why it happens:** Meta restricted reach data in a June 2025 API update. Reach is only reliably available in account-level queries without breakdowns, for date ranges within 13 months.

**How to avoid:** Request `reach` only in the main account-level insights call (no breakdowns). Do NOT include `reach` in the platform breakdown request. For the campaign-level request, `reach` is acceptable since it's not using action breakdowns, but treat it as optional.

### Pitfall 7: verifySession Must Stay Outside unstable_cache

**What goes wrong:** Moving `verifySession()` inside the `unstable_cache` callback causes a Next.js error: "cookies() cannot be called within unstable_cache."

**Why it happens:** `unstable_cache` runs in a context without access to request-scoped cookies/headers.

**How to avoid:** The existing pattern in `getClientFbInsights` is correct — `verifySession()` at the top of the outer function, before `unstable_cache` is created. All three new DAL functions must follow this exact pattern.

---

## Code Examples

### New Fields Request URL Example

```typescript
// Source: Python SDK adsinsights.py field names + damiengonot.com guide
const INSIGHTS_FIELDS = [
  'spend', 'impressions', 'clicks', 'ctr', 'cpc', 'cpm',
  'actions',
  'reach',                    // new — top-level string
  'frequency',                // new — top-level string
  'outbound_clicks',          // new — list<AdsActionStats>
  'quality_ranking',          // new — string enum (ad-level metric, account-level query returns "best ad" value)
  'engagement_rate_ranking',  // new — string enum
  'conversion_rate_ranking',  // new — string enum
].join(',')
```

### Deriving Leads from Actions

```typescript
// Source: existing lib/facebook-ads.ts getActionValue pattern — Phase 11 decision
function getLeads(actions?: FbAction[]): number {
  return (
    getActionValue(actions, 'lead') +
    getActionValue(actions, 'offsite_conversion.fb_pixel_lead')
  )
}

function getCpl(spend: string, actions?: FbAction[]): number | null {
  const leads = getLeads(actions)
  if (leads === 0) return null  // show "–" not divide-by-zero
  return parseFloat(spend) / leads
}
```

### Recharts Dual-Axis Data Preparation

```typescript
// Transform FbDailyInsight[] into chart-ready array
function buildTrendData(daily: FbDailyInsight[]): TrendDataPoint[] {
  return daily.map((d) => ({
    date: new Date(d.date_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    spend: parseFloat(d.spend),
    leads: getLeads(d.actions),
  }))
}
```

### jspdf-autotable Dynamic Import Pattern

```typescript
// Source: jspdf-autotable v5 README — named export, not method on doc
async function exportPdf(/* ... */) {
  const { jsPDF } = await import('jspdf')
  const { autoTable } = await import('jspdf-autotable')  // separate dynamic import
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // Draw header bar
  doc.setFillColor('#2563eb')
  doc.rect(0, 0, 210, 22, 'F')
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor('#ffffff')
  doc.text('BASEAIM', 10, 15)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Facebook Ads Performance Report', 60, 15)

  // Restore black text for body
  doc.setTextColor('#000000')
  // ... metrics section ...

  // Campaign table
  autoTable(doc, {
    startY: 80,
    head: [['Campaign', 'Spend', 'Impressions', 'Leads', 'CPL']],
    body: campaignRows,
    headStyles: {
      fillColor: '#2563eb',
      textColor: 255,        // 255 = white in grayscale shorthand
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: '#f8fafc' },
    margin: { left: 10, right: 10 },
  })

  const afterCampaigns = (doc as any).lastAutoTable.finalY + 8

  // Platform split table
  autoTable(doc, {
    startY: afterCampaigns,
    head: [['Platform', 'Spend', 'Impressions', 'Clicks']],
    body: platformRows,
    headStyles: { fillColor: '#2563eb', textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 10, right: 10 },
  })

  doc.save(`baseaim-fb-report-${dateRange}-${date}.pdf`)
}
```

### CSV Export with New Fields

```typescript
// Extend existing exportCsv to include new fields
const rows = [
  ['Metric', 'Value'],
  // ... existing 6 rows ...
  ['Reach', parseFloat(insights.reach ?? '0').toLocaleString('en-US')],
  ['Frequency', parseFloat(insights.frequency ?? '0').toFixed(2)],
  ['Leads', String(getLeads(insights.actions))],
  ['Cost Per Lead', getCpl(insights.spend, insights.actions) ? `$${getCpl(insights.spend, insights.actions)!.toFixed(2)}` : '–'],
  ['Outbound Clicks', String(outboundClicks)],
  ['Landing Page Views', String(getActionValue(insights.actions, 'landing_page_view'))],
  // Quality pills as text
  ['Quality Ranking', insights.quality_ranking ?? 'N/A'],
  ['Engagement Rate Ranking', insights.engagement_rate_ranking ?? 'N/A'],
  ['Conversion Rate Ranking', insights.conversion_rate_ranking ?? 'N/A'],
]
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Facebook Relevance Score (1-10) | quality_ranking / engagement_rate_ranking / conversion_rate_ranking enum strings | 2019 | Three separate signals replace one score |
| jspdf-autotable as doc.autoTable() method | Named export `autoTable(doc, opts)` | v5 (Jan 2026) | Must import separately — existing Phase 11 code only has `jspdf`, not `jspdf-autotable` |
| 7d_view and 28d_view attribution windows | Removed from API | Jan 12, 2026 | No impact for this phase — not requesting these attribution windows |
| Reach with all breakdowns | Reach restricted with breakdowns (13-month limit) | Jun 2025 | Do NOT request reach in platform breakdown call |

**Deprecated/outdated:**
- Facebook Relevance Score (1-10 numeric) — replaced by three enum ranking fields. Any old tutorial showing `relevance_score` is outdated.
- `doc.autoTable()` method pattern — v5 uses function import `import { autoTable } from 'jspdf-autotable'`

---

## Open Questions

1. **Quality ranking at account level vs ad level**
   - What we know: Facebook docs state rankings apply at the ad level only; requesting at account level may return the value for the top-performing ad, or an aggregated/single value.
   - What's unclear: Exact behavior when account has 20 ads — does it aggregate, pick best, or error?
   - Recommendation: Request at account level (same as current setup), display result as-is, add tooltip explaining "based on top ad." If the field returns blank/UNKNOWN in practice, hide the pills gracefully.

2. **landing_page_view action_type string exactness**
   - What we know: The field is action-based, not top-level. The action_type string is believed to be `'landing_page_view'` (singular, no underscore variant).
   - What's unclear: Could not verify exact string from official docs (developers.facebook.com was inaccessible during research).
   - Recommendation: Use `'landing_page_view'` (singular). Log the full actions array in dev mode to verify the exact string value on first real API call. Fallback to 0 if not found.

3. **Platform breakdown + reach restriction (Jun 2025)**
   - What we know: Post-June 2025, reach cannot be requested with breakdowns for queries beyond 13 months.
   - What's unclear: Whether `last_30d` preset (well within 13 months) is also affected.
   - Recommendation: Omit `reach` from the platform breakdown request. Show only spend, impressions, clicks per platform. This avoids the restriction entirely.

---

## Sources

### Primary (HIGH confidence)
- `facebook-python-business-sdk/adsinsights.py` (GitHub) — Field types for reach (string), frequency (string), outbound_clicks (list<AdsActionStats>), quality_ranking (string), engagement_rate_ranking (string), conversion_rate_ranking (string)
- `recharts.github.io/en-US/api/YAxis` — yAxisId prop = `0` default, orientation prop, how to link Bar/Line to YAxis
- `recharts.github.io/en-US/api/ComposedChart` — Child components: Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend
- `jspdf-autotable v5 README` (GitHub simonbengtsson/jsPDF-AutoTable/tree/v4) — Named export `autoTable(doc, opts)`, compatible with jsPDF ^4
- `artskydj.github.io/jsPDF/docs` — `setFillColor`, `rect`, `setTextColor`, `text`, `setFont`, `setFontSize` signatures
- Installed node_modules: jspdf@4.2.0 (confirmed), jspdf-autotable NOT installed, recharts@3.7.0 (confirmed)

### Secondary (MEDIUM confidence)
- `damiengonot.com/blog/guide-facebook-insights-api-2` — publisher_platform returns 4 values (facebook, instagram, audience_network, messenger); level=campaign + sort=spend_descending endpoint stays at /act_ID/insights; time_increment=1 returns daily rows; limit=25 default, can set limit parameter
- `catchr.io/metrics/facebook-ads-metrics` — quality_ranking enum values: BELOW_AVERAGE_10, BELOW_AVERAGE_20, BELOW_AVERAGE_35, AVERAGE, ABOVE_AVERAGE, UNKNOWN (verified against multiple marketing sources)
- `jsdocs.io/package/jspdf-autotable` — Options: head, body, headStyles, bodyStyles, startY, margin, theme, alternateRowStyles; v5.0.7 (Jan 2026) peer dep `"jspdf": "^2 || ^3 || ^4"`
- `windsor.ai` API update note — June 2025: reach restricted with breakdowns beyond 13 months; Jan 2026: 7d_view/28d_view attribution windows removed

### Tertiary (LOW confidence)
- Multiple marketing blog posts (Sprinklr, Databox, LeadEnforce) — confirmed ABOVE_AVERAGE / AVERAGE / BELOW_AVERAGE_* enum tier descriptions
- WebSearch summary: `landing_page_view` is the action_type string — could not verify against official Meta docs (site blocked)
- WebSearch: outbound_clicks list<AdsActionStats> parsed via `.reduce()` on array `.value` fields — confirmed by SDK typing

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — installed versions confirmed from node_modules
- FB API field types (reach, frequency, quality_ranking as strings): HIGH — verified from Python SDK source
- outbound_clicks as list<AdsActionStats>: HIGH — verified from Python SDK source
- landing_page_view action_type string: MEDIUM — could not access official docs, inferred from multiple sources
- Quality ranking enum values: MEDIUM — confirmed by multiple marketing sources, not from official API docs
- Architecture patterns (level=campaign, publisher_platform breakdown, time_increment=1): HIGH — verified from guide-facebook-insights-api-2
- recharts ComposedChart dual YAxis: HIGH — from official recharts API docs
- jspdf-autotable v5 API: HIGH — from official GitHub README
- jspdf setFillColor/rect: HIGH — from official jsPDF docs

**Research date:** 2026-02-24
**Valid until:** 2026-03-24 (30 days — stable APIs, no fast-moving changes expected)
