import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { sendPaymentConfirmationEmail } from '@/lib/email'
import Stripe from 'stripe'

/**
 * Stripe webhook handler
 *
 * CRITICAL: Uses req.text() (raw body) NOT req.json()
 * Raw body is required for Stripe signature verification.
 *
 * Handles:
 * - invoice.paid → updates Invoice to PAID, sends payment confirmation email
 * - invoice.payment_failed → updates Invoice to OVERDUE
 *
 * Always returns 200 (even for unhandled events or errors) to prevent
 * Stripe retry storms.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Read raw body — MUST be req.text(), not req.json()
  const body = await req.text()

  // 2. Get Stripe signature header
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    console.error('Stripe webhook: missing stripe-signature header')
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  // 3. Verify webhook signature
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Stripe webhook signature verification failed:', message)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  // 4. Handle events — wrap in try/catch, always return 200 to prevent retry storms
  try {
    switch (event.type) {
      case 'invoice.paid': {
        const stripeInvoice = event.data.object as Stripe.Invoice

        // Find local invoice by Stripe invoice ID
        const localInvoice = await prisma.invoice.findFirst({
          where: { stripeInvoiceId: stripeInvoice.id },
        })

        if (!localInvoice) {
          // Check if this is a subscription-generated invoice (Stripe v20: parent.subscription_details)
          const parentSub = stripeInvoice.parent?.subscription_details?.subscription ?? null
          const subscriptionId = parentSub
            ? (typeof parentSub === 'string' ? parentSub : parentSub.id)
            : null
          if (!subscriptionId) {
            console.warn(
              `Stripe webhook: invoice.paid — no local invoice for stripeInvoiceId=${stripeInvoice.id}`
            )
            break
          }

          // Look up local subscription by stripeCustomerId to get clientId
          const localSubscription = await prisma.subscription.findFirst({
            where: { stripeCustomerId: stripeInvoice.customer as string },
          })

          if (!localSubscription) {
            console.warn(
              `Stripe webhook: invoice.paid — subscription invoice but no local subscription for customer=${stripeInvoice.customer}`
            )
            break
          }

          // Generate invoice number: INV-YYYY-NNNN
          const totalInvoices = await prisma.invoice.count()
          const invoiceNumber = `INV-${new Date().getFullYear()}-${String(totalInvoices + 1).padStart(4, '0')}`

          // Build items from Stripe line items
          const lineItems = stripeInvoice.lines.data.map((line) => ({
            description: line.description || 'Monthly Retainer',
            amount: line.amount / 100,
          }))

          const totalAmount = stripeInvoice.amount_paid / 100
          const currency = stripeInvoice.currency
          const description =
            stripeInvoice.description ||
            lineItems[0]?.description ||
            'Monthly Retainer'
          const dueDate = stripeInvoice.due_date
            ? new Date(stripeInvoice.due_date * 1000)
            : new Date()

          // Create local invoice record
          const createdInvoice = await prisma.invoice.create({
            data: {
              clientId: localSubscription.clientId,
              invoiceNumber,
              amount: totalAmount,
              currency,
              status: 'PAID',
              dueDate,
              paidAt: new Date(),
              description,
              items: JSON.stringify(lineItems),
              stripeInvoiceId: stripeInvoice.id,
            },
          })

          // Send payment confirmation email
          const subClient = await prisma.client.findUnique({
            where: { id: localSubscription.clientId },
            include: { user: { select: { email: true, name: true } } },
          })

          if (subClient) {
            sendPaymentConfirmationEmail({
              clientName: subClient.user.name || subClient.companyName,
              email: subClient.user.email,
              invoiceNumber,
              amount: totalAmount,
              currency,
              paidDate: new Date().toLocaleDateString(),
            }).catch((err) => {
              console.error('Failed to send payment confirmation email:', err)
            })
          }

          revalidatePath(`/admin/clients/${localSubscription.clientId}/invoices`)
          revalidatePath('/dashboard/billing')

          console.info(
            `Stripe webhook: invoice.paid — created local invoice for subscription (invoiceId=${createdInvoice.id})`
          )
          break
        }

        // Idempotency: skip if already PAID
        if (localInvoice.status === 'PAID') {
          console.info(
            `Stripe webhook: invoice.paid — already PAID, skipping (invoiceId=${localInvoice.id})`
          )
          break
        }

        // Update invoice status to PAID
        await prisma.invoice.update({
          where: { id: localInvoice.id },
          data: {
            status: 'PAID',
            paidAt: new Date(),
          },
        })

        // Look up client with user for email notification
        const client = await prisma.client.findUnique({
          where: { id: localInvoice.clientId },
          include: {
            user: {
              select: {
                email: true,
                name: true,
              },
            },
          },
        })

        if (client) {
          // Fire-and-forget: email failures should not prevent 200 response
          sendPaymentConfirmationEmail({
            clientName: client.user.name || client.companyName,
            email: client.user.email,
            invoiceNumber: localInvoice.invoiceNumber,
            amount: localInvoice.amount,
            currency: localInvoice.currency,
            paidDate: new Date().toLocaleDateString(),
          }).catch((err) => {
            console.error('Failed to send payment confirmation email:', err)
          })
        }

        console.info(
          `Stripe webhook: invoice.paid — updated to PAID (invoiceId=${localInvoice.id})`
        )
        break
      }

      case 'invoice.payment_failed': {
        const stripeInvoice = event.data.object as Stripe.Invoice

        // Find local invoice by Stripe invoice ID
        const localInvoice = await prisma.invoice.findFirst({
          where: { stripeInvoiceId: stripeInvoice.id },
        })

        if (!localInvoice) {
          // Might be an external invoice not in our DB — log and continue
          console.warn(
            `Stripe webhook: invoice.payment_failed — no local invoice for stripeInvoiceId=${stripeInvoice.id}`
          )
          break
        }

        // Idempotency: skip if already OVERDUE
        if (localInvoice.status === 'OVERDUE') {
          console.info(
            `Stripe webhook: invoice.payment_failed — already OVERDUE, skipping (invoiceId=${localInvoice.id})`
          )
          break
        }

        // Update invoice status to OVERDUE
        await prisma.invoice.update({
          where: { id: localInvoice.id },
          data: { status: 'OVERDUE' },
        })

        console.info(
          `Stripe webhook: invoice.payment_failed — updated to OVERDUE (invoiceId=${localInvoice.id})`
        )
        break
      }

      case 'customer.subscription.deleted': {
        const stripeSubscription = event.data.object as Stripe.Subscription

        // Find local subscription by stripeSubscriptionId
        const localSubscription = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: stripeSubscription.id },
        })

        if (!localSubscription) {
          console.warn(
            `Stripe webhook: customer.subscription.deleted — no local subscription for stripeSubscriptionId=${stripeSubscription.id}`
          )
          return NextResponse.json({ received: true }, { status: 200 })
        }

        // Mark subscription as inactive and clear Stripe IDs
        await prisma.subscription.update({
          where: { id: localSubscription.id },
          data: {
            status: 'inactive',
            stripeSubscriptionId: null,
            currentPeriodEnd: null,
          },
        })

        console.info(
          `Stripe webhook: customer.subscription.deleted — marked inactive (subscriptionId=${localSubscription.id})`
        )
        break
      }

      case 'customer.subscription.updated': {
        const stripeSubscription = event.data.object as Stripe.Subscription

        // Find local subscription by stripeSubscriptionId
        const localSubscription = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: stripeSubscription.id },
        })

        if (!localSubscription) {
          console.warn(
            `Stripe webhook: customer.subscription.updated — no local subscription for stripeSubscriptionId=${stripeSubscription.id}`
          )
          return NextResponse.json({ received: true }, { status: 200 })
        }

        // Update status and period end
        await prisma.subscription.update({
          where: { id: localSubscription.id },
          data: {
            status: stripeSubscription.cancel_at_period_end
              ? 'cancelling'
              : stripeSubscription.status,
            currentPeriodEnd: new Date(
              (stripeSubscription as unknown as { current_period_end: number }).current_period_end * 1000
            ),
          },
        })

        console.info(
          `Stripe webhook: customer.subscription.updated — updated (subscriptionId=${localSubscription.id})`
        )
        break
      }

      default:
        // Unhandled event types — log and return 200 (not an error)
        console.info(`Stripe webhook: unhandled event type "${event.type}"`)
        break
    }
  } catch (err) {
    // Log internal errors but still return 200 to prevent Stripe retry storms
    console.error('Stripe webhook handler error:', err)
  }

  return NextResponse.json({ received: true })
}
