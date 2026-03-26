'use client'

interface AdminPreviewBannerProps {
  clientName: string
  exitAction: () => Promise<void>
}

export function AdminPreviewBanner({ clientName, exitAction }: AdminPreviewBannerProps) {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-between bg-amber-400 px-4 py-2 text-sm font-medium text-amber-900">
      <span>Viewing as {clientName}</span>
      <form action={exitAction}>
        <button
          type="submit"
          className="rounded bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
        >
          Exit Preview
        </button>
      </form>
    </div>
  )
}
