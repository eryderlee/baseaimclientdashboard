"use client"

import { MilestoneChecklist } from "@/components/dashboard/milestone-checklist"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  calculateOverallProgress,
  formatWeekLevel,
  getActiveMilestone,
} from "@/lib/milestone-utils"
import { Milestone, MilestoneStatus, MilestoneNote } from "@/lib/types/milestone"
import { CalendarDays, Target, TrendingUp } from "lucide-react"
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { TooltipProps } from "recharts"

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

interface ProgressViewProps {
  milestones: SerializedMilestone[]
}

const timelineDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
})

export function ProgressView({ milestones: serializedMilestones }: ProgressViewProps) {
  // Convert serialized milestones back to Milestone type with Date objects
  const milestones: Milestone[] = serializedMilestones.map(m => ({
    ...m,
    status: m.status as MilestoneStatus,
    startDate: m.startDate ? new Date(m.startDate) : null,
    dueDate: m.dueDate ? new Date(m.dueDate) : null,
    completedAt: m.completedAt ? new Date(m.completedAt) : null,
    createdAt: new Date(m.createdAt),
    updatedAt: new Date(m.updatedAt),
    notes: Array.isArray(m.notes) ? (m.notes as MilestoneNote[]) : [],
  }))

  // Handle empty state
  if (milestones.length === 0) {
    return (
      <div className="space-y-8">
        <Card className="overflow-hidden border-none bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-900/85 text-white shadow-xl">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-6">
              <div className="space-y-3">
                <CardTitle className="text-3xl font-semibold text-white">
                  Progress Tracking
                </CardTitle>
                <CardDescription className="text-base text-white/70">
                  No milestones assigned yet. Your project manager will set up your milestones during onboarding.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const overallProgress = calculateOverallProgress(milestones)
  const activeMilestone = getActiveMilestone(milestones)
  const completedMilestones = milestones.filter(
    (milestone) => milestone.status === MilestoneStatus.COMPLETED
  )
  const inProgressCount = milestones.filter(
    (milestone) => milestone.status === MilestoneStatus.IN_PROGRESS
  ).length
  const blockedCount = milestones.filter(
    (milestone) => milestone.status === MilestoneStatus.BLOCKED
  ).length
  const queuedCount = milestones.filter(
    (milestone) => milestone.status === MilestoneStatus.NOT_STARTED
  ).length
  const nextMilestone = milestones.find(
    (milestone) => milestone.status === MilestoneStatus.NOT_STARTED
  )
  const totalMilestones = milestones.length
  let cumulativeActualUnits = 0
  const timelineData = milestones.map((milestone, index) => {
    const planned = Math.round(((index + 1) / totalMilestones) * 100)
    const contribution =
      milestone.status === MilestoneStatus.COMPLETED
        ? 1
        : milestone.status === MilestoneStatus.IN_PROGRESS ||
          milestone.status === MilestoneStatus.BLOCKED
        ? milestone.progress / 100
        : 0

    cumulativeActualUnits += contribution

    const actual = Math.round(
      Math.min(cumulativeActualUnits / totalMilestones, 1) * 100
    )

    const dateSource =
      milestone.dueDate ?? milestone.startDate ?? milestone.createdAt
    const dateLabel = dateSource
      ? timelineDateFormatter.format(dateSource)
      : `Phase ${milestone.order}`

    return {
      phase: `Phase ${milestone.order}`,
      label: milestone.title,
      dateLabel,
      planned,
      actual,
      status: milestone.status,
    }
  })
  const TimelineTooltipContent = ({
    active,
    payload,
  }: any) => {
    if (!active || !payload?.length) {
      return null
    }

    const dataPoint = payload[0]?.payload as (typeof timelineData)[number]

    return (
      <div className="rounded-lg border bg-background/95 px-3 py-2 text-xs shadow-lg">
        <p className="text-sm font-medium text-foreground">{dataPoint.label}</p>
        <p className="text-muted-foreground">{dataPoint.dateLabel}</p>
        <div className="mt-2 space-y-1">
          <p className="text-muted-foreground">
            Planned:{" "}
            <span className="font-medium text-foreground">
              {dataPoint.planned}%
            </span>
          </p>
          <p className="text-muted-foreground">
            Actual:{" "}
            <span className="font-medium text-foreground">
              {dataPoint.actual}%
            </span>
          </p>
        </div>
      </div>
    )
  }

  const heroDescription = activeMilestone
    ? `${activeMilestone.title} is pacing toward ${formatWeekLevel(
        activeMilestone.dueDate
      )} with ${activeMilestone.progress}% of deliverables in place.`
    : "Every milestone in this workstream has been delivered. We'll add the next scope of work once it is scheduled."

  const stats = [
    {
      label: "Delivery pace",
      value: `${completedMilestones.length}/${milestones.length} phases`,
      sublabel: completedMilestones.length
        ? `${completedMilestones[completedMilestones.length - 1].title} shipped`
        : "Kickoff queued",
      icon: TrendingUp,
    },
    {
      label: "Current phase",
      value: activeMilestone?.title ?? "Awaiting kickoff",
      sublabel: activeMilestone?.dueDate
        ? formatWeekLevel(activeMilestone.dueDate)
        : "No dates scheduled",
      icon: Target,
    },
    {
      label: "Next review",
      value: nextMilestone
        ? formatWeekLevel(nextMilestone.startDate)
        : "To be scheduled",
      sublabel: nextMilestone?.title ?? "Pending scope",
      icon: CalendarDays,
    },
  ]

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden border-none bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-900/80 text-white shadow-xl">
        <CardHeader className="space-y-4">
          <Badge
            variant="outline"
            className="w-fit border-white/30 bg-white/5 text-white"
          >
            {activeMilestone ? "Active milestone" : "Delivery cadence"}
          </Badge>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <CardTitle className="text-3xl font-semibold text-white">
                Progress Tracking
              </CardTitle>
              <CardDescription className="text-base text-white/70">
                {heroDescription}
              </CardDescription>
              {activeMilestone && (
                <p className="text-sm text-white/70">
                  Due {formatWeekLevel(activeMilestone.dueDate)} ·{" "}
                  {activeMilestone.progress}% complete
                </p>
              )}
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/5 p-6 text-right">
              <p className="text-xs uppercase tracking-widest text-white/60">
                Overall completion
              </p>
              <p className="text-5xl font-semibold leading-tight">
                {overallProgress}%
              </p>
              <p className="text-sm text-emerald-200">On pace with plan</p>
            </div>
          </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-white/80">
                <span>
                  {completedMilestones.length} of {milestones.length} phases approved
                </span>
                <span className="font-semibold text-white">
                  {overallProgress}%
                </span>
              </div>
              <Progress value={overallProgress} className="mt-3 h-2 bg-white/20" />
              <p className="mt-2 text-xs uppercase tracking-wide text-white/60">
                {activeMilestone
                  ? `Building ${activeMilestone.title}`
                  : "Awaiting kickoff"}
              </p>
            </div>
          </CardHeader>
        </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="flex flex-col gap-4 p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2 text-primary">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="text-xl font-semibold text-foreground">
                      {stat.value}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{stat.sublabel}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]">
        <div className="order-2 lg:order-1">
          <MilestoneChecklist milestones={milestones} />
        </div>

        <div className="order-1 space-y-6 lg:order-2">
          <Card>
            <CardHeader>
              <CardTitle>Progress Timeline</CardTitle>
              <CardDescription>
                Planned vs actual completion across milestones
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={timelineData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="phase"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={false}
                  />
                  <Tooltip content={<TimelineTooltipContent />} />
                  <defs>
                    <linearGradient id="timelineActual" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="actual"
                    stroke="#0ea5e9"
                    strokeWidth={3}
                    fill="url(#timelineActual)"
                    name="Actual progress"
                  />
                  <Line
                    type="monotone"
                    dataKey="planned"
                    stroke="#cbd5f5"
                    strokeDasharray="6 4"
                    strokeWidth={2}
                    dot={{ stroke: "#cbd5f5", strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                    name="Planned pace"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Delivery Snapshot</CardTitle>
              <CardDescription>Where each phase sits right now</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Completed", value: completedMilestones.length },
                { label: "In progress", value: inProgressCount },
                { label: "Queued", value: queuedCount },
                { label: "Blocked", value: blockedCount },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-lg border border-dashed px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {item.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.value > 0
                        ? `${item.value} milestone${
                            item.value === 1 ? "" : "s"
                          }`
                        : "None right now"}
                    </p>
                  </div>
                  <span className="text-lg font-semibold text-foreground">
                    {item.value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
