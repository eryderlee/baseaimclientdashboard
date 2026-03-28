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

// ─── Campaign phase definition ───────────────────────────────────────────────

interface CampaignDef {
  id: string
  name: string
  spendShare: number
  leadShare: number
}

interface CampaignPhase {
  startDate: string
  endDate: string
  campaigns: CampaignDef[]
}

// ─── Per-client configuration ────────────────────────────────────────────────

interface ClientDemoConfig {
  seed: number
  dayCount: number
  startDate: string
  dailyBudget: number
  baseImpressions: number
  baseClicks: number
  baseLeads: number
  bookedCallProb: number
  roasMultiplier: number
  campaignPhases: CampaignPhase[]
}

// Budget range: $14-$25/day = ~$420-$750/month (within $400-$800 target)
// Booked calls target: avg ~8/month across clients (range 4-12)
// At low budgets ($14-25/day), baseLeads ~0.5-1.0/day, baseClicks ~10-25/day

const CLIENT_CONFIGS: Record<string, ClientDemoConfig> = {
  // ── Hargrove: 365 days, $25/day (~$750/mo), target ~10 calls/mo ──
  'demo-hargrove-associates': {
    seed: 271,
    dayCount: 365,
    startDate: '2025-03-28',
    dailyBudget: 25,
    baseImpressions: 820,
    baseClicks: 22,       // CPC ≈ $1.14
    baseLeads: 0.9,
    bookedCallProb: 0.42,
    roasMultiplier: 3.15,
    campaignPhases: [
      {
        startDate: '2025-03-28', endDate: '2025-07-27',
        campaigns: [
          { id: 'demo-ha-c01', name: 'Accounting Services - Local Businesses', spendShare: 0.55, leadShare: 0.54 },
          { id: 'demo-ha-c02', name: 'Tax Planning - Small Business Owners', spendShare: 0.30, leadShare: 0.30 },
          { id: 'demo-ha-c03', name: 'Brand Awareness - Professional Services', spendShare: 0.15, leadShare: 0.16 },
        ],
      },
      {
        startDate: '2025-07-28', endDate: '2025-11-27',
        campaigns: [
          { id: 'demo-ha-c04', name: 'Estate Planning - High-Net-Worth', spendShare: 0.50, leadShare: 0.51 },
          { id: 'demo-ha-c05', name: 'Business Advisory - Growth Stage', spendShare: 0.30, leadShare: 0.29 },
          { id: 'demo-ha-c06', name: 'Retargeting - Qualified Visitors', spendShare: 0.20, leadShare: 0.20 },
        ],
      },
      {
        startDate: '2025-11-28', endDate: '2026-03-27',
        campaigns: [
          { id: 'demo-ha-c07', name: 'Tax Season Lead Gen - Individuals', spendShare: 0.50, leadShare: 0.52 },
          { id: 'demo-ha-c08', name: 'Business Tax Filing - S-Corps', spendShare: 0.33, leadShare: 0.31 },
          { id: 'demo-ha-c09', name: 'Retargeting - Past Clients', spendShare: 0.17, leadShare: 0.17 },
        ],
      },
    ],
  },

  // ── Apex: 365 days, $22/day (~$660/mo), target ~8 calls/mo ──
  'demo-apex-tax': {
    seed: 137,
    dayCount: 365,
    startDate: '2025-03-28',
    dailyBudget: 22,
    baseImpressions: 710,
    baseClicks: 18,       // CPC ≈ $1.22
    baseLeads: 0.7,
    bookedCallProb: 0.40,
    roasMultiplier: 2.41,
    campaignPhases: [
      {
        startDate: '2025-03-28', endDate: '2025-07-27',
        campaigns: [
          { id: 'demo-at-c01', name: 'Tax Advisory - Business Owners', spendShare: 0.55, leadShare: 0.55 },
          { id: 'demo-at-c02', name: 'Bookkeeping Services - Startups', spendShare: 0.28, leadShare: 0.28 },
          { id: 'demo-at-c03', name: 'Brand Awareness - Local Reach', spendShare: 0.17, leadShare: 0.17 },
        ],
      },
      {
        startDate: '2025-07-28', endDate: '2025-11-27',
        campaigns: [
          { id: 'demo-at-c04', name: 'IRS Debt Relief - Lookalike', spendShare: 0.50, leadShare: 0.52 },
          { id: 'demo-at-c05', name: 'Quarterly Tax Planning', spendShare: 0.32, leadShare: 0.30 },
          { id: 'demo-at-c06', name: 'Retargeting - Landing Page', spendShare: 0.18, leadShare: 0.18 },
        ],
      },
      {
        startDate: '2025-11-28', endDate: '2026-03-27',
        campaigns: [
          { id: 'demo-at-c07', name: 'Tax Season Lead Gen - Business', spendShare: 0.52, leadShare: 0.55 },
          { id: 'demo-at-c08', name: 'Tax Resolution - Individuals', spendShare: 0.30, leadShare: 0.28 },
          { id: 'demo-at-c09', name: 'Retargeting - Engaged Visitors', spendShare: 0.18, leadShare: 0.17 },
        ],
      },
    ],
  },

  // ── Calloway: 365 days, $18/day (~$540/mo), target ~7 calls/mo ──
  'demo-calloway-klein': {
    seed: 42,
    dayCount: 365,
    startDate: '2025-03-28',
    dailyBudget: 18,
    baseImpressions: 600,
    baseClicks: 15,       // CPC ≈ $1.20
    baseLeads: 0.60,
    bookedCallProb: 0.48,
    roasMultiplier: 2.10,
    campaignPhases: [
      {
        startDate: '2025-03-28', endDate: '2025-07-27',
        campaigns: [
          { id: 'demo-ck-c01', name: 'CPA Services - Local Search', spendShare: 0.55, leadShare: 0.55 },
          { id: 'demo-ck-c02', name: 'Tax Prep - Individuals', spendShare: 0.30, leadShare: 0.30 },
          { id: 'demo-ck-c03', name: 'Brand Awareness - Community', spendShare: 0.15, leadShare: 0.15 },
        ],
      },
      {
        startDate: '2025-07-28', endDate: '2025-11-27',
        campaigns: [
          { id: 'demo-ck-c04', name: 'Business Advisory - Local', spendShare: 0.50, leadShare: 0.52 },
          { id: 'demo-ck-c05', name: 'Payroll Services - Small Biz', spendShare: 0.30, leadShare: 0.28 },
          { id: 'demo-ck-c06', name: 'Retargeting - Website', spendShare: 0.20, leadShare: 0.20 },
        ],
      },
      {
        startDate: '2025-11-28', endDate: '2026-03-27',
        campaigns: [
          { id: 'demo-ck-c07', name: 'Tax Season - Early Filers', spendShare: 0.52, leadShare: 0.54 },
          { id: 'demo-ck-c08', name: 'Business Tax Returns', spendShare: 0.30, leadShare: 0.28 },
          { id: 'demo-ck-c09', name: 'Retargeting - Prior Clients', spendShare: 0.18, leadShare: 0.18 },
        ],
      },
    ],
  },

  // ── Meridian: 180 days, $20/day (~$600/mo), target ~8 calls/mo ──
  'demo-meridian-financial': {
    seed: 500,
    dayCount: 180,
    startDate: '2025-09-29',
    dailyBudget: 20,
    baseImpressions: 650,
    baseClicks: 16,       // CPC ≈ $1.25
    baseLeads: 0.65,
    bookedCallProb: 0.42,
    roasMultiplier: 1.82,
    campaignPhases: [
      {
        startDate: '2025-09-29', endDate: '2026-01-28',
        campaigns: [
          { id: 'demo-mf-c01', name: 'Wealth Management - Homebuyers', spendShare: 0.55, leadShare: 0.54 },
          { id: 'demo-mf-c02', name: 'Retirement Planning - 50+', spendShare: 0.28, leadShare: 0.30 },
          { id: 'demo-mf-c03', name: 'Brand Awareness - Local', spendShare: 0.17, leadShare: 0.16 },
        ],
      },
      {
        startDate: '2026-01-29', endDate: '2026-03-27',
        campaigns: [
          { id: 'demo-mf-c04', name: 'Tax-Advantaged Investing', spendShare: 0.50, leadShare: 0.52 },
          { id: 'demo-mf-c05', name: 'Financial Planning - Families', spendShare: 0.32, leadShare: 0.30 },
          { id: 'demo-mf-c06', name: 'Retargeting - Website Visitors', spendShare: 0.18, leadShare: 0.18 },
        ],
      },
    ],
  },

  // ── Prestige Ledger: 120 days, $16/day (~$480/mo), target ~5 calls/mo ──
  'demo-prestige-ledger': {
    seed: 617,
    dayCount: 120,
    startDate: '2025-11-28',
    dailyBudget: 16,
    baseImpressions: 520,
    baseClicks: 13,       // CPC ≈ $1.23
    baseLeads: 0.55,
    bookedCallProb: 0.42,
    roasMultiplier: 1.95,
    campaignPhases: [
      {
        startDate: '2025-11-28', endDate: '2026-03-27',
        campaigns: [
          { id: 'demo-pl-c01', name: 'Bookkeeping Services - E-Commerce', spendShare: 0.52, leadShare: 0.53 },
          { id: 'demo-pl-c02', name: 'CFO Services - Growing Firms', spendShare: 0.30, leadShare: 0.29 },
          { id: 'demo-pl-c03', name: 'Retargeting - Leads', spendShare: 0.18, leadShare: 0.18 },
        ],
      },
    ],
  },

  // ── Whitfield: 60 days, $14/day (~$420/mo), target ~4 calls/mo (outlier low) ──
  'demo-whitfield-associates': {
    seed: 791,
    dayCount: 60,
    startDate: '2026-01-27',
    dailyBudget: 14,
    baseImpressions: 460,
    baseClicks: 11,       // CPC ≈ $1.27
    baseLeads: 0.48,
    bookedCallProb: 0.40,
    roasMultiplier: 1.65,
    campaignPhases: [
      {
        startDate: '2026-01-27', endDate: '2026-03-27',
        campaigns: [
          { id: 'demo-wa-c01', name: 'Audit & Assurance - Nonprofits', spendShare: 0.55, leadShare: 0.55 },
          { id: 'demo-wa-c02', name: 'Tax Compliance - Trusts', spendShare: 0.28, leadShare: 0.28 },
          { id: 'demo-wa-c03', name: 'Brand Awareness - Metro', spendShare: 0.17, leadShare: 0.17 },
        ],
      },
    ],
  },

  // ── Summit Ridge: 60 days, $24/day (~$720/mo), target ~12 calls/mo (outlier high) ──
  'demo-summit-ridge': {
    seed: 333,
    dayCount: 60,
    startDate: '2026-01-27',
    dailyBudget: 24,
    baseImpressions: 780,
    baseClicks: 20,       // CPC ≈ $1.20
    baseLeads: 0.85,
    bookedCallProb: 0.48,
    roasMultiplier: 2.80,
    campaignPhases: [
      {
        startDate: '2026-01-27', endDate: '2026-03-27',
        campaigns: [
          { id: 'demo-sr-c01', name: 'Full-Service Accounting - Restaurants', spendShare: 0.50, leadShare: 0.50 },
          { id: 'demo-sr-c02', name: 'Payroll & HR - Hospitality', spendShare: 0.30, leadShare: 0.30 },
          { id: 'demo-sr-c03', name: 'Retargeting - Website Leads', spendShare: 0.20, leadShare: 0.20 },
        ],
      },
    ],
  },
}

// ─── Meta-style 7-day budget pacing ──────────────────────────────────────────

function generateWeeklyPacedSpend(
  dayCount: number,
  dailyBudget: number,
  rng: () => number,
): number[] {
  const weeklyMax = dailyBudget * 7

  const spends: number[] = []
  for (let i = 0; i < dayCount; i++) {
    spends.push(dailyBudget * (0.80 + rng() * 0.40))
  }

  // Sliding-window correction — ensure every 7-day window ≤ weeklyMax
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i <= spends.length - 7; i++) {
      let windowSum = 0
      for (let j = i; j < i + 7; j++) windowSum += spends[j]
      if (windowSum > weeklyMax) {
        const scale = weeklyMax / windowSum
        for (let j = i; j < i + 7; j++) spends[j] *= scale
      }
    }
  }

  return spends
}

// ─── Day generation with realistic variation ─────────────────────────────────

function makeDay(
  date: string,
  daySpend: number,
  config: ClientDemoConfig,
  rng: () => number,
): FbDailyInsight {
  const dow = dayOfWeek(date)
  const isWeekend = dow === 0 || dow === 6

  const spendRatio = daySpend / config.dailyBudget

  // Impressions
  const impressionsJitter = 0.85 + rng() * 0.30
  const impressions = Math.max(0, Math.round(config.baseImpressions * spendRatio * impressionsJitter))

  // Clicks
  const clicksJitter = 0.82 + rng() * 0.36
  const clicks = Math.min(impressions, Math.max(0, Math.round(config.baseClicks * spendRatio * clicksJitter)))

  // Outbound clicks: ~70-85% of total clicks
  const outboundRatio = 0.70 + rng() * 0.15
  const outboundClicks = Math.max(0, Math.round(clicks * outboundRatio))

  // Landing page views: ~85-95% of outbound clicks
  const lpvRatio = 0.85 + rng() * 0.10
  const landingPageViews = Math.max(0, Math.round(outboundClicks * lpvRatio))

  // Leads
  const leadsJitter = 0.75 + rng() * 0.50
  const leads = Math.max(0, Math.round(config.baseLeads * spendRatio * leadsJitter))

  // Booked calls — sporadic
  let bookedCalls = 0
  if (leads > 0) {
    const callChance = isWeekend ? config.bookedCallProb * 0.3 : config.bookedCallProb
    if (rng() < callChance) {
      const callRate = 0.15 + rng() * 0.25
      bookedCalls = Math.max(1, Math.round(leads * callRate))
    }
  }

  // Purchase revenue for ROAS
  const roasJitter = 0.85 + rng() * 0.30
  const purchaseRevenue = (daySpend * config.roasMultiplier * roasJitter).toFixed(2)

  const actions: Array<{ action_type: string; value: string }> = []
  if (leads > 0) actions.push({ action_type: 'lead', value: String(leads) })
  if (bookedCalls > 0) actions.push({ action_type: 'offsite_conversion.fb_pixel_custom', value: String(bookedCalls) })
  if (landingPageViews > 0) actions.push({ action_type: 'landing_page_view', value: String(landingPageViews) })

  return {
    date_start: date,
    date_stop: date,
    spend: daySpend.toFixed(2),
    impressions: String(impressions),
    clicks: String(clicks),
    actions,
    outbound_clicks: outboundClicks > 0
      ? [{ action_type: 'outbound_click', value: String(outboundClicks) }]
      : undefined,
    action_values: [{ action_type: 'omni_purchase', value: purchaseRevenue }],
  }
}

// ─── Generate daily trend data per client ────────────────────────────────────

export const DEMO_FB_DAILY_TREND: Record<string, FbDailyInsight[]> = {}

for (const [stableId, config] of Object.entries(CLIENT_CONFIGS)) {
  const rng = mulberry32(config.seed)
  const dates = buildDates(config.startDate, config.dayCount)
  const dailySpends = generateWeeklyPacedSpend(config.dayCount, config.dailyBudget, rng)
  DEMO_FB_DAILY_TREND[stableId] = dates.map((date, i) => makeDay(date, dailySpends[i], config, rng))
}

// ─── Compute aggregated insights from daily data ─────────────────────────────

function sumDailyToInsights(stableId: string, config: ClientDemoConfig): FbInsights {
  const daily = DEMO_FB_DAILY_TREND[stableId]
  let totalSpend = 0
  let totalImpressions = 0
  let totalClicks = 0
  let totalLeads = 0
  let totalBookedCalls = 0
  let totalRevenue = 0
  let totalOutboundClicks = 0
  let totalLandingPageViews = 0

  for (const day of daily) {
    totalSpend += parseFloat(day.spend)
    totalImpressions += parseInt(day.impressions)
    totalClicks += parseInt(day.clicks)
    for (const a of day.actions ?? []) {
      if (a.action_type === 'lead') totalLeads += parseInt(a.value)
      if (a.action_type === 'offsite_conversion.fb_pixel_custom') totalBookedCalls += parseInt(a.value)
      if (a.action_type === 'landing_page_view') totalLandingPageViews += parseInt(a.value)
    }
    for (const oc of day.outbound_clicks ?? []) {
      totalOutboundClicks += parseInt(oc.value)
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
    { action_type: 'landing_page_view', value: String(totalLandingPageViews) },
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
    outbound_clicks: [{ action_type: 'outbound_click', value: String(totalOutboundClicks) }],
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

// ─── Campaign Breakdowns (with phase rotation) ──────────────────────────────

function buildCampaigns(stableId: string, config: ClientDemoConfig): FbCampaignInsight[] {
  const daily = DEMO_FB_DAILY_TREND[stableId]
  const result: FbCampaignInsight[] = []

  for (const phase of config.campaignPhases) {
    // Find daily entries within this phase's date range
    const phaseDays = daily.filter(d => d.date_start >= phase.startDate && d.date_start <= phase.endDate)
    if (phaseDays.length === 0) continue

    let phaseSpend = 0
    let phaseImpressions = 0
    let phaseClicks = 0
    let phaseLeads = 0
    for (const day of phaseDays) {
      phaseSpend += parseFloat(day.spend)
      phaseImpressions += parseInt(day.impressions)
      phaseClicks += parseInt(day.clicks)
      for (const a of day.actions ?? []) {
        if (a.action_type === 'lead') phaseLeads += parseInt(a.value)
      }
    }
    const phaseReach = Math.round(phaseImpressions * 0.65)

    for (const camp of phase.campaigns) {
      result.push({
        campaign_id: camp.id,
        campaign_name: camp.name,
        spend: (phaseSpend * camp.spendShare).toFixed(2),
        impressions: String(Math.round(phaseImpressions * camp.spendShare)),
        clicks: String(Math.round(phaseClicks * camp.spendShare)),
        reach: String(Math.round(phaseReach * camp.spendShare)),
        actions: [{ action_type: 'lead', value: String(Math.round(phaseLeads * camp.leadShare)) }],
        date_start: phase.startDate,
        date_stop: phase.endDate,
      })
    }
  }

  return result
}

export const DEMO_FB_CAMPAIGNS: Record<string, FbCampaignInsight[]> = {}

for (const [stableId, config] of Object.entries(CLIENT_CONFIGS)) {
  DEMO_FB_CAMPAIGNS[stableId] = buildCampaigns(stableId, config)
}
