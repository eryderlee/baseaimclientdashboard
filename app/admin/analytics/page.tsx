import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  verifySession,
  getAdminAnalytics,
  getAdminRevenueAnalytics,
  getAdminFbAggregation,
  getAdminFbDailyAggregation,
  getAdminFbMetricsPerClient,
  getAdminAllCampaigns,
  getAllClientsWithMilestones,
} from '@/lib/dal'
import { AdminFbTrendChart } from '@/components/admin/admin-fb-trend-chart'
import { AdminClientFbTable } from '@/components/admin/admin-client-fb-table'
import { AdminCampaignsTable } from '@/components/admin/admin-campaigns-table'
import { detectClientRisk } from '@/lib/utils/risk-detection'
import { Users, DollarSign, TrendingUp, Megaphone, Target, AlertTriangle, Calendar } from 'lucide-react'

// ─── Trend chart section (streamed) ──────────────────────────────────────────

function TrendChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-4 w-48 mt-1" />
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
        <CardTitle>Ad Spend &amp; Leads Trend</CardTitle>
        <CardDescription>Aggregated daily totals across all clients — last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        <AdminFbTrendChart data={trendData} />
      </CardContent>
    </Card>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt$(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtFull$(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const RISK_LEVEL_ORDER = { high: 0, medium: 1, low: 2, none: 3 } as const

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminAnalyticsPage() {
  const { userRole } = await verifySession()

  if (userRole !== 'ADMIN') {
    redirect('/dashboard')
  }

  // Fetch all data in parallel
  const [analytics, revenue, fbAggregation, fbMetricsPerClient, allCampaigns, allClients] =
    await Promise.all([
      getAdminAnalytics(),
      getAdminRevenueAnalytics(),
      getAdminFbAggregation(),
      getAdminFbMetricsPerClient(),
      getAdminAllCampaigns(),
      getAllClientsWithMilestones(),
    ])

  // Serialize dates for client components
  const upcomingDueDates = analytics.upcomingDueDates.map((item) => ({
    clientName: item.clientName,
    milestoneTitle: item.milestoneTitle,
    dueDate: item.dueDate.toISOString(),
  }))

  // Build clientId → name map for FB metrics table
  const clientNameMap: Record<string, string> = {}
  for (const c of allClients) {
    clientNameMap[c.id] = c.companyName
  }

  // Build per-client FB rows
  const fbClientRows = Object.entries(fbMetricsPerClient)
    .map(([clientId, metrics]) => ({
      clientId,
      clientName: clientNameMap[clientId] ?? 'Unknown',
      spend: metrics.spend,
      leads: metrics.leads,
      cpl: metrics.leads > 0 ? metrics.spend / metrics.leads : 0,
      impressions: metrics.impressions,
      ctr: metrics.ctr,
      cpc: metrics.cpc,
    }))
    .sort((a, b) => b.spend - a.spend)

  // Build campaign rows with CPL
  const campaignRows = allCampaigns.map((c) => ({
    ...c,
    cpl: c.leads > 0 ? c.spend / c.leads : 0,
  }))

  // Build at-risk clients list (top 5 by severity)
  const atRiskClients = allClients
    .map((client) => {
      const risk = detectClientRisk(client)
      return { client, risk }
    })
    .filter(({ risk }) => risk.riskLevel !== 'none')
    .sort(
      (a, b) =>
        RISK_LEVEL_ORDER[a.risk.riskLevel] - RISK_LEVEL_ORDER[b.risk.riskLevel]
    )
    .slice(0, 5)

  return (
    <div className="space-y-8">

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-neutral-500 mt-1">
          Platform performance, revenue, Facebook ads, and project health
        </p>
      </div>

      {/* ── Section 1: KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">

        {/* Active Clients */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-neutral-500">Active Clients</p>
              <Users className="h-3.5 w-3.5 text-neutral-400" />
            </div>
            <p className="text-2xl font-bold">{analytics.activeClients}</p>
            <p className="text-xs text-neutral-400 mt-0.5">of {analytics.totalClients} total</p>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-neutral-500">Total Revenue</p>
              <DollarSign className="h-3.5 w-3.5 text-neutral-400" />
            </div>
            <p className="text-2xl font-bold">{fmt$(revenue.totalRevenue)}</p>
            <p className="text-xs text-neutral-400 mt-0.5">
              {revenue.payingClientCount} paying client{revenue.payingClientCount === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>

        {/* MRR */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-neutral-500">MRR</p>
              <TrendingUp className="h-3.5 w-3.5 text-neutral-400" />
            </div>
            <p className="text-2xl font-bold">{fmt$(revenue.mrr)}</p>
            <p className="text-xs text-neutral-400 mt-0.5">per month</p>
          </CardContent>
        </Card>

        {/* FB Spend 30d */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-neutral-500">FB Spend (30d)</p>
              <Megaphone className="h-3.5 w-3.5 text-neutral-400" />
            </div>
            <p className="text-2xl font-bold">{fmt$(fbAggregation.totalSpend)}</p>
            <p className="text-xs text-neutral-400 mt-0.5">
              {fbAggregation.configuredClients} client{fbAggregation.configuredClients === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>

        {/* Total Leads 30d */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-neutral-500">Total Leads (30d)</p>
              <Target className="h-3.5 w-3.5 text-neutral-400" />
            </div>
            <p className="text-2xl font-bold">{fbAggregation.totalLeads}</p>
            <p className="text-xs text-neutral-400 mt-0.5">
              {fbAggregation.configuredClients > 0
                ? `${(fbAggregation.totalLeads / fbAggregation.configuredClients).toFixed(1)} avg/client`
                : 'No FB accounts'}
            </p>
          </CardContent>
        </Card>

        {/* At Risk */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-neutral-500">At Risk</p>
              <AlertTriangle className="h-3.5 w-3.5 text-neutral-400" />
            </div>
            <p
              className={`text-2xl font-bold ${analytics.atRiskClients > 0 ? 'text-destructive' : ''}`}
            >
              {analytics.atRiskClients}
            </p>
            <p className="text-xs text-neutral-400 mt-0.5">
              {analytics.atRiskClients === 0 ? 'All on track' : 'need attention'}
            </p>
          </CardContent>
        </Card>

      </div>

      {/* ── Section 2: Facebook Ads — Per Client ── */}
      <Card>
        <CardHeader>
          <CardTitle>Facebook Ads Performance</CardTitle>
          <CardDescription>Per-client metrics — last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminClientFbTable rows={fbClientRows} />
        </CardContent>
      </Card>

      {/* ── Section 3: Campaign Performance ── */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
          <CardDescription>
            Top campaigns by spend across all clients — last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminCampaignsTable rows={campaignRows} />
        </CardContent>
      </Card>

      {/* ── Section 4: Trend Chart (streamed) ── */}
      <Suspense fallback={<TrendChartSkeleton />}>
        <TrendChartSection />
      </Suspense>

      {/* ── Section 5: Project Health ── */}
      <div className="grid gap-6 md:grid-cols-2">

        {/* At-Risk Clients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              At-Risk Clients
            </CardTitle>
            <CardDescription>Clients with overdue or stalled milestones</CardDescription>
          </CardHeader>
          <CardContent>
            {atRiskClients.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/70 bg-white/60 p-6 text-center">
                <p className="text-sm font-medium text-slate-600">All clients on track</p>
                <p className="text-xs text-slate-400 mt-1">No at-risk projects detected</p>
              </div>
            ) : (
              <div className="space-y-3">
                {atRiskClients.map(({ client, risk }) => (
                  <div
                    key={client.id}
                    className="flex items-start justify-between border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{client.companyName}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {risk.reasons.join(' · ')}
                      </p>
                    </div>
                    <span
                      className={`ml-3 flex-shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        risk.riskLevel === 'high'
                          ? 'bg-red-100 text-red-700'
                          : risk.riskLevel === 'medium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-yellow-50 text-yellow-700'
                      }`}
                    >
                      {risk.riskLevel}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Milestones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              Upcoming Milestones
            </CardTitle>
            <CardDescription>Due within the next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingDueDates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/70 bg-white/60 p-6 text-center">
                <p className="text-sm font-medium text-slate-600">No upcoming milestones</p>
                <p className="text-xs text-slate-400 mt-1">Nothing due in the next 7 days</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingDueDates.map((item, index) => {
                  const date = new Date(item.dueDate)
                  const formattedDate = new Intl.DateTimeFormat('en-US', {
                    month: 'short',
                    day: 'numeric',
                  }).format(date)
                  return (
                    <div
                      key={index}
                      className="flex items-start justify-between border-b pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.milestoneTitle}</p>
                        <p className="text-xs text-neutral-500">{item.clientName}</p>
                      </div>
                      <span className="ml-3 flex-shrink-0 text-sm text-neutral-500">
                        {formattedDate}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
