# Phase 23: Demo Environment - Research

**Researched:** 2026-03-27
**Domain:** Prisma seeding, isDemo isolation, static FB data for demo clients
**Confidence:** HIGH

## Summary

Phase 23 implements a seed command (`npm run seed:demo`) that creates a fully realistic demo environment. The primary challenge is threefold: (1) adding an `isDemo` flag to the Client model and filtering it in every admin-facing DAL query, (2) implementing a standalone seed script separate from Prisma's built-in `prisma/seed.ts`, and (3) generating believable static Facebook Ads data for three post-setup demo clients without live API calls.

The existing codebase already has all the building blocks needed. The `prisma/seed.ts` file demonstrates the upsert pattern and bcrypt usage. The `lib/dal.ts` file contains every admin query that needs `isDemo` filtering added. The demo admin at `khan@baseaim.co` gets ADMIN role (not CLIENT role) — that is the mechanism for seeing only demo clients. The FB analytics functions in the DAL use `adAccountId` to gate live API calls; demo clients get `null` for `adAccountId`, and the DAL returns static data from a new `getDemoFbInsights` function (or the existing functions get short-circuit logic checking `isDemo`).

**Primary recommendation:** Implement `isDemo` as a schema migration on the Client model, add `WHERE isDemo = false` filters to all 8+ admin DAL functions that query clients, create `scripts/seed-demo.ts` as a standalone tsx script, and store static FB data as constants in the seed script that get written to a new `DemoMetrics` model OR stored as JSON in a metadata field on Client.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@prisma/client` | 5.22.0 | Database access | Already in project |
| `bcryptjs` | 3.0.3 | Password hashing | Already used in seed.ts and actions |
| `tsx` | 4.21.0 | Run TypeScript scripts | Already used for `prisma/seed.ts` |
| `prisma` | 5.22.0 | Schema migrations | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `dotenv` | 17.3.1 | Load `.env` in scripts | Already a devDep — tsx scripts need explicit dotenv load |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Standalone `scripts/seed-demo.ts` | Prisma built-in seed (`prisma db seed`) | Built-in seed runs with `prisma db seed`, not `npm run seed:demo`; standalone script with `tsx` matches the `--clean` flag requirement better |
| JSON field on Client for FB data | New `DemoMetrics` model | JSON on Client is simpler (no migration to add a new table); acceptable since FB data is purely static — no relations needed |

**Installation:** No new packages required. All dependencies already present.

## Architecture Patterns

### Recommended Project Structure
```
scripts/
└── seed-demo.ts         # New: standalone demo seed script
prisma/
└── schema.prisma        # Modified: add isDemo to Client, add demoStableId to User
lib/
└── dal.ts               # Modified: add isDemo: false filter to 8 admin queries
```

### Pattern 1: Standalone Seed Script with tsx
**What:** A TypeScript file in `scripts/` run via `npx tsx` with `--env-file` to load `.env`.
**When to use:** When you need CLI flags (like `--clean`) and the script is not part of the normal Prisma seed lifecycle.
**Example:**
```typescript
// scripts/seed-demo.ts
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const CLEAN = process.argv.includes('--clean')

async function main() {
  if (CLEAN) {
    // Delete in reverse dependency order
    await prisma.invoice.deleteMany({ where: { client: { isDemo: true } } })
    await prisma.document.deleteMany({ where: { client: { isDemo: true } } })
    await prisma.milestone.deleteMany({ where: { client: { isDemo: true } } })
    await prisma.client.deleteMany({ where: { isDemo: true } })
    await prisma.user.deleteMany({ where: { email: DEMO_ADMIN_EMAIL } })
    console.log('Demo data removed.')
    return
  }
  // ... upsert logic
}

main().catch(console.error).finally(() => prisma.$disconnect())
```

**package.json script:**
```json
"seed:demo": "dotenv -e .env -- npx tsx scripts/seed-demo.ts"
```

IMPORTANT: `dotenv` CLI wrapper or explicit `import 'dotenv/config'` is needed because `tsx` doesn't automatically load `.env`. The existing `prisma/seed.ts` works because `prisma db seed` loads env automatically. This standalone script needs explicit env loading.

**Simpler approach:** Use `--env-file` flag (Node 20.6+ feature, available since this project targets Node 20+):
```json
"seed:demo": "npx tsx --env-file=.env scripts/seed-demo.ts"
```

### Pattern 2: Upsert with Stable Identifier
**What:** Every demo record has a stable string identifier embedded in its data. On re-run, `upsert({ where: { stableKey }, update: {}, create: {} })` finds and updates the record.
**When to use:** For idempotent seeding (DEMO-11).

For Users: use `email` — already a `@unique` field, the natural stable key.
For Clients: Client has no unique field other than `userId`. Two options:
  - Add `demoStableId String? @unique` to Client model (cleanest, explicit)
  - Use the User's email as the stable key and join through User.clientProfile

**Recommendation:** Add `demoStableId String? @unique` to Client. This makes the upsert trivial and the stable key explicit. The 5 demo clients get values like `"demo-client-recently-launched"`.

For Milestones and Invoices: delete-and-recreate on each seed run (they have no natural unique key). Wrapped in `deleteMany({ where: { clientId } })` before `createMany(...)`. This is safe because the CONTEXT says "updates in place, preserves manual edits to non-seeded fields" — milestones and invoices don't have non-seeded fields in practice, and delete-recreate achieves the same end state.

For Documents: Same delete-and-recreate approach.

**Example upsert for Client:**
```typescript
// Upsert User first, get userId
const userUpsert = await prisma.user.upsert({
  where: { email: 'demo.client.email@example.com' },
  update: { name: 'Aria Jensen' },
  create: { email: 'demo.client.email@example.com', name: 'Aria Jensen', password: hashedPwd, role: 'CLIENT' },
})

// Upsert Client via demoStableId
const clientUpsert = await prisma.client.upsert({
  where: { demoStableId: 'demo-client-recently-launched' },
  update: { companyName: 'Meridian Financial Group', isDemo: true },
  create: {
    userId: userUpsert.id,
    companyName: 'Meridian Financial Group',
    isDemo: true,
    demoStableId: 'demo-client-recently-launched',
    industry: 'Accounting & Tax Advisory',
    onboardingStep: 6,
  },
})
```

### Pattern 3: isDemo Isolation in DAL
**What:** Add `isDemo: false` to the `where` clause in every admin DAL function that queries clients.
**When to use:** Every function in `lib/dal.ts` that calls `prisma.client.findMany()` without a specific clientId filter.

Functions that need the `isDemo: false` filter added (identified from `lib/dal.ts`):

| DAL Function | Line | Change |
|---|---|---|
| `getAllClientsWithMilestones` | 132 | Add `isDemo: false` to `findMany where` |
| `getAdminAnalytics` | 240 | Reuses `getAllClientsWithMilestones` — covered |
| `getAdminFbPerClient` | 1012 | Add `isDemo: false` to `findMany where` |
| `getAdminFbDailyAggregation` | 1068 | Add `isDemo: false` to `findMany where` |
| `getAdminFbAggregation` | 953 | Add `isDemo: false` to `findMany where` |
| `getAdminFbMetricsPerClient` | ~1117 | Add `isDemo: false` to `findMany where` |
| `getAdminAllCampaigns` | 1195 | Add `isDemo: false` to `findMany where` |
| `getAdminAllAds` | ~1248 | Add `isDemo: false` to `findMany where` |
| `getAdminRevenueAnalytics` | 887 | Uses `prisma.invoice.findMany` — add `client: { isDemo: false }` nested filter |

The demo admin (khan@baseaim.co) sees only demo clients. The implementation is that `getAllClientsWithMilestones` reads the calling user's role but does NOT filter by userId — it returns ALL non-demo clients for the real admin, and the demo admin must be isolated to see ONLY demo clients.

**Demo admin isolation approach:**
The demo admin has ADMIN role. If `getAllClientsWithMilestones` adds `isDemo: false`, the demo admin would see ZERO clients (since all real clients have `isDemo: false`). Instead, the filter must be role-aware:

```typescript
// In getAllClientsWithMilestones:
const { userId, userRole } = await verifySession()
if (userRole !== 'ADMIN') throw new Error('Unauthorized')

// Determine if calling admin is the demo admin
const isDemoAdmin = await prisma.user.findUnique({
  where: { id: userId },
  select: { email: true },
}).then(u => u?.email === DEMO_ADMIN_EMAIL)

const clients = await prisma.client.findMany({
  where: { isDemo: isDemoAdmin ? true : false },
  // ...
})
```

**Alternative (simpler):** Add a `isDemo Boolean @default(false)` flag to the User model as well, marking the demo admin as a demo user. Then `getAllClientsWithMilestones` can filter by `isDemo: { equals: callerIsDemo }`. But this requires a second schema change.

**Simplest correct approach:** Query the calling admin's email inside `getAllClientsWithMilestones` and the other admin DAL functions. If email equals `DEMO_ADMIN_EMAIL`, use `isDemo: true`; otherwise use `isDemo: false`. This is one DB round-trip per admin request and avoids adding a flag to the User model.

**Recommended:** Extract a helper:
```typescript
const DEMO_ADMIN_EMAIL = 'khan@baseaim.co'

async function getCallerIsDemoAdmin(): Promise<boolean> {
  const { userId } = await verifySession()
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
  return user?.email === DEMO_ADMIN_EMAIL
}
```

Then every admin list function calls `getCallerIsDemoAdmin()` and applies the filter. Since `verifySession` uses `cache()`, the session is already cached; the user email lookup is a single tiny query per render.

### Pattern 4: Static FB Data for Demo Clients
**What:** Demo clients get realistic static FB metrics stored as a JSON field on the Client model (`demoFbData Json?`), not real FB API calls. The DAL functions detect `isDemo` clients and return this static data instead of calling the Facebook API.
**When to use:** Demo clients have `adAccountId = null`, so the existing FB DAL functions already return `null`/`[]` for them — which shows "not configured" states. For a true demo, we need these to show real-looking data.

**Two options for storing static FB data:**

Option A: Store as `Json?` field on Client model (`demoFbData`)
- Pro: No new model, data travels with the client record
- Con: The shape is complex (multiple date ranges), making the JSON schema hard to validate
- Verdict: Acceptable for the static nature of demo data

Option B: New `DemoFbSnapshot` model with fields
- Pro: Type-safe, queryable
- Con: Another migration, another model
- Verdict: Overkill for static demo data that never changes

**Recommendation:** Store static FB data as a `Json?` field on Client (`demoFbData`). The seed script writes a pre-computed object matching the `FbInsights` interface shape. The DAL gets a thin helper `getDemoClientFbInsights(clientId)` that reads `client.demoFbData` if `client.isDemo === true`.

**Alternative approach (simpler but less flexible):** Don't add `demoFbData` to the schema at all. Instead, define static FB data as constants in the DAL or a `lib/demo-data.ts` file, keyed by `demoStableId`. When a demo client's FB data is requested, the DAL checks `client.isDemo` and returns the appropriate constant. This avoids any schema change for FB data.

**Recommendation (revised):** Use the constants-in-code approach. It's simpler, avoids a schema field for data that never changes, and keeps the demo data version-controlled in the codebase. Store demo FB data in `lib/demo-data.ts` keyed by `demoStableId`.

### Pattern 5: Demo Password Strategy
**What:** A strong random password generated at seed time, printed to console.
**When to use:** Per CONTEXT.md, the password is Claude's discretion and gets printed after seeding.
**Example:**
```typescript
// Generate a readable but strong password (no crypto randomness needed — just a good default)
const DEMO_ADMIN_PASSWORD = 'BaseAim2026!'  // Hardcoded but non-obvious
// Print after seeding:
console.log('\nDemo Admin:')
console.log('  Email:    khan@baseaim.co')
console.log('  Password: BaseAim2026!')
```

Using a hardcoded strong password (rather than randomly generated) makes re-runs predictable. Randomly generated passwords would be re-printed on each run but change each time — confusing. A fixed strong password is correct here.

### Anti-Patterns to Avoid
- **Adding isDemo to User model**: Not needed. The demo admin isolation can be achieved by checking the admin's email against `DEMO_ADMIN_EMAIL`. Adding isDemo to User creates unnecessary complexity.
- **Putting FB demo data in the database**: Static demo data should be in code (constants), not in the DB. It never changes and doesn't benefit from database storage.
- **Using `prisma.client.deleteMany({ where: { isDemo: true } })` before recreating in seed**: Risk of cascade-deleting milestones/invoices/documents unintentionally if not handled in correct order. Use targeted `deleteMany` per relation, then delete Client, then delete User.
- **Using `prisma db seed` for the demo script**: The built-in seed command runs `prisma/seed.ts`. The demo script should be separate and independently runnable.
- **Missing isDemo filter in revenue analytics**: `getAdminRevenueAnalytics` queries `prisma.invoice` directly (not through client). Must add `client: { isDemo: false }` as a nested filter to exclude demo invoices from real revenue totals.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom crypto | `bcryptjs` (already used) | Salt + hash already implemented in seed.ts and admin actions |
| Env loading in scripts | Manual `process.env` | `tsx --env-file=.env` (Node 20+) | One flag, no extra imports |
| Unique IDs for stable upsert | `cuid()` | Stable string constants (`'demo-client-recently-launched'`) | cuid is random per run; stable strings enable true idempotency |

**Key insight:** The upsert idempotency pattern is the core engineering challenge. Everything else (bcrypt, Prisma, tsx) is already established in the codebase.

## Common Pitfalls

### Pitfall 1: Missing isDemo filter in cascading queries
**What goes wrong:** Admin sees demo clients mixed into real client list, or demo revenue pollutes real analytics numbers.
**Why it happens:** Multiple DAL functions query clients independently. Easy to miss one.
**How to avoid:** Audit ALL `prisma.client.findMany()` calls in `lib/dal.ts`. There are 8 distinct queries. Also check `prisma.invoice.findMany()` in `getAdminRevenueAnalytics` — it queries invoices directly, needs `client: { isDemo: false }` nested filter.
**Warning signs:** Demo company names appear in real admin client list.

### Pitfall 2: Demo admin sees zero clients or all clients
**What goes wrong:** If `isDemo: false` is added naively to all admin queries, the demo admin sees no clients. If only real admin sees `isDemo: false`, but no corresponding `isDemo: true` filter for demo admin, the demo admin might see ALL clients.
**Why it happens:** The filter must be conditional: real admin → `isDemo: false`; demo admin → `isDemo: true`.
**How to avoid:** Implement the `getCallerIsDemoAdmin()` helper and use it in all admin list functions.
**Warning signs:** Demo admin login shows empty client list or shows real client names.

### Pitfall 3: FB analytics shows "not configured" for demo clients
**What goes wrong:** Demo post-setup clients have `adAccountId = null`, so existing FB DAL functions return `null`/`[]`. The analytics page shows "not configured" empty states — visible indicator that data is fake.
**Why it happens:** The FB DAL functions gate on `adAccountId` being set.
**How to avoid:** Add demo-aware short-circuit in FB DAL functions. When `client.isDemo === true`, return static data from `lib/demo-data.ts` instead of calling the FB API.
**Warning signs:** Demo client analytics page shows "Connect your ad account" prompts.

### Pitfall 4: Invoice number uniqueness violation on re-run
**What goes wrong:** The Invoice model has `invoiceNumber String @unique`. If the seed script uses fixed invoice numbers (for idempotency) and upserts don't cover invoices (since they have no stable unique key besides `invoiceNumber`), a second run will fail with a unique constraint violation if delete-recreate is not correctly ordered.
**Why it happens:** `invoiceNumber` is the only unique field on Invoice. If the delete step is skipped or fails partially, the create step will collide.
**How to avoid:** Use `deleteMany({ where: { clientId } })` on invoices before recreating them. Use prefixed invoice numbers like `DEMO-2025-001` that are clearly demo-specific and can be found by prefix for cleanup.
**Warning signs:** Second seed run throws `Unique constraint failed on field: invoiceNumber`.

### Pitfall 5: Seed script doesn't load .env
**What goes wrong:** `DATABASE_URL` is undefined; Prisma connection fails.
**Why it happens:** Unlike `prisma db seed`, a standalone `tsx` script doesn't auto-load `.env`.
**How to avoid:** Use `npx tsx --env-file=.env scripts/seed-demo.ts` in the npm script, or add `import 'dotenv/config'` as the first line of the script (dotenv is already a devDependency).
**Warning signs:** `Error: Environment variable not found: DATABASE_URL`.

### Pitfall 6: Clean flag doesn't remove demo admin
**What goes wrong:** `--clean` removes demo clients but leaves the demo admin user, causing confusion on re-seed (or vice versa — deleting the user before clients causes cascade issues).
**Why it happens:** Prisma cascade deletes on Client (onDelete: Cascade from User → Client) mean deleting User also deletes Client. But deleting Client alone doesn't delete User (no cascade upward).
**How to avoid:** In `--clean` mode: delete milestones, invoices, documents, then clients, then users — in that order. Or rely on Prisma cascade: delete User records by email, which cascades to Client and all client relations.
**Warning signs:** Orphaned User record with no ClientProfile after `--clean`.

## Code Examples

### Schema changes required
```prisma
// prisma/schema.prisma — Client model additions
model Client {
  // ... existing fields ...
  isDemo        Boolean   @default(false)
  demoStableId  String?   @unique
}
```

No change to User model needed.

### Demo data constants file
```typescript
// lib/demo-data.ts
// Static FB metrics for 3 post-setup demo clients
// Keyed by demoStableId

export const DEMO_FB_INSIGHTS: Record<string, {
  spend: string; impressions: string; clicks: string; ctr: string
  cpc: string; cpm: string; reach: string; frequency: string
  actions: Array<{ action_type: string; value: string }>
  date_start: string; date_stop: string
  purchase_roas: Array<{ action_type: string; value: string }>
}> = {
  'demo-meridian-financial': {
    // Recently launched client — lower spend, building momentum
    spend: '3840.00',
    impressions: '142500',
    clicks: '4275',
    ctr: '3.000000',
    cpc: '0.898246',
    cpm: '26.947368',
    reach: '98000',
    frequency: '1.45',
    date_start: '2026-02-25',
    date_stop: '2026-03-27',
    actions: [
      { action_type: 'lead', value: '127' },
      { action_type: 'link_click', value: '4275' },
    ],
    purchase_roas: [{ action_type: 'offsite_conversion.fb_pixel_purchase', value: '1.82' }],
  },
  'demo-apex-tax': {
    // Active 3-4 months — healthy performance
    spend: '9200.00',
    impressions: '318000',
    clicks: '9222',
    ctr: '2.900000',
    cpc: '0.997614',
    cpm: '28.930818',
    reach: '201000',
    frequency: '1.58',
    date_start: '2026-02-25',
    date_stop: '2026-03-27',
    actions: [
      { action_type: 'lead', value: '312' },
      { action_type: 'link_click', value: '9222' },
    ],
    purchase_roas: [{ action_type: 'offsite_conversion.fb_pixel_purchase', value: '2.41' }],
  },
  'demo-hargrove-associates': {
    // Mature 6+ months — strong performance, scaling
    spend: '18500.00',
    impressions: '620000',
    clicks: '18290',
    ctr: '2.950000',
    cpc: '1.011593',
    cpm: '29.838710',
    reach: '380000',
    frequency: '1.63',
    date_start: '2026-02-25',
    date_stop: '2026-03-27',
    actions: [
      { action_type: 'lead', value: '694' },
      { action_type: 'link_click', value: '18290' },
    ],
    purchase_roas: [{ action_type: 'offsite_conversion.fb_pixel_purchase', value: '3.15' }],
  },
}
```

### DAL isolation helper
```typescript
// In lib/dal.ts — add near top
const DEMO_ADMIN_EMAIL = 'khan@baseaim.co'

// Not exported — internal helper only
async function resolveClientIsDemoFilter(): Promise<boolean> {
  const { userId } = await verifySession()
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })
  return user?.email === DEMO_ADMIN_EMAIL
}
```

### getAllClientsWithMilestones with isolation
```typescript
export const getAllClientsWithMilestones = cache(async () => {
  const { userRole } = await verifySession()
  if (userRole !== 'ADMIN') throw new Error('Unauthorized: Admin access required')

  const isDemoAdmin = await resolveClientIsDemoFilter()

  const clients = await prisma.client.findMany({
    where: { isDemo: isDemoAdmin },  // demo admin → true; real admin → false
    // ... rest unchanged
  })
  return clients
})
```

### seed-demo.ts structure
```typescript
// scripts/seed-demo.ts
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const CLEAN = process.argv.includes('--clean')
const DEMO_ADMIN_EMAIL = 'khan@baseaim.co'
const DEMO_ADMIN_PASSWORD = 'BaseAim2026!'

// 5 demo client stable IDs
const DEMO_CLIENTS = {
  earlySetup: 'demo-client-early-setup',       // in-setup phases 1-2
  midSetup: 'demo-client-mid-setup',           // in-setup phases 3-4
  recentlyLaunched: 'demo-meridian-financial', // post-setup ~1 month
  active: 'demo-apex-tax',                     // post-setup 3-4 months
  mature: 'demo-hargrove-associates',          // post-setup 6+ months
}

async function clean() {
  // Delete via cascade: User delete cascades to Client and all relations
  // But first clean relations that DON'T cascade from Client directly
  // (Check schema — documents, milestones, invoices all have onDelete: Cascade from Client)
  // So deleting Client cascades everything. Deleting User cascades to Client.

  // Delete demo clients (cascades milestones, invoices, documents)
  await prisma.client.deleteMany({ where: { isDemo: true } })
  // Delete demo admin user
  await prisma.user.deleteMany({ where: { email: DEMO_ADMIN_EMAIL } })
  console.log('Demo data removed.')
}

async function seed() {
  // 1. Demo admin
  const hashedAdminPwd = await bcrypt.hash(DEMO_ADMIN_PASSWORD, 10)
  const demoAdmin = await prisma.user.upsert({
    where: { email: DEMO_ADMIN_EMAIL },
    update: {},
    create: {
      email: DEMO_ADMIN_EMAIL,
      name: 'Zara Khan',
      password: hashedAdminPwd,
      role: 'ADMIN',
    },
  })

  // 2-6. Demo clients (upsert User, upsert Client, delete+recreate milestones/invoices/documents)
  // ... per-client logic

  // Summary output
  console.log('\n--- Demo Seed Complete ---')
  console.log('Created/updated:')
  console.log('  1 demo admin')
  console.log('  5 demo clients (2 in-setup, 3 post-setup)')
  console.log('\nDemo admin credentials:')
  console.log(`  Email:    ${DEMO_ADMIN_EMAIL}`)
  console.log(`  Password: ${DEMO_ADMIN_PASSWORD}`)
}

async function main() {
  if (CLEAN) { await clean(); return }
  await seed()
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

### 5 Demo Client Profiles (Recommended Data)

**In-setup clients:**

Client A — Early setup (phases 1-2 complete):
- Company: "Calloway & Klein CPAs"
- Contact: "Marcus Calloway" / `calloway@callowayklein.com`
- Industry: Tax & Financial Advisory
- onboardingStep: 2
- Setup milestones: milestone 1 COMPLETED, milestone 2 IN_PROGRESS (60%), milestones 3-6 NOT_STARTED

Client B — Mid setup (phases 3-4 complete):
- Company: "Summit Ridge Accounting"
- Contact: "Priya Nair" / `priya@summitridgeaccounting.com`
- Industry: Accounting & Bookkeeping
- onboardingStep: 4
- Setup milestones: milestones 1-3 COMPLETED, milestone 4 IN_PROGRESS (80%), milestones 5-6 NOT_STARTED

**Post-setup clients:**

Client C — Recently launched (~1 month):
- Company: "Meridian Financial Group"
- Contact: "Thomas Osei" / `tosei@meridianfinancial.com`
- Industry: Financial Planning & Wealth Management
- onboardingStep: 6, all 6 setup milestones COMPLETED
- Growth milestones: 1-2 monthly reviews (COMPLETED)
- Invoices: 1 setup invoice ($4,200 PAID), 1 monthly retainer ($2,800 PAID)
- FB spend: ~$3,840 / 127 leads / ROAS 1.82

Client D — Active 3-4 months:
- Company: "Apex Tax & Advisory"
- Contact: "Samira Holt" / `samira@apextaxadvisory.com`
- Industry: Tax Planning & Business Advisory
- onboardingStep: 6, all 6 setup milestones COMPLETED
- Growth milestones: 3-4 monthly reviews (mix of COMPLETED and IN_PROGRESS)
- Invoices: 1 setup ($4,200 PAID), 3 monthly retainers ($2,800 PAID each), 1 current ($2,800 SENT)
- FB spend: ~$9,200 / 312 leads / ROAS 2.41

Client E — Mature 6+ months:
- Company: "Hargrove & Associates"
- Contact: "Elena Hargrove" / `elena@hargroveassociates.com`
- Industry: Accounting, Tax & Business Consulting
- onboardingStep: 6, all 6 setup milestones COMPLETED
- Growth milestones: 6+ monthly reviews (all COMPLETED except current IN_PROGRESS)
- Invoices: 1 setup ($4,200 PAID), 6 monthly retainers ($3,200 PAID — rate increased after 3 months), 1 current ($3,200 SENT)
- FB spend: ~$18,500 / 694 leads / ROAS 3.15

### Growth milestone template for demo (monthly reviews)
```typescript
// Each "monthly review" growth milestone:
{
  milestoneType: 'GROWTH',
  title: 'Monthly Performance Review — Feb 2026',
  description: 'Review ad performance, optimize campaigns, and plan next month strategy.',
  status: 'COMPLETED',
  progress: 100,
  completedAt: new Date('2026-02-28'),
  startDate: new Date('2026-02-01'),
  dueDate: new Date('2026-02-28'),
  order: 1,
  notes: [{ id: 'note-1', content: 'CTR improved 18% vs prior month. Scaling top-performing ad sets.', createdAt: '...', createdBy: 'BaseAim Team' }]
}
```

### FB analytics DAL short-circuit for demo clients
```typescript
// In getClientFbInsights (and other FB DAL functions):
import { DEMO_FB_INSIGHTS } from '@/lib/demo-data'

export const getClientFbInsights = cache(async (datePreset: DatePreset = 'last_30d') => {
  const { userRole } = await verifySession()
  if (userRole !== 'CLIENT' && userRole !== 'ADMIN') return null

  const client = await getClientAdConfig()  // returns { id, adAccountId, leadsChartEnabled, isDemo, demoStableId }

  if (!client) return null

  // Demo short-circuit: return static data for demo clients
  if (client.isDemo && client.demoStableId) {
    return DEMO_FB_INSIGHTS[client.demoStableId] ?? null
  }

  if (!client?.adAccountId) return null
  // ... rest of existing logic
})
```

**Note:** `getClientAdConfig` must be updated to also `select: { isDemo: true, demoStableId: true }` from the Client model.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `prisma db seed` for all seeds | Standalone `tsx` scripts for specialized seeds | Common pattern | More flexibility: `--clean` flags, custom args |
| Storing demo data in DB | Demo data as code constants | N/A | Version-controlled, no migrations needed for data changes |

## Open Questions

1. **Should the demo admin see FB aggregation on admin analytics page?**
   - What we know: Admin analytics page calls `getAdminFbAggregation()`, `getAdminFbDailyAggregation()`, `getAdminFbMetricsPerClient()`, `getAdminAllCampaigns()`, `getAdminAllAds()`. These query `prisma.client.findMany({ where: { adAccountId: { not: null } } })`.
   - What's unclear: Demo clients won't have `adAccountId` set (demo data is static). So demo admin would see empty FB aggregation on admin analytics.
   - Recommendation: For post-setup demo clients, provide a fake `adAccountId` value like `"act_demo123456"` — but modify the admin FB aggregation functions to skip actual API calls for demo clients. OR accept that admin analytics FB aggregation shows zeros for demo admin (simpler). The CONTEXT says "no visible indicators" — so admin analytics FB aggregation showing zeros would be a visible gap. Plan should address this.

2. **Document file storage for demo documents**
   - What we know: Documents have `fileUrl`, `fileName`, `fileSize`, `fileType` fields. Real docs reference Google Drive or Vercel Blob URLs.
   - What's unclear: Should demo documents have real file URLs or placeholder URLs?
   - Recommendation: Use placeholder URLs (e.g., `https://placeholder.baseaim.co/demo-doc.pdf`) that don't resolve to real files. Documents are listed by name/title in the UI — the URL is only accessed when user clicks to download. For a demo, this is acceptable. If the download must work, consider storing simple PDF stubs in `/public/demo/`.

## Sources

### Primary (HIGH confidence)
- Codebase direct inspection — `lib/dal.ts`, `prisma/schema.prisma`, `prisma/seed.ts`, `lib/facebook-ads.ts`, `lib/actions/preview.ts`
- Prisma upsert docs — verified pattern matches existing `seed.ts` usage

### Secondary (MEDIUM confidence)
- Node.js `--env-file` flag — available since Node 20.6.0; project targets Node 20+ per devDep types

### Tertiary (LOW confidence)
- Demo password recommendation — judgment call based on context requirements

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, no new dependencies
- Architecture: HIGH — patterns are direct extensions of existing codebase patterns
- Pitfalls: HIGH — derived from direct schema and DAL code inspection
- Demo data values: MEDIUM — realistic FB metric ranges for accounting firm clients (300-700 leads/month at $10-30 CPL is realistic for local service businesses)

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable — no fast-moving dependencies)
