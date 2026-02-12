"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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
  TrendingDown,
  DollarSign,
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
  totalAdSpend: number
  isExpanded: boolean
  setIsExpanded: (expanded: boolean) => void
}

export function AnalyticsOverview({
  impressionsData,
  clicksData,
  leadsData,
  bookedCallsData,
  totalAdSpend,
  isExpanded,
  setIsExpanded,
}: AnalyticsOverviewProps) {
  const [activeTab, setActiveTab] = useState("impressions")

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
          <TabsList className="grid w-full grid-cols-4 mb-6">
            {Object.entries(metrics).map(([key, metric]) => {
              const MetricIcon = metric.icon
              return (
                <TabsTrigger key={key} value={key} className="gap-2">
                  <MetricIcon className="h-4 w-4" />
                  {metric.name}
                </TabsTrigger>
              )
            })}
          </TabsList>

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
                      {metric.total.toLocaleString()}
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
                <CardHeader>
                  <CardTitle>{metric.name} Trend</CardTitle>
                  <CardDescription>
                    Daily performance over the last 30 days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={metric.dailyData}>
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
