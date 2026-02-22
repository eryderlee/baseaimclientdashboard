import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Stat cards row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>

      {/* Chart area */}
      <Skeleton className="h-64 rounded-xl" />

      {/* Milestone checklist */}
      <Skeleton className="h-48 rounded-xl" />
    </div>
  )
}
