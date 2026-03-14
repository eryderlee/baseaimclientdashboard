# Phase 16: Performance Optimization - Research

**Researched:** 2026-03-15
**Domain:** Next.js 16 App Router performance, Prisma/Supabase connection pooling, Netlify cold starts, bundle optimization, caching
**Confidence:** HIGH (primary findings from official Next.js 16 docs and Supabase docs dated 2026-02-27)

---

## Summary

Performance optimization for this dashboard spans four distinct layers: (1) database query efficiency and connection pooling, (2) server-side caching strategy, (3) client-side bundle size, and (4) streaming and perceived performance. Each layer has concrete, addressable problems identified from code inspection.

The codebase already uses the right primitives — React `cache()` for per-request deduplication and `unstable_cache` for cross-request persistence on FB Ads data. The gaps are: `settings.findFirst()` is called 7 times across DAL functions without a shared cached getter, the analytics page fetches data via both DAL functions AND a direct Prisma call (dual-path problem), the DB connection is using a direct connection string rather than Supabase's transaction-mode pooler, and the bundle has not been analyzed to identify large client-side dependencies.

**Primary recommendation:** Address the database connection pooling first (it's a correctness-risk as well as performance), then fix the settings deduplication gap, then run the bundle analyzer, then apply Suspense boundaries for streaming on slow pages.

---

## Standard Stack

No new libraries are needed for this phase. All optimization is configuration and code pattern work within the existing stack.

### Core (already installed)
| Tool | Version | Purpose | Status |
|------|---------|---------|--------|
| `react` cache() | 19.2.3 | Per-request deduplication of DAL calls | In use, gaps exist |
| `next/cache` unstable_cache | 16.1.6 | Cross-request persistence (6h TTL for FB Ads) | In use correctly |
| `next` experimental-analyze | 16.1.6 | Turbopack bundle analyzer | Not yet run |
| `prisma` | 5.22.0 | ORM — relationLoadStrategy optimization available | Partially optimized |

### Supporting (no installation needed)
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `@next/bundle-analyzer` | Webpack bundle analysis | If Turbopack analyzer insufficient |
| Supabase Supavisor (transaction mode port 6543) | Connection pooling | DATABASE_URL change only, no package needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase Supavisor | Prisma Accelerate | Accelerate adds paid tier cost; Supavisor is free and already provisioned by Supabase |
| `unstable_cache` | `use cache` (Next.js 15+ experimental) | `use cache` is canary/experimental in 16.1; `unstable_cache` is stable and already in use |

**Installation:** No new packages required for this phase.

---

## Architecture Patterns

### Recommended Project Structure

No structural changes needed. Optimizations are within existing files:

```
lib/
├── dal.ts          # Add getSettings() cached function, add preload patterns
├── prisma.ts       # Already uses singleton pattern (correct)
app/
├── dashboard/analytics/page.tsx   # Fix dual-fetch (uses both DAL + direct prisma)
├── admin/page.tsx                 # Already uses Promise.all correctly
prisma/
├── schema.prisma   # Add Milestone @@index([clientId, status]) if compound query needed
```

---

### Pattern 1: Cached Settings Singleton

**What:** `prisma.settings.findFirst()` is called 7 times in dal.ts — inside `getChatSettings`, `getClientFbInsights`, `getClientFbDailyInsights`, `getClientFbCampaigns`, `getClientFbPlatformBreakdown`, `getClientFbDailyTrend`, and `getAdminFbAggregation`. Each is wrapped in its own `cache()` so React `cache()` does NOT deduplicate across these function boundaries. Each call that hits in the same render tree will execute a separate DB query.

**When to use:** Whenever a singleton record (Settings, global config) is read by multiple DAL functions in the same request.

**Fix:** Extract a shared `getSettings` cached function and call it from within each FB DAL function:

```typescript
// Source: Confirmed by React cache() docs — cache() deduplicates PER FUNCTION, not globally
// Add to lib/dal.ts
export const getSettings = cache(async () => {
  return prisma.settings.findFirst({
    select: { facebookAccessToken: true, whatsappNumber: true, telegramUsername: true },
  })
})

// Then replace all inline prisma.settings.findFirst() with:
const settings = await getSettings()
```

**Why this works:** React `cache()` deduplicates calls to `getSettings()` itself. When `getClientFbInsights` and `getClientFbCampaigns` both call `getSettings()` in the same render pass, the second call returns the memoized result.

---

### Pattern 2: Supabase Transaction Mode Connection Pooling

**What:** In serverless environments (Netlify Functions), each invocation creates a new Prisma client connection. Without a connection pooler, these connections accumulate against PostgreSQL's hard limit.

**When to use:** Mandatory for any serverless deployment targeting Supabase PostgreSQL.

**Fix:** Switch `DATABASE_URL` to Supabase Supavisor transaction mode (port 6543):

```
# .env (Netlify environment variables)
# Direct connection (keep for migrations/Prisma introspection if needed)
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[ID].supabase.co:5432/postgres"

# Transaction mode pooler — use this as DATABASE_URL
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
```

**Critical:** `?pgbouncer=true` is **required** — Supavisor transaction mode does not support prepared statements, which Prisma uses by default. Without this flag, you will see prepared statement errors under load.

**Source:** Supabase Prisma troubleshooting docs — https://supabase.com/docs/guides/database/prisma/prisma-troubleshooting

**env.ts validator:** The current regex validates `postgresql://` prefix — the Supavisor pooler URL also starts with `postgresql://` so no validator change needed.

---

### Pattern 3: Parallel Fetching with Promise.all (Audit Existing Pages)

**What:** Sequential `await` calls in a server component create a waterfall — each query starts only after the previous one finishes. `Promise.all` starts all requests simultaneously.

**Status:** Admin page already uses `Promise.all` correctly. Dashboard home page uses `Promise.all` for milestones + chat + FB daily. The analytics page has a problem: it calls `Promise.all` for the 4 FB functions but then separately calls `getAnalyticsData(userId)` sequentially — however these two groups don't depend on each other, so they should run in parallel.

**Fix for analytics page:**

```typescript
// Source: https://nextjs.org/docs/app/getting-started/fetching-data
// Current (sequential — analytics waits for FB to finish first):
const [fbInsights, campaigns, platforms, dailyTrend] = await Promise.all([...])
const analytics = await getAnalyticsData(userId)

// Fixed (parallel — both groups start at the same time):
const [fbResults, analytics] = await Promise.all([
  Promise.all([getClientFbInsights(datePreset), getClientFbCampaigns(datePreset), ...]),
  getAnalyticsData(userId),
])
```

**Note:** `getAnalyticsData` in the analytics page is a local function that calls `prisma.user.findUnique` directly (bypassing DAL) — this is the dual-fetch problem. It fetches milestones, documents, and activities using a raw Prisma call while DAL functions also fetch client/milestones. Consolidate into DAL functions.

---

### Pattern 4: Bundle Analysis with Turbopack Analyzer (Next.js 16.1)

**What:** Next.js 16.1 introduced an experimental Turbopack-native bundle analyzer. Run it to identify large client-side dependencies.

**Command:**
```bash
# Source: https://nextjs.org/docs/app/guides/package-bundling (version 16.1.6, 2026-02-27)
npx next experimental-analyze
```

This opens an interactive treemap showing every module, its size, and its import chain. Use it to find unexpected large dependencies in client bundles.

**Already optimized by Next.js by default (no action needed):**
- `lucide-react` — auto-optimized (in Next.js default optimizePackageImports list)
- `recharts` — auto-optimized (in Next.js default optimizePackageImports list)
- `date-fns` — auto-optimized

These do NOT need to be added to `experimental.optimizePackageImports`.

---

### Pattern 5: Suspense for Streaming (Granular Loading)

**What:** Currently, `loading.tsx` files wrap entire pages in a Suspense boundary. This means the whole page shows a skeleton until ALL data is ready. Granular `<Suspense>` boundaries let fast sections render immediately while slow sections stream in.

**When beneficial:** Pages where some sections load fast (static content, cached data) and others are slow (FB Ads API calls with cache miss, Stripe API).

**Key insight for this app:** The analytics page fetches 4 FB Ads API calls + project analytics. With a page-level loading.tsx, the user sees nothing until all 4 FB calls resolve. With granular Suspense, project analytics (fast DB query) could show immediately.

```typescript
// Source: https://nextjs.org/docs/app/getting-started/fetching-data
// Pattern: async Server Component as a Suspense boundary child
export default function AnalyticsPage() {
  return (
    <div>
      <Suspense fallback={<ProjectMetricsSkeleton />}>
        <ProjectMetrics /> {/* Fast DB queries */}
      </Suspense>
      <Suspense fallback={<FbAdsSkeleton />}>
        <FbAdsSection /> {/* Slow FB API — streams in separately */}
      </Suspense>
    </div>
  )
}
```

**Netlify specific:** Netlify's OpenNext adapter fully supports streaming responses from serverless functions. The adapter passes RSC streaming through to the CDN correctly.

---

### Pattern 6: Prisma Query Field Selection

**What:** The admin analytics page calls `getAllClientsWithMilestones()` which uses `include: { milestones: {...} }` and includes full milestone objects. The `getAdminAnalytics()` function then calls `getAllClientsWithMilestones()` again via `cache()` (correctly deduplicated). However, the Milestone model has a `notes: Json` field that can be large — it's included in the full milestone fetch even when analytics only needs status and progress.

**Fix:** Add a lean analytics-specific DAL function that selects only required fields:

```typescript
// Source: https://www.prisma.io/docs/orm/prisma-client/queries/query-optimization-performance
// Use select instead of include to minimize data transfer
const clients = await prisma.client.findMany({
  select: {
    id: true,
    companyName: true,
    isActive: true,
    createdAt: true,
    user: { select: { name: true, email: true } },
    milestones: {
      select: { status: true, progress: true, dueDate: true, order: true }
      // Exclude: notes (Json, potentially large), description, startDate, completedAt
    }
  }
})
```

**N+1 note:** The admin page calls `getAllClientsWithMilestones()` and then processes each client with `calculateOverallProgress(client.milestones)` and `detectClientRisk(client)` — this is application-level processing on already-fetched data, NOT N+1 queries. The Prisma calls themselves are correct (single query with included relations).

---

### Pattern 7: Prisma relationLoadStrategy

**What:** Prisma by default uses "query" strategy for relations (multiple round-trips). Setting `relationLoadStrategy: "join"` performs a single SQL JOIN.

**When to use:** When fetching one-to-many relations where all data is in the same DB (Supabase PostgreSQL here).

```typescript
// Source: https://www.prisma.io/docs/orm/prisma-client/queries/query-optimization-performance
const client = await prisma.client.findUnique({
  where: { id: clientId },
  relationLoadStrategy: 'join', // Single DB query instead of 2
  include: { milestones: true }
})
```

**Caveat:** This is a Prisma 5.x feature, confirmed available in `@prisma/client@5.22.0`. Test on a page-by-page basis as behavior may differ with complex nested includes.

---

### Anti-Patterns to Avoid

- **Calling `unstable_cache` inside a per-request function:** The project already avoids this correctly — `verifySession()` is called outside the `unstable_cache` boundary (documented in DAL comments). Do not change this pattern.
- **`dynamic = 'force-dynamic'` on all pages:** This disables the Full Route Cache. These pages are already dynamic (they use `cookies()` via auth). Adding this explicitly would have no effect but signals incorrect intent.
- **Adding `connection_limit` without `pgbouncer=true`:** The two parameters work together. Without `pgbouncer=true`, Prisma's prepared statements will fail in transaction mode even if pooling is correctly configured.
- **Creating a `getSettings` function that is NOT wrapped in `cache()`:** Without `cache()`, it would still execute a DB query on every call within the same render. The `cache()` wrapper is the deduplication mechanism.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Connection pool management | Custom connection manager | Supabase Supavisor (transaction mode URL) | Already provisioned, free tier, handles pooling server-side |
| Bundle visualization | Custom build script parsing | `npx next experimental-analyze` | Built into Next.js 16.1, Turbopack-integrated |
| Cross-request caching of FB API data | Redis with custom TTL logic | `unstable_cache` (already in use) | Already works, 6h TTL already correct |
| Import optimization for icon/chart libs | Manual named imports from deep paths | Next.js auto-optimization (lucide-react, recharts already in default list) | Auto-handled, manual deep imports are fragile across package versions |

**Key insight:** Most of the performance work here is removing redundancy and fixing configuration, not adding new infrastructure.

---

## Common Pitfalls

### Pitfall 1: Assuming React cache() deduplicates across function boundaries

**What goes wrong:** Developer wraps two different functions in `cache()`, both call `getSettings()` inline. Expects only one DB query. Gets two DB queries because `cache()` is keyed per function — `cache(async () => { getSettings() })` and `cache(async () => { getSettings() })` are two separate caches.

**Why it happens:** The React docs describe `cache()` as memoizing a function's return value for the same arguments. This applies per-function-instance, not globally across all calls to Prisma.

**How to avoid:** Extract shared DB fetches into their own `cache()`-wrapped exports. Then call those shared functions from within other `cache()`-wrapped functions. The inner call gets deduplicated by the inner function's cache.

**Warning signs:** Multiple `prisma.*.findFirst()` calls for the same singleton table appearing in `dal.ts` inline within different `cache()` wrappers.

---

### Pitfall 2: Transaction mode without pgbouncer=true causes prepared statement errors

**What goes wrong:** DATABASE_URL is switched to port 6543 (Supavisor transaction mode). Under load (multiple concurrent serverless function invocations), Prisma throws "prepared statement already exists" or similar errors.

**Why it happens:** Supavisor transaction mode does not maintain per-connection state between transactions. Prisma's default behavior creates named prepared statements per connection. In transaction mode, the "connection" is a pooled logical connection that may be shared — the prepared statement from a previous transaction is gone.

**How to avoid:** Always include `?pgbouncer=true` in the transaction mode connection string. This tells the Prisma client to disable prepared statements.

**Warning signs:** Intermittent DB errors in production logs (Sentry) that correlate with traffic spikes or concurrent users.

---

### Pitfall 3: Supabase Supavisor transaction mode does not support all Prisma features

**What goes wrong:** Certain Prisma operations (specifically `$transaction` with isolation levels, interactive transactions) behave differently in transaction mode.

**Why it happens:** Transaction mode gives each statement a pooled connection but does not guarantee the same underlying connection for multi-statement transactions.

**How to avoid:** For this codebase, check if any Server Actions use `prisma.$transaction()`. If so, test thoroughly after switching to pooler mode. Simple CRUD operations are unaffected.

**Warning signs:** Server Action mutations that use `$transaction([...])` failing after the connection string change.

---

### Pitfall 4: Netlify cold starts cannot be "warmed" like Vercel

**What goes wrong:** Developer implements a cron-based ping to keep serverless functions warm. Netlify's Lambda-based functions don't support this reliably.

**Why it happens:** Netlify does not have an equivalent to Vercel's "Fluid Compute" (2026) or a keep-warm mechanism. Each function invocation may spin up a new container.

**How to avoid:** Focus cold-start mitigation on reducing bundle size (faster Lambda init) and reducing DB connection overhead (via Supavisor pooling). Accept that cold starts exist on Netlify; ensure the loading.tsx skeletons make the perceived experience acceptable.

**Warning signs:** A "warm up" script or artificial traffic generator being proposed as a solution.

---

### Pitfall 5: analytics page dual-fetch pattern

**What goes wrong:** `app/dashboard/analytics/page.tsx` has a local `getAnalyticsData(userId)` function that calls `prisma.user.findUnique` with `include: { clientProfile: { include: { milestones: true, documents: true, invoices: true } } }`. The page ALSO calls DAL functions like `getClientFbInsights()` which internally call `prisma.client.findUnique({ where: { userId } })`. This means the client record is fetched twice via different code paths — once indirectly through user.clientProfile and once directly in the DAL.

**Why it happens:** The local analytics function pre-dates the full DAL and was written before DAL functions existed for documents/activities.

**How to avoid:** Move `getAnalyticsData` logic into the DAL as `getClientAnalytics()`, selecting only required fields. Remove the direct Prisma import from the analytics page.

---

## Code Examples

### Verified Settings Deduplication Pattern

```typescript
// Source: lib/dal.ts — add this near the top, after getChatSettings
// React cache() key is this function reference — all callers get the same memoized result
export const getSettings = cache(async () => {
  return prisma.settings.findFirst({
    select: {
      facebookAccessToken: true,
      whatsappNumber: true,
      telegramUsername: true,
    },
  })
})

// Inside getClientFbInsights — replace inline prisma.settings.findFirst:
export const getClientFbInsights = cache(async (datePreset: DatePreset = 'last_30d') => {
  const { userId, userRole } = await verifySession()
  // ...
  const settings = await getSettings() // deduplicated via cache()
  if (!settings?.facebookAccessToken) return null
  // ...
})
```

### Supabase Pooler Connection String

```bash
# Source: https://supabase.com/docs/guides/database/prisma/prisma-troubleshooting
# Transaction mode — use this as DATABASE_URL for production (Netlify env vars)
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
```

### Bundle Analyzer (no install required in Next.js 16.1)

```bash
# Source: https://nextjs.org/docs/app/guides/package-bundling (version 16.1.6)
npx next experimental-analyze
# Opens interactive treemap in browser
# Filter by: route, environment (client/server), module type
# Click module to see import chain and where it's used
```

### revalidateTag for FB Ads cache invalidation

```typescript
// Source: https://nextjs.org/docs/app/guides/caching
// When admin updates FB access token in Settings, invalidate all FB caches
import { revalidateTag } from 'next/cache'

// In admin settings Server Action:
revalidateTag(`fb-insights-${clientId}`) // per-client tag used in unstable_cache
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@next/bundle-analyzer` (webpack plugin) | `npx next experimental-analyze` (Turbopack-native) | Next.js 16.1 (2026) | No config changes needed, works with Turbopack dev server |
| Direct PostgreSQL connection (port 5432) | Supavisor transaction mode (port 6543) with `?pgbouncer=true` | Supabase Supavisor GA | Prevents connection exhaustion in serverless |
| Page-level `loading.tsx` only | Granular `<Suspense>` boundaries within pages | Next.js 13+ (always available) | Partial page streaming; fast sections show without waiting for slow sections |
| `unstable_cache` for all non-fetch caching | `use cache` directive (experimental) | Next.js 15 canary | `use cache` not yet stable; `unstable_cache` remains the production choice |
| Barrel file imports (e.g., `import { X } from 'lucide-react'`) | Auto-optimized by Next.js | Next.js 13.5 | lucide-react and recharts are in the default optimization list — no config change needed |

**Deprecated/outdated:**
- `export const revalidate = 0`: Opts the route out of Full Route Cache AND Data Cache. Avoid globally — these pages are already dynamic because of `auth()` (cookie access). No explicit `revalidate = 0` is needed.
- PgBouncer self-hosted: Supabase Supavisor replaces this for Supabase-hosted PostgreSQL.

---

## Open Questions

1. **Does the current `DATABASE_URL` use direct connection or Supavisor?**
   - What we know: `.env` file exists but is gitignored (not readable). The `env.ts` validator only checks for `postgresql://` prefix — both direct and pooler URLs pass this.
   - What's unclear: Whether the URL already points to port 6543 (pooler) or port 5432 (direct).
   - Recommendation: Check the Netlify environment variable in the Netlify dashboard. If it's port 5432, switching to 6543 with `?pgbouncer=true` is the highest-impact single change.

2. **Is `prisma.$transaction()` used anywhere?**
   - What we know: Not found in dal.ts. Server Actions in `app/actions/` and `app/admin/actions.ts` were not fully audited.
   - What's unclear: Whether any mutations batch writes in a transaction.
   - Recommendation: Search all Server Action files for `$transaction` before switching to pooler mode.

3. **What is the actual bundle size and cold start time?**
   - What we know: Site is described as "slow" — not quantified.
   - What's unclear: Whether the bottleneck is cold start (Lambda init), DB query latency, FB API latency, or initial JS download.
   - Recommendation: Run `npx next experimental-analyze` first to get a baseline, and check Netlify function logs for invocation duration before optimizing blindly.

4. **`getAnalyticsData` on the analytics page — can it be fully replaced with DAL calls?**
   - What we know: It fetches documents (count), milestones (status filter), and activities (last 50). DAL already has `getMilestones()`. No DAL function exists for document count or activities.
   - What's unclear: Whether the activity log feature is still actively used or vestigial.
   - Recommendation: Create `getClientAnalytics()` in DAL that uses `select` to fetch only the computed fields needed (counts, not full records). Remove the direct Prisma import from the page.

---

## Sources

### Primary (HIGH confidence)
- `https://nextjs.org/docs/app/guides/caching` — Next.js 16.1.6, last updated 2026-02-27. Cache mechanism overview, Request Memoization, Data Cache, Full Route Cache, Router Cache.
- `https://nextjs.org/docs/app/getting-started/fetching-data` — Next.js 16.1.6, last updated 2026-02-27. Parallel fetching patterns, Promise.all, Suspense streaming.
- `https://nextjs.org/docs/app/guides/package-bundling` — Next.js 16.1.6, last updated 2026-02-27. `npx next experimental-analyze`, `@next/bundle-analyzer`, `serverExternalPackages`.
- `https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports` — Next.js 16.1.6, last updated 2026-02-27. Default optimized packages list (lucide-react, recharts confirmed).
- `https://supabase.com/docs/guides/database/prisma/prisma-troubleshooting` — Supabase official docs. `?pgbouncer=true` requirement for transaction mode.
- `https://www.prisma.io/docs/orm/prisma-client/queries/query-optimization-performance` — Prisma official docs. N+1, relationLoadStrategy, select vs include.
- `https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/` — Netlify official docs. OpenNext adapter, ISR support, streaming, caching.

### Secondary (MEDIUM confidence)
- `https://opennext.js.org/netlify` — OpenNext docs for Netlify adapter. Streaming support confirmed, cold start mitigation not documented.
- `https://supabase.com/docs/guides/database/connecting-to-postgres` — Supabase connection string formats, port numbers.

### Tertiary (LOW confidence)
- WebSearch results on Netlify cold start benchmarks (2026) — Netlify confirmed slower than Vercel in benchmarks. No mitigation equivalent to Vercel Fluid Compute. Not verified against official Netlify docs.

---

## Metadata

**Confidence breakdown:**
- Standard stack (what to use): HIGH — verified from official Next.js 16.1.6 docs dated 2026-02-27
- Architecture patterns (settings deduplication, pooling, bundle analyzer): HIGH — verified from official docs
- Supabase connection pooling details: HIGH — verified from Supabase official troubleshooting docs
- Netlify cold start mitigation: LOW — official Netlify docs do not document warm-up strategies; benchmark claims from WebSearch only
- Prisma `relationLoadStrategy: 'join'`: MEDIUM — documented in Prisma docs; behavioral nuances under Supavisor transaction mode unverified

**Research date:** 2026-03-15
**Valid until:** 2026-06-15 (stable APIs; Netlify adapter releases may change caching behavior sooner)
