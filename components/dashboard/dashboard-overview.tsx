"use client"

import { useState } from "react"
import Link from "next/link"
import GradientBG from "@/components/GradientBG"
import { AnalyticsOverview } from "@/components/dashboard/analytics-overview"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Milestone } from "@/lib/types/milestone"
import { calculateOverallProgress } from "@/lib/milestone-utils"
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  MessageSquare,
  Send,
  TrendingUp,
  Upload,
} from "lucide-react"

// Generate mock analytics data for the last 30 days
function generateDailyData(baseValue: number, variance: number, days: number = 30) {
  const data = []
  const today = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" })

    const randomVariance = (Math.random() - 0.5) * variance * 2
    const trend = ((days - i) / days) * (baseValue * 0.2)
    const value = Math.round(baseValue + randomVariance + trend)

    data.push({ date: dateStr, value: Math.max(0, value) })
  }

  return data
}

// Mock data for demo (analytics, documents, notifications, activities)
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
    pendingPayments: 2450.0,
  },
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

interface SerializedMilestone {
  id: string
  clientId: string
  title: string
  description: string | null
  status: string
  startDate: string | null
  dueDate: string | null
  completedAt: string | null
  progress: number
  order: number
  notes: any
  createdAt: string
  updatedAt: string
}

interface DashboardOverviewProps {
  milestones: SerializedMilestone[]
}

export function DashboardOverview({ milestones: serializedMilestones }: DashboardOverviewProps) {
  const [isChartExpanded, setIsChartExpanded] = useState(false)
  const { analytics, stats, documents, notifications, activities } = mockData

  // Convert serialized milestones back to Milestone type with Date objects
  const milestones: Milestone[] = serializedMilestones.map(m => ({
    ...m,
    status: m.status as any,
    startDate: m.startDate ? new Date(m.startDate) : null,
    dueDate: m.dueDate ? new Date(m.dueDate) : null,
    completedAt: m.completedAt ? new Date(m.completedAt) : null,
    createdAt: new Date(m.createdAt),
    updatedAt: new Date(m.updatedAt),
    notes: Array.isArray(m.notes) ? m.notes : [],
  }))

  // Use shared utility for consistent progress calculation with REAL milestones
  const overallProgress = calculateOverallProgress(milestones)
  const completedMilestones = milestones.filter((m) => m.status === "COMPLETED").length
  const totalMilestones = milestones.length
  const totalImpressions = analytics.impressions.reduce((sum, d) => sum + d.value, 0)
  const totalClicks = analytics.clicks.reduce((sum, d) => sum + d.value, 0)
  const totalLeads = analytics.leads.reduce((sum, d) => sum + d.value, 0)
  const totalBookedCalls = analytics.bookedCalls.reduce((sum, d) => sum + d.value, 0)
  const pipelineConversion = totalLeads ? (totalBookedCalls / totalLeads) * 100 : 0
  const averageCpa = totalLeads ? analytics.totalAdSpend / totalLeads : 0
  const averageCostPerCall = totalBookedCalls ? analytics.totalAdSpend / totalBookedCalls : 0
  const ctr = totalImpressions ? (totalClicks / totalImpressions) * 100 : 0

  const inProgressMilestone = milestones.find((milestone) => milestone.status === "IN_PROGRESS")
  const nextMilestone = milestones.find((milestone) => milestone.status === "NOT_STARTED")
  const sortedMilestones = [...milestones].sort(
    (a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0)
  )
  const recentCompletedMilestone = [...sortedMilestones]
    .reverse()
    .find((milestone) => milestone.status === "COMPLETED")
  const recentMilestone = inProgressMilestone || recentCompletedMilestone || sortedMilestones[0]

  const workflowHighlights = [
    {
      label: "Recent Milestone",
      value: recentMilestone?.title || "Not started",
      detail: recentMilestone
        ? `${recentMilestone.status.replace("_", " ")} · Due ${recentMilestone.dueDate?.toLocaleDateString() || "TBD"}`
        : "Awaiting kickoff",
      accent: "from-primary/30 via-sky-200/30 to-transparent",
    },
    {
      label: "Next Milestone",
      value: nextMilestone?.title || "Scheduling",
      detail: nextMilestone
        ? `Begins after ${nextMilestone.dueDate?.toLocaleDateString() || "TBD"}`
        : "Coordinating in chat",
      accent: "from-cyan-300/25 via-blue-200/30 to-transparent",
    },
    {
      label: "Media Budget",
      value: stats.pendingPayments.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
      detail: "Awaiting payment release",
      accent: "from-[#f97316]/20 via-[#fb923c]/30 to-transparent",
    },
  ]
  const heroStats = [
    {
      label: "Qualified Calls (30d)",
      value: totalBookedCalls.toLocaleString(),
      caption: "Booked calls logged in Baseaim",
    },
    {
      label: "Leads -> Calls",
      value: `${pipelineConversion.toFixed(1)}%`,
      caption: "Conversion rate across funnels",
    },
    {
      label: "Avg CPA",
      value: `$${averageCpa.toFixed(2)}`,
      caption: `CTR ${ctr.toFixed(1)}% / Media efficiency`,
    },
    {
      label: "Cost / Booked Call",
      value: `$${averageCostPerCall.toFixed(2)}`,
      caption: "Goal: <$450 per consultation",
    },
  ]

  const statCards = [
    {
      title: "Client Assets",
      value: stats.totalDocuments,
      description: "Proposals, creative & approvals",
      icon: FileText,
      href: "/dashboard/documents",
      action: "Review files",
    },
    {
      title: "Unread Messages",
      value: stats.unreadMessages,
      description: "Threads awaiting your reply",
      icon: MessageSquare,
      href: "/dashboard/chat",
      action: "Open chat",
    },
    {
      title: "Client Acquisition System",
      value: `${overallProgress}%`,
      description: `${completedMilestones}/${totalMilestones} steps done`,
      icon: TrendingUp,
      href: "#milestones",
      action: "View roadmap",
    },
    {
      title: "Pending Media Budget",
      value: stats.pendingPayments.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
      description: "Due this week",
      icon: CreditCard,
      href: "/dashboard/billing",
      action: "Manage billing",
    },
  ]

  return (
    <div className="space-y-10 pb-16">
      <section className="relative overflow-hidden rounded-[32px] border border-white/60 bg-white/90 px-6 py-10 shadow-[0_35px_140px_rgba(37,99,235,0.2)] dark:border-slate-800/70 dark:bg-slate-900/80">
        <GradientBG />
        <div className="relative z-10 flex flex-col gap-10 lg:flex-row">
          <div className="max-w-2xl space-y-6 text-slate-600">
            <span className="chip-pill text-xs uppercase tracking-[0.35em] text-slate-500">
              Engagement snapshot
            </span>
            <div>
              <p className="font-alt text-sm uppercase tracking-[0.4em] text-slate-500">
                Control Center
              </p>
              <h1 className="mt-3 text-4xl font-heading leading-tight text-slate-900 dark:text-white">
                Everything active on your Baseaim build.
              </h1>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {workflowHighlights.map((item) => (
                <div
                  key={item.label}
                  className="relative overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br from-white via-white/90 to-slate-50 p-4 shadow-[0_25px_80px_rgba(15,23,42,0.18)] ring-1 ring-white/70 dark:border-slate-800/60 dark:bg-slate-900/70 dark:from-slate-900/80 dark:via-slate-900/70 dark:to-slate-900/60 dark:ring-slate-800/60"
                >
                  <div
                    className={`pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br ${item.accent} opacity-80`}
                  />
                  <div className="relative">
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                      {item.label}
                    </p>
                    <p className="mt-2 text-lg font-heading text-slate-900 dark:text-white">
                      {item.value}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-4">
              <Button
                asChild
                className="rounded-full bg-gradient-to-r from-primary via-sky-400 to-cyan-400 px-6 py-2 font-semibold text-white shadow-lg shadow-sky-200 hover:opacity-90 border-0"
              >
                <Link href="/dashboard/documents" className="inline-flex items-center gap-2">
                  Upload or Approve Files
                  <Upload className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="rounded-full border border-white/70 bg-white/70 px-6 py-2 text-slate-700 shadow-sm shadow-sky-100 hover:bg-white/90 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
              >
                <Link href="/dashboard/chat" className="inline-flex items-center gap-2">
                  Message Project Manager
                  <Send className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

            <div className="grid flex-1 gap-4 sm:grid-cols-2">
              {heroStats.map((item) => (
                <div
                  key={item.label}
                  className="relative overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br from-white via-white/90 to-slate-50 p-5 text-slate-700 shadow-[0_28px_90px_rgba(15,23,42,0.2)] ring-1 ring-white/70 dark:border-slate-800/60 dark:bg-slate-900/70 dark:ring-slate-800/70"
                >
                  <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.45]" aria-hidden="true">
                    <div className="absolute inset-y-0 left-[-10%] w-2/3 bg-gradient-to-br from-primary/25 via-sky-200/35 to-transparent blur-3xl" />
                    <div className="absolute inset-y-0 right-[-5%] w-1/2 bg-gradient-to-br from-cyan-200/35 via-white/40 to-transparent blur-3xl" />
                  </div>
                  <div className="relative">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                      {item.label}
                    </p>
                    <p className="mt-3 text-3xl font-heading text-slate-900 dark:text-white">
                      {item.value}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.caption}</p>
                  </div>
                </div>
              ))}
            </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <AnalyticsOverview
          impressionsData={analytics.impressions}
          clicksData={analytics.clicks}
          leadsData={analytics.leads}
          bookedCallsData={analytics.bookedCalls}
          totalAdSpend={analytics.totalAdSpend}
          isExpanded={isChartExpanded}
          setIsExpanded={setIsChartExpanded}
        />

        <div
          className={`grid gap-4 ${isChartExpanded ? "lg:col-span-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : "lg:col-span-1 grid-cols-2 sm:grid-cols-2 lg:grid-cols-1"}`}
        >
          {statCards.map((card) => {
            const Icon = card.icon
            return (
              <Card
                key={card.title}
                className="glass-card rounded-2xl border border-white/70 p-0 px-4 py-5 shadow-lg shadow-sky-100 transition-all hover:-translate-y-1 dark:border-slate-800/70"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-sm font-semibold text-slate-700 dark:text-white">
                      {card.title}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                      {card.description}
                    </CardDescription>
                  </div>
                  <div className="rounded-full bg-gradient-to-br from-primary/10 to-cyan-100/40 p-2 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 px-0">
                  <div className="text-3xl font-heading text-slate-900 dark:text-white">
                    {card.value}
                  </div>
                  {card.title === "Acquisition Progress" && (
                    <Progress value={overallProgress} className="h-2 bg-slate-200" />
                  )}
                  <Button asChild variant="link" className="px-0 text-sm font-semibold text-primary">
                    <Link href={card.href}>
                      {card.action} <ArrowUpRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.7fr_1.3fr]" id="milestones">
        <Card className="glass-card rounded-3xl border border-white/60 shadow-xl shadow-sky-100 dark:border-slate-800/70">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Acquisition Roadmap</CardTitle>
            <CardDescription>Track each funnel phase from strategy through optimization.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/70 bg-white/70 p-4 text-slate-700 shadow-sm shadow-sky-100 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-100">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Milestone Completion
                </p>
                <p className="mt-2 text-3xl font-heading text-slate-900 dark:text-white">
                  {completedMilestones}/{totalMilestones}
                </p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/70 p-4 text-slate-700 shadow-sm shadow-sky-100 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-100">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Projected Launch
                </p>
                <p className="mt-2 text-3xl font-heading text-slate-900 dark:text-white">
                  March 5, 2026
                </p>
              </div>
            </div>
            {milestones.map((milestone) => (
              <div
                key={milestone.id}
                className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm shadow-sky-100 dark:border-slate-800 dark:bg-slate-900/60"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {milestone.status === "COMPLETED" ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : milestone.status === "IN_PROGRESS" ? (
                      <Clock className="h-5 w-5 text-primary" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-slate-300" />
                    )}
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-white">{milestone.title}</p>
                      {milestone.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400">{milestone.description}</p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`chip-pill text-xs ${
                      milestone.status === "COMPLETED"
                        ? "bg-emerald-100 text-emerald-700"
                        : milestone.status === "IN_PROGRESS"
                        ? "bg-sky-100 text-sky-600"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {milestone.status.replace("_", " ")}
                  </span>
                </div>
                <Progress value={milestone.progress} className="mt-4 h-2 bg-slate-200" />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Due: {milestone.dueDate?.toLocaleDateString() || "TBD"}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card rounded-3xl border border-white/60 shadow-xl shadow-sky-100 dark:border-slate-800/70">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Recent Activity</CardTitle>
            <CardDescription>Live collaboration between your team and Baseaim.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 rounded-2xl border border-white/70 bg-white/70 p-3 shadow-sm shadow-sky-100 dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <Avatar className="h-10 w-10 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-white">
                    <AvatarFallback>
                      {activity.user.name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm text-slate-700 dark:text-slate-100">
                      <span className="font-semibold">{activity.user.name}</span> {activity.action}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {activity.createdAt.toLocaleString()}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-500 hover:text-primary">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-card rounded-3xl border border-white/60 shadow-lg shadow-sky-100 dark:border-slate-800/70">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Recent Documents</CardTitle>
            <CardDescription>Creative assets, proposals, and compliance docs shared this week.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/80 p-4 text-slate-700 shadow-sm shadow-sky-100 transition-colors hover:border-primary/40 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-white/70 bg-white/90 p-3 shadow-sm shadow-sky-100 dark:border-slate-800 dark:bg-slate-900/70">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{doc.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {doc.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge
                  className={`rounded-full px-3 ${
                    doc.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {doc.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card rounded-3xl border border-white/60 shadow-lg shadow-sky-100 dark:border-slate-800/70">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Notifications</CardTitle>
            <CardDescription>Important updates and reminders from your Baseaim team.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm shadow-sky-100 dark:border-slate-800 dark:bg-slate-900/60"
              >
                <p className="text-sm font-semibold text-slate-800 dark:text-white">{notification.title}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{notification.message}</p>
                <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                  {notification.createdAt.toLocaleString()}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
