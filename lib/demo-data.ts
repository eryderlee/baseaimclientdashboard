/**
 * Static demo data for the demo environment.
 * All data is keyed by demoStableId so it can be looked up from the Client record.
 *
 * Used by:
 * - getClientFbInsights: short-circuit FB API for demo clients
 * - getClientFbCampaigns: short-circuit FB API for demo clients
 * - getClientFbDailyTrend / getClientFbDailyTrendByRange: short-circuit for demo clients
 * - Admin FB admin functions: aggregate static data for demo admin view
 */

import type { FbInsights, FbCampaignInsight, FbDailyInsight } from '@/lib/facebook-ads'

// ─── Constants ────────────────────────────────────────────────────────────────

export const DEMO_ADMIN_EMAIL = 'khan@baseaim.co'

// All demo data ends on this date
const DATE_STOP = '2026-03-27'

// ─── Seeded PRNG (mulberry32) ────────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dayOfWeek(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00Z').getUTCDay()
}

function buildDates(startDate: string, count: number): string[] {
  const dates: string[] = []
  const d = new Date(startDate + 'T12:00:00Z')
  for (let i = 0; i < count; i++) {
    dates.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return dates
}

// ─── Per-client configuration ────────────────────────────────────────────────

interface ClientDemoConfig {
  seed: number
  dayCount: number
  startDate: string
  baseSpend: number       // daily average spend
  baseImpressions: number // daily average impressions
  baseClicks: number      // daily average clicks (spend/clicks ≈ target CPC)
  baseLeads: number       // daily average leads
  bookedCallProb: number  // probability of booked calls on a given day (0-1)
  roasMultiplier: number
  campaigns: Array<{
    id: string
    name: string
    spendShare: number    // fraction of total spend (should sum to 1.0)
    leadShare: number     // fraction of total leads
  }>
}

const CLIENT_CONFIGS: Record<string, ClientDemoConfig> = {
  // Meridian: newer client, 20 days, low CPC (~$0.75), smaller budget
  'demo-meridian-financial': {
    seed: 42,
    dayCount: 20,
    startDate: '2026-03-08',
    baseSpend: 128,         // ~$2560 total over 20 days
    baseImpressions: 5200,
    baseClicks: 171,        // CPC ≈ $0.75
    baseLeads: 4.5,
    bookedCallProb: 0.35,
    roasMultiplier: 1.82,
    campaigns: [
      { id: 'demo-mf-camp-001', name: 'Mortgage Lead Gen - Homebuyers', spendShare: 0.55, leadShare: 0.54 },
      { id: 'demo-mf-camp-002', name: 'Retargeting - Website Visitors', spendShare: 0.28, leadShare: 0.30 },
      { id: 'demo-mf-camp-003', name: 'Brand Awareness - Local', spendShare: 0.17, leadShare: 0.16 },
    ],
  },
  // Apex: mid-range client, 45 days, mid CPC (~$1.40)
  'demo-apex-tax': {
    seed: 137,
    dayCount: 45,
    startDate: '2026-02-10',
    baseSpend: 310,         // ~$13,950 total over 45 days
    baseImpressions: 9800,
    baseClicks: 221,        // CPC ≈ $1.40
    baseLeads: 8.2,
    bookedCallProb: 0.50,
    roasMultiplier: 2.41,
    campaigns: [
      { id: 'demo-at-camp-001', name: 'Tax Season Lead Gen - Business Owners', spendShare: 0.52, leadShare: 0.55 },
      { id: 'demo-at-camp-002', name: 'IRS Debt Relief - Lookalike Audience', spendShare: 0.30, leadShare: 0.28 },
      { id: 'demo-at-camp-003', name: 'Retargeting - Landing Page Visitors', spendShare: 0.18, leadShare: 0.17 },
    ],
  },
  // Hargrove: mature client, 120 days, higher CPC (~$2.20), big budget
  'demo-hargrove-associates': {
    seed: 271,
    dayCount: 120,
    startDate: '2025-11-28',
    baseSpend: 520,         // ~$62,400 total over 120 days
    baseImpressions: 15200,
    baseClicks: 236,        // CPC ≈ $2.20
    baseLeads: 12.5,
    bookedCallProb: 0.65,
    roasMultiplier: 3.15,
    campaigns: [
      { id: 'demo-ha-camp-001', name: 'Estate Planning - High-Net-Worth Targeting', spendShare: 0.50, leadShare: 0.51 },
      { id: 'demo-ha-camp-002', name: 'Business Law - Small Business Owners', spendShare: 0.33, leadShare: 0.32 },
      { id: 'demo-ha-camp-003', name: 'Retargeting - Qualified Website Visitors', spendShare: 0.17, leadShare: 0.17 },
    ],
  },
}

// ─── Day generation with realistic variation ─────────────────────────────────

function makeDay(
  date: string,
  config: ClientDemoConfig,
  rng: () => number,
): FbDailyInsight {
  const dow = dayOfWeek(date)
  const isWeekend = dow === 0 || dow === 6

  // Base weekend/weekday factor
  let baseFactor = isWeekend ? 0.65 : 1.0

  // ~10% chance of a "dip day" — correlated drop across all metrics
  const isDipDay = rng() < 0.10
  const dipMultiplier = isDipDay ? 0.50 + rng() * 0.20 : 1.0 // 50-70% of normal

  // Spend: tighter jitter (±10%) — should be "somewhat consistent"
  const spendJitter = 0.90 + rng() * 0.20
  const spend = Math.max(0, config.baseSpend * baseFactor * spendJitter * dipMultiplier)

  // Impressions: wider jitter (±20%)
  const impressionsJitter = 0.80 + rng() * 0.40
  const impressions = Math.max(0, Math.round(config.baseImpressions * baseFactor * impressionsJitter * dipMultiplier))

  // Clicks: independent jitter (±18%)
  const clicksJitter = 0.82 + rng() * 0.36
  const clicks = Math.min(impressions, Math.max(0, Math.round(config.baseClicks * baseFactor * clicksJitter * dipMultiplier)))

  // Leads: wider jitter (±25%) — more volatile
  const leadsJitter = 0.75 + rng() * 0.50
  const leads = Math.max(0, Math.round(config.baseLeads * baseFactor * leadsJitter * dipMultiplier))

  // Booked calls: sporadic — some days 0, some days a few
  let bookedCalls = 0
  if (leads > 0) {
    // Weekends much less likely to have calls
    const callChance = isWeekend ? config.bookedCallProb * 0.3 : config.bookedCallProb
    if (rng() < callChance) {
      // 15-40% of leads convert to booked calls
      const callRate = 0.15 + rng() * 0.25
      bookedCalls = Math.max(1, Math.round(leads * callRate))
    }
  }

  // Purchase revenue for ROAS
  const roasJitter = 0.85 + rng() * 0.30
  const purchaseRevenue = (spend * config.roasMultiplier * roasJitter).toFixed(2)

  const actions: Array<{ action_type: string; value: string }> = []
  if (leads > 0) actions.push({ action_type: 'lead', value: String(leads) })
  if (bookedCalls > 0) actions.push({ action_type: 'offsite_conversion.fb_pixel_custom', value: String(bookedCalls) })

  return {
    date_start: date,
    date_stop: date,
    spend: spend.toFixed(2),
    impressions: String(impressions),
    clicks: String(clicks),
    actions,
    action_values: [{ action_type: 'omni_purchase', value: purchaseRevenue }],
  }
}

// ─── Generate daily trend data per client ────────────────────────────��───────

export const DEMO_FB_DAILY_TREND: Record<string, FbDailyInsight[]> = {}

for (const [stableId, config] of Object.entries(CLIENT_CONFIGS)) {
  const rng = mulberry32(config.seed)
  const dates = buildDates(config.startDate, config.dayCount)
  DEMO_FB_DAILY_TREND[stableId] = dates.map(date => makeDay(date, config, rng))
}

// ─── Compute aggregated insights from daily data (guarantees consistency) ────

function sumDailyToInsights(stableId: string, config: ClientDemoConfig): FbInsights {
  const daily = DEMO_FB_DAILY_TREND[stableId]
  let totalSpend = 0
  let totalImpressions = 0
  let totalClicks = 0
  let totalLeads = 0
  let totalBookedCalls = 0
  let totalRevenue = 0

  for (const day of daily) {
    totalSpend += parseFloat(day.spend)
    totalImpressions += parseInt(day.impressions)
    totalClicks += parseInt(day.clicks)
    for (const a of day.actions ?? []) {
      if (a.action_type === 'lead') totalLeads += parseInt(a.value)
      if (a.action_type === 'offsite_conversion.fb_pixel_custom') totalBookedCalls += parseInt(a.value)
    }
    for (const av of day.action_values ?? []) {
      if (av.action_type === 'omni_purchase') totalRevenue += parseFloat(av.value)
    }
  }

  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0
  const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0
  const reach = Math.round(totalImpressions * 0.65)
  const frequency = reach > 0 ? totalImpressions / reach : 0
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0

  const dateStart = daily[0]?.date_start ?? config.startDate
  const dateStop = daily[daily.length - 1]?.date_stop ?? DATE_STOP

  const actions: Array<{ action_type: string; value: string }> = [
    { action_type: 'lead', value: String(totalLeads) },
    { action_type: 'link_click', value: String(totalClicks) },
  ]
  if (totalBookedCalls > 0) {
    actions.push({ action_type: 'offsite_conversion.fb_pixel_custom', value: String(totalBookedCalls) })
  }

  return {
    spend: totalSpend.toFixed(2),
    impressions: String(totalImpressions),
    clicks: String(totalClicks),
    ctr: ctr.toFixed(6),
    cpc: cpc.toFixed(6),
    cpm: cpm.toFixed(6),
    reach: String(reach),
    frequency: frequency.toFixed(6),
    actions,
    purchase_roas: [
      { action_type: 'omni_purchase', value: roas.toFixed(2) },
    ],
    date_start: dateStart,
    date_stop: dateStop,
  }
}

export const DEMO_FB_INSIGHTS: Record<string, FbInsights> = {}

for (const [stableId, config] of Object.entries(CLIENT_CONFIGS)) {
  DEMO_FB_INSIGHTS[stableId] = sumDailyToInsights(stableId, config)
}

// ─── Campaign Breakdowns (derived from totals using split ratios) ────────────

function buildCampaigns(stableId: string, config: ClientDemoConfig): FbCampaignInsight[] {
  const insights = DEMO_FB_INSIGHTS[stableId]
  const totalSpend = parseFloat(insights.spend)
  const totalImpressions = parseInt(insights.impressions)
  const totalClicks = parseInt(insights.clicks)
  const totalReach = parseInt(insights.reach)
  const totalLeads = parseInt(
    insights.actions?.find(a => a.action_type === 'lead')?.value ?? '0'
  )

  return config.campaigns.map(camp => ({
    campaign_id: camp.id,
    campaign_name: camp.name,
    spend: (totalSpend * camp.spendShare).toFixed(2),
    impressions: String(Math.round(totalImpressions * camp.spendShare)),
    clicks: String(Math.round(totalClicks * camp.spendShare)),
    reach: String(Math.round(totalReach * camp.spendShare)),
    actions: [{ action_type: 'lead', value: String(Math.round(totalLeads * camp.leadShare)) }],
    date_start: insights.date_start,
    date_stop: insights.date_stop,
  }))
}

export const DEMO_FB_CAMPAIGNS: Record<string, FbCampaignInsight[]> = {}

for (const [stableId, config] of Object.entries(CLIENT_CONFIGS)) {
  DEMO_FB_CAMPAIGNS[stableId] = buildCampaigns(stableId, config)
}
