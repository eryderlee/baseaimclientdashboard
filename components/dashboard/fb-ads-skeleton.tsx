import { Skeleton } from "@/components/ui/skeleton"

export function FbAdsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Date range buttons + export */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-28 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>

      {/* 12 metric cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      {/* Trend chart */}
      <div className="mt-6 space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-64 rounded-xl" />
      </div>

      {/* Top campaigns */}
      <div className="mt-6 space-y-2">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-32 rounded-xl" />
      </div>

      {/* Platform breakdown */}
      <div className="mt-6 space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    </div>
  )
}
