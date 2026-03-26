"use client"

import { useState } from "react"
import Link from "next/link"
import GradientBG from "@/components/GradientBG"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Milestone } from "@/lib/types/milestone"
import { calculateOverallProgress } from "@/lib/milestone-utils"
import {
  ArrowUpRight,
  ArrowRight,
  Clock,
  FileText,
  Upload,
} from "lucide-react"

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

interface SerializedDocument {
  id: string
  title: string
  status: string
  createdAt: string
}

interface SerializedActivity {
  id: string
  action: string
  createdAt: string
  user: { name: string | null }
}

interface DashboardOverviewProps {
  milestones: SerializedMilestone[]
  chatSettings?: {
    whatsappNumber?: string | null
    telegramUsername?: string | null
  }
  clientName?: string
  companyName?: string
  documents: SerializedDocument[]
  activities: SerializedActivity[]
}

export function DashboardOverview({
  milestones: serializedMilestones,
  chatSettings,
  clientName = 'Client',
  companyName = 'Company',
  documents,
  activities,
}: DashboardOverviewProps) {
  const [isChartExpanded, setIsChartExpanded] = useState(false)

  const analytics = { totalAdSpend: 0 }
  const isFbConfigured = false

  const stats = {
    totalDocuments: documents.length,
    unreadMessages: 0,
  }

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
  const orderedMilestones = [...milestones].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  )

  const inProgressMilestone = milestones.find((milestone) => milestone.status === "IN_PROGRESS")
  const nextMilestone = milestones.find((milestone) => milestone.status === "NOT_STARTED")
  const sortedMilestones = [...milestones].sort(
    (a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0)
  )
  const recentCompletedMilestone = [...sortedMilestones]
    .reverse()
    .find((milestone) => milestone.status === "COMPLETED")
  const recentMilestone = inProgressMilestone || recentCompletedMilestone || sortedMilestones[0]
  const currentPhase = inProgressMilestone || nextMilestone || orderedMilestones[0]
  const currentPhaseNumber = currentPhase
    ? currentPhase.order || orderedMilestones.findIndex((m) => m.id === currentPhase.id) + 1
    : 0

  const workflowHighlights = [
    {
      label: "Recent Milestone",
      value: recentMilestone?.title || "Not started",
      detail: recentMilestone
        ? `${recentMilestone.status.replace("_", " ")} -> Due ${recentMilestone.dueDate?.toLocaleDateString() || "TBD"}`
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
      value: isFbConfigured
        ? analytics.totalAdSpend.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          })
        : "—",
      detail: isFbConfigured ? "Total ad spend (30d)" : "Ad account not connected",
      accent: "from-[#f97316]/20 via-[#fb923c]/30 to-transparent",
    },
  ]

  const phaseThemes = {
    COMPLETED: {
      card: "border-emerald-200/70 bg-emerald-50/80 dark:border-emerald-500/30 dark:bg-emerald-900/20",
      badge: "bg-emerald-100 text-emerald-700",
      progress: "bg-emerald-500",
    },
    IN_PROGRESS: {
      card: "border-sky-200/70 bg-sky-50/80 dark:border-sky-500/40 dark:bg-sky-900/20",
      badge: "bg-sky-100 text-sky-700",
      progress: "bg-sky-500",
    },
    BLOCKED: {
      card: "border-amber-200/70 bg-amber-50/80 dark:border-amber-500/30 dark:bg-amber-900/20",
      badge: "bg-amber-100 text-amber-700",
      progress: "bg-amber-500",
    },
    DEFAULT: {
      card: "border-slate-200/70 bg-white/80 dark:border-slate-800/60 dark:bg-slate-900/40",
      badge: "bg-slate-100 text-slate-600",
      progress: "bg-slate-400",
    },
  } as const

  const getPhaseTheme = (status: string) =>
    phaseThemes[status as keyof typeof phaseThemes] ?? phaseThemes.DEFAULT

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
                <Link href="#milestones" className="inline-flex items-center gap-2">
                  Review Project Phases
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid flex-1 gap-4 sm:grid-cols-2 mt-6 lg:mt-0 lg:ml-6">
            {[
              { label: "Qualified Calls (30d)", value: "—", caption: "Booked calls logged in Baseaim" },
              { label: "Leads → Calls", value: "—", caption: "Conversion rate across funnels" },
              { label: "Avg CPA", value: "—", caption: "Media efficiency" },
              { label: "Cost / Booked Call", value: "—", caption: "Goal: <$450 per consultation" },
            ].map((item) => (
              <div
                key={item.label}
                className="relative overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br from-white via-white/90 to-slate-50 p-5 text-slate-700 shadow-[0_28px_90px_rgba(15,23,42,0.2)] ring-1 ring-white/70 transition-all duration-200 hover:shadow-lg dark:border-slate-800/60 dark:bg-slate-900/70 dark:ring-slate-800/70"
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

      <div className="space-y-6" id="milestones">
        <Card className="glass-card rounded-3xl border border-white/60 shadow-xl shadow-sky-100 dark:border-slate-800/70">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Growth Roadmap</CardTitle>
            <CardDescription>Track each funnel phase from strategy through optimization.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/70 bg-white/70 p-4 text-slate-700 shadow-sm shadow-sky-100 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-100">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Phase Completion
                </p>
                <p className="mt-2 text-3xl font-heading text-slate-900 dark:text-white">
                  {completedMilestones}/{totalMilestones}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {overallProgress}% complete
                </p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/70 p-4 text-slate-700 shadow-sm shadow-sky-100 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-100">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Current Focus
                </p>
                <p className="mt-2 text-3xl font-heading text-slate-900 dark:text-white">
                  {currentPhaseNumber > 0 ? `Phase ${currentPhaseNumber}` : "Not scheduled"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {currentPhase?.title || "Awaiting kickoff"}
                </p>
              </div>
            </div>
            {orderedMilestones.length > 0 ? (
              <div className="overflow-x-auto pb-2">
                <div className="flex min-w-[640px] items-stretch gap-4">
                  {orderedMilestones.map((milestone, index) => {
                    const phaseNumber = milestone.order || index + 1
                    const theme = getPhaseTheme(milestone.status)
                    return (
                      <div key={milestone.id} className="flex items-stretch gap-4">
                        <div
                          className={`flex min-w-[220px] flex-1 flex-col justify-between rounded-3xl border p-4 shadow-sm transition-all duration-200 hover:shadow-md ${theme.card}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-200">
                              Phase {phaseNumber}
                            </span>
                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${theme.badge}`}>
                              {milestone.status.replace("_", " ")}
                            </span>
                          </div>
                          <div className="space-y-2 pt-2">
                            <p className="text-base font-semibold text-slate-900 dark:text-white">
                              {milestone.title}
                            </p>
                            {milestone.description && (
                              <p className="text-sm text-slate-600 dark:text-slate-300">
                                {milestone.description}
                              </p>
                            )}
                          </div>
                          <div className="pt-4">
                            <Progress value={milestone.progress} className="h-2 bg-white/40 dark:bg-slate-800/60" />
                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">
                              {milestone.dueDate
                                ? `Due ${milestone.dueDate.toLocaleDateString()}`
                                : "Timeline TBD"}
                            </p>
                          </div>
                        </div>
                        {index < orderedMilestones.length - 1 && (
                          <div className="hidden h-full items-center justify-center md:flex">
                            <ArrowRight className="h-6 w-6 flex-shrink-0 text-slate-400 dark:text-slate-600" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/70 bg-white/60 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                Your project team will create phases after onboarding.
              </div>
            )}
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
            {documents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/70 bg-white/60 p-6 text-center dark:border-slate-800 dark:bg-slate-900/50">
                <FileText className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No documents yet</p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  Your team will share files here once your project kicks off.
                </p>
              </div>
            ) : (
              documents.map((doc) => (
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
                        {new Date(doc.createdAt).toLocaleDateString()}
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
              ))
            )}
          </CardContent>
        </Card>

        <Card className="glass-card rounded-3xl border border-white/60 shadow-lg shadow-sky-100 dark:border-slate-800/70">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Recent Activity</CardTitle>
            <CardDescription>Quick snapshot of what your Baseaim crew just touched.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activities.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/70 bg-white/60 p-6 text-center dark:border-slate-800 dark:bg-slate-900/50">
                <Clock className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No recent activity</p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  Activity updates will appear here as your project progresses.
                </p>
              </div>
            ) : (
              activities.slice(0, 4).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm shadow-sky-100 dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <Avatar className="h-10 w-10 bg-primary/10 text-primary dark:bg-primary/20">
                    <AvatarFallback>
                      {activity.user.name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm text-slate-700 dark:text-slate-100">
                      <span className="font-semibold">{activity.user.name}</span> {activity.action}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
