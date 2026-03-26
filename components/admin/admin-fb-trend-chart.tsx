'use client'

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

interface TrendDataPoint {
  date: string
  spend: number
  leads: number
}

interface AdminFbTrendChartProps {
  data: TrendDataPoint[]
}

export function AdminFbTrendChart({ data }: AdminFbTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/70 bg-white/60 p-6 text-center">
        <p className="text-sm text-slate-500">No trend data available.</p>
      </div>
    )
  }

  const formatted = data.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={formatted} margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
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
  )
}
