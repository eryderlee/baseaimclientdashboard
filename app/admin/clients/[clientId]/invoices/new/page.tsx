import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { verifySession, getAdminClientForBilling } from "@/lib/dal"
import { CreateInvoiceForm } from "@/components/admin/create-invoice-form"
import { Button } from "@/components/ui/button"

export default async function NewInvoicePage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  // 1. Verify admin access
  const { userRole } = await verifySession()
  if (userRole !== "ADMIN") {
    redirect("/dashboard")
  }

  // 2. Await params (Next.js 16+ async params)
  const { clientId } = await params

  // 3. Fetch client data for page title
  const client = await getAdminClientForBilling(clientId)

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/clients/${clientId}/invoices`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          New Invoice for {client.companyName}
        </h1>
        <p className="text-neutral-500 mt-1">
          Create and send an invoice — Stripe will email the client
        </p>
      </div>

      {/* Form */}
      <CreateInvoiceForm clientId={clientId} />
    </div>
  )
}
