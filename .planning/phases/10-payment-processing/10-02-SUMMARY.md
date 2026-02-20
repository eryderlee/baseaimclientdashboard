---
phase: 10-payment-processing
plan: 02
subsystem: payments
tags: [stripe, invoices, admin-ui, react-hook-form, zod, shadcn]

# Dependency graph
requires:
  - phase: 10-01
    provides: createInvoice server action, getAdminClientInvoices DAL, getAdminClientForBilling DAL
provides:
  - Admin invoice list page per client (/admin/clients/[clientId]/invoices)
  - Admin new invoice creation page (/admin/clients/[clientId]/invoices/new)
  - CreateInvoiceForm component with dynamic line items
  - Invoices navigation link on client detail page
affects: [10-03-client-billing-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dynamic field array with react-hook-form useFieldArray for line items"
    - "useTransition for async server action calls (non-blocking loading state)"
    - "Promise.all for parallel DAL fetches on server components"

key-files:
  created:
    - app/admin/clients/[clientId]/invoices/page.tsx
    - app/admin/clients/[clientId]/invoices/new/page.tsx
    - components/admin/create-invoice-form.tsx
  modified:
    - app/admin/clients/[clientId]/page.tsx

key-decisions:
  - "z.number() not z.coerce.number() for form items — coerce causes TypeScript resolver type mismatch with react-hook-form"
  - "useTransition instead of isSubmitting for server action loading — cleaner async state management"
  - "Client detail page gets Edit+Documents+Invoices action button row — consistent navigation pattern"

patterns-established:
  - "Admin invoice pages follow same server-component pattern: verifySession + DAL fetch + render"
  - "CreateInvoiceForm serializes items as JSON string for FormData server action compatibility"

# Metrics
duration: 4min
completed: 2026-02-20
---

# Phase 10 Plan 02: Admin Invoice UI Summary

**Admin invoice list and creation UI wired to Stripe via createInvoice server action, with dynamic line items form using react-hook-form + useFieldArray**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-20T16:52:35Z
- **Completed:** 2026-02-20T16:56:16Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Admin can view all invoices for a client at `/admin/clients/[clientId]/invoices` with status badges (Paid/Sent/Overdue/Draft/Cancelled), formatted currency, and empty state
- Admin can create invoices at `/admin/clients/[clientId]/invoices/new` with a dynamic line-item form that calculates total in real time and sends via Stripe on submit
- Client detail page now has Edit, Documents, and Invoices action buttons in the heading area for easy navigation

## Task Commits

Each task was committed atomically:

1. **Task 1: Admin invoice list and creation pages** - `7c4931b` (feat)
2. **Task 2: Add invoices link to admin client detail page** - `1186936` (feat)

**Plan metadata:** `(pending)` (docs: complete plan)

## Files Created/Modified

- `app/admin/clients/[clientId]/invoices/page.tsx` - Server component: invoice list table with status badges, empty state, and Create Invoice button
- `app/admin/clients/[clientId]/invoices/new/page.tsx` - Server component: new invoice page with client name in heading, renders CreateInvoiceForm
- `components/admin/create-invoice-form.tsx` - Client component: react-hook-form with useFieldArray for dynamic line items, calls createInvoice, shows toast on success/error
- `app/admin/clients/[clientId]/page.tsx` - Added Edit/Documents/Invoices action buttons row next to client heading

## Decisions Made

- Used `z.number()` instead of `z.coerce.number()` for amount fields — coerce changes the inferred type to `unknown` which breaks react-hook-form's Resolver type compatibility
- Used `useTransition` for server action submit state instead of `formState.isSubmitting` — cleaner handling of async server actions in React 19
- Added all three action buttons (Edit, Documents, Invoices) to the client detail page heading area — grouped navigation is more discoverable than scattered links

## Deviations from Plan

None - plan executed exactly as written. The TypeScript fix for `z.coerce.number()` → `z.number()` was caught during verification and fixed before commit.

## Issues Encountered

Minor TypeScript issue during implementation: `z.coerce.number()` with `z.string().default('usd')` in Zod schema caused resolver type inference mismatch with react-hook-form. Fixed by using `z.number()` (HTML input with type="number" gives numeric value) and `z.string().min(1)` for currency. TypeScript passed clean on first verification after fix.

## User Setup Required

None - no external service configuration required for this plan. Stripe credentials were configured in Plan 01.

## Next Phase Readiness

- Admin invoice UI complete — admins can create Stripe-synced invoices per client
- Plan 10-03 (client billing UI) can now build on the same DAL functions (getClientInvoices, getClientBillingData)
- All success criteria met: list page, create page, dynamic form, client detail link

---
*Phase: 10-payment-processing*
*Completed: 2026-02-20*
