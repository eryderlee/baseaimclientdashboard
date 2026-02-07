import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AnalyticsCharts } from "@/components/dashboard/analytics-charts"
import {
  FileText,
  MessageSquare,
  TrendingUp,
  Activity,
} from "lucide-react"

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
      messages: {
        orderBy: { createdAt: "asc" },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  })

  // Calculate metrics
  const totalDocuments = user?.clientProfile?.documents.length || 0
  const totalMessages = user?.messages.length || 0
  const completedMilestones = user?.clientProfile?.milestones.filter(
    (m) => m.status === "COMPLETED"
  ).length || 0
  const totalMilestones = user?.clientProfile?.milestones.length || 0
  const progressRate = totalMilestones > 0
    ? Math.round((completedMilestones / totalMilestones) * 100)
    : 0

  // Documents over time
  const documentsData = user?.clientProfile?.documents.reduce((acc: any[], doc) => {
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
  const activityData = user?.activities.reduce((acc: any[], activity) => {
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
    totalMessages,
    completedMilestones,
    totalMilestones,
    progressRate,
    documentsData,
    activityData,
    milestoneData,
  }
}

export default async function AnalyticsPage() {
  const session = await auth()
  const analytics = await getAnalyticsData(session!.user!.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics & Reports</h1>
        <p className="text-neutral-500 mt-1">
          Track your engagement and progress metrics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <MessageSquare className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalMessages}</div>
            <p className="text-xs text-neutral-500 mt-1">
              Total communications
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

      {/* Charts */}
      <AnalyticsCharts
        documentsData={analytics.documentsData}
        activityData={analytics.activityData.slice(0, 14)}
        milestoneData={analytics.milestoneData}
      />
    </div>
  )
}
