'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

const ranges = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: 'All', value: 'all' },
] as const

export function DateRangeSelector() {
  const params = useSearchParams()
  const current = params.get('range') ?? '30d'
  return (
    <div className="flex gap-1">
      {ranges.map((r) => (
        <Link
          key={r.value}
          href={`?range=${r.value}`}
          className={cn(
            'rounded px-2.5 py-1 text-xs font-medium transition-colors',
            current === r.value
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
        >
          {r.label}
        </Link>
      ))}
    </div>
  )
}
