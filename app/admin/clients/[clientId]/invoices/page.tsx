import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CreditCard, Plus } from "lucide-react"
import { verifySession, getAdminClientInvoices, getAdminClientForBilling } from "@/lib/dal"
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

// Format currency amount (amount is stored as a float, e.g. 1500.00)
function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toLowerCase(),
  }).format(amount)
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
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

export default async function ClientInvoicesPage({
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

  // 3. Fetch client and invoices via DAL
  const [client, invoices] = await Promise.all([
    getAdminClientForBilling(clientId),
    getAdminClientInvoices(clientId),
  ])

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/clients/${clientId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Client
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {client.companyName} — Invoices
          </h1>
          <p className="text-neutral-500 mt-1">
            {invoices.length} invoice{invoices.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Button asChild>
          <Link href={`/admin/clients/${clientId}/invoices/new`}>
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
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
                Create the first invoice for {client.companyName}
              </p>
            </div>
            <Button asChild>
              <Link href={`/admin/clients/${clientId}/invoices/new`}>
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
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
