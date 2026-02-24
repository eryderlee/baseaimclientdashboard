'use client'

import type { FbPlatformRow } from '@/lib/facebook-ads'

interface FbPlatformSplitProps {
  platforms: FbPlatformRow[]
}

function capitalize(str: string): string {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function FbPlatformSplit({ platforms }: FbPlatformSplitProps) {
  if (platforms.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/70 bg-white/60 p-6 text-center">
        <p className="text-sm text-slate-500">No platform breakdown data available for this period.</p>
      </div>
    )
  }

  // Calculate total spend for percentage calculation
  const totalSpend = platforms.reduce((sum, p) => sum + parseFloat(p.spend), 0)

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {platforms.map((platform) => {
        const spendValue = parseFloat(platform.spend)
        const spendPercent = totalSpend > 0 ? ((spendValue / totalSpend) * 100).toFixed(1) : '0.0'

        return (
          <div
            key={platform.publisher_platform}
            className="rounded-lg border border-slate-100 bg-white p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-slate-800">
                {capitalize(platform.publisher_platform)}
              </span>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {spendPercent}% of spend
              </span>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Spend</span>
                <span className="font-medium text-slate-700">${spendValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Impressions</span>
                <span className="font-medium text-slate-700">
                  {parseInt(platform.impressions).toLocaleString('en-US')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Clicks</span>
                <span className="font-medium text-slate-700">
                  {parseInt(platform.clicks).toLocaleString('en-US')}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
