import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, RefreshCw, Receipt } from "lucide-react"
import {
  verifySession,
  getAdminClientForBilling,
  getAdminClientSubscription,
} from "@/lib/dal"
import { CreateInvoiceForm } from "@/components/admin/create-invoice-form"
import { SubscriptionManager } from "@/components/admin/subscription-manager"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default async function NewInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>
  searchParams: Promise<{ type?: string }>
}) {
  const { userRole } = await verifySession()
  if (userRole !== "ADMIN") redirect("/dashboard")

  const [{ clientId }, { type }] = await Promise.all([params, searchParams])
  const client = await getAdminClientForBilling(clientId)

  // ── Type picker ────────────────────────────────────────────────────────────
  if (!type) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/clients/${clientId}/invoices`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Link>
        </Button>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Billing</h1>
          <p className="text-neutral-500 mt-1">
            Choose a billing type for {client.companyName}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
          <Link href={`/admin/clients/${clientId}/invoices/new?type=retainer`}>
            <Card className="hover:border-primary cursor-pointer transition-colors h-full">
              <CardHeader>
                <RefreshCw className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Monthly Retainer</CardTitle>
                <CardDescription>
                  Start automatic recurring billing. Stripe charges the client
                  every month — no manual action needed after setup.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href={`/admin/clients/${clientId}/invoices/new?type=invoice`}>
            <Card className="hover:border-primary cursor-pointer transition-colors h-full">
              <CardHeader>
                <Receipt className="h-8 w-8 text-primary mb-2" />
                <CardTitle>One-time Invoice</CardTitle>
                <CardDescription>
                  Create and send a single invoice. Useful for project fees, ad
                  spend, or any one-off charge.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    )
  }

  // ── Monthly Retainer ───────────────────────────────────────────────────────
  if (type === "retainer") {
    const subscription = await getAdminClientSubscription(clientId)
    const serializedSubscription = subscription
      ? {
          id: subscription.id,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
          stripePriceId: subscription.stripePriceId,
          stripeSubscriptionId: subscription.stripeSubscriptionId,
        }
      : null

    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/clients/${clientId}/invoices/new`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Monthly Retainer — {client.companyName}
          </h1>
          <p className="text-neutral-500 mt-1">
            Manage automatic recurring billing
          </p>
        </div>

        <div className="max-w-xl">
          <SubscriptionManager
            clientId={clientId}
            subscription={serializedSubscription}
          />
        </div>
      </div>
    )
  }

  // ── One-time Invoice ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/admin/clients/${clientId}/invoices/new`}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          New Invoice — {client.companyName}
        </h1>
        <p className="text-neutral-500 mt-1">
          Create and send an invoice — Stripe will email the client
        </p>
      </div>

      <CreateInvoiceForm clientId={clientId} />
    </div>
  )
}
