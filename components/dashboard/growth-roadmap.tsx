"use client"

interface SerializedMilestone {
  id: string
  clientId: string
  title: string
  description: string | null
  status: string
  milestoneType?: string
  startDate: string | null
  dueDate: string | null
  completedAt: string | null
  progress: number
  order: number
  notes: any
  createdAt: string
  updatedAt: string
}

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

function getPhaseTheme(status: string) {
  return phaseThemes[status as keyof typeof phaseThemes] ?? phaseThemes.DEFAULT
}

function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return "No date set"
  return new Date(dueDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

interface GrowthRoadmapProps {
  milestones: SerializedMilestone[]
}

export function GrowthRoadmap({ milestones }: GrowthRoadmapProps) {
  if (milestones.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/70 bg-white/60 p-6 text-center dark:border-slate-800 dark:bg-slate-900/50">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Your post-setup milestones will appear here once monthly reviews are generated.
        </p>
      </div>
    )
  }

  // Show only the next 5 upcoming milestones (non-completed first, ordered by dueDate from DAL)
  const upcoming = milestones
    .filter((m) => m.status !== "COMPLETED")
    .slice(0, 5)

  if (upcoming.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/70 bg-white/60 p-6 text-center dark:border-slate-800 dark:bg-slate-900/50">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          All post-setup milestones are complete!
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
      {upcoming.map((milestone) => {
        const theme = getPhaseTheme(milestone.status)
        return (
          <div
            key={milestone.id}
            className={`flex flex-col justify-between rounded-3xl border p-4 shadow-sm transition-all duration-200 hover:shadow-md ${theme.card}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${theme.badge}`}>
                {milestone.status.replace(/_/g, " ")}
              </span>
            </div>
            <div className="space-y-1 pt-3">
              <p className="text-sm font-semibold leading-tight text-slate-900 dark:text-white">
                {milestone.title}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formatDueDate(milestone.dueDate)}
              </p>
            </div>
            {milestone.status === "IN_PROGRESS" && (
              <div className="mt-3">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/40 dark:bg-slate-800/60">
                  <div
                    className={`h-full rounded-full ${theme.progress}`}
                    style={{ width: `${milestone.progress}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {milestone.progress}%
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
