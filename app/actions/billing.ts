'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { verifySession, getCurrentClientId } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { sendInvoiceCreatedEmail } from '@/lib/email'

// ─── Schemas ─────────────────────────────────────────────────────────────────

const InvoiceItemSchema = z.object({
  description: z.string().min(1, 'Item description is required'),
  amount: z.number().positive('Amount must be positive'),
})

const CreateInvoiceSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  description: z.string().min(1, 'Description is required'),
  items: z.array(InvoiceItemSchema).min(1, 'At least one item is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  currency: z.string().default('usd'),
})

// ─── Types ───────────────────────────────────────────────────────────────────

interface ActionResult {
  success: boolean
  error?: string
  invoiceId?: string
  url?: string
}

// ─── Server Actions ───────────────────────────────────────────────────────────

/**
 * Create a Stripe invoice for a client
 * ADMIN role only
 * - Gets or creates a Stripe customer lazily
 * - Creates line items in Stripe
 * - Finalizes and sends the invoice via Stripe
 * - Saves the invoice to the local DB
 * - Sends notification email to client
 */
export async function createInvoice(formData: FormData): Promise<ActionResult> {
  try {
    // 1. Verify admin session
    const { userRole } = await verifySession()
    if (userRole !== 'ADMIN') {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    // 2. Parse and validate input
    const rawItems = formData.get('items')
    let parsedItems: Array<{ description: string; amount: number }> = []
    try {
      parsedItems = JSON.parse(rawItems as string)
    } catch {
      return { success: false, error: 'Invalid items format' }
    }

    const validation = CreateInvoiceSchema.safeParse({
      clientId: formData.get('clientId'),
      description: formData.get('description'),
      items: parsedItems,
      dueDate: formData.get('dueDate'),
      currency: formData.get('currency') || 'usd',
    })

    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message }
    }

    const { clientId, description, items, dueDate, currency } = validation.data

    // 3. Get client data (user email, companyName, subscriptions)
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        subscriptions: {
          select: {
            id: true,
            stripeCustomerId: true,
          },
        },
      },
    })

    if (!client) {
      return { success: false, error: 'Client not found' }
    }

    const clientEmail = client.user.email
    const clientName = client.user.name || client.companyName

    // 4. Get or create Stripe customer (lazy creation)
    let stripeCustomerId: string
    const existingSubscription = client.subscriptions.find(
      (s) => s.stripeCustomerId !== null
    )

    if (existingSubscription?.stripeCustomerId) {
      stripeCustomerId = existingSubscription.stripeCustomerId
    } else {
      // Create new Stripe customer
      const stripeCustomer = await stripe.customers.create({
        email: clientEmail,
        name: client.companyName,
        metadata: { clientId },
      })
      stripeCustomerId = stripeCustomer.id

      // Upsert a Subscription record with the new stripeCustomerId
      await prisma.subscription.upsert({
        where: {
          // Try to find by clientId if a subscription exists
          id: existingSubscription?.id || '',
        },
        update: {
          stripeCustomerId: stripeCustomerId,
        },
        create: {
          clientId,
          stripeCustomerId: stripeCustomerId,
          status: 'inactive',
        },
      })
    }

    // 5. Calculate days until due
    const dueDateObj = new Date(dueDate)
    const now = new Date()
    const daysDiff = Math.max(
      1,
      Math.ceil((dueDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    )

    // 6. Create Stripe invoice
    const stripeInvoice = await stripe.invoices.create({
      customer: stripeCustomerId,
      collection_method: 'send_invoice',
      days_until_due: daysDiff,
      metadata: { clientId },
      description,
    })

    // 7. Add line items to the invoice
    for (const item of items) {
      await stripe.invoiceItems.create({
        customer: stripeCustomerId,
        invoice: stripeInvoice.id,
        amount: Math.round(item.amount * 100), // Convert to cents
        currency,
        description: item.description,
      })
    }

    // 8. Finalize the invoice (makes it ready to send)
    await stripe.invoices.finalizeInvoice(stripeInvoice.id)

    // 9. Send the invoice via Stripe (emails the client)
    await stripe.invoices.sendInvoice(stripeInvoice.id)

    // 10. Generate invoice number: INV-YYYY-NNNN
    const totalInvoices = await prisma.invoice.count()
    const invoiceCount = totalInvoices + 1
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount).padStart(4, '0')}`

    // 11. Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)

    // 12. Save invoice to local DB
    const localInvoice = await prisma.invoice.create({
      data: {
        clientId,
        invoiceNumber,
        amount: totalAmount,
        currency,
        status: 'SENT',
        dueDate: dueDateObj,
        description,
        items: JSON.stringify(items),
        stripeInvoiceId: stripeInvoice.id,
      },
    })

    // 13. Send notification email (fire-and-forget — email failures don't block flow)
    const viewUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/billing`
    sendInvoiceCreatedEmail({
      clientName,
      email: clientEmail,
      invoiceNumber,
      amount: totalAmount,
      currency,
      dueDate: dueDateObj.toLocaleDateString(),
      viewUrl,
    }).catch((err) => {
      console.error('Failed to send invoice created email:', err)
    })

    // 14. Revalidate paths
    revalidatePath(`/admin/clients/${clientId}/invoices`)
    revalidatePath('/dashboard/billing')

    return { success: true, invoiceId: localInvoice.id }
  } catch (error) {
    console.error('createInvoice error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create invoice',
    }
  }
}

/**
 * Create a Stripe Customer Portal session for the current client
 * CLIENT role only
 * Returns the portal URL for redirecting the client
 */
export async function createPortalSession(): Promise<ActionResult> {
  try {
    // 1. Verify client session
    const { userRole } = await verifySession()
    if (userRole !== 'CLIENT') {
      return { success: false, error: 'Unauthorized: Client access only' }
    }

    // 2. Get current client ID
    const clientId = await getCurrentClientId()
    if (!clientId) {
      return { success: false, error: 'Client profile not found' }
    }

    // 3. Look up stripeCustomerId from Subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        clientId,
        stripeCustomerId: { not: null },
      },
      select: { stripeCustomerId: true },
    })

    if (!subscription?.stripeCustomerId) {
      return { success: false, error: 'No billing account found' }
    }

    // 4. Create Stripe Customer Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/billing`,
    })

    return { success: true, url: session.url }
  } catch (error) {
    console.error('createPortalSession error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create portal session',
    }
  }
}
