'use client'

import { useState } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { cn } from '@/lib/utils'
import type { TrendDataPoint } from '@/lib/facebook-ads'
export type { TrendDataPoint }

type Range = '7d' | '30d' | '90d' | 'all'

const RANGES: { label: string; value: Range }[] = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '90D', value: '90d' },
  { label: 'All', value: 'all' },
]

function sliceByRange(data: TrendDataPoint[], range: Range): TrendDataPoint[] {
  if (range === 'all') return data
  const days = parseInt(range)
  return data.slice(-days)
}

// ─── Component ─────────────────────────────────────────────────────────────────

interface FbTrendChartProps {
  data: TrendDataPoint[]
}

export function FbTrendChart({ data }: FbTrendChartProps) {
  const [range, setRange] = useState<Range>('30d')
  const visible = sliceByRange(data, range)

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/70 bg-white/60 p-6 text-center">
        <p className="text-sm text-slate-500">No trend data available.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-1">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={cn(
              'rounded px-2.5 py-1 text-xs font-medium transition-colors',
              range === r.value
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={visible} margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="spend"
            orientation="left"
            tickFormatter={(v: number) => `$${v}`}
            tick={{ fontSize: 12, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="leads"
            orientation="right"
            allowDecimals={false}
            tick={{ fontSize: 12, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            yAxisId="spend"
            dataKey="spend"
            fill="#2563eb"
            name="Spend ($)"
            barSize={20}
            radius={[2, 2, 0, 0]}
          />
          <Line
            yAxisId="leads"
            dataKey="leads"
            stroke="#10b981"
            dot={false}
            name="Leads"
            strokeWidth={2}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
