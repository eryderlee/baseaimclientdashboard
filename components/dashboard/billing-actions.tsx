'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Download, CreditCard, Loader2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { createPortalSession } from '@/app/actions/billing'

// ─── InvoiceActions ───────────────────────────────────────────────────────────

interface InvoiceActionsProps {
  invoiceId: string
  status: string
}

interface InvoiceUrls {
  hosted_invoice_url: string | null
  invoice_pdf: string | null
}

async function fetchInvoiceUrls(invoiceId: string): Promise<InvoiceUrls> {
  const res = await fetch(`/api/invoices/${invoiceId}/urls`)
  if (!res.ok) {
    throw new Error('Failed to fetch invoice URLs')
  }
  return res.json()
}

export function InvoiceActions({ invoiceId, status }: InvoiceActionsProps) {
  const [payLoading, setPayLoading] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)

  const showPayNow = status === 'SENT' || status === 'OVERDUE'
  const showDownload = status !== 'DRAFT'

  const handlePayNow = async () => {
    setPayLoading(true)
    try {
      const { hosted_invoice_url } = await fetchInvoiceUrls(invoiceId)
      if (hosted_invoice_url) {
        window.open(hosted_invoice_url, '_blank')
      } else {
        toast.error('Payment link unavailable')
      }
    } catch {
      toast.error('Payment link unavailable')
    } finally {
      setPayLoading(false)
    }
  }

  const handleDownload = async () => {
    setDownloadLoading(true)
    try {
      const { invoice_pdf } = await fetchInvoiceUrls(invoiceId)
      if (invoice_pdf) {
        window.open(invoice_pdf, '_blank')
      } else {
        toast.error('PDF not available')
      }
    } catch {
      toast.error('PDF not available')
    } finally {
      setDownloadLoading(false)
    }
  }

  return (
    <div className="flex justify-end gap-2">
      {showPayNow && (
        <Button
          size="sm"
          onClick={handlePayNow}
          disabled={payLoading}
        >
          {payLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <ExternalLink className="h-4 w-4 mr-1" />
              Pay Now
            </>
          )}
        </Button>
      )}
      {showDownload && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          disabled={downloadLoading}
          title="Download PDF"
        >
          {downloadLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  )
}

// ─── ManageBillingButton ──────────────────────────────────────────────────────

export function ManageBillingButton() {
  const [isPending, startTransition] = useTransition()

  const handleManageBilling = () => {
    startTransition(async () => {
      const result = await createPortalSession()
      if (result.success && result.url) {
        window.location.href = result.url
      } else {
        toast.error(result.error || 'Failed to open billing portal')
      }
    })
  }

  return (
    <Button
      variant="outline"
      onClick={handleManageBilling}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <CreditCard className="h-4 w-4 mr-2" />
      )}
      Manage Billing
    </Button>
  )
}
