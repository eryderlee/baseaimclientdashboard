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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TrendDataPoint } from '@/lib/facebook-ads'
export type { TrendDataPoint }

type Range = '7d' | '30d' | '90d' | 'all' | 'month'

const RANGES: { label: string; value: Exclude<Range, 'month'> }[] = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '90D', value: '90d' },
  { label: 'All', value: 'all' },
]

function aggregateTrendToMonthly(data: TrendDataPoint[]): TrendDataPoint[] {
  const map = new Map<string, { spend: number; leads: number; revenue: number; date: string; rawDate: string }>()
  for (const d of data) {
    const key = d.rawDate.slice(0, 7)
    const existing = map.get(key)
    if (existing) {
      existing.spend += d.spend
      existing.leads += d.leads
      existing.revenue += d.roas * d.spend
    } else {
      const label = new Date(d.rawDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      map.set(key, { spend: d.spend, leads: d.leads, revenue: d.roas * d.spend, date: label, rawDate: key + '-01' })
    }
  }
  return Array.from(map.values()).map((v) => ({
    date: v.date,
    rawDate: v.rawDate,
    spend: v.spend,
    leads: v.leads,
    roas: v.spend > 0 ? v.revenue / v.spend : 0,
  }))
}

function sliceByRange(data: TrendDataPoint[], range: Range, customMonth: string | null): TrendDataPoint[] {
  if (range === 'all') return aggregateTrendToMonthly(data)
  if (range === 'month' && customMonth) return data.filter((d) => d.rawDate.startsWith(customMonth))
  const days = parseInt(range)
  return data.slice(-days)
}

// ─── Component ─────────────────────────────────────────────────────────────────

interface FbTrendChartProps {
  data: TrendDataPoint[]
  leadsEnabled?: boolean
}

export function FbTrendChart({ data, leadsEnabled = true }: FbTrendChartProps) {
  const [range, setRange] = useState<Range>('30d')
  const [customMonth, setCustomMonth] = useState<string | null>(null)

  const availableMonths = Array.from(new Set(data.map((d) => d.rawDate.slice(0, 7)))).sort()

  const visible = sliceByRange(data, range, customMonth)

  const handleRangeClick = (r: Exclude<Range, 'month'>) => {
    setRange(r)
    setCustomMonth(null)
  }

  const handleMonthSelect = (month: string) => {
    setCustomMonth(month)
    setRange('month')
  }

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/70 bg-white/60 p-6 text-center">
        <p className="text-sm text-slate-500">No trend data available.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-end gap-1 items-center">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => handleRangeClick(r.value)}
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
        <Select value={customMonth ?? ''} onValueChange={handleMonthSelect}>
          <SelectTrigger
            className={cn(
              'h-7 w-[110px] text-xs',
              range === 'month' ? 'border-blue-600 ring-1 ring-blue-600' : ''
            )}
          >
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {availableMonths.map((m) => {
              const label = new Date(m + '-01T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
              return (
                <SelectItem key={m} value={m}>
                  {label}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart
          data={visible}
          margin={{ top: 4, right: leadsEnabled ? 80 : 50, left: 8, bottom: 4 }}
        >
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
            hide={!leadsEnabled}
            allowDecimals={false}
            tick={{ fontSize: 11, fill: '#10b981' }}
            tickLine={false}
            axisLine={false}
            width={leadsEnabled ? 40 : 0}
          />
          <YAxis
            yAxisId="roas"
            orientation="right"
            hide={false}
            tickFormatter={(v: number) => `${v.toFixed(1)}x`}
            tick={{ fontSize: 11, fill: '#f59e0b' }}
            tickLine={false}
            axisLine={false}
            width={40}
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
          {leadsEnabled && (
            <Line
              yAxisId="leads"
              dataKey="leads"
              stroke="#10b981"
              dot={false}
              name="Leads"
              strokeWidth={2}
            />
          )}
          <Line
            yAxisId="roas"
            dataKey="roas"
            stroke="#f59e0b"
            dot={false}
            name="ROAS"
            strokeWidth={2}
            strokeDasharray="5 3"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
