import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getClientFbInsights, getClientFbCampaigns, getClientFbPlatformBreakdown, getClientFbDailyTrend, getClientAdConfig, getClientAnalytics, verifySession, getCurrentClientId } from "@/lib/dal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FbAdsMetrics } from "@/components/dashboard/fb-ads-metrics"
import { FbTrendChart } from "@/components/dashboard/fb-trend-chart"
import { buildTrendData } from "@/lib/facebook-ads"
import { FbCampaignTable } from "@/components/dashboard/fb-campaign-table"
import { FbPlatformSplit } from "@/components/dashboard/fb-platform-split"
import { FbAdsSkeleton } from "@/components/dashboard/fb-ads-skeleton"
import { ProjectMetricsSkeleton } from "@/components/dashboard/project-metrics-skeleton"
import {
  FileText,
  TrendingUp,
  Activity,
} from "lucide-react"
import type { DatePreset } from "@/lib/facebook-ads"

type DateRange = '7d' | '30d' | 'all'

function rangToDatePreset(range: DateRange): DatePreset {
  if (range === '7d') return 'last_7d'
  if (range === 'all') return 'maximum'
  return 'last_30d'
}

// ─── Async section: FB Ads (slow — Facebook API with 6h TTL cache) ─────────────

async function FbAdsSection({ dateRange }: { dateRange: DateRange }) {
  const datePreset = rangToDatePreset(dateRange)

  const [fbInsights, campaigns, platforms, dailyTrend, clientAdConfig] = await Promise.all([
    getClientFbInsights(datePreset),
    getClientFbCampaigns(datePreset),
    getClientFbPlatformBreakdown(datePreset),
    getClientFbDailyTrend(),
    getClientAdConfig(),
  ])

  const isConfigured = !!clientAdConfig?.adAccountId || !!clientAdConfig?.isDemo
  const leadsEnabled = clientAdConfig?.leadsChartEnabled ?? true

  return (
    <div className="space-y-4">
      <FbAdsMetrics
        insights={fbInsights}
        dateRange={dateRange}
        isConfigured={isConfigured}
        campaigns={campaigns}
        platforms={platforms}
        leadsEnabled={leadsEnabled}
      />

      {/* Extended sections — only shown when FB is configured and has data */}
      {isConfigured && fbInsights && (
        <>
          {/* Spend & Leads Trend */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Spend & Leads Trend</h3>
            <FbTrendChart data={dailyTrend ? buildTrendData(dailyTrend) : []} leadsEnabled={leadsEnabled} />
          </div>

          {/* Top Campaigns */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Top Campaigns</h3>
            <FbCampaignTable campaigns={campaigns} />
          </div>

          {/* Platform Breakdown */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Platform Breakdown</h3>
            <FbPlatformSplit platforms={platforms} />
          </div>
        </>
      )}
    </div>
  )
}

// ─── Async section: Project Metrics (fast — DB query) ─────────────────────────

async function ProjectMetricsSection() {
  const analytics = await getClientAnalytics()

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
          <FileText className="h-4 w-4 text-neutral-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analytics.totalDocuments}</div>
          <p className="text-xs text-neutral-500 mt-1">
            Uploaded to date
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-neutral-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analytics.progressRate}%</div>
          <p className="text-xs text-neutral-500 mt-1">
            {analytics.completedMilestones} of {analytics.totalMilestones} milestones
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
          <Activity className="h-4 w-4 text-neutral-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {analytics.activityData.slice(0, 7).reduce((sum, d) => sum + d.count, 0)}
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Last 7 days
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Page (non-async — delegates data fetching to async sections) ──────────────

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  // Admin without preview context has no client — redirect to admin analytics
  const { userRole } = await verifySession()
  if (userRole === 'ADMIN') {
    const clientId = await getCurrentClientId()
    if (!clientId) redirect('/admin/analytics')
  }

  // Resolve searchParams (Next.js 15 async pattern)
  const resolvedParams = await searchParams
  const rawRange = resolvedParams?.range

  // Validate and default the date range
  const dateRange: DateRange =
    rawRange === '7d' || rawRange === '30d' || rawRange === 'all'
      ? rawRange
      : '30d'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics & Reports</h1>
        <p className="text-neutral-500 mt-1">
          Track your engagement and progress metrics
        </p>
      </div>

      {/* Facebook Ads Performance — streams in independently (slow FB API) */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Facebook Ads Performance</h2>
        <Suspense fallback={<FbAdsSkeleton />}>
          <FbAdsSection dateRange={dateRange} />
        </Suspense>
      </div>

      {/* Project Metrics — streams in independently (fast DB query) */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Project Metrics</h2>
        <Suspense fallback={<ProjectMetricsSkeleton />}>
          <ProjectMetricsSection />
        </Suspense>
      </div>
    </div>
  )
}
