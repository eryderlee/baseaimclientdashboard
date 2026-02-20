# Phase 10: Payment Processing - Research

**Researched:** 2026-02-21
**Domain:** Stripe Invoicing, Webhooks, Customer Portal — Next.js 16 App Router
**Confidence:** HIGH (primary sources: Stripe official docs, verified code patterns)

---

## Summary

This phase wires up Stripe to a client dashboard that already has the Invoice/Subscription Prisma schema, email functions, and a billing UI skeleton. The `stripe` Node.js package (v20.3.0) and `@stripe/stripe-js` (v8.7.0) are already installed. The Stripe singleton in `lib/stripe.ts` already exists, pinned to API version `2026-01-28.clover`. No new payment library installs are needed.

The integration has three independent axes: (1) **Admin invoice creation** — admin creates invoice in DB then syncs to Stripe, stores the returned `stripeInvoiceId`; (2) **Client billing UI** — clients view invoices and access the Stripe Customer Portal or Stripe-hosted invoice page to pay; (3) **Webhook handler** — a raw-body route at `app/api/webhooks/stripe/route.ts` verifies signatures via `req.text()`, handles `invoice.paid` and `invoice.payment_failed`, updates DB status, and sends email.

The Subscription model already has `stripeCustomerId`. **The critical missing link is that the Invoice model has no direct `stripeCustomerId` field.** To redirect a client to their Customer Portal, the code must look up `stripeCustomerId` via `Invoice.clientId → Client.subscriptions[0].stripeCustomerId`. Stripe Customer Portal requires the Stripe customer to already exist; for admin clients that have no subscription yet, a Stripe Customer may need to be created lazily when the first invoice is made.

**Primary recommendation:** Stripe-first invoice flow (create Stripe invoice → store `stripeInvoiceId` + `hosted_invoice_url` in local DB → finalize → send via Stripe). Clients pay via the Stripe-hosted invoice page (`hosted_invoice_url`). Customer Portal provides subscription management and invoice history, accessed via server action that creates a portal session using `stripeCustomerId` from the Subscription model.

---

## Standard Stack

### Core (already installed — no new installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `stripe` | 20.3.0 | Stripe Node.js SDK — server-side API calls | Official SDK, TypeScript types included |
| `@stripe/stripe-js` | 8.7.0 | Stripe.js browser client | Not needed for this phase (no Payment Element — using hosted invoice page) |

### Supporting (already installed)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `prisma` / `@prisma/client` | 5.22.0 | DB access for invoice/subscription models | Already in use |
| `next-auth` | 5.0.0-beta.30 | Auth session verification | Already in use via DAL |
| `zod` | 4.3.6 | Input validation on server actions | Already in use |
| `resend` | 6.9.2 | Email delivery for invoice notifications | Already in use, email templates exist |

### Not Needed for This Phase

| Library | Reason to Skip |
|---------|---------------|
| `@stripe/react-stripe-js` | Not needed — clients pay via Stripe-hosted invoice page, not embedded Payment Element |
| PDF generation library (jspdf, pdf-lib) | Stripe provides `invoice_pdf` URL — use Stripe-hosted PDFs |
| `stripe-sync-engine` | Overkill for this use case — webhook-driven updates are sufficient |

**Installation:** No new packages needed. All Stripe packages already installed.

---

## Architecture Patterns

### Recommended File Structure

```
app/
├── api/
│   └── webhooks/
│       └── stripe/
│           └── route.ts          # Webhook handler (raw body, no middleware)
├── dashboard/
│   └── billing/
│       └── page.tsx              # Already exists — update to show real data + portal link
├── admin/
│   └── clients/
│       └── [clientId]/
│           └── invoices/
│               ├── page.tsx      # Admin: list invoices for a client
│               └── new/
│                   └── page.tsx  # Admin: create invoice form
lib/
├── stripe.ts                     # Already exists — singleton, API version 2026-01-28.clover
├── dal.ts                        # Add: getClientInvoices(), getClientBillingData()
app/
├── actions/
│   └── billing.ts                # Server actions: createPortalSession, createInvoice
```

### Pattern 1: Stripe Singleton (Already Exists)

**What:** Single Stripe instance reused across server-side calls.
**Current implementation in `lib/stripe.ts`:**

```typescript
// Source: lib/stripe.ts (already in project)
import Stripe from "stripe"

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-01-28.clover",
  typescript: true,
})
```

**Note:** The `|| ""` fallback is acceptable for build-time but will fail at runtime if `STRIPE_SECRET_KEY` is not set. The `typescript: true` option enables TypeScript types.

### Pattern 2: Admin Invoice Creation Flow (Stripe-First)

**What:** Admin creates an invoice in Stripe, then stores the Stripe IDs back to the local DB.
**Why Stripe-first:** Stripe is the source of truth for payment state. The local DB stores references (`stripeInvoiceId`, `hosted_invoice_url`) needed for client-facing links.

```typescript
// Source: Stripe docs - docs.stripe.com/invoicing/integration/quickstart
// app/actions/billing.ts (new file)
'use server'

import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'
import { sendInvoiceCreatedEmail } from '@/lib/email'
import { revalidatePath } from 'next/cache'

export async function createInvoice(formData: {
  clientId: string
  amount: number        // in dollars
  description: string
  dueDate: string       // ISO date string
  items: Array<{ description: string; amount: number; quantity: number }>
}) {
  const { userRole } = await verifySession()
  if (userRole !== 'ADMIN') return { error: 'Unauthorized' }

  // 1. Get or create Stripe customer for this client
  const client = await prisma.client.findUnique({
    where: { id: formData.clientId },
    include: {
      user: { select: { email: true, name: true } },
      subscriptions: { select: { stripeCustomerId: true } },
    },
  })
  if (!client) return { error: 'Client not found' }

  let stripeCustomerId = client.subscriptions[0]?.stripeCustomerId

  if (!stripeCustomerId) {
    // Lazy-create Stripe customer for clients without a subscription
    const customer = await stripe.customers.create({
      email: client.user.email,
      name: client.user.name || client.companyName,
      metadata: { clientId: client.id },
    })
    stripeCustomerId = customer.id

    // Store in Subscription record (upsert)
    await prisma.subscription.upsert({
      where: { clientId: client.id },
      update: { stripeCustomerId },
      create: { clientId: client.id, stripeCustomerId },
    })
  }

  // 2. Create Stripe invoice (draft)
  const stripeInvoice = await stripe.invoices.create({
    customer: stripeCustomerId,
    collection_method: 'send_invoice',
    days_until_due: 30,
    metadata: { clientId: client.id },  // for webhook lookup
  })

  // 3. Add line items to Stripe invoice
  for (const item of formData.items) {
    await stripe.invoiceItems.create({
      customer: stripeCustomerId,
      invoice: stripeInvoice.id,
      amount: Math.round(item.amount * 100),  // Stripe uses cents
      currency: 'usd',
      description: item.description,
      quantity: item.quantity,
    })
  }

  // 4. Generate invoice number (local)
  const invoiceCount = await prisma.invoice.count()
  const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(4, '0')}`

  // 5. Finalize and send via Stripe (gets hosted_invoice_url)
  const finalizedInvoice = await stripe.invoices.finalizeInvoice(stripeInvoice.id)
  await stripe.invoices.sendInvoice(finalizedInvoice.id)

  // 6. Store in local DB with Stripe references
  const dbInvoice = await prisma.invoice.create({
    data: {
      clientId: formData.clientId,
      invoiceNumber,
      amount: formData.amount,
      currency: 'usd',
      status: 'SENT',
      dueDate: new Date(formData.dueDate),
      description: formData.description,
      items: formData.items,
      stripeInvoiceId: finalizedInvoice.id,
      // Store hosted_invoice_url if you add this field to schema
    },
  })

  // 7. Send notification email
  await sendInvoiceCreatedEmail({
    clientName: client.user.name || client.companyName,
    email: client.user.email,
    invoiceNumber,
    amount: formData.amount,
    currency: 'usd',
    dueDate: new Date(formData.dueDate).toLocaleDateString(),
    viewUrl: finalizedInvoice.hosted_invoice_url || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
  })

  revalidatePath(`/admin/clients/${formData.clientId}/invoices`)
  return { success: true, invoice: dbInvoice }
}
```

### Pattern 3: Webhook Handler (Raw Body Required)

**What:** Route handler at `app/api/webhooks/stripe/route.ts` that reads raw body with `await req.text()` for signature verification.
**Critical:** App Router route handlers do NOT need `export const config = { api: { bodyParser: false } }`. Just use `req.text()`.

```typescript
// Source: Stripe docs - docs.stripe.com/webhooks, verified against Next.js App Router
// app/api/webhooks/stripe/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { sendPaymentConfirmationEmail } from '@/lib/email'

export async function POST(req: Request) {
  // MUST use req.text() — not req.json() — for signature verification
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Return 200 immediately, process synchronously within the handler
  // (Stripe retries on non-2xx within 3 days)
  try {
    switch (event.type) {
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break
    }
  } catch (err) {
    // Log but still return 200 to avoid Stripe retry storm on DB errors
    console.error('Webhook handler error:', err)
  }

  return NextResponse.json({ received: true })
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Find local invoice by stripeInvoiceId
  const localInvoice = await prisma.invoice.findFirst({
    where: { stripeInvoiceId: invoice.id },
    include: {
      client: {
        include: { user: { select: { email: true, name: true } } },
      },
    },
  })

  if (!localInvoice) {
    console.warn('invoice.paid: no local invoice for Stripe ID', invoice.id)
    return
  }

  // Idempotency: skip if already marked PAID
  if (localInvoice.status === 'PAID') return

  await prisma.invoice.update({
    where: { id: localInvoice.id },
    data: {
      status: 'PAID',
      paidAt: new Date(),
    },
  })

  await sendPaymentConfirmationEmail({
    clientName: localInvoice.client.user.name || '',
    email: localInvoice.client.user.email,
    invoiceNumber: localInvoice.invoiceNumber,
    amount: localInvoice.amount,
    currency: localInvoice.currency,
    paidDate: new Date().toLocaleDateString(),
  })
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const localInvoice = await prisma.invoice.findFirst({
    where: { stripeInvoiceId: invoice.id },
  })

  if (!localInvoice || localInvoice.status === 'PAID') return

  // Mark overdue on payment failure (or keep as SENT — design decision)
  await prisma.invoice.update({
    where: { id: localInvoice.id },
    data: { status: 'OVERDUE' },
  })
}
```

### Pattern 4: Stripe Customer Portal (Server Action)

**What:** Server action that creates a portal session and redirects the client.
**Requires:** `stripeCustomerId` from the Subscription model.

```typescript
// Source: Stripe docs - docs.stripe.com/customer-management/integrate-customer-portal
// app/actions/billing.ts (same file as createInvoice)

export async function redirectToCustomerPortal() {
  const { userId } = await verifySession()

  const client = await prisma.client.findUnique({
    where: { userId },
    include: {
      subscriptions: { select: { stripeCustomerId: true } },
    },
  })

  const stripeCustomerId = client?.subscriptions[0]?.stripeCustomerId

  if (!stripeCustomerId) {
    // Client has no Stripe customer yet — cannot access portal
    throw new Error('No billing account found. Contact support.')
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
  })

  redirect(portalSession.url)
}
```

### Pattern 5: Accessing Invoice PDF

**What:** Stripe provides `hosted_invoice_url` (payment page) and `invoice_pdf` (PDF download) on every finalized invoice object. No server-side PDF generation is needed.

```typescript
// Source: docs.stripe.com/api/invoices/object + docs.stripe.com/invoicing/hosted-invoice-page

// To get the latest URLs (they expire), retrieve the Stripe invoice from the API:
const stripeInvoice = await stripe.invoices.retrieve(localInvoice.stripeInvoiceId!)
// stripeInvoice.hosted_invoice_url — payment page (expires 30d after due date, max 120d)
// stripeInvoice.invoice_pdf       — PDF download URL (same expiry)

// For the client billing page, retrieve on demand when client clicks "Download PDF":
// GET /api/invoices/[invoiceId]/pdf → returns { url: stripeInvoice.invoice_pdf }
```

**URL expiry:** Stripe invoice URLs expire 30 days after the due date (max 120 days total). URLs retrieved from the API are guaranteed valid for at least 10 days. Retrieve on-demand rather than storing URLs.

### Anti-Patterns to Avoid

- **Using `req.json()` in webhook handler:** Mutates the body, breaks signature verification. Always use `req.text()`.
- **Storing `hosted_invoice_url` in DB and treating it as permanent:** URLs expire. Retrieve from Stripe API on demand.
- **Creating Stripe customer during client signup:** Use lazy creation — only create when first invoice is needed. This avoids Stripe customer objects for clients who never get invoiced.
- **Calling `stripe.invoices.finalizeInvoice()` then `stripe.invoices.sendInvoice()` separately without awaiting each:** Finalize must complete before send. Both must be awaited.
- **Handling `payment_intent.succeeded` for invoice billing:** Use `invoice.paid` instead — it's the definitive event for invoice payment completion, regardless of payment method.
- **No idempotency check in webhook:** Stripe can deliver the same event multiple times. Always check if DB is already in the target state before updating.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Invoice PDF generation | Custom PDF with jspdf/pdf-lib | Stripe `invoice_pdf` URL | Stripe auto-generates PDFs for finalized invoices with correct formatting, currency, line items |
| Payment form UI | Custom card form with stripe.js | Stripe hosted invoice page (`hosted_invoice_url`) | Handles 3DS, multiple payment methods, PCI compliance automatically |
| Customer billing portal | Custom "manage payment method" UI | `stripe.billingPortal.sessions.create()` | Handles payment method update, subscription management, invoice history |
| Invoice numbering with sequential IDs | Custom atomic counter | Simple count-based approach is fine | DB count + 1 is adequate; Stripe assigns its own invoice number separately |
| Webhook signature verification | Parse `Stripe-Signature` header manually | `stripe.webhooks.constructEvent()` | Handles timing attacks, handles v1 vs v0 signatures, handles timestamp tolerance |
| Duplicate webhook protection with external queue | Redis/queue system | Check `localInvoice.status === 'PAID'` before updating | At this scale, DB-state idempotency check is sufficient without a full queue |

**Key insight:** Stripe already solved invoice PDFs, hosted payment pages, and billing portal. Don't rebuild what Stripe provides.

---

## Common Pitfalls

### Pitfall 1: Raw Body Parsing in Webhook Route

**What goes wrong:** Developer calls `await req.json()` in the webhook handler. Stripe signature verification fails with "No signatures found matching the expected signature for payload." Webhooks return 400 and Stripe starts retrying.

**Why it happens:** `req.json()` parses the body (potentially reordering keys, changing whitespace). Stripe signs the exact raw bytes. Any modification breaks the HMAC signature.

**How to avoid:** Always use `await req.text()` in the webhook route handler. Never import or use any body parsing middleware on the webhook route.

**Warning signs:** `WebhookSignatureVerificationError` or "No signatures found" in console logs.

### Pitfall 2: Missing Stripe Customer at Invoice Creation Time

**What goes wrong:** Admin tries to create invoice for a client that has no Subscription record (no `stripeCustomerId`). The Stripe API call fails with "customer is required."

**Why it happens:** Not all clients have a Stripe customer — they may have been created before Phase 10 or without a subscription.

**How to avoid:** In `createInvoice()`, always do a lazy upsert: check for existing `stripeCustomerId`, create Stripe customer if missing, store it before creating the invoice.

**Warning signs:** `StripeInvalidRequestError: No such customer` during invoice creation.

### Pitfall 3: Looking Up Local Invoice in Webhook Without `stripeInvoiceId`

**What goes wrong:** The webhook receives `invoice.paid` but cannot find the corresponding local DB record. Invoice status never updates.

**Why it happens:** `stripeInvoiceId` was not stored when the invoice was created, or the webhook lookup uses `metadata.clientId` instead of the direct `stripeInvoiceId`.

**How to avoid:** Always store `stripeInvoiceId` on the local Invoice record immediately after `stripe.invoices.create()`. Look up by `stripeInvoiceId` in webhook handlers.

**Warning signs:** Webhook logs show "no local invoice for Stripe ID X" but Stripe Dashboard shows invoice paid.

### Pitfall 4: Stripe Customer Portal Requires Prior Configuration

**What goes wrong:** Portal session creation succeeds but the portal shows no invoices, no payment method management, or throws a configuration error.

**Why it happens:** The Stripe Customer Portal must be configured in the Stripe Dashboard (Settings > Billing > Customer Portal) before it will work. Features like "invoice history" must be explicitly enabled.

**How to avoid:** Configure the portal in Stripe Dashboard before testing. Enable: invoice history, payment method management. Set the default return URL.

**Warning signs:** Portal loads but shows empty state, or API returns "No configuration was provided."

### Pitfall 5: Webhook Secret Mismatch Between Test and Production

**What goes wrong:** Webhooks work in development (Stripe CLI) but fail in production.

**Why it happens:** The Stripe CLI provides a different webhook secret (`whsec_...`) than the Dashboard endpoint secret. Using the CLI secret in production (or vice versa) causes signature failures.

**How to avoid:** Use `STRIPE_WEBHOOK_SECRET` for the Dashboard endpoint secret in production. For local dev, use `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and copy the CLI-provided secret into `.env.local`.

**Warning signs:** Webhooks fail immediately in production with 400 after working perfectly in development.

### Pitfall 6: Invoice URL Expiry

**What goes wrong:** Client clicks "Pay" or "Download PDF" link stored in the DB and gets a 404/expired error from Stripe.

**Why it happens:** `hosted_invoice_url` and `invoice_pdf` URLs expire 30 days after the due date (max 120 days). Stored URLs become invalid.

**How to avoid:** Never store `hosted_invoice_url` or `invoice_pdf` as permanent DB fields. Retrieve them on-demand from `stripe.invoices.retrieve(stripeInvoiceId)` when the client requests them. Add `hosted_invoice_url` as a transient field in the API response, not persisted in DB.

**Warning signs:** PDF/pay links work initially then return 404 after ~30 days.

### Pitfall 7: Stripe Customer Portal and Individual Invoice "Pay Now" Are Separate Flows

**What goes wrong:** Developer tries to use the billing portal to direct a client to pay a specific invoice, but the portal shows all invoices without deep-linking to one.

**Why it happens:** The Customer Portal is a general billing management interface. For "Pay Now" on a specific invoice, use the `hosted_invoice_url` from that specific Stripe invoice object, not a portal session.

**How to avoid:** Use `hosted_invoice_url` for "Pay Invoice" buttons. Use portal session for "Manage Billing" / "Update Payment Method" buttons. These are different UX flows.

---

## Code Examples

### Stripe Initialization (Already in Project)

```typescript
// Source: lib/stripe.ts (existing file)
import Stripe from "stripe"

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-01-28.clover",
  typescript: true,
})
```

### Create Stripe Invoice with Line Items

```typescript
// Source: docs.stripe.com/invoicing/integration/quickstart

// Step 1: Create invoice
const stripeInvoice = await stripe.invoices.create({
  customer: stripeCustomerId,        // Required: existing Stripe customer ID
  collection_method: 'send_invoice', // Stripe emails invoice to customer
  days_until_due: 30,
  metadata: { clientId: localClientId },  // For webhook lookup
})

// Step 2: Add line items (must be done before finalize)
await stripe.invoiceItems.create({
  customer: stripeCustomerId,
  invoice: stripeInvoice.id,
  amount: 150000,         // $1,500.00 in cents
  currency: 'usd',
  description: 'Monthly retainer',
})

// Step 3: Finalize (locks the invoice, generates hosted_invoice_url)
const finalized = await stripe.invoices.finalizeInvoice(stripeInvoice.id)
// finalized.hosted_invoice_url — use this in email/DB
// finalized.invoice_pdf        — direct PDF download

// Step 4: Send (emails the invoice to the customer via Stripe)
await stripe.invoices.sendInvoice(finalized.id)
```

### Create Customer Portal Session

```typescript
// Source: docs.stripe.com/customer-management/integrate-customer-portal

const portalSession = await stripe.billingPortal.sessions.create({
  customer: stripeCustomerId,
  return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
})

redirect(portalSession.url)  // Redirect user to portal URL
```

### Retrieve Invoice for PDF/Pay Links (On-Demand)

```typescript
// Source: docs.stripe.com/api/invoices/retrieve

// In an API route: GET /api/invoices/[invoiceId]/urls
export async function GET(req: Request, { params }: { params: { invoiceId: string } }) {
  const { userId } = await verifySession()

  const localInvoice = await prisma.invoice.findUnique({
    where: { id: params.invoiceId },
    include: { client: { include: { user: { select: { id: true } } } } },
  })

  if (localInvoice?.client.user.id !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const stripeInvoice = await stripe.invoices.retrieve(localInvoice.stripeInvoiceId!)
  return NextResponse.json({
    payUrl: stripeInvoice.hosted_invoice_url,
    pdfUrl: stripeInvoice.invoice_pdf,
  })
}
```

### Webhook: Verify + Handle Invoice Events

```typescript
// Source: docs.stripe.com/webhooks + verified App Router pattern

export async function POST(req: Request) {
  const body = await req.text()                              // Raw body - critical
  const signature = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object as Stripe.Invoice)
      break
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
      break
  }

  return NextResponse.json({ received: true })
}
```

---

## Schema Considerations

### Current Schema Analysis

The current Invoice model has:
- `stripeInvoiceId String?` — correct, used to find invoice in webhooks
- No `hostedInvoiceUrl` field — retrieve on-demand from Stripe API, do not store

The Subscription model has `stripeCustomerId String? @unique` — this is the lookup path for portal sessions.

### Webhook Lookup Chain

```
invoice.paid event → event.data.object.id (Stripe invoice ID)
→ prisma.invoice.findFirst({ where: { stripeInvoiceId: stripeId } })
→ localInvoice.clientId
→ client.user.email (for confirmation email)
```

### Portal Lookup Chain

```
Client requests portal →
→ prisma.client.findUnique({ where: { userId }, include: { subscriptions } })
→ client.subscriptions[0].stripeCustomerId
→ stripe.billingPortal.sessions.create({ customer: stripeCustomerId })
```

### No Schema Migration Needed

The existing Invoice and Subscription models support this phase without changes. The only consideration: if you want to store `stripeCustomerId` directly on `Invoice` for faster webhook lookup, you could add it, but the join through `Subscription` is sufficient.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `export const config = { api: { bodyParser: false } }` (Pages Router) | `await req.text()` (App Router) | Config export is ignored/deprecated in App Router; use Web API |
| Custom payment form with Stripe Elements | `hosted_invoice_url` redirect for invoices | Simpler, PCI compliant by default for this use case |
| Pages Router API routes | App Router route handlers in `app/api/` | Route handlers return `Response`/`NextResponse`, not `res.json()` |
| `stripe.invoices.pay()` | `stripe.invoices.finalizeInvoice()` + `stripe.invoices.sendInvoice()` | Send vs charge-automatically — depends on `collection_method` |

**Current Stripe API version in project:** `2026-01-28.clover` — this is the latest SDK-pinned version. No changes needed.

---

## Webhook Events to Handle

Based on official Stripe documentation (docs.stripe.com/billing/subscriptions/webhooks):

| Event | When Fired | Required Action |
|-------|-----------|----------------|
| `invoice.paid` | Payment succeeds | Update DB status → PAID, set paidAt, send confirmation email |
| `invoice.payment_failed` | Payment fails | Update DB status → OVERDUE, optionally notify client |
| `invoice.finalized` | Invoice finalized (optional) | No action needed — handled by creation flow |

**Not needed for this phase:**
- `customer.subscription.updated` — no subscription management in Phase 10
- `payment_intent.succeeded` — use `invoice.paid` instead for invoice billing
- `invoice.created` — not needed; we create invoices ourselves

---

## Environment Variables Required

```bash
# .env.local (development)
STRIPE_SECRET_KEY=sk_test_...          # Test mode secret key
STRIPE_WEBHOOK_SECRET=whsec_...        # From: stripe listen --forward-to localhost:3000/api/webhooks/stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Not needed for hosted invoice approach, but good to have

# .env.production (separate file for live mode)
STRIPE_SECRET_KEY=sk_live_...          # Live mode secret key
STRIPE_WEBHOOK_SECRET=whsec_...        # From Stripe Dashboard > Webhooks > signing secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Already set (from prior phases)
NEXT_PUBLIC_APP_URL=https://your-domain.com   # Used in email links and return_url
```

**Stripe Dashboard configuration required:**
1. Create a webhook endpoint pointing to `https://your-domain.com/api/webhooks/stripe`
2. Subscribe to events: `invoice.paid`, `invoice.payment_failed`
3. Configure Customer Portal in Settings > Billing > Customer Portal (enable invoice history)
4. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`

---

## Open Questions

1. **Stripe Customer Portal Configuration**
   - What we know: Portal must be configured in Stripe Dashboard before it works
   - What's unclear: Whether the project's Stripe account already has portal configured
   - Recommendation: Plan task to verify/configure portal in Dashboard as explicit step

2. **Admin Invoice Number Format**
   - What we know: Current schema has `invoiceNumber String @unique`; count-based approach works
   - What's unclear: Whether the client wants a specific format (e.g., `INV-2026-0001` vs `INV-0001`)
   - Recommendation: Use `INV-${year}-${padded count}` format for clarity

3. **`invoice.payment_failed` → OVERDUE vs staying SENT**
   - What we know: When Stripe fails payment on a `send_invoice` type, the invoice stays `open` in Stripe
   - What's unclear: Whether a payment failure should immediately set status to OVERDUE or wait for manual review
   - Recommendation: Set to OVERDUE on payment failure. The client's billing page already handles the OVERDUE status with a warning icon.

4. **Stripe Customer Portal and "Pay Now" for specific invoices**
   - What we know: The portal shows invoice history but doesn't deep-link to a specific invoice payment flow in the standard integration
   - What's unclear: Whether the team wants "Pay Now" buttons on individual invoices or just a general portal link
   - Recommendation: Use `hosted_invoice_url` for per-invoice "Pay Now" buttons AND a separate "Manage Billing" button that goes to the portal. Both appear on the billing page.

5. **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` necessity**
   - What we know: Not needed if using hosted invoice page + server-side portal redirect
   - What's unclear: If Payment Element will be added in a future phase
   - Recommendation: Add to env vars but don't use in Phase 10. Ready for future phases.

---

## Sources

### Primary (HIGH confidence)
- `https://docs.stripe.com/webhooks` — Webhook best practices, signature verification, event handling
- `https://docs.stripe.com/invoicing/integration/quickstart` — Complete invoice creation flow (customer → invoice → items → finalize → send)
- `https://docs.stripe.com/customer-management/integrate-customer-portal` — Customer Portal session creation and redirect flow
- `https://docs.stripe.com/api/invoices/object` — Invoice object fields including `hosted_invoice_url`, `invoice_pdf`, `metadata`
- `https://docs.stripe.com/billing/subscriptions/webhooks` — Recommended webhook events for invoice billing
- `https://docs.stripe.com/invoicing/hosted-invoice-page` — Hosted invoice page capabilities and URL expiry
- `https://docs.stripe.com/metadata/use-cases` — Metadata for linking Stripe objects to local DB records
- `https://docs.stripe.com/invoicing/integration/workflow-transitions` — Invoice status transitions, `invoice.paid` and `invoice.payment_failed` events
- `https://www.hookrelay.io/guides/nextjs-webhook-stripe` — Verified webhook implementation with idempotency pattern

### Secondary (MEDIUM confidence)
- `https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/` — Server action patterns for Next.js + Stripe (code verified against official docs)
- `https://github.com/t3dotgg/stripe-recommendations` — Stripe architecture recommendations (lazy creation, sync patterns)
- `https://support.stripe.com/questions/invoice-link-expiration` — URL expiry details (30d after due date, max 120d)

### Tertiary (LOW confidence)
- WebSearch: App Router config export `bodyParser: false` is deprecated — verified against official Stripe + Next.js docs, upgraded to HIGH

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed, versions confirmed in package.json
- Architecture: HIGH — patterns verified against official Stripe docs and working Next.js 15 examples
- Webhook implementation: HIGH — official docs + verified community pattern agree on `req.text()` approach
- Pitfalls: HIGH — each pitfall verified against official documentation sources
- Schema: HIGH — directly read from prisma/schema.prisma

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (Stripe API changes infrequently; webhook and invoice patterns are stable)
