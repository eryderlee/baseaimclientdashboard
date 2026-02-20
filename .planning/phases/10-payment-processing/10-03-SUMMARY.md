---
phase: 10-payment-processing
plan: "03"
subsystem: payments
tags: [stripe, react, nextjs, billing, invoice, customer-portal]

# Dependency graph
requires:
  - phase: 10-01
    provides: getClientBillingData DAL function, createPortalSession server action, /api/invoices/[invoiceId]/urls route
provides:
  - Client billing page wired to real Stripe actions (Pay Now, Download PDF, Manage Billing)
  - InvoiceActions client component for per-row pay/download
  - ManageBillingButton client component for Stripe Customer Portal
affects: [11-facebook-ads, 13-ui-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client components for interactive Stripe actions; server component page fetches data via DAL"
    - "On-demand URL fetching: fetch /api/invoices/[id]/urls at click time (never cached)"
    - "useTransition for server action loading state (ManageBillingButton)"

key-files:
  created:
    - components/dashboard/billing-actions.tsx
  modified:
    - app/dashboard/billing/page.tsx

key-decisions:
  - "Fetch Stripe URLs on-demand (at click time) — URLs expire so never cache client-side"
  - "ManageBillingButton shown in both page header and per-subscription card"
  - "Intl.NumberFormat for currency using invoice.currency field (not hardcoded USD)"
  - "showDownload for all non-DRAFT statuses; showPayNow only for SENT|OVERDUE"

patterns-established:
  - "Pattern: Server component page + client component action buttons (no mixed rendering)"
  - "Pattern: Stripe URL fetch pattern — fetch('/api/invoices/[id]/urls') then window.open"

# Metrics
duration: 2min
completed: 2026-02-20
---

# Phase 10 Plan 03: Client Billing Page with Stripe Actions Summary

**Client billing page wired to real Stripe Pay Now (hosted invoice), Download PDF, and Manage Billing (Customer Portal) using on-demand URL fetching**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-20T16:52:53Z
- **Completed:** 2026-02-20T16:54:56Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `InvoiceActions` client component with Pay Now (fetches `hosted_invoice_url`, opens in new tab) and Download PDF (fetches `invoice_pdf`, opens in new tab) — both with loading spinners and toast error handling
- Created `ManageBillingButton` client component using `useTransition` + `createPortalSession` server action, redirects to Stripe Customer Portal
- Rewrote `app/dashboard/billing/page.tsx` to use `getClientBillingData()` from DAL — removed inline `getBillingData`, direct `prisma` import, and `auth()` import
- Currency amounts now formatted via `Intl.NumberFormat` using per-invoice `currency` field
- Manage Billing button rendered in page header and within each subscription card (conditionally when `stripeCustomerId` exists)

## Task Commits

Each task was committed atomically:

1. **Task 1: Client billing actions component** - `248f307` (feat)
2. **Task 2: Update client billing page to use DAL and wire actions** - `7b49913` (feat)

**Plan metadata:** `[pending]` (docs: complete plan)

## Files Created/Modified

- `components/dashboard/billing-actions.tsx` — New client component: `InvoiceActions` (Pay Now + Download PDF) and `ManageBillingButton` (Stripe Customer Portal)
- `app/dashboard/billing/page.tsx` — Rewritten to use DAL, wired Stripe action buttons, Intl.NumberFormat currency formatting

## Decisions Made

- **On-demand URL fetching:** Stripe URLs expire so they are fetched fresh at click time via `/api/invoices/[id]/urls`. No client-side caching.
- **ManageBillingButton placement:** Rendered in both the page header area and inside each subscription card — gives users two convenient access points to the portal.
- **Download visibility:** Show Download PDF for all non-DRAFT statuses (SENT, OVERDUE, PAID, CANCELLED) since Stripe generates PDFs for finalized invoices regardless of payment state.
- **Currency formatting:** Used `invoice.currency` field per invoice row rather than a single page-level currency, since invoices could theoretically use different currencies.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required for this plan. Stripe was already configured in Plan 10-01.

## Next Phase Readiness

- Client billing page is fully functional: Pay Now opens Stripe-hosted payment page (STRIPE-01), Download PDF opens Stripe PDF (STRIPE-02), Manage Billing opens Stripe Customer Portal (STRIPE-03)
- Plan 10-02 (Admin invoice UI) is the only remaining plan in Phase 10
- Email notifications on invoice creation and payment are covered by Plan 10-01 backend

---
*Phase: 10-payment-processing*
*Completed: 2026-02-20*
