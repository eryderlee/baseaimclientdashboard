import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  verifySession,
  getAdminAnalytics,
  getAdminRevenueAnalytics,
  getAdminFbAggregation,
  getAdminFbDailyAggregation,
} from '@/lib/dal'
import { AnalyticsSummary } from '@/components/admin/analytics-summary'
import { AdminFbTrendChart } from '@/components/admin/admin-fb-trend-chart'

async function getAnalyticsData() {
  const [analytics, revenue, fbAggregation] = await Promise.all([
    getAdminAnalytics(),
    getAdminRevenueAnalytics(),
    getAdminFbAggregation(),
  ])

  const upcomingDueDates = analytics.upcomingDueDates.map((item) => ({
    clientName: item.clientName,
    milestoneTitle: item.milestoneTitle,
    dueDate: item.dueDate.toISOString(),
  }))

  return {
    analytics: { ...analytics, upcomingDueDates },
    revenue,
    fbAggregation,
  }
}

function TrendChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-64" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full rounded" />
      </CardContent>
    </Card>
  )
}

async function TrendChartSection() {
  const trendData = await getAdminFbDailyAggregation()
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ad Spend &amp; Leads Trend (30d)</CardTitle>
      </CardHeader>
      <CardContent>
        <AdminFbTrendChart data={trendData} />
      </CardContent>
    </Card>
  )
}

export default async function AdminAnalyticsPage() {
  const { userRole } = await verifySession()

  if (userRole !== 'ADMIN') {
    redirect('/dashboard')
  }

  const data = await getAnalyticsData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-neutral-500 mt-1">
          Platform performance, revenue, and ad metrics
        </p>
      </div>

      <AnalyticsSummary
        totalClients={data.analytics.totalClients}
        activeClients={data.analytics.activeClients}
        averageProgress={data.analytics.averageProgress}
        atRiskClients={data.analytics.atRiskClients}
        upcomingDueDates={data.analytics.upcomingDueDates}
        totalRevenue={data.revenue.totalRevenue}
        mrr={data.revenue.mrr}
        payingClientCount={data.revenue.payingClientCount}
        activeSubscriptionCount={data.revenue.activeSubscriptionCount}
        totalFbSpend={data.fbAggregation.totalSpend}
        totalFbLeads={data.fbAggregation.totalLeads}
        fbConfiguredClients={data.fbAggregation.configuredClients}
      />

      <Suspense fallback={<TrendChartSkeleton />}>
        <TrendChartSection />
      </Suspense>
    </div>
  )
}
