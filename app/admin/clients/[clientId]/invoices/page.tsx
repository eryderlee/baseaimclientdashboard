import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CreditCard, Plus } from "lucide-react"
import { verifySession, getAdminClientInvoices, getAdminClientForBilling, getAdminClientSubscription } from "@/lib/dal"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InvoiceStatus } from "@prisma/client"

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency.toLowerCase(),
  }).format(amount)
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date)
}

function getStatusBadge(status: InvoiceStatus) {
  switch (status) {
    case "PAID":
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
          Paid
        </Badge>
      )
    case "SENT":
      return <Badge variant="secondary">Sent</Badge>
    case "OVERDUE":
      return <Badge variant="destructive">Overdue</Badge>
    case "DRAFT":
      return <Badge variant="outline">Draft</Badge>
    case "CANCELLED":
      return <Badge variant="outline">Cancelled</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function RetainerBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
        Retainer Active
      </Badge>
    )
  }
  if (status === "cancelling") {
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
        Retainer Cancelling
      </Badge>
    )
  }
  return null
}

export default async function ClientInvoicesPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { userRole } = await verifySession()
  if (userRole !== "ADMIN") {
    redirect("/dashboard")
  }

  const { clientId } = await params

  const [invoices, clientData, subscription] = await Promise.all([
    getAdminClientInvoices(clientId),
    getAdminClientForBilling(clientId),
    getAdminClientSubscription(clientId),
  ])

  const retainerStatus =
    subscription?.status === "active" || subscription?.status === "cancelling"
      ? subscription.status
      : null

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Clients
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            {clientData.companyName} — Invoices
          </h1>
          {retainerStatus && <RetainerBadge status={retainerStatus} />}
        </div>
        <Button asChild>
          <Link href={`/admin/clients/${clientId}/invoices/new`}>
            <Plus className="h-4 w-4 mr-2" />
            New
          </Link>
        </Button>
      </div>

      {/* Invoices table or empty state */}
      {invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <CreditCard className="h-12 w-12 text-neutral-400" />
            <div className="text-center">
              <p className="text-lg font-medium text-neutral-900">No invoices yet</p>
              <p className="text-neutral-500 mt-1">
                Create the first invoice for {clientData.companyName}
              </p>
            </div>
            <Button asChild>
              <Link href={`/admin/clients/${clientId}/invoices/new`}>
                <Plus className="h-4 w-4 mr-2" />
                New
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Invoice History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-sm font-medium">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell className="text-neutral-600 max-w-xs truncate">
                      {invoice.description || "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </TableCell>
                    <TableCell className="text-neutral-600">
                      {formatDate(invoice.dueDate)}
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell className="text-neutral-600">
                      {formatDate(invoice.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
