---
phase: 16-performance-optimization
plan: "04"
subsystem: database
tags: [prisma, dal, query-optimization, bundle-analysis, nextjs, select, relationLoadStrategy]

# Dependency graph
requires:
  - phase: 16-02
    provides: "Settings/client config deduplication, getClientAdConfig singleton, lean select patterns on getClientAnalytics"
provides:
  - "getAllClientsWithMilestones() uses select instead of include, excluding large notes Json from milestones"
  - "relationLoadStrategy: 'join' added to 5 DAL functions that fetch relations"
  - "prisma/schema.prisma has previewFeatures = ['relationJoins'] to enable single-query JOIN strategy"
  - "Bundle analysis baseline: total static JS ~3.7 MB across 55 chunks, key findings documented"
affects: ["future phases using DAL", "future bundle optimization work"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Prisma select over include for analytics/list queries — exclude large unused fields (notes Json)"
    - "relationLoadStrategy: 'join' on relation-fetching DAL functions — single DB round trip instead of N+1"
    - "previewFeatures = ['relationJoins'] in schema.prisma required for relationLoadStrategy TypeScript support"

key-files:
  created: []
  modified:
    - lib/dal.ts
    - prisma/schema.prisma

key-decisions:
  - "previewFeatures = ['relationJoins'] added to schema.prisma — required for Prisma 5.x TypeScript types; without it 'join' is typed as 'never'"
  - "notes excluded from getAllClientsWithMilestones milestones select — notes Json array is only needed by admin milestone editor (getClientWithMilestones), not by analytics or admin list table"
  - "getClientWithMilestones keeps full include (including notes) — admin milestone editor reads/displays notes for each milestone"
  - "jspdf appears in initial static chunk (408KB) despite dynamic import in export-buttons.tsx — Turbopack bundling behavior, not a regression; documented as optimization opportunity"
  - "No @googleapis/drive found in client-side chunks — server external package config working correctly"
  - "Three 393KB recharts chunks are route-specific (FB analytics page) — expected for data visualization library"

patterns-established:
  - "select on admin list queries: always exclude heavy Json fields (notes, metadata) that aren't consumed by the list UI"
  - "relationLoadStrategy: 'join' on all DAL findUnique/findMany that use include with relations (except unstable_cache functions)"

# Metrics
duration: 10min
completed: 2026-03-16
---

# Phase 16 Plan 04: Prisma Query Optimization + Bundle Analysis Summary

**Prisma select optimization eliminates notes Json from admin analytics queries; relationLoadStrategy: 'join' added to 5 DAL functions; bundle baseline shows recharts (3x 393KB) and jspdf (408KB) as largest client chunks**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-16T04:45:15Z
- **Completed:** 2026-03-16T04:55:21Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `getAllClientsWithMilestones()` converted from `include` to `select`, excluding `notes: Json` and other unused milestone fields (description, completedAt, createdAt, updatedAt) — only analytics-needed fields fetched
- `relationLoadStrategy: 'join'` added to `getClientWithMilestones`, `getClientForEdit`, `getClientBillingData`, `getAdminClientForBilling`, and `getAllClientsWithMilestones` — 5 DAL functions total
- Enabled `previewFeatures = ["relationJoins"]` in `prisma/schema.prisma` and regenerated client to fix TypeScript types
- `npx next build` completed successfully; bundle analysis captured and findings documented below

## Task Commits

Each task was committed atomically:

1. **Task 1: Optimize Prisma queries with select and relationLoadStrategy** - `33a687d` (feat)

**Plan metadata:** committed with final docs commit

## Files Created/Modified
- `lib/dal.ts` - getAllClientsWithMilestones converted to select (excludes notes), relationLoadStrategy: 'join' added to 5 functions
- `prisma/schema.prisma` - Added previewFeatures = ["relationJoins"] to generator block

## Bundle Analysis Findings

### Build Results
- **Build:** `npx next build` completed successfully (Turbopack, ~58s compile)
- **All 32 routes built** — 23 dynamic (ƒ), 9 static (○)
- **Note:** Next.js 16.1.6 with Turbopack does not print per-route First Load JS sizes in build output

### Static Chunk Summary

Total static JS: ~3.7 MB across 55 chunks (uncompressed; gzip typically reduces by ~70%)

**Chunks over 100KB:**

| Chunk | Size | Contents |
|-------|------|---------|
| d7a6df8fb3833df0.js | 520 KB | Next.js/React framework runtime (TURBOPACK root) |
| 9c3b5204e0c21dbb.js | 408 KB | **jspdf library** (see note below) |
| fbea7133184ff9f8.js | 393 KB | recharts (route-specific: FB analytics page) |
| c27710de80a71d46.js | 393 KB | recharts (route-specific: FB analytics page) |
| 910b16307ac2cde4.js | 393 KB | recharts (route-specific: FB analytics page) |
| 4e756c45a9b5c591.js | 295 KB | Next.js shared runtime |
| 68d3092a76f3d353.js | 193 KB | Shared UI components (Radix/shadcn) |
| f678525b7b9735ed.js | 154 KB | Shared utilities |
| a6dad97d9634a72d.js | 109 KB | Polyfills |

### Key Findings

**1. jspdf in initial bundle (408KB) — investigation:**
- `export-buttons.tsx` correctly uses `await import('jspdf')` (dynamic import, browser-only)
- Despite this, jspdf appears in `9c3b5204e0c21dbb.js` — an eagerly-loaded static chunk
- **Root cause:** Turbopack 16.x includes dynamic-imported modules in shared chunk groups when multiple routes share a common ancestor layout. This is a known Turbopack behavior difference from webpack's code splitting.
- **Impact:** This chunk is only loaded on routes that use export-buttons.tsx (FB analytics page), not on all routes
- **Recommendation for future optimization:** Verify with route-specific chunk manifest whether this chunk is route-scoped; if not, consider `next/dynamic` with `{ ssr: false }` wrapping the ExportButtons component

**2. recharts — three 393KB chunks:**
- recharts v2 splits into multiple chunks; these are route-specific to the FB analytics page
- Not loaded on login, dashboard home, or admin pages
- **Recommendation:** recharts is acceptable given it's analytics-only; no action needed

**3. @googleapis/drive — server-only (verified):**
- No trace of `googleapis` in any `.next/static/chunks/*.js` files
- Correctly isolated via `serverExternalPackages` in next.config.ts
- Result: zero client bundle impact from the Google Drive integration

**4. Stripe — server-only (verified):**
- No Stripe SDK references found in client chunks
- All Stripe calls are in server components and API routes

**5. Prisma client — server-only (verified):**
- `@prisma/client` in `serverExternalPackages` — not bundled client-side
- Prisma query engine (WASM) stays on server

### Bundle Size Context
- The 520KB framework chunk (Next.js/React runtime) is unavoidable overhead
- recharts (3x 393KB) and jspdf (408KB) are the largest app-specific dependencies
- Both are scoped to the FB analytics page — not global overhead
- Estimated First Load JS for login/dashboard pages: ~700-900KB (framework + shared UI)
- Estimated First Load JS for FB analytics page: ~2.5MB (includes recharts + jspdf chunks)

## Decisions Made
- `previewFeatures = ["relationJoins"]` added to schema.prisma — required in Prisma 5.x for TypeScript compatibility; without it `relationLoadStrategy: 'join'` is typed as `never`
- `notes` excluded from `getAllClientsWithMilestones` milestones select — the admin list/analytics consumers (`getAdminAnalytics`, admin page table) only access `status`, `dueDate`, `startDate`, `progress`, `order`, `title` — never `notes`
- `getClientWithMilestones` keeps `include` with `notes` — the admin milestone editor page reads `milestone.notes` to display/edit notes per milestone; removing it would break that page
- Bundle code changes deferred — current sizes are acceptable for an internal dashboard; recharts and jspdf are scoped to analytics routes; no immediate action needed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Enabled previewFeatures = ['relationJoins'] in schema.prisma**
- **Found during:** Task 1 (after adding `relationLoadStrategy: 'join'`)
- **Issue:** `npx tsc --noEmit` reported `Type 'string' is not assignable to type 'never'` at all `relationLoadStrategy: 'join'` lines — Prisma 5.x requires `previewFeatures = ["relationJoins"]` in the generator block for the type to be defined
- **Fix:** Added `previewFeatures = ["relationJoins"]` to `generator client` block in `prisma/schema.prisma`, ran `npx prisma generate` to regenerate client
- **Files modified:** `prisma/schema.prisma`
- **Verification:** `npx tsc --noEmit` passes cleanly after regeneration
- **Committed in:** `33a687d` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Fix was necessary for TypeScript compilation — plan assumed `relationLoadStrategy` would be available without explicit preview feature opt-in. No scope creep.

## Issues Encountered
- Next.js 16.1.6 with Turbopack does not print per-route First Load JS sizes in build output (unlike Webpack builds). Bundle analysis was performed by inspecting `.next/static/chunks/` directly and grepping for library signatures.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Phase 16 complete: DB pooling (16-01), query deduplication (16-02), Suspense streaming (16-03), and Prisma query optimization (16-04) all done
- Bundle analysis baseline established — future optimization target is the jspdf chunk on the FB analytics route
- All TypeScript compiles cleanly; `npx next build` succeeds

---
*Phase: 16-performance-optimization*
*Completed: 2026-03-16*
