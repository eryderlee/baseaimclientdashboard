---
phase: 10
plan: 05
subsystem: billing-ui
tags: [stripe, subscription, react, client-component, admin]

dependency-graph:
  requires: [10-04]
  provides: [subscription-manager-ui]
  affects: []

tech-stack:
  added: []
  patterns: [useTransition-for-server-actions, date-serialization-server-to-client]

key-files:
  created:
    - components/admin/subscription-manager.tsx
  modified:
    - app/admin/clients/[clientId]/invoices/page.tsx

decisions:
  - "SubscriptionManager renders two distinct states (no-subscription vs active/cancelling) via conditional rendering — avoids prop-drilling complex mode flags"
  - "useTransition for both startSubscription and cancelSubscription calls — consistent loading UX pattern with rest of codebase"
  - "Subscription dates serialized (Date → ISO string) at server component boundary before passing to client component — required for React serialization"
  - "window.confirm for cancel confirmation — simple, no extra dialog component needed"

metrics:
  duration: "6 min"
  completed: 2026-02-21
---

# Phase 10 Plan 05: Subscription UI Summary

**One-liner:** Admin subscription manager card with start-retainer form and active/cancelling status + cancel button, integrated into the client invoices page.

## What Was Built

Added a `SubscriptionManager` client component that surfaces subscription state directly on the admin invoices page, eliminating the need to query Stripe directly to know a client's billing status.

**SubscriptionManager component** (`components/admin/subscription-manager.tsx`):

- **State A — No active subscription:** Card with a form to start a monthly retainer. Fields: Monthly Amount (AUD), Description (defaults to "Monthly Retainer"). Submit calls `startSubscription` server action via `useTransition`. Shows loading state on button.
- **State B — Active subscription:** Card with green "Active" badge, next billing date formatted via `Intl.DateTimeFormat('en-AU')`, and a "Cancel Retainer" button that triggers `window.confirm` before calling `cancelSubscription`.
- **State B — Cancelling subscription:** Card with amber "Cancelling" badge, end date shown. No cancel button (already cancelling).

**Invoices page update** (`app/admin/clients/[clientId]/invoices/page.tsx`):

- `getAdminClientSubscription` added to `Promise.all` alongside existing fetches
- Subscription serialized (`.currentPeriodEnd?.toISOString()`) before passing to `<SubscriptionManager>`
- `<SubscriptionManager>` rendered between page header and invoice table

## Verification

`npx tsc --noEmit` — zero errors.

## Deviations from Plan

None — plan executed exactly as written.
