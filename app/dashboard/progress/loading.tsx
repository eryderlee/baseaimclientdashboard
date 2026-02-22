import { Skeleton } from "@/components/ui/skeleton"

export default function ProgressLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Milestone items */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          {/* Left icon/status placeholder */}
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          {/* Milestone content */}
          <Skeleton className="h-20 flex-1 rounded-xl" />
        </div>
      ))}
    </div>
  )
}
