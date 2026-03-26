---
phase: 20
plan: 01
subsystem: facebook-ads-dal
tags: [prisma, dal, admin-ui, facebook-ads, react-hook-form]

dependency-graph:
  requires:
    - "19-01: getClientAdConfig with preview mode support"
    - "16-02: getSettings and getClientAdConfig deduplication pattern"
    - "14-01: FbDailyInsight type and fetchFacebookDailyInsights function"
    - "11-02: ClientForm with adAccountId and ClientFormProps typing"
  provides:
    - "leadsChartEnabled Boolean flag on Client model"
    - "getClientFbDailyTrendByRange DAL function accepting DatePreset"
    - "getClientAdConfig now returns leadsChartEnabled"
    - "Admin Switch toggle for leadsChartEnabled in edit form"
  affects:
    - "20-02: Home page chart rendering gated on leadsChartEnabled"
    - "20-02: Daily trend fetch uses getClientFbDailyTrendByRange with date range"

tech-stack:
  added:
    - "@radix-ui/react-switch (via shadcn Switch component)"
  patterns:
    - "Boolean @default(false) field on Prisma model for feature flag"
    - "watch + setValue pattern for Switch in react-hook-form"
    - "parameterized unstable_cache key: fb-daily-trend-{datePreset}-{clientId}"

file-tracking:
  created:
    - components/ui/switch.tsx
  modified:
    - prisma/schema.prisma
    - lib/schemas/client.ts
    - lib/dal.ts
    - app/admin/actions.ts
    - components/admin/client-form.tsx
    - app/admin/clients/[clientId]/edit/page.tsx

decisions:
  - "leadsChartEnabled defaults to false — new clients don't show leads chart until admin enables it"
  - "Boolean form value serialized as String('true'/'false') in FormData — handled specially in onSubmit loop"
  - "getClientFbDailyTrendByRange follows identical pattern to getClientFbInsights (already accepts DatePreset)"
  - "leadsChartEnabled added to both ADMIN-preview and CLIENT branches of getClientAdConfig select"

metrics:
  duration: "4 min"
  completed: "2026-03-26"
---

# Phase 20 Plan 01: leadsChartEnabled Flag + Parameterized Daily Trend DAL Summary

**One-liner:** Added `leadsChartEnabled` Boolean client flag with admin Switch toggle and `getClientFbDailyTrendByRange` DAL function that accepts `DatePreset` for date-range-aware caching.

## What Was Built

### Task 1: leadsChartEnabled Flag — Schema, Zod, Admin UI

- **prisma/schema.prisma:** Added `leadsChartEnabled Boolean @default(false)` to the `Client` model after `adAccountId`
- **lib/schemas/client.ts:** Added `leadsChartEnabled: z.boolean().optional()` to `updateClientSchema`
- **app/admin/actions.ts:** Extracts `leadsChartEnabled` from formData (`=== 'true'` coercion), validates via Zod, and persists alongside `adAccountId` in `prisma.client.update`
- **components/admin/client-form.tsx:** Imports shadcn `Switch` component; renders a "Show Leads Chart on Home Page" switch in the Facebook Ads Configuration card (edit mode only); uses `watch`/`setValue` pattern for boolean field; explicitly serializes boolean to string in FormData onSubmit
- **components/ui/switch.tsx:** New shadcn Switch component installed via `npx shadcn@latest add switch`
- **app/admin/clients/[clientId]/edit/page.tsx:** Passes `leadsChartEnabled: client.leadsChartEnabled` in `defaultValues`

### Task 2: getClientFbDailyTrendByRange + Extended getClientAdConfig

- **lib/dal.ts (getClientAdConfig):** Added `leadsChartEnabled: true` to both the ADMIN-preview branch and the CLIENT branch select statements
- **lib/dal.ts (getClientFbDailyTrendByRange):** New exported `cache` function accepting `datePreset: DatePreset = 'last_30d'`. Follows identical auth-outside-cache pattern as `getClientFbInsights`. Cache key: `fb-daily-trend-${datePreset}-${client.id}` (deduplicates per range). Tagged `fb-insights-${client.id}` for targeted invalidation.

## Verification

- `prisma validate` — schema syntax valid
- `prisma generate` — Prisma client generated successfully from updated schema
- `npx tsc --noEmit` — passes cleanly after both tasks
- `grep -n "getClientFbDailyTrendByRange" lib/dal.ts` — shows function at line 790
- `grep -n "leadsChartEnabled" lib/dal.ts` — shows in both getClientAdConfig select branches (lines 299, 307)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Switch UI component did not exist**

- **Found during:** Task 1 setup
- **Issue:** `components/ui/switch.tsx` was not present in the project
- **Fix:** Ran `npx shadcn@latest add switch` to install it
- **Files modified:** `components/ui/switch.tsx` (created)
- **Commit:** fdc7b82

**2. [Rule 1 - Bug] Boolean value lost in generic FormData serialization**

- **Found during:** Task 1 — client-form.tsx onSubmit review
- **Issue:** The existing `Object.entries` loop skips falsy values (`false` fails the `value !== ''` check is fine but the form would never serialize `false`). For a boolean field, `false` needs to be explicitly included.
- **Fix:** Added a special case for `leadsChartEnabled` key to always append `String(value ?? false)`, bypassing the generic truthy guard
- **Files modified:** `components/admin/client-form.tsx`
- **Commit:** fdc7b82

### Database Push Note

`npx prisma db push` returned "FATAL: Tenant or user not found" — the Supabase self-hosted instance at `supabase.ryderagency.com` was unreachable during execution. The schema change is syntactically valid (confirmed via `prisma validate`) and the Prisma client was generated successfully. `db push` should be run when the database is accessible. All TypeScript compiles cleanly against the generated client.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| fdc7b82 | feat | Add leadsChartEnabled flag with admin toggle (schema, Zod, server action, form) |
| 9b607dd | feat | Add getClientFbDailyTrendByRange DAL function and extend getClientAdConfig |

## Next Phase Readiness

Plan 20-02 can now:
1. Read `client.leadsChartEnabled` from `getClientAdConfig()` to conditionally render the leads chart
2. Call `getClientFbDailyTrendByRange(datePreset)` with the user-selected date range to fetch date-range-specific daily trend data
3. No additional backend changes needed before UI rendering work
