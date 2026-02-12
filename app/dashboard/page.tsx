import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { AnalyticsOverview } from "@/components/dashboard/analytics-overview"
import {
  FileText,
  MessageSquare,
  CreditCard,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  Upload,
  Send,
} from "lucide-react"
import Link from "next/link"

// Generate mock analytics data for the last 30 days
function generateDailyData(baseValue: number, variance: number, days: number = 30) {
  const data = []
  const today = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    // Generate realistic variance
    const randomVariance = (Math.random() - 0.5) * variance * 2
    const trend = (days - i) / days * (baseValue * 0.2) // Slight upward trend
    const value = Math.round(baseValue + randomVariance + trend)

    data.push({ date: dateStr, value: Math.max(0, value) })
  }

  return data
}

// Mock data for demo
const mockData = {
  analytics: {
    impressions: generateDailyData(2500, 500),
    clicks: generateDailyData(180, 40),
    leads: generateDailyData(25, 8),
    bookedCalls: generateDailyData(8, 3),
    totalAdSpend: 3500,
  },
  stats: {
    totalDocuments: 24,
    unreadMessages: 3,
    overallProgress: 65,
    pendingPayments: 2450.00,
  },
  milestones: [
    {
      id: "1",
      title: "Project Kickoff & Planning",
      description: "Initial project setup and requirements gathering",
      status: "COMPLETED",
      progress: 100,
      dueDate: new Date("2026-01-15"),
    },
    {
      id: "2",
      title: "Design & Prototyping",
      description: "Create wireframes and design mockups",
      status: "COMPLETED",
      progress: 100,
      dueDate: new Date("2026-01-28"),
    },
    {
      id: "3",
      title: "Development Phase 1",
      description: "Build core features and functionality",
      status: "IN_PROGRESS",
      progress: 75,
      dueDate: new Date("2026-02-20"),
    },
    {
      id: "4",
      title: "Testing & QA",
      description: "Comprehensive testing and bug fixes",
      status: "NOT_STARTED",
      progress: 0,
      dueDate: new Date("2026-03-05"),
    },
  ],
  documents: [
    {
      id: "1",
      title: "Project Proposal.pdf",
      status: "APPROVED",
      createdAt: new Date("2026-01-10"),
    },
    {
      id: "2",
      title: "Design Mockups.fig",
      status: "APPROVED",
      createdAt: new Date("2026-01-25"),
    },
    {
      id: "3",
      title: "Contract Agreement.pdf",
      status: "PENDING",
      createdAt: new Date("2026-02-01"),
    },
  ],
  notifications: [
    {
      id: "1",
      title: "New Message",
      message: "Your project manager sent you a message",
      createdAt: new Date("2026-02-04T10:30:00"),
    },
    {
      id: "2",
      title: "Document Approved",
      message: "Design Mockups.fig has been approved",
      createdAt: new Date("2026-02-03T15:45:00"),
    },
    {
      id: "3",
      title: "Payment Due",
      message: "Invoice #2024-002 is due in 5 days",
      createdAt: new Date("2026-02-02T09:00:00"),
    },
  ],
  activities: [
    {
      id: "1",
      user: { name: "Demo User" },
      action: "uploaded a document",
      createdAt: new Date("2026-02-04T11:00:00"),
    },
    {
      id: "2",
      user: { name: "Project Manager" },
      action: "approved Design Mockups.fig",
      createdAt: new Date("2026-02-03T15:45:00"),
    },
    {
      id: "3",
      user: { name: "Demo User" },
      action: "updated milestone progress",
      createdAt: new Date("2026-02-02T14:30:00"),
    },
  ],
}

export default async function DashboardPage() {
  const { analytics, stats, milestones, documents, notifications, activities } = mockData
  const completedMilestones = milestones.filter(m => m.status === "COMPLETED").length
  const totalMilestones = milestones.length

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, Demo User!
        </h1>
        <p className="text-neutral-500 mt-1">
          Here's an overview of your projects and activities
        </p>
      </div>

      {/* Stats Overview and Analytics - 3 Column Layout (1:2 ratio) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Section: Stats Cards (1/3 width on desktop, stacked vertically) */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <Card className="hover:shadow-lg transition-shadow flex-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <FileText className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDocuments}</div>
              <Link href="/dashboard/documents">
                <Button variant="link" className="px-0 text-xs">
                  View all documents <ArrowUpRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow flex-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unreadMessages}</div>
              <Link href="/dashboard/chat">
                <Button variant="link" className="px-0 text-xs">
                  Open chat <ArrowUpRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow flex-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overallProgress}%</div>
              <Progress value={stats.overallProgress} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow flex-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <CreditCard className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.pendingPayments.toFixed(2)}
              </div>
              <Link href="/dashboard/billing">
                <Button variant="link" className="px-0 text-xs">
                  View invoices <ArrowUpRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Right Section: Analytics Chart (1/2 width on desktop, expandable) */}
        <AnalyticsOverview
          impressionsData={analytics.impressions}
          clicksData={analytics.clicks}
          leadsData={analytics.leads}
          bookedCallsData={analytics.bookedCalls}
          totalAdSpend={analytics.totalAdSpend}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/dashboard/documents">
          <Card className="hover:shadow-lg transition-all hover:scale-105 cursor-pointer border-2 hover:border-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Upload className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Upload Document</h3>
                  <p className="text-sm text-neutral-500">Share files with your team</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/chat">
          <Card className="hover:shadow-lg transition-all hover:scale-105 cursor-pointer border-2 hover:border-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Send className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Send Message</h3>
                  <p className="text-sm text-neutral-500">Chat with your manager</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/analytics">
          <Card className="hover:shadow-lg transition-all hover:scale-105 cursor-pointer border-2 hover:border-purple-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold">View Analytics</h3>
                  <p className="text-sm text-neutral-500">Track your progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Progress Tracking */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Project Milestones</CardTitle>
            <CardDescription>
              {completedMilestones} of {totalMilestones} milestones completed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {milestones.map((milestone) => (
              <div key={milestone.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {milestone.status === "COMPLETED" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : milestone.status === "IN_PROGRESS" ? (
                      <Clock className="h-5 w-5 text-blue-500" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-neutral-300" />
                    )}
                    <div>
                      <p className="font-medium">{milestone.title}</p>
                      {milestone.description && (
                        <p className="text-sm text-neutral-500">{milestone.description}</p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={
                      milestone.status === "COMPLETED"
                        ? "default"
                        : milestone.status === "IN_PROGRESS"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {milestone.status.replace("_", " ")}
                  </Badge>
                </div>
                <Progress value={milestone.progress} className="h-2" />
                <p className="text-xs text-neutral-500">
                  Due: {milestone.dueDate.toLocaleDateString()}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates and changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {activity.user.name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm">
                      <span className="font-medium">{activity.user.name}</span>{" "}
                      {activity.action}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {activity.createdAt.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Documents and Notifications */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Documents</CardTitle>
            <CardDescription>Latest uploads and shared files</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-neutral-500" />
                    <div>
                      <p className="font-medium text-sm">{doc.title}</p>
                      <p className="text-xs text-neutral-500">
                        {doc.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant={doc.status === "APPROVED" ? "default" : "secondary"}>
                    {doc.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Important updates and alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-3 border rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                >
                  <p className="font-medium text-sm">{notification.title}</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {notification.message}
                  </p>
                  <p className="text-xs text-neutral-400 mt-2">
                    {notification.createdAt.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
