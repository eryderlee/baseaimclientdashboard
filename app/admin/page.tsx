import { redirect } from "next/navigation"
import Link from "next/link"
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
import { Users, FileText, MessageSquare, DollarSign, UserPlus } from "lucide-react"
import { verifySession, getAllClientsWithMilestones } from "@/lib/dal"
import { prisma } from "@/lib/prisma"
import { calculateOverallProgress } from "@/lib/utils/progress"

async function getAdminData() {
  const clients = await getAllClientsWithMilestones()

  const totalClients = clients.length
  const activeClients = clients.filter((c) => c.isActive).length
  const totalDocuments = await prisma.document.count()

  const invoices = await prisma.invoice.findMany({
    where: { status: "PAID" },
    select: { amount: true },
  })
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.amount, 0)

  const totalMessages = await prisma.message.count()

  return {
    clients,
    totalClients,
    activeClients,
    totalDocuments,
    totalRevenue,
    totalMessages,
  }
}

export default async function AdminPage() {
  const { userRole } = await verifySession()

  // Check if user is admin
  if (userRole !== "ADMIN") {
    redirect("/dashboard")
  }

  const adminData = await getAdminData()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-neutral-500 mt-1">
            Manage all clients and monitor platform activity
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/clients/new">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Client
          </Link>
        </Button>
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
                <TableHead>Overall Progress</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminData.clients.map((client) => {
                const completedMilestones = client.milestones.filter(
                  (m) => m.status === "COMPLETED"
                ).length
                const overallProgress = calculateOverallProgress(client.milestones)

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
                    <TableCell>{adminData.totalDocuments}</TableCell>
                    <TableCell>
                      {completedMilestones}/{client.milestones.length}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 rounded-full bg-neutral-200">
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{ width: `${overallProgress}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{overallProgress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>${adminData.totalRevenue.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={client.isActive ? "default" : "secondary"}>
                        {client.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(client.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/clients/${client.id}`}>
                          Edit Milestones
                        </Link>
                      </Button>
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
