---
phase: 10
plan: 04
subsystem: billing
tags: [stripe, subscriptions, webhooks, dal, server-actions]

dependency-graph:
  requires: [10-01, 10-02, 10-03]
  provides: [subscription-backend, subscription-webhooks, subscription-dal]
  affects: [10-05]

tech-stack:
  added: []
  patterns:
    - lazy-stripe-customer-creation
    - cancel-at-period-end
    - idempotent-webhook-handlers

key-files:
  created: []
  modified:
    - app/actions/billing.ts
    - app/api/webhooks/stripe/route.ts
    - lib/dal.ts

decisions:
  - "clientId not unique on Subscription model — used findFirst + update/create instead of upsert where: { clientId }"
  - "current_period_end cast via (as unknown as { current_period_end: number }) — Stripe type uses current_period_end on Subscription object but TS types declare it on the interface, cast avoids noEmit failure"
  - "startSubscription finds existing Subscription by stripeCustomerId match to determine update vs create — consistent with createInvoice pattern"
  - "cancelSubscription uses findFirst where stripeSubscriptionId not null — allows cancelling even if status is already 'cancelling'"

metrics:
  duration: "2 min"
  completed: "2026-02-21"
---

# Phase 10 Plan 04: Subscription Backend Summary

**One-liner:** Monthly retainer subscription server actions (start/cancel), Stripe subscription lifecycle webhooks, and admin DAL function for subscription status lookup.

## What Was Implemented

### Task 1 — startSubscription and cancelSubscription

**`app/actions/billing.ts`**

Added `StartSubscriptionSchema` (Zod) to validate clientId, monthlyAmount, description, currency.

**`startSubscription(formData)`** — admin-only:
- Verifies admin session
- Validates input via StartSubscriptionSchema
- Fetches client with user and subscriptions (including stripeSubscriptionId and status)
- Guards against creating duplicate active subscriptions
- Lazily creates or reuses Stripe customer (identical pattern to createInvoice)
- Creates a recurring Stripe Price (`interval: 'month'`) on-the-fly using the provided amount/description
- Creates a Stripe Subscription from that price
- Updates existing Subscription record (matched by stripeCustomerId) or creates new one with stripeSubscriptionId, stripePriceId, status, currentPeriodEnd
- Revalidates `/admin/clients/{clientId}/invoices` and `/dashboard/billing`

**`cancelSubscription(formData)`** — admin-only:
- Verifies admin session
- Finds local Subscription where stripeSubscriptionId is not null
- Calls `stripe.subscriptions.update(..., { cancel_at_period_end: true })`
- Updates local status to `'cancelling'`
- Revalidates same paths

### Task 2 — Webhook Handlers and DAL

**`app/api/webhooks/stripe/route.ts`**

Two new cases added to the existing switch statement:

- **`customer.subscription.deleted`**: Finds local Subscription by stripeSubscriptionId, marks status `'inactive'`, clears stripeSubscriptionId and currentPeriodEnd. Returns 200 if no local record (external subscription).
- **`customer.subscription.updated`**: Finds local Subscription by stripeSubscriptionId, syncs status (uses `'cancelling'` when `cancel_at_period_end` is true, otherwise mirrors Stripe status), updates currentPeriodEnd. Returns 200 if no local record.

Both handlers follow the existing pattern: always return 200 after sig verification, log warns for missing local records.

**`lib/dal.ts`**

Added `getAdminClientSubscription(clientId)`:
- Admin-only (throws Unauthorized if not ADMIN)
- Returns most recent Subscription record for the client ordered by createdAt desc
- Wrapped in `cache()` for deduplication

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Upsert where: { clientId } not viable — no unique constraint**

- **Found during:** Task 1 implementation
- **Issue:** Plan specified `prisma.subscription.upsert({ where: { clientId }, ... })` but `clientId` is not marked `@unique` on the Subscription model — only an `@@index`. Prisma requires a unique field in `where` for upsert.
- **Fix:** Used `findFirst` by stripeCustomerId to detect existing record, then branched to `update` (by id) or `create`. Same outcome, no schema migration needed.
- **Files modified:** `app/actions/billing.ts`
- **Commits:** 66d7528

**2. [Rule 1 - Bug] current_period_end TypeScript cast**

- **Found during:** Task 1 and Task 2 implementation
- **Issue:** Stripe's TypeScript types for `Subscription` expose `current_period_end` but the property access pattern `(stripeSubscription as any).current_period_end` would generate a lint warning. Plan used `as any`; replaced with `as unknown as { current_period_end: number }` for safer typing that still passes noEmit.
- **Files modified:** `app/actions/billing.ts`, `app/api/webhooks/stripe/route.ts`
- **Commits:** 66d7528, 562e5d7

## Verification

TypeScript check passed with zero errors:
```
npx tsc --noEmit
# (no output — clean)
```

## Next Phase Readiness

Plan 10-05 (subscription UI) can now import `startSubscription`, `cancelSubscription` from `app/actions/billing.ts` and `getAdminClientSubscription` from `lib/dal.ts`. No blockers.
