import { Skeleton } from "@/components/ui/skeleton"

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>

      {/* Row 1 — Client metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>

      {/* Row 2 — Revenue & Marketing section */}
      <div>
        <Skeleton className="h-4 w-36 mb-3" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Clients table card */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        {/* Card header */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>

        {/* Filter bar */}
        <Skeleton className="h-10 w-full rounded-md" />

        {/* Table */}
        <div className="space-y-3">
          {/* Table header row */}
          <div className="flex gap-3">
            {[48, 80, 64, 56, 48, 56, 48, 40].map((w, i) => (
              <Skeleton key={i} className={`h-3 w-${w} rounded`} />
            ))}
          </div>

          {/* 5 body rows */}
          {Array.from({ length: 5 }).map((_, row) => (
            <div key={row} className="flex gap-3 items-center">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="h-4 w-12 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="h-4 w-14 rounded" />
              <Skeleton className="h-4 w-12 rounded" />
              <Skeleton className="h-4 w-10 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
