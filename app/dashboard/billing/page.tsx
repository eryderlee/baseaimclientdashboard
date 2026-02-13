import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  CreditCard,
  Download,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"

async function getBillingData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      clientProfile: {
        include: {
          invoices: {
            orderBy: { createdAt: "desc" },
          },
          subscriptions: true,
        },
      },
    },
  })

  return {
    invoices: user?.clientProfile?.invoices || [],
    subscriptions: user?.clientProfile?.subscriptions || [],
  }
}

export default async function BillingPage() {
  const session = await auth()
  const { invoices, subscriptions } = await getBillingData(session!.user!.id)

  const totalPaid = invoices
    .filter((inv) => inv.status === "PAID")
    .reduce((sum, inv) => sum + inv.amount, 0)

  const totalPending = invoices
    .filter((inv) => inv.status === "SENT" || inv.status === "OVERDUE")
    .reduce((sum, inv) => sum + inv.amount, 0)

  const overdueInvoices = invoices.filter((inv) => inv.status === "OVERDUE")

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "default"
      case "SENT":
        return "secondary"
      case "OVERDUE":
        return "destructive"
      case "CANCELLED":
        return "outline"
      default:
        return "outline"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PAID":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "SENT":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "OVERDUE":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Payments</h1>
        <p className="text-neutral-500 mt-1">
          Manage your invoices, payments, and subscription
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <DollarSign className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPaid.toFixed(2)}</div>
            <p className="text-xs text-neutral-500 mt-1">
              Lifetime payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPending.toFixed(2)}</div>
            <p className="text-xs text-neutral-500 mt-1">
              Awaiting payment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {overdueInvoices.length}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Requires attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Info */}
      {subscriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Subscription</CardTitle>
            <CardDescription>
              Your current subscription plan and details
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subscriptions.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-8 w-8 text-neutral-500" />
                  <div>
                    <p className="font-medium">Active Subscription</p>
                    <p className="text-sm text-neutral-500">
                      Status: <Badge variant="default">{sub.status}</Badge>
                    </p>
                  </div>
                </div>
                {sub.currentPeriodEnd && (
                  <div className="text-right">
                    <p className="text-sm font-medium">Next billing date</p>
                    <p className="text-sm text-neutral-500">
                      {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>
            View and manage your payment history
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-neutral-400" />
              <p className="mt-4 text-sm text-neutral-500">
                No invoices yet
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-sm">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell>
                      {invoice.description || "Invoice"}
                    </TableCell>
                    <TableCell className="font-medium">
                      ${invoice.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.dueDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(invoice.status)}
                        <Badge variant={getStatusColor(invoice.status) as any}>
                          {invoice.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {(invoice.status === "SENT" || invoice.status === "OVERDUE") && (
                          <Link href={`/dashboard/billing/pay/${invoice.id}`}>
                            <Button size="sm">Pay Now</Button>
                          </Link>
                        )}
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
