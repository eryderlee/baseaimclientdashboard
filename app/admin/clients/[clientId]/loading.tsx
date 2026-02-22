import { Skeleton } from "@/components/ui/skeleton"

export default function ClientDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Back button */}
      <Skeleton className="h-8 w-32" />

      {/* Client name + action buttons */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-56" />
        </div>
        {/* Action buttons (Edit, Documents, Invoices) */}
        <div className="flex gap-2 shrink-0">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Milestone table / content area */}
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}
