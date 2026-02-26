import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getClientFbInsights, getClientFbCampaigns, getClientFbPlatformBreakdown, getClientFbDailyTrend } from "@/lib/dal"
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

async function getAnalyticsData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      clientProfile: {
        include: {
          documents: {
            orderBy: { createdAt: "asc" },
          },
          milestones: true,
          invoices: true,
        },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  })

  // Calculate metrics
  const totalDocuments = user?.clientProfile?.documents.length || 0
  const completedMilestones = user?.clientProfile?.milestones.filter(
    (m) => m.status === "COMPLETED"
  ).length || 0
  const totalMilestones = user?.clientProfile?.milestones.length || 0
  const progressRate = totalMilestones > 0
    ? Math.round((completedMilestones / totalMilestones) * 100)
    : 0

  // Documents over time
  const documentsData = user?.clientProfile?.documents.reduce((acc: Array<{ month: string; count: number }>, doc) => {
    const month = new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    const existing = acc.find(item => item.month === month)
    if (existing) {
      existing.count++
    } else {
      acc.push({ month, count: 1 })
    }
    return acc
  }, []) || []

  // Activity over time
  const activityData = user?.activities.reduce((acc: Array<{ date: string; count: number }>, activity) => {
    const date = new Date(activity.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const existing = acc.find(item => item.date === date)
    if (existing) {
      existing.count++
    } else {
      acc.push({ date, count: 1 })
    }
    return acc
  }, []).reverse() || []

  // Milestone progress
  const milestoneData = user?.clientProfile?.milestones.map(m => ({
    name: m.title,
    progress: m.progress,
    status: m.status,
  })) || []

  return {
    totalDocuments,
    completedMilestones,
    totalMilestones,
    progressRate,
    documentsData,
    activityData,
    milestoneData,
  }
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const session = await auth()
  const userId = session!.user!.id

  // Resolve searchParams (Next.js 15 async pattern)
  const resolvedParams = await searchParams
  const rawRange = resolvedParams?.range

  // Validate and default the date range
  const dateRange: DateRange =
    rawRange === '7d' || rawRange === '30d' || rawRange === 'all'
      ? rawRange
      : '30d'

  const datePreset = rangToDatePreset(dateRange)

  // Determine isConfigured: client has adAccountId set
  const clientProfile = await prisma.client.findUnique({
    where: { userId },
    select: { adAccountId: true },
  })
  const isConfigured = !!clientProfile?.adAccountId

  // Fetch all FB data in parallel — existing insights + new campaign/platform/trend data
  const [fbInsights, campaigns, platforms, dailyTrend] = await Promise.all([
    getClientFbInsights(datePreset),
    getClientFbCampaigns(datePreset),
    getClientFbPlatformBreakdown(datePreset),
    getClientFbDailyTrend(),
  ])

  // Fetch existing project analytics data
  const analytics = await getAnalyticsData(userId)

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
