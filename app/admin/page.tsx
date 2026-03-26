import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UserPlus, Calendar } from 'lucide-react'
import { verifySession, getAllClientsWithMilestones, getAdminAnalytics, getAdminFbPerClient } from '@/lib/dal'
import { calculateOverallProgress } from '@/lib/utils/progress'
import { detectClientRisk } from '@/lib/utils/risk-detection'
import { ClientFilters } from '@/components/admin/client-filters'
import { ClientAnalyticsTable } from '@/components/admin/client-analytics-table'
import { Skeleton } from '@/components/ui/skeleton'

async function getAdminData() {
  const [analytics, clients, fbPerClient] = await Promise.all([
    getAdminAnalytics(),
    getAllClientsWithMilestones(),
    getAdminFbPerClient(),
  ])

  const processedClients = clients.map((client) => {
    const overallProgress = calculateOverallProgress(client.milestones)
    const completedMilestones = client.milestones.filter((m) => m.status === 'COMPLETED').length
    const totalMilestones = client.milestones.length
    const risk = detectClientRisk(client)

    const upcomingMilestones = client.milestones
      .filter((m) => m.status !== 'COMPLETED' && m.dueDate)
      .sort((a, b) => {
        if (!a.dueDate || !b.dueDate) return 0
        return a.dueDate.getTime() - b.dueDate.getTime()
      })
    const nextDueDate = upcomingMilestones[0]?.dueDate || null

    const fbData = fbPerClient[client.id]
    const setupMilestones = client.milestones.filter((m) => m.order <= 6)
    const setupComplete =
      setupMilestones.length >= 6 &&
      setupMilestones.every((m) => m.status === 'COMPLETED')
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
      setupComplete,
      fbSpend: fbData?.spend ?? null,
      fbLeads: fbData?.leads ?? null,
      user: {
        name: client.user.name || '',
        email: client.user.email,
      },
      createdAt: client.createdAt.toISOString(),
    }
  })

  const upcomingDueDates = analytics.upcomingDueDates.map((item) => ({
    clientName: item.clientName,
    milestoneTitle: item.milestoneTitle,
    dueDate: item.dueDate.toISOString(),
  }))

  return { clients: processedClients, upcomingDueDates }
}

export default async function AdminPage() {
  const { userRole } = await verifySession()

  if (userRole !== 'ADMIN') {
    redirect('/dashboard')
  }

  const { clients, upcomingDueDates } = await getAdminData()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-neutral-500 mt-1">Manage all client accounts</p>
        </div>
        <Button asChild>
          <Link href="/admin/clients/new">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Client
          </Link>
        </Button>
      </div>

      {/* Upcoming Milestones */}
      {upcomingDueDates.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
            <Calendar className="h-4 w-4 text-neutral-500" />
            <CardTitle className="text-base">Upcoming Milestones</CardTitle>
            <span className="ml-auto text-xs text-neutral-400">Next 7 days</span>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingDueDates.map((item, index) => {
                const date = new Date(item.dueDate)
                const formatted = new Intl.DateTimeFormat('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }).format(date)
                return (
                  <div
                    key={index}
                    className="flex items-start justify-between border-b pb-2 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.milestoneTitle}</p>
                      <p className="text-xs text-neutral-500">{item.clientName}</p>
                    </div>
                    <p className="text-sm text-neutral-500 shrink-0 ml-4">{formatted}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Clients */}
      <Card>
        <CardHeader>
          <CardTitle>All Clients</CardTitle>
          <CardDescription>Filter, sort, and manage all client accounts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Suspense
            fallback={
              <div className="flex gap-2">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
              </div>
            }
          >
            <ClientFilters />
          </Suspense>
          <Suspense
            fallback={
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            }
          >
            <ClientAnalyticsTable clients={clients} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
