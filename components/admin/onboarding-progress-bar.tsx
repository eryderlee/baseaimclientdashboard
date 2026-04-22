import { Progress } from '@/components/ui/progress'

interface OnboardingProgressBarProps {
  checked: number
  total: number
}

export function OnboardingProgressBar({ checked, total }: OnboardingProgressBarProps) {
  const pct = total === 0 ? 0 : Math.round((checked / total) * 100)
  const complete = pct === 100

  return (
    <div className="sticky top-16 z-40 -mx-4 md:-mx-8 lg:-mx-12 bg-white border-b border-neutral-200 shadow-sm px-4 md:px-8 lg:px-12 py-3">
      <div className="flex items-center justify-between text-sm mb-2">
        <span className={`font-medium ${complete ? 'text-emerald-600' : 'text-neutral-700'}`}>
          {complete ? 'Onboarding complete' : 'Onboarding progress'}
        </span>
        <span className={`tabular-nums text-xs ${complete ? 'text-emerald-600 font-semibold' : 'text-neutral-500'}`}>
          {checked} / {total} — {pct}%
        </span>
      </div>
      <Progress
        value={pct}
        className={`h-1.5 ${complete ? '[&>div]:bg-emerald-500' : ''}`}
      />
    </div>
  )
}
