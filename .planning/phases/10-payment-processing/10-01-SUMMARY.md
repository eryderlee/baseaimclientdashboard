---
phase: 10-payment-processing
plan: 01
subsystem: payments
tags: [stripe, webhooks, prisma, server-actions, zod, nextjs-api-routes]

# Dependency graph
requires:
  - phase: 08-email-infrastructure
    provides: sendInvoiceCreatedEmail and sendPaymentConfirmationEmail functions already built
  - phase: 09-document-storage-migration
    provides: Prisma schema with Invoice and Subscription models
provides:
  - getClientInvoices, getClientBillingData, getAdminClientInvoices, getAdminClientForBilling DAL functions
  - createInvoice server action (Stripe invoice creation + DB sync + email)
  - createPortalSession server action (Stripe Customer Portal URL)
  - Stripe webhook handler at /api/webhooks/stripe (invoice.paid, invoice.payment_failed)
  - On-demand invoice URL retrieval at /api/invoices/[invoiceId]/urls
affects: [10-payment-processing (plans 02+), admin invoice UI, client billing UI]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lazy Stripe customer creation — customer created on first invoice, stored in Subscription.stripeCustomerId"
    - "Fire-and-forget emails — email sends use .catch() so failures don't block invoice creation"
    - "Raw body webhook parsing — req.text() required before any JSON parsing for Stripe signature verification"
    - "Idempotent webhook handling — status checks before DB updates prevent duplicate processing"
    - "On-demand URL retrieval — Stripe invoice URLs fetched fresh from API, never stored in DB"

key-files:
  created:
    - app/actions/billing.ts
    - app/api/webhooks/stripe/route.ts
    - app/api/invoices/[invoiceId]/urls/route.ts
  modified:
    - lib/dal.ts

key-decisions:
  - "Webhook returns 200 for all code paths after signature verification — prevents Stripe retry storms on handler errors"
  - "Stripe customer created lazily (on first invoice) via upsert to Subscription table — no upfront provisioning needed"
  - "Invoice URLs retrieved on-demand from Stripe — Stripe URLs expire, storing them causes stale links"
  - "createInvoice accepts FormData with items as JSON string — compatible with both server action and fetch() calls"

patterns-established:
  - "Billing DAL pattern: cache() wrapper + verifySession() role check same as existing DAL functions"
  - "Server action error pattern: try/catch returning { success, error } — consistent with auth.ts actions"

# Metrics
duration: 4min
completed: 2026-02-20
---

# Phase 10 Plan 01: Stripe Backend Infrastructure Summary

**Stripe payment backend: webhook handler with raw body signature verification, invoice creation server action with lazy customer provisioning, portal session action, and on-demand invoice URL API route**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-20T16:43:59Z
- **Completed:** 2026-02-20T16:48:18Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- DAL layer extended with 4 billing functions following cache() + verifySession() pattern (getClientInvoices, getClientBillingData, getAdminClientInvoices, getAdminClientForBilling)
- Stripe webhook handler at /api/webhooks/stripe: raw body via req.text(), HMAC signature verification, invoice.paid and invoice.payment_failed event handling with idempotency guards, always returns 200 to prevent retry storms
- createInvoice server action: lazy Stripe customer creation, invoice item creation, finalize + send via Stripe, local DB save with INV-YYYY-NNNN numbering, fire-and-forget email notification
- createPortalSession server action: looks up stripeCustomerId, creates Stripe Customer Portal session, returns redirect URL
- Invoice URL route at /api/invoices/[invoiceId]/urls: admin or owning-client auth, on-demand Stripe retrieval, returns hosted_invoice_url and invoice_pdf

## Task Commits

Each task was committed atomically:

1. **Task 1: DAL billing functions and server actions** - `ebf4b5c` (feat)
2. **Task 2: Stripe webhook handler and invoice URL API route** - `1457191` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `lib/dal.ts` - Added 4 billing DAL functions (getClientInvoices, getClientBillingData, getAdminClientInvoices, getAdminClientForBilling)
- `app/actions/billing.ts` - Created: createInvoice (Stripe invoice creation + DB sync) and createPortalSession server actions
- `app/api/webhooks/stripe/route.ts` - Created: Stripe webhook handler with raw body parsing and invoice event handling
- `app/api/invoices/[invoiceId]/urls/route.ts` - Created: On-demand Stripe invoice URL retrieval API route

## Decisions Made

- **Webhook returns 200 after errors in handler** — Log internal errors but still return 200. Returning 5xx causes Stripe to retry the event repeatedly, creating retry storms. Stripe recommends 2xx for "received" acknowledgment even when processing fails.
- **Lazy Stripe customer creation** — No upfront provisioning. First invoice for a client triggers customer.create() and upserts a Subscription record with the stripeCustomerId. Simpler onboarding, no orphaned Stripe customers.
- **Invoice URLs never stored in DB** — Stripe hosted_invoice_url and invoice_pdf URLs expire. Always fetch fresh from stripe.invoices.retrieve() to prevent stale links showing to clients.
- **createInvoice accepts FormData with items as JSON string** — Allows the action to be called from standard HTML forms and from fetch() programmatically.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required (Stripe keys and webhook secret were covered in Phase 10 setup context).

## Next Phase Readiness

All Stripe backend infrastructure is in place:
- DAL functions ready for admin invoice page and client billing page to consume
- createInvoice action ready for admin invoice creation form
- createPortalSession action ready for client "Manage Billing" button
- Webhook endpoint ready to receive Stripe events (needs STRIPE_WEBHOOK_SECRET env var configured)
- Invoice URL route ready for client "Download PDF" and "Pay Now" buttons

Ready for Plan 10-02 (Admin invoice UI) and Plan 10-03 (Client billing UI updates).

---
*Phase: 10-payment-processing*
*Completed: 2026-02-20*
