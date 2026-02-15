import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UserPlus } from 'lucide-react'
import { verifySession, getAllClientsWithMilestones, getAdminAnalytics } from '@/lib/dal'
import { calculateOverallProgress } from '@/lib/utils/progress'
import { detectClientRisk } from '@/lib/utils/risk-detection'
import { AnalyticsSummary } from '@/components/admin/analytics-summary'
import { ClientFilters } from '@/components/admin/client-filters'
import { ClientAnalyticsTable } from '@/components/admin/client-analytics-table'

async function getAdminData() {
  // Get analytics summary
  const analytics = await getAdminAnalytics()

  // Get all clients with milestones
  const clients = await getAllClientsWithMilestones()

  // Process each client to prepare data for analytics table
  const processedClients = clients.map((client) => {
    const overallProgress = calculateOverallProgress(client.milestones)
    const completedMilestones = client.milestones.filter((m) => m.status === 'COMPLETED').length
    const totalMilestones = client.milestones.length
    const risk = detectClientRisk(client)

    // Find next due date (earliest non-COMPLETED milestone)
    const upcomingMilestones = client.milestones
      .filter((m) => m.status !== 'COMPLETED' && m.dueDate)
      .sort((a, b) => {
        if (!a.dueDate || !b.dueDate) return 0
        return a.dueDate.getTime() - b.dueDate.getTime()
      })
    const nextDueDate = upcomingMilestones[0]?.dueDate || null

    return {
      id: client.id,
      companyName: client.companyName,
      isActive: client.isActive,
      overallProgress,
      completedMilestones,
      totalMilestones,
      riskLevel: risk.riskLevel,
      riskReasons: risk.reasons,
      nextDueDate: nextDueDate ? nextDueDate.toISOString() : null,
      user: {
        name: client.user.name || '',
        email: client.user.email,
      },
      createdAt: client.createdAt.toISOString(),
    }
  })

  // Serialize upcoming due dates for AnalyticsSummary
  const upcomingDueDates = analytics.upcomingDueDates.map((item) => ({
    clientName: item.clientName,
    milestoneTitle: item.milestoneTitle,
    dueDate: item.dueDate.toISOString(),
  }))

  return {
    analytics: {
      ...analytics,
      upcomingDueDates,
    },
    clients: processedClients,
  }
}

export default async function AdminPage() {
  const { userRole } = await verifySession()

  // Check if user is admin
  if (userRole !== 'ADMIN') {
    redirect('/dashboard')
  }

  const adminData = await getAdminData()

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Analytics Summary */}
      <AnalyticsSummary
        totalClients={adminData.analytics.totalClients}
        activeClients={adminData.analytics.activeClients}
        averageProgress={adminData.analytics.averageProgress}
        atRiskClients={adminData.analytics.atRiskClients}
        upcomingDueDates={adminData.analytics.upcomingDueDates}
      />

      {/* Clients Table with Filters */}
      <Card>
        <CardHeader>
          <CardTitle>All Clients</CardTitle>
          <CardDescription>
            Filter, sort, and manage all client accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Suspense fallback={<div>Loading filters...</div>}>
            <ClientFilters />
          </Suspense>
          <Suspense fallback={<div>Loading clients...</div>}>
            <ClientAnalyticsTable clients={adminData.clients} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
