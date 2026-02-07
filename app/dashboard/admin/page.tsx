import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Users, FileText, MessageSquare, DollarSign } from "lucide-react"

async function getAdminData() {
  const clients = await prisma.client.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
          createdAt: true,
        },
      },
      documents: true,
      milestones: true,
      invoices: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  const totalClients = clients.length
  const activeClients = clients.filter((c) => c.isActive).length
  const totalDocuments = clients.reduce((sum, c) => sum + c.documents.length, 0)
  const totalRevenue = clients.reduce(
    (sum, c) =>
      sum +
      c.invoices
        .filter((inv) => inv.status === "PAID")
        .reduce((s, inv) => s + inv.amount, 0),
    0
  )

  const messages = await prisma.message.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
  })

  return {
    clients,
    totalClients,
    activeClients,
    totalDocuments,
    totalRevenue,
    totalMessages: messages.length,
  }
}

export default async function AdminPage() {
  const session = await auth()

  // Check if user is admin
  if (session?.user?.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const adminData = await getAdminData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-neutral-500 mt-1">
          Manage all clients and monitor platform activity
        </p>
      </div>

      {/* Admin Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminData.totalClients}</div>
            <p className="text-xs text-neutral-500 mt-1">
              {adminData.activeClients} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminData.totalDocuments}</div>
            <p className="text-xs text-neutral-500 mt-1">
              Across all clients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminData.totalMessages}</div>
            <p className="text-xs text-neutral-500 mt-1">
              Communication activity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${adminData.totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Paid invoices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Clients</CardTitle>
          <CardDescription>
            Manage and monitor all client accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead>Milestones</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminData.clients.map((client) => {
                const paidRevenue = client.invoices
                  .filter((inv) => inv.status === "PAID")
                  .reduce((sum, inv) => sum + inv.amount, 0)
                const completedMilestones = client.milestones.filter(
                  (m) => m.status === "COMPLETED"
                ).length

                return (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      {client.companyName}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{client.user.name}</p>
                        <p className="text-xs text-neutral-500">
                          {client.user.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{client.documents.length}</TableCell>
                    <TableCell>
                      {completedMilestones}/{client.milestones.length}
                    </TableCell>
                    <TableCell>${paidRevenue.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={client.isActive ? "default" : "secondary"}>
                        {client.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(client.user.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
