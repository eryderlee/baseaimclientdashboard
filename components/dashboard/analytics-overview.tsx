"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import {
  Eye,
  MousePointer,
  Users,
  Phone,
  TrendingUp,
  DollarSign,
  LayoutDashboard,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface DailyMetric {
  date: string
  rawDate: string   // ISO date e.g. "2026-03-20" — used for calendar-based filtering
  value: number
}

interface MetricData {
  name: string
  dailyData: DailyMetric[]
  total: number
  adSpend: number
  conversionRate: number
  cpc?: number
  cpa?: number
  change: number
  icon: any
  color: string
  bgColor: string
}

interface AnalyticsOverviewProps {
  impressionsData: DailyMetric[]
  clicksData: DailyMetric[]
  leadsData: DailyMetric[]
  bookedCallsData: DailyMetric[]
  spendData: DailyMetric[]
  leadsEnabled: boolean
  daysCampaignRunning: number | null
}

type ChartRange = '7d' | '30d' | '90d' | 'all' | 'month'

const CHART_RANGES: { label: string; value: ChartRange }[] = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '90D', value: '90d' },
  { label: 'All', value: 'all' },
]

// Series definitions for the Overview chart — order and colors match the metrics object
const ALL_SERIES = [
  { key: 'Impressions', color: '#3b82f6', leadsOnly: false },
  { key: 'Clicks', color: '#22c55e', leadsOnly: false },
  { key: 'Leads', color: '#a855f7', leadsOnly: true },
  { key: 'Booked Calls', color: '#f97316', leadsOnly: false },
  { key: 'Ad Spend', color: '#eab308', leadsOnly: false },
] as const

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function aggregateToMonthly(data: DailyMetric[]): DailyMetric[] {
  const map = new Map<string, { sum: number; rawDate: string; date: string }>()
  for (const d of data) {
    const key = d.rawDate.slice(0, 7) // 'YYYY-MM'
    if (map.has(key)) {
      map.get(key)!.sum += d.value
    } else {
      const label = new Date(d.rawDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      map.set(key, { sum: d.value, rawDate: key + '-01', date: label })
    }
  }
  return Array.from(map.values()).map(v => ({ date: v.date, rawDate: v.rawDate, value: v.sum }))
}

function sliceRange(data: DailyMetric[], range: ChartRange, customMonth?: string | null): DailyMetric[] {
  if (range === 'all') return aggregateToMonthly(data)
  if (range === 'month' && customMonth) return data.filter(d => d.rawDate.startsWith(customMonth))
  const days = parseInt(range)
  const today = new Date()
  const todayStr = toLocalDateStr(today)
  const cutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate() - days)
  const cutoffStr = toLocalDateStr(cutoff)
  return data.filter((d) => d.rawDate >= cutoffStr && d.rawDate < todayStr)
}

export function AnalyticsOverview({
  impressionsData,
  clicksData,
  leadsData,
  bookedCallsData,
  spendData,
  leadsEnabled,
  daysCampaignRunning,
}: AnalyticsOverviewProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [chartRange, setChartRange] = useState<ChartRange>('30d')
  const [customMonth, setCustomMonth] = useState<string | null>(null)
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set())

  // Available months derived from the data
  const availableMonths = Array.from(
    new Set(impressionsData.map(d => d.rawDate.slice(0, 7)))
  ).sort().reverse()

  function handleRangeClick(range: ChartRange) {
    setChartRange(range)
    setCustomMonth(null)
  }

  function handleMonthSelect(month: string) {
    setCustomMonth(month)
    setChartRange('month')
  }

  // Calculate totals scoped to the selected range
  const rangedImpressions = sliceRange(impressionsData, chartRange, customMonth)
  const rangedClicks = sliceRange(clicksData, chartRange, customMonth)
  const rangedLeads = sliceRange(leadsData, chartRange, customMonth)
  const rangedBookedCalls = sliceRange(bookedCallsData, chartRange, customMonth)
  const rangedSpend = sliceRange(spendData, chartRange, customMonth)

  const totalImpressions = rangedImpressions.reduce((sum, d) => sum + d.value, 0)
  const totalClicks = rangedClicks.reduce((sum, d) => sum + d.value, 0)
  const totalLeads = rangedLeads.reduce((sum, d) => sum + d.value, 0)
  const totalBookedCalls = rangedBookedCalls.reduce((sum, d) => sum + d.value, 0)
  const rangeAdSpend = rangedSpend.reduce((sum, d) => sum + d.value, 0)

  // Calculate metrics from range-scoped data
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const cpc = totalClicks > 0 ? rangeAdSpend / totalClicks : 0
  const leadsConversionRate = totalClicks > 0 ? (totalLeads / totalClicks) * 100 : 0
  const cpa = totalLeads > 0 ? rangeAdSpend / totalLeads : 0
  const callsConversionRate = totalLeads > 0 ? (totalBookedCalls / totalLeads) * 100 : 0
  const cpCall = totalBookedCalls > 0 ? rangeAdSpend / totalBookedCalls : 0

  const rangeLabel = chartRange === 'all'
    ? 'All time'
    : chartRange === 'month' && customMonth
      ? new Date(customMonth + '-01T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : chartRange.toUpperCase()

  // Build metrics — conditionally include leads/bookedCalls
  const metrics: Record<string, MetricData> = {
    impressions: {
      name: "Impressions",
      dailyData: impressionsData,
      total: totalImpressions,
      adSpend: rangeAdSpend,
      conversionRate: ctr,
      change: 12.5,
      icon: Eye,
      color: "#3b82f6",
      bgColor: "bg-blue-100 dark:bg-blue-900",
    },
    clicks: {
      name: "Clicks",
      dailyData: clicksData,
      total: totalClicks,
      adSpend: rangeAdSpend,
      conversionRate: leadsConversionRate,
      cpc: cpc,
      change: 8.3,
      icon: MousePointer,
      color: "#22c55e",
      bgColor: "bg-green-100 dark:bg-green-900",
    },
    ...(leadsEnabled ? {
      leads: {
        name: "Leads",
        dailyData: leadsData,
        total: totalLeads,
        adSpend: rangeAdSpend,
        conversionRate: callsConversionRate,
        cpa: cpa,
        change: 15.7,
        icon: Users,
        color: "#a855f7",
        bgColor: "bg-purple-100 dark:bg-purple-900",
      },
    } : {}),
    bookedCalls: {
      name: "Booked Calls",
      dailyData: bookedCallsData,
      total: totalBookedCalls,
      adSpend: rangeAdSpend,
      conversionRate: totalLeads > 0 ? (totalBookedCalls / totalLeads) * 100 : 0,
      cpa: cpCall,
      change: 23.1,
      icon: Phone,
      color: "#f97316",
      bgColor: "bg-orange-100 dark:bg-orange-900",
    },
    spend: {
      name: "Ad Spend",
      dailyData: spendData,
      total: rangeAdSpend,
      adSpend: rangeAdSpend,
      conversionRate: ctr,
      cpc: cpc,
      change: 0,
      icon: DollarSign,
      color: "#eab308",
      bgColor: "bg-amber-100 dark:bg-amber-900",
    },
  }

  const metricKeys = Object.keys(metrics)
  const currentMetric = metrics[activeTab]
  const Icon = currentMetric?.icon ?? LayoutDashboard

  // Series available for Overview chart (respects leadsEnabled)
  const availableSeries = ALL_SERIES.filter((s) => !s.leadsOnly || leadsEnabled)

  function toggleSeries(key: string) {
    setHiddenSeries((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const rangeControls = (
    <div className="flex items-center gap-1 flex-wrap">
      {CHART_RANGES.map((r) => (
        <button
          key={r.value}
          onClick={() => handleRangeClick(r.value)}
          className={cn(
            'rounded px-2.5 py-1 text-xs font-medium transition-colors',
            chartRange === r.value && !customMonth
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
        >
          {r.label}
        </button>
      ))}
      <Select
        value={customMonth ?? ''}
        onValueChange={handleMonthSelect}
      >
        <SelectTrigger
          className={cn(
            'h-7 w-[110px] text-xs border-0 shadow-none',
            chartRange === 'month' && customMonth
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
        >
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          {availableMonths.map(m => {
            const label = new Date(m + '-01T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            return <SelectItem key={m} value={m}>{label}</SelectItem>
          })}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <div className="lg:col-span-2">
      <Card className="w-full h-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Campaign Performance</CardTitle>
            <CardDescription>
              Track your advertising metrics and conversion rates
            </CardDescription>
          </div>
          {daysCampaignRunning != null && daysCampaignRunning > 0 && (
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              Running for {daysCampaignRunning} {daysCampaignRunning === 1 ? 'day' : 'days'}
            </span>
          )}
        </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* grid-cols-5 grid-cols-6 — keep both in source so Tailwind doesn't purge them */}
          <TabsList className={cn("grid w-full mb-6", leadsEnabled ? "grid-cols-6" : "grid-cols-5")}>
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </TabsTrigger>
            {metricKeys.map((key) => {
              const metric = metrics[key]
              const MetricIcon = metric.icon
              return (
                <TabsTrigger key={key} value={key} className="gap-2">
                  <MetricIcon className="h-4 w-4" />
                  {metric.name}
                </TabsTrigger>
              )
            })}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>All Metrics</CardTitle>
                  <CardDescription>Daily performance across all channels</CardDescription>
                </div>
                {rangeControls}
              </CardHeader>
              <CardContent>
                {/* Series toggle pills */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {availableSeries.map((s) => {
                    const isHidden = hiddenSeries.has(s.key)
                    return (
                      <button
                        key={s.key}
                        onClick={() => toggleSeries(s.key)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all border',
                          isHidden
                            ? 'opacity-40 line-through border-slate-200 text-slate-400'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        )}
                      >
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: isHidden ? '#cbd5e1' : s.color }}
                        />
                        {s.key}
                      </button>
                    )
                  })}
                </div>
                {(() => {
                  // Merge all series by index — all arrays share same dates in same order
                  const sliced = sliceRange(impressionsData, chartRange, customMonth)
                  const slicedClicks = sliceRange(clicksData, chartRange, customMonth)
                  const slicedLeads = sliceRange(leadsData, chartRange, customMonth)
                  const slicedCalls = sliceRange(bookedCallsData, chartRange, customMonth)
                  const slicedSpend = sliceRange(spendData, chartRange, customMonth)
                  const combined = sliced.map((d, i) => ({
                    date: d.date,
                    Impressions: d.value,
                    Clicks: slicedClicks[i]?.value ?? 0,
                    Leads: slicedLeads[i]?.value ?? 0,
                    'Booked Calls': slicedCalls[i]?.value ?? 0,
                    'Ad Spend': slicedSpend[i]?.value ?? 0,
                  }))
                  const visibleSeries = availableSeries.filter((s) => !hiddenSeries.has(s.key))
                  return (
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={combined}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-800" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          className="text-neutral-600 dark:text-neutral-400"
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          className="text-neutral-600 dark:text-neutral-400"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "var(--radius)",
                          }}
                        />
                        {visibleSeries.map((s) => (
                          <Line
                            key={s.key}
                            type="monotone"
                            dataKey={s.key}
                            stroke={s.color}
                            strokeWidth={2}
                            dot={{ fill: s.color, r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  )
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {metricKeys.map((key) => {
            const metric = metrics[key]
            return (
            <TabsContent key={key} value={key} className="space-y-6">
              {/* Meta Metrics */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Total Count */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total {metric.name}
                    </CardTitle>
                    <Icon className="h-4 w-4" style={{ color: metric.color }} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {activeTab === 'spend'
                        ? `$${metric.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : metric.total.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      <p className="text-xs text-green-600 dark:text-green-400">
                        +{metric.change}% from last month
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Ad Spend */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Ad Spend
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${metric.adSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      {rangeLabel} investment
                    </p>
                  </CardContent>
                </Card>

                {/* Conversion Rate */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Conversion Rate
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {metric.conversionRate.toFixed(2)}%
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      {key === "impressions" && "Click-through rate"}
                      {key === "clicks" && "Clicks to leads"}
                      {key === "leads" && "Leads to calls"}
                      {key === "bookedCalls" && "Call booking rate"}
                    </p>
                  </CardContent>
                </Card>

                {/* CPC/CPA */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {metric.cpc ? "CPC" : "CPA"}
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-purple-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${(metric.cpc || metric.cpa || 0).toFixed(2)}
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      {metric.cpc ? "Cost per click" : "Cost per acquisition"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Line Chart */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{metric.name} Trend</CardTitle>
                    <CardDescription>
                      Daily performance over the selected range
                    </CardDescription>
                  </div>
                  {rangeControls}
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={sliceRange(metric.dailyData, chartRange, customMonth)}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-800" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        className="text-neutral-600 dark:text-neutral-400"
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        className="text-neutral-600 dark:text-neutral-400"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={metric.color}
                        strokeWidth={2}
                        dot={{ fill: metric.color, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
            )
          })}
        </Tabs>
      </CardContent>
    </Card>
    </div>
  )
}
