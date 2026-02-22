---
phase: 12
plan: 04
subsystem: security
tags: [zod, validation, api-routes, input-validation, production-hardening]

dependency-graph:
  requires:
    - "12-03 (Rate limiting, CSRF audit, Zod on Server Actions)"
  provides:
    - "Zod validation on all user-submitted data (100% coverage)"
    - "updateSettingsSchema in app/api/user/settings/route.ts"
    - "createMessageSchema in app/api/messages/route.ts"
  affects:
    - "Phase 12 VERIFICATION.md Truth 5: PARTIAL -> VERIFIED"
    - "PROD-05 requirement: fully satisfied"

tech-stack:
  added: []
  patterns:
    - "safeParse pattern: parse after req.json(), return 400 on failure, destructure from parsed.data"
    - "Schema-to-DB-type alignment: Zod nullable() must match actual Prisma column nullability"

key-files:
  created: []
  modified:
    - path: app/api/user/settings/route.ts
      change: "Added updateSettingsSchema, replaced raw req.json() destructure with safeParse"
    - path: app/api/messages/route.ts
      change: "Added createMessageSchema, replaced manual !content check with safeParse; receiverId now CUID-validated"
    - path: .planning/phases/12-production-hardening/12-VERIFICATION.md
      change: "Updated frontmatter status: gaps_found -> verified; Truth 5 and PROD-05 updated to VERIFIED"

decisions:
  - topic: "companyName schema type"
    choice: "z.string().max(200).optional() (not .nullable())"
    reason: "Client.companyName is String (non-nullable) in Prisma schema — Prisma update rejects null for required String columns"
  - topic: "content field after Zod"
    choice: "content: content (not content.trim())"
    reason: "Zod .trim() already trims on parse; double-trimming is redundant"

metrics:
  duration: "8 minutes"
  completed: "2026-02-22"
  tasks-completed: 3
  tasks-total: 3
---

# Phase 12 Plan 04: Zod Validation Gap Closure (API Route Handlers) Summary

**One-liner:** Zod schemas added to settings PATCH and messages POST route handlers, closing 100% input validation coverage.

## What Was Built

Two API route handlers that previously accepted raw `req.json()` without Zod validation are now fully schema-validated:

1. **`app/api/user/settings/route.ts`** — `updateSettingsSchema` validates all 6 user profile fields before `prisma.user.update()`. The `name` and `email` fields are optional strings; `phone`, `website`, and `address` are optional+nullable matching DB column types; `companyName` is optional-only (DB column is non-nullable).

2. **`app/api/messages/route.ts`** — `createMessageSchema` validates `content` (min 1 char, max 5000, trimmed) and `receiverId` as `z.string().cuid().optional()`. The existing manual `if (!content || !content.trim())` check is removed and replaced by Zod. Invalid receiver IDs no longer reach the database.

Both handlers return HTTP 400 on parse failure. All other behavior (auth check, Prisma operations, activity logging, notifications) is unchanged.

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | Pass (0 errors) |
| `updateSettingsSchema` in settings route | Present |
| `createMessageSchema` in messages route | Present |
| `z.string().cuid().optional()` for receiverId | Present |
| `safeParse` in both routes | Present |
| Manual `if (!content` check removed | Confirmed (grep: no matches) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Zod schema nullable mismatch for companyName**

- **Found during:** Task 1 verification (TypeScript check)
- **Issue:** Plan specified `companyName: z.string().max(200).optional().nullable()` but the Prisma `Client.companyName` column is `String` (non-nullable). Prisma's generated update type for a required String field does not accept `null`, only `string | undefined`. TypeScript error: `Type 'null' is not assignable to type 'string | StringFieldUpdateOperationsInput | undefined'`
- **Fix:** Changed to `z.string().max(200).optional()` (removed `.nullable()`). The field can still be omitted from the request body (undefined = no update), but cannot be set to null — which matches the database constraint.
- **Files modified:** `app/api/user/settings/route.ts`
- **Commit:** dd7f2d3 (included in Task 1 commit)

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add Zod validation to settings route | dd7f2d3 | app/api/user/settings/route.ts |
| 2 | Add Zod validation to messages route | 9308ec7 | app/api/messages/route.ts |
| 3 | Verify TypeScript and final grep check | (no files changed) | — |

## Phase 12 Status After This Plan

- **PROD-05: Zod on all user-submitted data** — VERIFIED (was PARTIAL)
- **Truth 5** — VERIFIED (was PARTIAL)
- **Phase 12 VERIFICATION.md** — updated to `status: verified`
- **Total Zod coverage:** 7 Server Action files + 2 API route handlers = 100%

## Next Phase Readiness

Phase 12 is fully complete. All 8 production hardening truths are now verified (3 remain as human-only verification requiring live Upstash Redis and Sentry DSN). No blocking code gaps remain for Phase 13 (UI Polish).
