'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  Eye,
  MousePointer,
  TrendingUp,
  Activity,
  BarChart2,
  Users,
  Repeat,
  UserPlus,
  ExternalLink,
  Globe,
} from 'lucide-react'
import { ExportButtons } from '@/app/dashboard/analytics/export-buttons'
import { getActionValue, getRoas } from '@/lib/facebook-ads'
import type { FbInsights, FbAction, FbCampaignInsight, FbPlatformRow } from '@/lib/facebook-ads'

interface FbAdsMetricsProps {
  insights: FbInsights | null
  dateRange: '7d' | '30d' | 'all'
  isConfigured: boolean
  campaigns?: FbCampaignInsight[]
  platforms?: FbPlatformRow[]
}

const DATE_RANGES = [
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'All Time', value: 'all' },
] as const

// ─── Quality Pill ──────────────────────────────────────────────────────────────

interface QualityPillProps {
  label: string
  value?: string
}

function QualityPill({ label, value }: QualityPillProps) {
  if (!value || value === 'UNKNOWN') return null

  let colorClass = 'bg-slate-100 text-slate-700'
  let text = value

  if (value === 'ABOVE_AVERAGE') {
    colorClass = 'bg-emerald-100 text-emerald-800'
    text = 'Above Avg'
  } else if (value === 'AVERAGE') {
    colorClass = 'bg-amber-100 text-amber-800'
    text = 'Average'
  } else if (
    value === 'BELOW_AVERAGE_35' ||
    value === 'BELOW_AVERAGE_20'
  ) {
    colorClass = 'bg-red-100 text-red-800'
    text = 'Below Avg'
  } else if (value === 'BELOW_AVERAGE_10') {
    colorClass = 'bg-red-200 text-red-900'
    text = 'Below Avg'
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}: {text}
    </span>
  )
}

// ─── Helper Functions ──────────────────────────────────────────────────────────

function formatCurrency(value: string): string {
  return `$${parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatNumber(value: string): string {
  return parseFloat(value).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function formatPercent(value: string): string {
  return `${parseFloat(value).toFixed(2)}%`
}

function getLeads(actions?: FbAction[]): number {
  return (
    getActionValue(actions, 'lead') +
    getActionValue(actions, 'offsite_conversion.fb_pixel_lead')
  )
}

function getCpl(spend: string, actions?: FbAction[]): string {
  const leads = getLeads(actions)
  if (leads === 0) return '--'
  return `$${(parseFloat(spend) / leads).toFixed(2)}`
}

function getOutboundClicks(outboundClicks?: FbAction[]): number {
  if (!outboundClicks) return 0
  return outboundClicks.reduce((sum, a) => sum + parseFloat(a.value || '0'), 0)
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function FbAdsMetrics({
  insights,
  dateRange,
  isConfigured,
  campaigns,
  platforms,
}: FbAdsMetricsProps) {
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

  const roas = getRoas(insights?.purchase_roas)

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
            <ExportButtons
              insights={insights}
              dateRange={dateRange}
              campaigns={campaigns}
              platforms={platforms}
            />
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
        /* State 3: Metrics grid — 12 cards + ROAS */
        <>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {/* Card 1: Ad Spend */}
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

            {/* Card 2: Impressions */}
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

            {/* Card 3: Clicks */}
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

            {/* Card 4: CTR */}
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

            {/* Card 5: CPC */}
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

            {/* Card 6: CPM */}
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

            {/* Card 7: Reach */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reach</CardTitle>
                <Users className="h-4 w-4 text-neutral-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(insights.reach)}</div>
                <p className="text-xs text-neutral-500 mt-1">Unique people reached</p>
              </CardContent>
            </Card>

            {/* Card 8: Frequency */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Frequency</CardTitle>
                <Repeat className="h-4 w-4 text-neutral-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{parseFloat(insights.frequency).toFixed(2)}</div>
                <p className="text-xs text-neutral-500 mt-1">Average times seen per person</p>
              </CardContent>
            </Card>

            {/* Card 9: Leads */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Leads</CardTitle>
                <UserPlus className="h-4 w-4 text-neutral-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{String(getLeads(insights.actions))}</div>
                <p className="text-xs text-neutral-500 mt-1">Total lead conversions</p>
              </CardContent>
            </Card>

            {/* Card 10: Cost Per Lead */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cost Per Lead</CardTitle>
                <DollarSign className="h-4 w-4 text-neutral-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getCpl(insights.spend, insights.actions)}</div>
                <p className="text-xs text-neutral-500 mt-1">Average cost per lead</p>
              </CardContent>
            </Card>

            {/* Card 11: Outbound Clicks */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Outbound Clicks</CardTitle>
                <ExternalLink className="h-4 w-4 text-neutral-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(String(getOutboundClicks(insights.outbound_clicks)))}
                </div>
                <p className="text-xs text-neutral-500 mt-1">Clicks to external site</p>
              </CardContent>
            </Card>

            {/* Card 12: Landing Page Views */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Landing Page Views</CardTitle>
                <Globe className="h-4 w-4 text-neutral-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(String(getActionValue(insights.actions, 'landing_page_view')))}
                </div>
                <p className="text-xs text-neutral-500 mt-1">Landing page loads (requires pixel)</p>
              </CardContent>
            </Card>

            {/* Card 13: ROAS */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ROAS</CardTitle>
                <TrendingUp className="h-4 w-4 text-neutral-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {roas !== null ? `${roas.toFixed(2)}x` : '—'}
                </div>
                <p className="text-xs text-neutral-500 mt-1">Purchase revenue / ad spend</p>
              </CardContent>
            </Card>
          </div>

          {/* Quality Score Pills — hidden when all are UNKNOWN */}
          <div className="flex flex-wrap gap-2">
            <QualityPill label="Quality" value={insights.quality_ranking} />
            <QualityPill label="Engagement" value={insights.engagement_rate_ranking} />
            <QualityPill label="Conversion" value={insights.conversion_rate_ranking} />
          </div>

          <p className="text-xs text-neutral-400">
            Data from {insights.date_start} to {insights.date_stop} &middot; Refreshes every 6 hours
          </p>
        </>
      )}
    </div>
  )
}
