import { getClientFbInsights, getClientFbCampaigns, getClientFbPlatformBreakdown, getClientFbDailyTrend, getClientAdConfig, getClientAnalytics } from "@/lib/dal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FbAdsMetrics } from "@/components/dashboard/fb-ads-metrics"
import { FbTrendChart } from "@/components/dashboard/fb-trend-chart"
import { buildTrendData } from "@/lib/facebook-ads"
import { FbCampaignTable } from "@/components/dashboard/fb-campaign-table"
import { FbPlatformSplit } from "@/components/dashboard/fb-platform-split"
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

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  // Resolve searchParams (Next.js 15 async pattern)
  const resolvedParams = await searchParams
  const rawRange = resolvedParams?.range

  // Validate and default the date range
  const dateRange: DateRange =
    rawRange === '7d' || rawRange === '30d' || rawRange === 'all'
      ? rawRange
      : '30d'

  const datePreset = rangToDatePreset(dateRange)

  // Fetch all data in parallel — FB insights + project analytics
  const [fbInsights, campaigns, platforms, dailyTrend, analytics] = await Promise.all([
    getClientFbInsights(datePreset),
    getClientFbCampaigns(datePreset),
    getClientFbPlatformBreakdown(datePreset),
    getClientFbDailyTrend(),
    getClientAnalytics(),
  ])

  // Determine isConfigured: client has adAccountId set
  const clientAdConfig = await getClientAdConfig()
  const isConfigured = !!clientAdConfig?.adAccountId

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics & Reports</h1>
        <p className="text-neutral-500 mt-1">
          Track your engagement and progress metrics
        </p>
      </div>

      {/* Facebook Ads Performance */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Facebook Ads Performance</h2>
        <FbAdsMetrics
          insights={fbInsights}
          dateRange={dateRange}
          isConfigured={isConfigured}
          campaigns={campaigns}
          platforms={platforms}
        />

        {/* Extended sections — only shown when FB is configured and has data */}
        {isConfigured && fbInsights && (
          <>
            {/* Spend & Leads Trend */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Spend & Leads Trend</h3>
              <FbTrendChart data={dailyTrend ? buildTrendData(dailyTrend) : []} />
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

      {/* Project Metrics */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Project Metrics</h2>
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
      </div>

    </div>
  )
}
