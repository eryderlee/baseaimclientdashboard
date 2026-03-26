"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  ComposedChart,
  LineChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import {
  Eye,
  MousePointer,
  Users,
  Phone,
  TrendingUp,
  TrendingDown,
  DollarSign,
  LayoutDashboard,
  Maximize2,
  Minimize2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface DailyMetric {
  date: string
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
  totalAdSpend: number
  isExpanded: boolean
  setIsExpanded: (expanded: boolean) => void
}

type ChartRange = '7d' | '30d' | '90d' | 'all'

const CHART_RANGES: { label: string; value: ChartRange }[] = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '90D', value: '90d' },
  { label: 'All', value: 'all' },
]

function sliceRange(data: DailyMetric[], range: ChartRange): DailyMetric[] {
  if (range === 'all') return data
  return data.slice(-parseInt(range))
}

export function AnalyticsOverview({
  impressionsData,
  clicksData,
  leadsData,
  bookedCallsData,
  spendData,
  totalAdSpend,
  isExpanded,
  setIsExpanded,
}: AnalyticsOverviewProps) {
  const [activeTab, setActiveTab] = useState("impressions")
  const [chartRange, setChartRange] = useState<ChartRange>('30d')

  // Calculate totals
  const totalImpressions = impressionsData.reduce((sum, d) => sum + d.value, 0)
  const totalClicks = clicksData.reduce((sum, d) => sum + d.value, 0)
  const totalLeads = leadsData.reduce((sum, d) => sum + d.value, 0)
  const totalBookedCalls = bookedCallsData.reduce((sum, d) => sum + d.value, 0)

  // Calculate metrics
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const cpc = totalClicks > 0 ? totalAdSpend / totalClicks : 0
  const leadsConversionRate = totalClicks > 0 ? (totalLeads / totalClicks) * 100 : 0
  const cpa = totalLeads > 0 ? totalAdSpend / totalLeads : 0
  const callsConversionRate = totalLeads > 0 ? (totalBookedCalls / totalLeads) * 100 : 0
  const cpCall = totalBookedCalls > 0 ? totalAdSpend / totalBookedCalls : 0

  const metrics: Record<string, MetricData> = {
    impressions: {
      name: "Impressions",
      dailyData: impressionsData,
      total: totalImpressions,
      adSpend: totalAdSpend,
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
      adSpend: totalAdSpend,
      conversionRate: leadsConversionRate,
      cpc: cpc,
      change: 8.3,
      icon: MousePointer,
      color: "#22c55e",
      bgColor: "bg-green-100 dark:bg-green-900",
    },
    leads: {
      name: "Leads",
      dailyData: leadsData,
      total: totalLeads,
      adSpend: totalAdSpend,
      conversionRate: callsConversionRate,
      cpa: cpa,
      change: 15.7,
      icon: Users,
      color: "#a855f7",
      bgColor: "bg-purple-100 dark:bg-purple-900",
    },
    bookedCalls: {
      name: "Booked Calls",
      dailyData: bookedCallsData,
      total: totalBookedCalls,
      adSpend: totalAdSpend,
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
      total: totalAdSpend,
      adSpend: totalAdSpend,
      conversionRate: ctr,
      cpc: cpc,
      change: 0,
      icon: DollarSign,
      color: "#10b981",
      bgColor: "bg-emerald-100 dark:bg-emerald-900",
    },
  }

  const currentMetric = metrics[activeTab]
  const Icon = currentMetric.icon

  return (
    <div className={cn(
      "transition-all duration-300",
      isExpanded ? "lg:col-span-3" : "lg:col-span-2"
    )}>
      <Card className="w-full h-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Campaign Performance</CardTitle>
            <CardDescription>
              Track your advertising metrics and conversion rates over the last 30 days
            </CardDescription>
          </div>
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Collapse chart to normal size" : "Expand chart to full width"}
            variant="outline"
            size="icon"
            className="hidden lg:flex"
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6 mb-6">
            {Object.entries(metrics).map(([key, metric]) => {
              const MetricIcon = metric.icon
              return (
                <TabsTrigger key={key} value={key} className="gap-2">
                  <MetricIcon className="h-4 w-4" />
                  {metric.name}
                </TabsTrigger>
              )
            })}
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>All Metrics</CardTitle>
                  <CardDescription>Daily performance across all channels</CardDescription>
                </div>
                <div className="flex gap-1">
                  {CHART_RANGES.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setChartRange(r.value)}
                      className={cn(
                        'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                        chartRange === r.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Merge all series by date — all arrays share the same dates
                  const sliced = sliceRange(impressionsData, chartRange)
                  const offset = impressionsData.length - sliced.length
                  const combined = sliced.map((d, i) => ({
                    date: d.date,
                    Impressions: impressionsData[offset + i]?.value ?? 0,
                    Clicks: clicksData[offset + i]?.value ?? 0,
                    Leads: leadsData[offset + i]?.value ?? 0,
                    'Booked Calls': bookedCallsData[offset + i]?.value ?? 0,
                    'Ad Spend': spendData[offset + i]?.value ?? 0,
                  }))
                  return (
                    <ResponsiveContainer width="100%" height={400}>
                      <ComposedChart data={combined} margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-800" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="spend" orientation="left" tickFormatter={(v: number) => `$${v}`} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="counts" orientation="right" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)", fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar yAxisId="spend" dataKey="Ad Spend" fill="#10b981" barSize={16} radius={[2, 2, 0, 0]} />
                        <Line yAxisId="counts" dataKey="Impressions" stroke="#3b82f6" strokeWidth={2} dot={false} />
                        <Line yAxisId="counts" dataKey="Clicks" stroke="#22c55e" strokeWidth={2} dot={false} />
                        <Line yAxisId="counts" dataKey="Leads" stroke="#a855f7" strokeWidth={2} dot={false} />
                        <Line yAxisId="counts" dataKey="Booked Calls" stroke="#f97316" strokeWidth={2} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {Object.entries(metrics).map(([key, metric]) => (
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
                      ${metric.adSpend.toLocaleString()}
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      Total investment
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
                  <div className="flex gap-1">
                    {CHART_RANGES.map((r) => (
                      <button
                        key={r.value}
                        onClick={() => setChartRange(r.value)}
                        className={cn(
                          'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                          chartRange === r.value
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        )}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={sliceRange(metric.dailyData, chartRange)}>
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
          ))}
        </Tabs>
      </CardContent>
    </Card>
    </div>
  )
}
