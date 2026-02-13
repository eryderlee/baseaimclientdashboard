"use client";

import { MilestoneChecklist } from "@/components/dashboard/milestone-checklist";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  calculateOverallProgress,
  formatWeekLevel,
  getActiveMilestone,
} from "@/lib/milestone-utils";
import { Milestone, MilestoneStatus } from "@/lib/types/milestone";
import { CalendarDays, Target, TrendingUp } from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";

const mockMilestones: Milestone[] = [
  {
    id: "kickoff",
    clientId: "demo-client",
    title: "Discovery + Kickoff",
    description: "Project intake, success metrics, and tech stack alignment.",
    status: MilestoneStatus.COMPLETED,
    startDate: new Date("2026-01-05"),
    dueDate: new Date("2026-01-10"),
    completedAt: new Date("2026-01-10"),
    progress: 100,
    order: 1,
    notes: [
      {
        id: "kickoff-note-1",
        content: "Kickoff call recorded and summary shared.",
        createdAt: "2026-01-09T15:00:00.000Z",
        createdBy: "Project Manager",
      },
    ],
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-10"),
  },
  {
    id: "funnels",
    clientId: "demo-client",
    title: "Acquisition Funnel Architecture",
    description: "Landing page copy, wireframes, and CRM routing.",
    status: MilestoneStatus.COMPLETED,
    startDate: new Date("2026-01-11"),
    dueDate: new Date("2026-01-22"),
    completedAt: new Date("2026-01-22"),
    progress: 100,
    order: 2,
    notes: [
      {
        id: "funnels-note-1",
        content: "Copy approved and design locked for dev handoff.",
        createdAt: "2026-01-20T13:00:00.000Z",
        createdBy: "Creative Lead",
      },
    ],
    createdAt: new Date("2026-01-02"),
    updatedAt: new Date("2026-01-22"),
  },
  {
    id: "build",
    clientId: "demo-client",
    title: "Client Acquisition System Build",
    description: "Deploy landing pages, automations, and call booking workflows.",
    status: MilestoneStatus.IN_PROGRESS,
    startDate: new Date("2026-01-23"),
    dueDate: new Date("2026-02-05"),
    completedAt: null,
    progress: 65,
    order: 3,
    notes: [
      {
        id: "build-note-1",
        content: "Calendly + CRM integration complete; awaiting legal review.",
        createdAt: "2026-01-28T18:30:00.000Z",
        createdBy: "Growth Engineer",
      },
    ],
    createdAt: new Date("2026-01-05"),
    updatedAt: new Date("2026-02-01"),
  },
  {
    id: "qa",
    clientId: "demo-client",
    title: "QA, Compliance, and Launch Prep",
    description: "Testing tracking events, compliance review, and launch list.",
    status: MilestoneStatus.NOT_STARTED,
    startDate: new Date("2026-02-06"),
    dueDate: new Date("2026-02-15"),
    completedAt: null,
    progress: 0,
    order: 4,
    notes: [],
    createdAt: new Date("2026-01-20"),
    updatedAt: new Date("2026-01-20"),
  },
  {
    id: "scale",
    clientId: "demo-client",
    title: "Paid Media Launch + Optimization",
    description: "Launch ads, monitor CPL, and iterate on creative weekly.",
    status: MilestoneStatus.NOT_STARTED,
    startDate: new Date("2026-02-16"),
    dueDate: new Date("2026-03-05"),
    completedAt: null,
    progress: 0,
    order: 5,
    notes: [],
    createdAt: new Date("2026-01-25"),
    updatedAt: new Date("2026-01-25"),
  },
];

const timelineDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});
const noteDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
});

export default function ProgressPage() {
  const overallProgress = calculateOverallProgress(mockMilestones);
  const activeMilestone = getActiveMilestone(mockMilestones);
  const completedMilestones = mockMilestones.filter(
    (milestone) => milestone.status === MilestoneStatus.COMPLETED
  );
  const nextMilestone = mockMilestones.find(
    (milestone) => milestone.status === MilestoneStatus.NOT_STARTED
  );
  const milestoneNotes = mockMilestones
    .flatMap((milestone) =>
      milestone.notes.map((note) => ({
        milestoneTitle: milestone.title,
        ...note,
      }))
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  const totalMilestones = mockMilestones.length;
  let cumulativeActualUnits = 0;
  const timelineData = mockMilestones.map((milestone, index) => {
    const planned = Math.round(((index + 1) / totalMilestones) * 100);
    const contribution =
      milestone.status === MilestoneStatus.COMPLETED
        ? 1
        : milestone.status === MilestoneStatus.IN_PROGRESS ||
          milestone.status === MilestoneStatus.BLOCKED
        ? milestone.progress / 100
        : 0;

    cumulativeActualUnits += contribution;

    const actual = Math.round(
      Math.min(cumulativeActualUnits / totalMilestones, 1) * 100
    );

    const dateSource =
      milestone.dueDate ?? milestone.startDate ?? milestone.createdAt;
    const dateLabel = dateSource
      ? timelineDateFormatter.format(dateSource)
      : `Phase ${milestone.order}`;

    return {
      phase: `Phase ${milestone.order}`,
      label: milestone.title,
      dateLabel,
      planned,
      actual,
      status: milestone.status,
    };
  });

  const TimelineTooltipContent = ({
    active,
    payload,
  }: any) => {
    if (!active || !payload?.length) {
      return null;
    }

    const dataPoint = payload[0]?.payload as (typeof timelineData)[number];

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
    );
  };

  const heroDescription = activeMilestone
    ? `${activeMilestone.title} is pacing toward ${formatWeekLevel(
        activeMilestone.dueDate
      )} with ${activeMilestone.progress}% of deliverables in place.`
    : "Every milestone in this workstream has been delivered. We'll add the next scope of work once it is scheduled.";

  const stats = [
    {
      label: "Delivery pace",
      value: `${completedMilestones.length}/${mockMilestones.length} phases`,
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
  ];

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden border-none bg-slate-950 text-white shadow-xl">
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
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
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
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
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
            <CardTitle>Progress Log</CardTitle>
            <CardDescription>
              Latest milestone notes synced from the delivery team
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {milestoneNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No milestone notes yet. Updates will appear here automatically.
              </p>
            ) : (
              milestoneNotes.slice(0, 4).map((note) => (
                <div
                  key={note.id}
                  className="rounded-xl border bg-muted/30 p-4"
                >
                  <p className="text-sm font-medium text-foreground">
                    {note.content}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                    <span>{note.milestoneTitle}</span>
                    <span aria-hidden="true">•</span>
                    <span>{note.createdBy}</span>
                    <span aria-hidden="true">•</span>
                    <span>
                      {noteDateFormatter.format(new Date(note.createdAt))}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <MilestoneChecklist milestones={mockMilestones} />
    </div>
  );
}
