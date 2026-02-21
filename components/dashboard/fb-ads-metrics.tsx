'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DollarSign, Eye, MousePointer, TrendingUp, Activity, BarChart2 } from 'lucide-react'
import { ExportButtons } from '@/app/dashboard/analytics/export-buttons'
import type { FbInsights } from '@/lib/facebook-ads'

interface FbAdsMetricsProps {
  insights: FbInsights | null
  dateRange: '7d' | '30d' | 'all'
  isConfigured: boolean
}

const DATE_RANGES = [
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'All Time', value: 'all' },
] as const

function formatCurrency(value: string): string {
  return `$${parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatNumber(value: string): string {
  return parseFloat(value).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function formatPercent(value: string): string {
  return `${parseFloat(value).toFixed(2)}%`
}

export function FbAdsMetrics({ insights, dateRange, isConfigured }: FbAdsMetricsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleRangeChange = (range: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('range', range)
    router.push(`/dashboard/analytics?${params.toString()}`)
  }

  // State 1: Not configured — admin hasn't set up FB integration for this client
  if (!isConfigured) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <BarChart2 className="h-12 w-12 text-neutral-300 mb-4" />
          <h3 className="text-lg font-semibold text-neutral-700 mb-2">
            Facebook Ads Not Configured
          </h3>
          <p className="text-sm text-neutral-500 max-w-sm">
            Your Facebook Ads account has not been linked yet. Please contact your account manager to enable this feature.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Date Range Switcher */}
      <div className="flex items-center gap-2">
        {DATE_RANGES.map((range) => (
          <Button
            key={range.value}
            variant={dateRange === range.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleRangeChange(range.value)}
          >
            {range.label}
          </Button>
        ))}
        {insights && (
          <div className="ml-auto">
            <ExportButtons insights={insights} dateRange={dateRange} />
          </div>
        )}
      </div>

      {/* State 2: No data for this date range */}
      {!insights ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Activity className="h-12 w-12 text-neutral-300 mb-4" />
            <h3 className="text-lg font-semibold text-neutral-700 mb-2">
              No Data for This Period
            </h3>
            <p className="text-sm text-neutral-500">
              No Facebook Ads data is available for the selected date range.
              Try selecting a different time period.
            </p>
          </CardContent>
        </Card>
      ) : (
        /* State 3: Metrics grid — 6 cards */
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ad Spend</CardTitle>
                <DollarSign className="h-4 w-4 text-neutral-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(insights.spend)}</div>
                <p className="text-xs text-neutral-500 mt-1">Total spend for period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Impressions</CardTitle>
                <Eye className="h-4 w-4 text-neutral-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(insights.impressions)}</div>
                <p className="text-xs text-neutral-500 mt-1">Times ads were shown</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clicks</CardTitle>
                <MousePointer className="h-4 w-4 text-neutral-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(insights.clicks)}</div>
                <p className="text-xs text-neutral-500 mt-1">Total link clicks</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CTR</CardTitle>
                <TrendingUp className="h-4 w-4 text-neutral-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercent(insights.ctr)}</div>
                <p className="text-xs text-neutral-500 mt-1">Click-through rate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPC</CardTitle>
                <DollarSign className="h-4 w-4 text-neutral-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(insights.cpc)}</div>
                <p className="text-xs text-neutral-500 mt-1">Cost per click</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPM</CardTitle>
                <BarChart2 className="h-4 w-4 text-neutral-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(insights.cpm)}</div>
                <p className="text-xs text-neutral-500 mt-1">Cost per 1,000 impressions</p>
              </CardContent>
            </Card>
          </div>

          <p className="text-xs text-neutral-400">
            Data from {insights.date_start} to {insights.date_stop} &middot; Refreshes every 6 hours
          </p>
        </>
      )}
    </div>
  )
}
