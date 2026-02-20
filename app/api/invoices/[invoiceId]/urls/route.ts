import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/invoices/[invoiceId]/urls
 *
 * Returns Stripe hosted_invoice_url and invoice_pdf for a given invoice.
 * URLs are retrieved on-demand from Stripe (never stored in DB — they expire).
 *
 * Authorization: session user must be ADMIN or the client who owns the invoice.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
): Promise<NextResponse> {
  // 1. Verify session
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Get invoiceId from params
  const { invoiceId } = await params

  // 3. Look up invoice in DB
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      client: {
        select: {
          userId: true,
        },
      },
    },
  })

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  // 4. Verify authorization: must be admin OR the client who owns the invoice
  const isAdmin = session.user.role === 'ADMIN'
  const isOwner = invoice.client.userId === session.user.id

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 5. If no stripeInvoiceId, return null URLs (invoice not yet in Stripe)
  if (!invoice.stripeInvoiceId) {
    return NextResponse.json({
      hosted_invoice_url: null,
      invoice_pdf: null,
    })
  }

  // 6. Retrieve URLs from Stripe on-demand (never cache in DB — they expire)
  try {
    const stripeInvoice = await stripe.invoices.retrieve(invoice.stripeInvoiceId)

    return NextResponse.json({
      hosted_invoice_url: stripeInvoice.hosted_invoice_url ?? null,
      invoice_pdf: stripeInvoice.invoice_pdf ?? null,
    })
  } catch (err) {
    console.error(
      `Failed to retrieve Stripe invoice URLs (stripeInvoiceId=${invoice.stripeInvoiceId}):`,
      err
    )
    return NextResponse.json(
      { error: 'Failed to retrieve invoice URLs from Stripe' },
      { status: 502 }
    )
  }
}
