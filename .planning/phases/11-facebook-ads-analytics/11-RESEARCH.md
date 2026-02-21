# Phase 11: Facebook Ads Analytics - Research

**Researched:** 2026-02-21
**Domain:** Facebook Marketing API (Insights endpoint), Next.js 16 caching, CSV/PDF export
**Confidence:** HIGH for API fields and caching; MEDIUM for SDK choice; HIGH for codebase patterns

---

## Summary

This phase replaces mock ad analytics data on the client dashboard with real Facebook Ads data fetched via the Facebook Marketing API Insights endpoint. BaseAim's agency model (clients grant Business Manager access) means a System User token is sufficient — no Advanced Access / app review needed.

The standard approach is: store a single System User token in environment variables, store per-client `adAccountId` on the `Client` model (same pattern as `driveFolderId`), fetch from `graph.facebook.com/v22.0/act_{adAccountId}/insights` with plain `fetch()` (no SDK needed), and cache results for 6 hours using Next.js `unstable_cache` (keeping `use cache` as an upgrade path).

The existing `analytics-overview.tsx` component already has the chart infrastructure (Recharts LineChart). The existing analytics page at `/dashboard/analytics` needs to be refactored to use real Facebook data instead of mock data in `dashboard-overview.tsx`.

**Primary recommendation:** Use plain `fetch()` to `graph.facebook.com` (not the SDK), cache with `unstable_cache` at `revalidate: 21600`, store one System User token as env var, store `adAccountId` per client in the DB, add `facebookAccessToken` field to the Settings model.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Facebook Marketing API | v22.0 | Ad metrics endpoint | Current supported version (v24+ released Oct 2025, v22 still valid) |
| Native `fetch()` | built-in Node.js | HTTP requests to graph.facebook.com | No SDK needed for simple read-only insights; avoids bundle complexity |
| `unstable_cache` | next/cache (built-in) | 6-hour caching of FB API responses | Simple, works with existing DAL pattern; no additional packages |
| Recharts | 3.7.0 (already installed) | Time-series charts | Already in use in analytics-overview.tsx |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `facebook-nodejs-business-sdk` | 22.0.x | Official Meta Node.js SDK | NOT recommended here — plain fetch is simpler for read-only insights |
| `jspdf` or `@react-pdf/renderer` | latest | PDF generation | For PDF export (FBADS-03); client-side jsPDF is simplest |
| Native Blob + anchor | browser built-in | CSV export | No package needed for CSV download |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain `fetch()` | `facebook-nodejs-business-sdk` v22.x | SDK adds complexity, requires `serverExternalPackages`, plain fetch is sufficient for one endpoint |
| `unstable_cache` | `'use cache'` directive (Next.js 16 new API) | `use cache` requires `cacheComponents: true` in next.config + is still experimental; `unstable_cache` is stable and works today |
| Client-side CSV | `react-csv` npm package | No package needed; 10-line native Blob approach works fine |

**Installation (if SDK path chosen — not recommended):**
```bash
npm install facebook-nodejs-business-sdk
```

**No new packages required** for the recommended approach (plain fetch + unstable_cache + native CSV).

For PDF export:
```bash
npm install jspdf
```

---

## Architecture Patterns

### Recommended Project Structure
```
lib/
├── facebook-ads.ts          # fetchFacebookInsights() — plain fetch wrapper
app/
├── dashboard/
│   └── analytics/
│       └── page.tsx         # Server component — replaces mock data with real FB data
│       └── export-buttons.tsx  # Client component — CSV and PDF export triggers
components/
├── dashboard/
│   └── analytics-overview.tsx  # Existing — receives real data instead of mock
│   └── fb-ads-metrics.tsx      # New — 6 metric cards (spend, impressions, clicks, CTR, CPC, CPM)
prisma/
└── schema.prisma            # Add adAccountId to Client, facebookAccessToken to Settings
app/
├── admin/
│   └── settings/
│       └── page.tsx         # Add Facebook token field (same pattern as chat settings)
│       └── chat-settings-form.tsx  # Extend with facebookAccessToken field
│       └── actions.ts       # Extend updateChatSettings to include facebookAccessToken
│   └── clients/[clientId]/
│       └── edit/page.tsx    # Already exists — add adAccountId field to ClientForm
```

### Pattern 1: Facebook Insights Fetch Function
**What:** Plain `fetch()` wrapper around the Graph API Insights endpoint, called from server components/DAL
**When to use:** Anywhere Facebook ad data is needed

```typescript
// lib/facebook-ads.ts
// Source: graph.facebook.com documentation + verified field names

export interface FbInsights {
  spend: string        // e.g. "1234.56"
  impressions: string  // e.g. "45000"
  clicks: string       // e.g. "1200"
  ctr: string          // e.g. "2.666667"  (percentage, NOT decimal)
  cpc: string          // e.g. "1.028600"
  cpm: string          // e.g. "27.434111"
  date_start: string
  date_stop: string
}

type DatePreset = 'last_7d' | 'last_30d' | 'maximum'

export async function fetchFacebookInsights(
  adAccountId: string,  // e.g. "act_123456789"
  datePreset: DatePreset,
  accessToken: string
): Promise<FbInsights | null> {
  const fields = 'spend,impressions,clicks,ctr,cpc,cpm'
  const apiVersion = 'v22.0'
  const url = `https://graph.facebook.com/${apiVersion}/${adAccountId}/insights?fields=${fields}&date_preset=${datePreset}&access_token=${accessToken}&level=account`

  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    // Handle token expired (error code 190) or invalid ad account (code 100)
    const error = await res.json()
    console.error('Facebook API error:', error)
    return null
  }

  const json = await res.json()
  // data is an array; aggregate or take first item
  return json.data?.[0] ?? null
}
```

### Pattern 2: DAL Function with unstable_cache
**What:** Cached DAL function that fetches FB insights with 6-hour TTL
**When to use:** Server components rendering the analytics page

```typescript
// In lib/dal.ts (or separate lib/dal/facebook-ads.ts)
// Source: Next.js docs (unstable_cache, verified 2026-02-20)

import { unstable_cache } from 'next/cache'
import { cache } from 'react'
import { fetchFacebookInsights } from '@/lib/facebook-ads'

type DatePreset = 'last_7d' | 'last_30d' | 'maximum'

export const getClientFbInsights = cache(async (datePreset: DatePreset = 'last_30d') => {
  const { userId, userRole } = await verifySession()
  if (userRole !== 'CLIENT') throw new Error('Unauthorized')

  // Get client's adAccountId from DB
  const client = await prisma.client.findUnique({
    where: { userId },
    select: { id: true, adAccountId: true },
  })

  if (!client?.adAccountId) return null  // Not configured yet

  // Get global System User token from Settings
  const settings = await prisma.settings.findFirst({
    select: { facebookAccessToken: true },
  })

  if (!settings?.facebookAccessToken) return null

  // Cache per (clientId, datePreset) for 6 hours
  const getCached = unstable_cache(
    () => fetchFacebookInsights(client.adAccountId!, datePreset, settings.facebookAccessToken!),
    [`fb-insights-${client.id}-${datePreset}`],
    { revalidate: 21600, tags: [`fb-insights-${client.id}`] }
  )

  return getCached()
})
```

**Key constraint:** `unstable_cache` cannot call `headers()` or `cookies()` inside it — session verification must happen OUTSIDE the cache boundary. The DAL pattern correctly reads auth first, then passes client ID as cache key parameter.

### Pattern 3: Date Range Switching (Client Component)
**What:** URL search param approach to switch date ranges without full page reload
**When to use:** The date range selector (7d / 30d / all-time)

```typescript
// app/dashboard/analytics/page.tsx
// searchParams drive the date preset

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const { range } = await searchParams
  const datePreset = range === '7d' ? 'last_7d'
    : range === 'all' ? 'maximum'
    : 'last_30d'  // default

  const insights = await getClientFbInsights(datePreset)
  // ...
}
```

The client component uses `router.push` or `<Link href="?range=7d">` to trigger server re-fetch with different params. The cache key includes `datePreset`, so each range has its own 6-hour cache.

### Pattern 4: Admin adAccountId Configuration
**What:** Add `adAccountId` field to Client model and ClientForm — same pattern as `driveFolderId`
**When to use:** Admin client edit page

```typescript
// prisma/schema.prisma — add to Client model
adAccountId  String?   // Facebook Ad Account ID, e.g. "act_123456789"

// lib/schemas/client.ts — add to updateClientSchema
adAccountId: z.string().regex(/^act_\d+$/, 'Must be in format act_XXXXXXXXX').optional().or(z.literal('')),

// app/admin/actions.ts — add to rawData extraction in updateClient
adAccountId: formData.get('adAccountId') || undefined,

// app/admin/clients/[clientId]/edit/page.tsx — add to defaultValues
adAccountId: client.adAccountId || undefined,
```

### Pattern 5: System User Token in Settings
**What:** Store the global Facebook System User token in the Settings singleton (same DB record as chat settings)
**When to use:** Admin settings page

```typescript
// prisma/schema.prisma — add to Settings model
facebookAccessToken  String?   // Meta Business Manager System User token

// lib/schemas/settings.ts — new fbSettingsSchema (separate form section)
export const fbSettingsSchema = z.object({
  facebookAccessToken: z.string().min(10, 'Access token required').optional().or(z.literal('')),
})

// app/admin/settings/actions.ts — new updateFbSettings action
// follows same pattern as updateChatSettings
```

### Pattern 6: CSV Export (Client-Side)
**What:** Convert data array to CSV and trigger browser download
**When to use:** "Export CSV" button on analytics page

```typescript
// components/dashboard/export-buttons.tsx — "use client"
function exportCsv(insights: FbInsights, dateRange: string) {
  const rows = [
    ['Metric', 'Value'],
    ['Ad Spend', `$${parseFloat(insights.spend).toFixed(2)}`],
    ['Impressions', insights.impressions],
    ['Clicks', insights.clicks],
    ['CTR', `${parseFloat(insights.ctr).toFixed(2)}%`],
    ['CPC', `$${parseFloat(insights.cpc).toFixed(2)}`],
    ['CPM', `$${parseFloat(insights.cpm).toFixed(2)}`],
  ]

  const csv = rows.map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `facebook-ads-${dateRange}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
```

### Anti-Patterns to Avoid
- **Calling Facebook API in client components:** All API calls must be server-side. Never expose the access token to the browser.
- **Fetching without cache:** Each page render would hit the FB API — use `unstable_cache` always.
- **Storing token in `.env.local` only:** Also store in the Settings DB so admin can rotate it via UI without redeployment.
- **Not prefixing adAccountId with `act_`:** The Graph API requires the `act_` prefix. Validate format in Zod schema.
- **Using `headers()` or `cookies()` inside `unstable_cache`:** These are dynamic and cannot be cached. Call `verifySession()` before entering the cache scope.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 6-hour cache invalidation | Custom timestamp comparison in DB | `unstable_cache` with `revalidate: 21600` | Built-in, works across serverless instances |
| Date range math | Custom date arithmetic | Facebook `date_preset` parameter | API handles it natively (last_7d, last_30d, maximum) |
| Metric aggregation | Client-side summing across calls | Single API call with `level=account` | One call at account level returns aggregate totals |
| Per-client caching | Separate cache stores per client | Cache key includes clientId (`fb-insights-${clientId}-${preset}`) | Single `unstable_cache` call, keys differentiate clients |
| Token rotation | Cron job to refresh token | System User token never expires | No token rotation needed for System User tokens |

**Key insight:** The Facebook Insights API handles all the hard math (CTR, CPC, CPM). These are returned as pre-computed fields — never calculate them manually from raw data.

---

## Common Pitfalls

### Pitfall 1: Token Expiry Confusion
**What goes wrong:** Using a regular user access token (60-day expiry) instead of a System User token — the system breaks after 60 days.
**Why it happens:** Developers generate a token from Graph API Explorer (user token) instead of from Business Manager System User.
**How to avoid:** Generate token ONLY from Business Manager > Users > System Users > Generate Token. System User tokens have no expiry.
**Warning signs:** API error code 190 ("Invalid OAuth access token") appearing unexpectedly.

### Pitfall 2: adAccountId Format Errors
**What goes wrong:** Storing `123456789` in DB but Graph API requires `act_123456789`.
**Why it happens:** The ad account ID without prefix is what appears in Ads Manager URL.
**How to avoid:** Validate with Zod regex `/^act_\d+$/`. If admin enters without prefix, auto-prepend `act_` in the action handler.
**Warning signs:** API error code 100 ("Invalid parameter") or 200 ("Permissions error").

### Pitfall 3: Serverless Cache Not Persisting
**What goes wrong:** `unstable_cache` entries not surviving across requests in serverless/Vercel deployment.
**Why it happens:** Serverless functions can spin up new instances — in-memory cache is lost. Next.js Data Cache (used by `unstable_cache`) IS persisted on filesystem in Vercel, but only when using Node.js runtime (not edge).
**How to avoid:** Ensure analytics page uses default Node.js runtime (not `export const runtime = 'edge'`). The Data Cache persists on Vercel with Node.js runtime.
**Warning signs:** API calls on every request despite cache configuration.

### Pitfall 4: Rate Limiting From Dev/Testing
**What goes wrong:** Repeatedly hitting Facebook API during development causes rate limit errors.
**Why it happens:** Dev server restarts + HMR bypass cache; each re-render triggers a fresh API call.
**How to avoid:** In development, use mock data as fallback when `FACEBOOK_ACCESS_TOKEN` is not set. The `getClientFbInsights` function should return `null` gracefully when token is absent, and the page should show a "not configured" state.
**Warning signs:** Error code 613 ("Calls to this API have exceeded the rate limit").

### Pitfall 5: `use cache` Complexity (New Next.js API)
**What goes wrong:** Attempting to use the new `'use cache'` directive without understanding constraints — builds hang because `cookies()` was called inside the cache scope.
**Why it happens:** `'use cache'` requires `cacheComponents: true` flag and has strict constraints about dynamic data access.
**How to avoid:** Use `unstable_cache` instead — it is stable, well-understood, and the existing codebase has no `cacheComponents` flag enabled. Reserve `'use cache'` for future refactor if needed.
**Warning signs:** Build timeout errors ("Filling a cache during prerender timed out").

### Pitfall 6: "All Time" Returns Empty for New Accounts
**What goes wrong:** `date_preset=maximum` returns no data if ad account has no lifetime spend.
**Why it happens:** Facebook returns empty `data` array, not an error, when no data exists for the range.
**How to avoid:** Handle `json.data?.[0] ?? null` — return null and display "No data for this period" instead of throwing.

---

## Code Examples

### Complete Facebook Insights Fetch (Verified Fields)
```typescript
// Source: Facebook Graph API — field names verified via multiple sources
// API version v22.0 is current (v24.0 released Oct 2025, v22 still valid as of Feb 2026)

const GRAPH_API_VERSION = 'v22.0'
const INSIGHTS_FIELDS = 'spend,impressions,clicks,ctr,cpc,cpm'

// Date preset mapping for requirements FBADS-02
const DATE_PRESETS = {
  '7d': 'last_7d',
  '30d': 'last_30d',
  'all': 'maximum',  // "lifetime" also works; "maximum" is equivalent
} as const

// Example request:
// GET https://graph.facebook.com/v22.0/act_123456789/insights
//   ?fields=spend,impressions,clicks,ctr,cpc,cpm
//   &date_preset=last_30d
//   &level=account
//   &access_token=EAABxx...

// Example response:
// {
//   "data": [{
//     "spend": "1234.56",
//     "impressions": "45000",
//     "clicks": "1200",
//     "ctr": "2.666667",   <- percentage value, e.g. 2.67%
//     "cpc": "1.028800",   <- dollars per click
//     "cpm": "27.434111",  <- dollars per 1000 impressions
//     "date_start": "2026-01-22",
//     "date_stop": "2026-02-21"
//   }],
//   "paging": { ... }
// }

// All numeric values are STRINGS in the API response — always parseFloat()
```

### unstable_cache for 6-Hour FB Data Caching
```typescript
// Source: Next.js docs (unstable_cache API, verified 2026-02-20, version 16.1.6)
// revalidate: 21600 = 6 hours × 60 min × 60 sec

import { unstable_cache } from 'next/cache'

const cachedFetch = unstable_cache(
  async (adAccountId: string, datePreset: string, accessToken: string) => {
    return fetchFacebookInsights(adAccountId, datePreset, accessToken)
  },
  // cache key array — must be unique per client + date range
  ['fb-insights'],  // base key; actual key is derived from args too
  {
    revalidate: 21600,  // 6 hours
    tags: ['facebook-insights'],  // for manual invalidation if needed
  }
)
```

### Admin Settings Pattern — Adding Facebook Token Field
```typescript
// Follows exact same pattern as existing chat-settings-form.tsx
// Source: existing codebase pattern (app/admin/settings/)

// 1. Extend Settings model in schema.prisma
model Settings {
  // ... existing fields
  facebookAccessToken  String?
}

// 2. Add to settings schema (lib/schemas/settings.ts)
export const fbSettingsSchema = z.object({
  facebookAccessToken: z.string().optional().or(z.literal('')),
})

// 3. New server action (app/admin/settings/actions.ts)
export async function updateFbSettings(formData: FormData) {
  const { userRole } = await verifySession()
  if (userRole !== 'ADMIN') return { error: 'Unauthorized' }
  // ... upsert pattern same as updateChatSettings
}
```

### Admin Client Form — Adding adAccountId Field
```typescript
// Pattern: identical to how driveFolderId would be edited
// Source: existing codebase pattern (app/admin/clients/[clientId]/edit/)

// updateClientSchema addition (lib/schemas/client.ts)
adAccountId: z.string()
  .regex(/^act_\d+$/, 'Format: act_XXXXXXXXX')
  .optional()
  .or(z.literal('')),

// ClientForm new field (components/admin/client-form.tsx)
<div>
  <Label htmlFor="adAccountId">Facebook Ad Account ID</Label>
  <Input
    id="adAccountId"
    placeholder="act_123456789"
    {...register('adAccountId')}
    className="mt-1"
  />
  <p className="text-sm text-neutral-500 mt-1">
    Found in Meta Ads Manager URL or Business Settings
  </p>
</div>

// app/admin/actions.ts updateClient() rawData addition
adAccountId: formData.get('adAccountId') || undefined,
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `unstable_cache` | `'use cache'` directive + `cacheLife()` | Next.js v16.0.0 (stable flag) | `unstable_cache` still works; `use cache` requires opt-in flag |
| API version v17-v19 | v22.0 (current), v24.0 (latest) | v22 released ~Q1 2025 | Use v22.0; v17-v19 examples in older docs/blogs still have correct field names |
| SDK for all operations | Plain fetch for read-only | Ongoing | SDK overkill for single-endpoint read-only use case |
| User access tokens (60d) | System User tokens (no expiry) | Existing best practice | Agency use case — system user is the right model |

**Deprecated/outdated:**
- API v17-v20 blog examples: Field names (`spend`, `impressions`, `clicks`, `ctr`, `cpc`, `cpm`) remain the same — just update the version to `v22.0`.
- Long-lived user access tokens (60-day): Do not use. System User tokens are permanent.
- `experimental_cache` references: Was renamed to `unstable_cache` in Next.js 14.

---

## Open Questions

1. **`use cache` vs `unstable_cache` — which to adopt**
   - What we know: `unstable_cache` is stable and works today. `'use cache'` is the future but requires `cacheComponents: true` in `next.config.ts` and has stricter constraints.
   - What's unclear: Whether the project will enable `cacheComponents` generally (it affects all caching behavior).
   - Recommendation: Use `unstable_cache` for this phase. Note `'use cache'` as a future upgrade path.

2. **Campaign-level vs Account-level data**
   - What we know: The requirements (FBADS-01) ask for 6 aggregate metrics — account level (`level=account`) returns these as single aggregated values for the whole account. Campaign level (`level=campaign`) returns per-campaign rows.
   - What's unclear: Whether the client wants totals across all campaigns or per-campaign breakdown.
   - Recommendation: Use `level=account` for aggregate totals matching the 6 required metrics. If per-campaign breakdown is needed, that's scope expansion.

3. **PDF export complexity**
   - What we know: jsPDF works client-side but requires an additional package. `@react-pdf/renderer` is more powerful but heavier.
   - What's unclear: What format/layout is expected for the PDF report.
   - Recommendation: Use jsPDF for a simple table-format PDF. If rich layout is needed, revisit.

4. **Multiple clients — single token**
   - What we know: One System User token in Settings covers ALL clients, as long as the System User has been granted access to each client's ad account in Business Manager.
   - What's unclear: Whether each client's ad account has already been added to BaseAim's Business Manager (operational setup, not code).
   - Recommendation: Document in admin UI that the System User must have access to each ad account before the `adAccountId` is configured per-client.

---

## Sources

### Primary (HIGH confidence)
- Next.js docs (unstable_cache, v16.1.6, fetched 2026-02-20): https://nextjs.org/docs/app/api-reference/functions/unstable_cache
- Next.js docs (use cache directive, v16.1.6, fetched 2026-02-20): https://nextjs.org/docs/app/api-reference/directives/use-cache
- Next.js docs (cacheLife, v16.1.6, fetched 2026-02-20): https://nextjs.org/docs/app/api-reference/functions/cacheLife
- Existing codebase patterns: `lib/dal.ts`, `app/admin/settings/`, `prisma/schema.prisma`
- SDK GitHub README: https://github.com/facebook/facebook-nodejs-business-sdk

### Secondary (MEDIUM confidence)
- API field names (`spend`, `impressions`, `clicks`, `ctr`, `cpc`, `cpm`) — confirmed by multiple independent sources (AdManage.ai blog, Damien Gonot guide, Coupler.io)
- API endpoint format `https://graph.facebook.com/v22.0/act_{id}/insights` — confirmed by multiple sources
- Date presets `last_7d`, `last_30d`, `maximum` (all-time) — confirmed by multiple sources
- System User token never-expiry behavior — confirmed via Weld.app and Intelitics documentation
- Current API version v22.0 (v24.0 released Oct 2025) — confirmed via Airbyte issue and Swipe Insight
- SDK version v22.0.1 on npm — confirmed via unpkg search result

### Tertiary (LOW confidence)
- Facebook rate limit formula "190,000 + 400 × Active ads" — from Fivetran troubleshooting docs, not official Meta docs
- PDF export via jsPDF — general ecosystem knowledge; specific Next.js integration patterns from WebSearch

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — plain fetch approach is verified, field names confirmed from multiple sources
- Architecture: HIGH — based on existing codebase patterns, directly analogous to driveFolderId and chat settings
- Caching strategy: HIGH — verified against actual Next.js 16.1.6 docs dated 2026-02-20
- Facebook API fields: MEDIUM-HIGH — confirmed by multiple independent sources but could not directly access developers.facebook.com
- Pitfalls: MEDIUM — based on community sources and known Next.js constraints
- Export: MEDIUM — CSV is trivial; PDF is LOW confidence on exact implementation

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (Facebook API versions are deprecated ~18 months after release; Next.js docs are current)
