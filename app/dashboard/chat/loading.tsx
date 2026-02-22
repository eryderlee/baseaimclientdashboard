import { Skeleton } from "@/components/ui/skeleton"

export default function ChatLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Page header */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Chat card */}
      <div className="rounded-3xl border p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-64" />
        </div>
        {/* Chat buttons placeholder */}
        <Skeleton className="h-48 max-w-md mx-auto rounded-2xl" />
      </div>
    </div>
  )
}
