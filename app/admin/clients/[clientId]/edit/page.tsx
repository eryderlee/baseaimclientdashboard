import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { verifySession, getClientForEdit } from "@/lib/dal"
import { ClientForm } from "@/components/admin/client-form"
import { PasswordResetSection } from "@/components/admin/password-reset-section"
import { DeleteClientSection } from "@/components/admin/delete-client-section"
import { LeadDestinationSection } from "@/components/admin/lead-destination-section"
import { BookingSystemSection } from "@/components/admin/booking-system-section"
import type { LeadDestinations, BookingSystemConfig } from "@/app/admin/actions"
import { Button } from "@/components/ui/button"

export default async function ClientEditPage({
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

  // 3. Fetch client data via DAL
  const client = await getClientForEdit(clientId)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Edit Client - {client.companyName}
        </h1>
        <p className="text-neutral-500 mt-1">
          {client.user.email}
        </p>
      </div>

      <ClientForm
        mode="edit"
        clientId={clientId}
        defaultValues={{
          name: client.user.name || '',
          companyName: client.companyName,
          industry: client.industry || undefined,
          website: client.website || undefined,
          phone: client.phone || undefined,
          address: client.address || undefined,
          adAccountId: client.adAccountId || undefined,
          leadsChartEnabled: client.leadsChartEnabled,
          baseaimDomainEnabled: client.baseaimDomainEnabled,
        }}
      />

      <LeadDestinationSection
        clientId={clientId}
        initialDestinations={client.leadDestinations as LeadDestinations | null}
      />

      <BookingSystemSection
        clientId={clientId}
        initialConfig={client.bookingSystemConfig as BookingSystemConfig | null}
      />

      <PasswordResetSection clientId={clientId} />

      <DeleteClientSection clientId={clientId} companyName={client.companyName} />
    </div>
  )
}
