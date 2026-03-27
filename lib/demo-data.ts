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

// Date range the demo data covers (last 30 days from 2026-03-27)
const DATE_START = '2026-02-25'
const DATE_STOP = '2026-03-27'

// ─── Aggregated Insights (matches FbInsights shape) ──────────────────────────

export const DEMO_FB_INSIGHTS: Record<string, FbInsights> = {
  'demo-meridian-financial': {
    spend: '3840.00',
    impressions: '142500',
    clicks: '4275',
    ctr: '3.000000',
    cpc: '0.898246',
    cpm: '26.947368',
    reach: '98000',
    frequency: '1.454082',
    actions: [
      { action_type: 'lead', value: '127' },
      { action_type: 'link_click', value: '4275' },
    ],
    purchase_roas: [
      { action_type: 'omni_purchase', value: '1.82' },
    ],
    date_start: DATE_START,
    date_stop: DATE_STOP,
  },
  'demo-apex-tax': {
    spend: '9200.00',
    impressions: '318000',
    clicks: '9222',
    ctr: '2.900000',
    cpc: '0.997615',
    cpm: '28.930818',
    reach: '201000',
    frequency: '1.582090',
    actions: [
      { action_type: 'lead', value: '312' },
      { action_type: 'link_click', value: '9222' },
    ],
    purchase_roas: [
      { action_type: 'omni_purchase', value: '2.41' },
    ],
    date_start: DATE_START,
    date_stop: DATE_STOP,
  },
  'demo-hargrove-associates': {
    spend: '18500.00',
    impressions: '620000',
    clicks: '18290',
    ctr: '2.950000',
    cpc: '1.011481',
    cpm: '29.838710',
    reach: '380000',
    frequency: '1.631579',
    actions: [
      { action_type: 'lead', value: '694' },
      { action_type: 'link_click', value: '18290' },
    ],
    purchase_roas: [
      { action_type: 'omni_purchase', value: '3.15' },
    ],
    date_start: DATE_START,
    date_stop: DATE_STOP,
  },
}

// ─── Campaign Breakdowns ──────────────────────────────────────────────────────

export const DEMO_FB_CAMPAIGNS: Record<string, FbCampaignInsight[]> = {
  'demo-meridian-financial': [
    {
      campaign_id: 'demo-mf-camp-001',
      campaign_name: 'Mortgage Lead Gen - Homebuyers',
      spend: '2100.00',
      impressions: '78000',
      clicks: '2340',
      reach: '54000',
      actions: [{ action_type: 'lead', value: '69' }],
      date_start: DATE_START,
      date_stop: DATE_STOP,
    },
    {
      campaign_id: 'demo-mf-camp-002',
      campaign_name: 'Retargeting - Website Visitors',
      spend: '1060.00',
      impressions: '42000',
      clicks: '1260',
      reach: '28000',
      actions: [{ action_type: 'lead', value: '38' }],
      date_start: DATE_START,
      date_stop: DATE_STOP,
    },
    {
      campaign_id: 'demo-mf-camp-003',
      campaign_name: 'Brand Awareness - Local',
      spend: '680.00',
      impressions: '22500',
      clicks: '675',
      reach: '16000',
      actions: [{ action_type: 'lead', value: '20' }],
      date_start: DATE_START,
      date_stop: DATE_STOP,
    },
  ],
  'demo-apex-tax': [
    {
      campaign_id: 'demo-at-camp-001',
      campaign_name: 'Tax Season Lead Gen - Business Owners',
      spend: '5800.00',
      impressions: '200000',
      clicks: '5800',
      reach: '127000',
      actions: [{ action_type: 'lead', value: '196' }],
      date_start: DATE_START,
      date_stop: DATE_STOP,
    },
    {
      campaign_id: 'demo-at-camp-002',
      campaign_name: 'IRS Debt Relief - Lookalike Audience',
      spend: '2400.00',
      impressions: '82000',
      clicks: '2378',
      reach: '52000',
      actions: [{ action_type: 'lead', value: '81' }],
      date_start: DATE_START,
      date_stop: DATE_STOP,
    },
    {
      campaign_id: 'demo-at-camp-003',
      campaign_name: 'Retargeting - Landing Page Visitors',
      spend: '1000.00',
      impressions: '36000',
      clicks: '1044',
      reach: '22000',
      actions: [{ action_type: 'lead', value: '35' }],
      date_start: DATE_START,
      date_stop: DATE_STOP,
    },
  ],
  'demo-hargrove-associates': [
    {
      campaign_id: 'demo-ha-camp-001',
      campaign_name: 'Estate Planning - High-Net-Worth Targeting',
      spend: '9500.00',
      impressions: '318000',
      clicks: '9390',
      reach: '196000',
      actions: [{ action_type: 'lead', value: '356' }],
      date_start: DATE_START,
      date_stop: DATE_STOP,
    },
    {
      campaign_id: 'demo-ha-camp-002',
      campaign_name: 'Business Law - Small Business Owners',
      spend: '6200.00',
      impressions: '198000',
      clicks: '5841',
      reach: '122000',
      actions: [{ action_type: 'lead', value: '233' }],
      date_start: DATE_START,
      date_stop: DATE_STOP,
    },
    {
      campaign_id: 'demo-ha-camp-003',
      campaign_name: 'Retargeting - Qualified Website Visitors',
      spend: '2800.00',
      impressions: '104000',
      clicks: '3059',
      reach: '62000',
      actions: [{ action_type: 'lead', value: '105' }],
      date_start: DATE_START,
      date_stop: DATE_STOP,
    },
  ],
}

// ─── Daily Trend Data (30 days: 2026-02-25 to 2026-03-27) ───────────────────

/**
 * Generates a daily entry for a demo client.
 * Weekdays get ~1.4x the spend of weekends for realistic variation.
 */
function makeDay(
  date: string,
  isWeekend: boolean,
  baseSpend: number,
  baseLeads: number,
  baseImpressions: number,
  baseClicks: number,
  roasMultiplier: number,
  baseBookedCalls: number = 0
): FbDailyInsight {
  const factor = isWeekend ? 0.65 : 1.0
  const spend = (baseSpend * factor).toFixed(2)
  const impressions = Math.round(baseImpressions * factor)
  const clicks = Math.round(baseClicks * factor)
  const leads = Math.max(0, Math.round(baseLeads * factor))
  const bookedCalls = Math.max(0, Math.round(baseBookedCalls * factor))
  // action_values represents purchase revenue: spend * ROAS = revenue
  const purchaseRevenue = (parseFloat(spend) * roasMultiplier).toFixed(2)
  const actions: { action_type: string; value: string }[] = []
  if (leads > 0) actions.push({ action_type: 'lead', value: String(leads) })
  if (bookedCalls > 0) actions.push({ action_type: 'offsite_conversion.fb_pixel_custom', value: String(bookedCalls) })
  return {
    date_start: date,
    date_stop: date,
    spend,
    impressions: String(impressions),
    clicks: String(clicks),
    actions,
    action_values: [{ action_type: 'omni_purchase', value: purchaseRevenue }],
  }
}

// Day-of-week helper: 0=Sun, 6=Sat
function dayOfWeek(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00Z').getUTCDay()
}

// Build 30 days from 2026-02-25 to 2026-03-27
const DEMO_DATES: string[] = []
{
  const d = new Date('2026-02-25T12:00:00Z')
  for (let i = 0; i < 30; i++) {
    DEMO_DATES.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 1)
  }
}

// Per-client daily base values (will sum ~to the totals)
// Meridian: 3840 spend / 30 = 128/day avg; 127 leads / 30 ≈ 4.2/day
// Apex Tax: 9200 / 30 = 306.7/day; 312 leads / 30 ≈ 10.4/day
// Hargrove: 18500 / 30 = 616.7/day; 694 leads / 30 ≈ 23.1/day

// Weekdays = ~1.0, weekends = ~0.65. 30 days = ~22 weekdays + 8 weekends
// avg_factor = (22*1.0 + 8*0.65)/30 ≈ 0.907
// so base should be total / (30 * 0.907)

const MF_DAILY_SPEND = 141.1   // 3840 / (30 * 0.907)
const MF_DAILY_LEADS = 4.66    // 127 / (30 * 0.907)
const MF_DAILY_IMPRESSIONS = 5240
const MF_DAILY_CLICKS = 157
const MF_DAILY_BOOKED = 1.10   // ~30 booked calls / (30 * 0.907) ≈ 24% of leads

const AT_DAILY_SPEND = 338.0   // 9200 / (30 * 0.907)
const AT_DAILY_LEADS = 11.47   // 312 / (30 * 0.907)
const AT_DAILY_IMPRESSIONS = 11692
const AT_DAILY_CLICKS = 339
const AT_DAILY_BOOKED = 3.12   // ~85 booked calls / (30 * 0.907) ≈ 27% of leads

const HA_DAILY_SPEND = 679.9   // 18500 / (30 * 0.907)
const HA_DAILY_LEADS = 25.52   // 694 / (30 * 0.907)
const HA_DAILY_IMPRESSIONS = 22813
const HA_DAILY_CLICKS = 673
const HA_DAILY_BOOKED = 7.17   // ~195 booked calls / (30 * 0.907) ≈ 28% of leads

export const DEMO_FB_DAILY_TREND: Record<string, FbDailyInsight[]> = {
  'demo-meridian-financial': DEMO_DATES.map(date => {
    const dow = dayOfWeek(date)
    const isWeekend = dow === 0 || dow === 6
    return makeDay(date, isWeekend, MF_DAILY_SPEND, MF_DAILY_LEADS, MF_DAILY_IMPRESSIONS, MF_DAILY_CLICKS, 1.82, MF_DAILY_BOOKED)
  }),
  'demo-apex-tax': DEMO_DATES.map(date => {
    const dow = dayOfWeek(date)
    const isWeekend = dow === 0 || dow === 6
    return makeDay(date, isWeekend, AT_DAILY_SPEND, AT_DAILY_LEADS, AT_DAILY_IMPRESSIONS, AT_DAILY_CLICKS, 2.41, AT_DAILY_BOOKED)
  }),
  'demo-hargrove-associates': DEMO_DATES.map(date => {
    const dow = dayOfWeek(date)
    const isWeekend = dow === 0 || dow === 6
    return makeDay(date, isWeekend, HA_DAILY_SPEND, HA_DAILY_LEADS, HA_DAILY_IMPRESSIONS, HA_DAILY_CLICKS, 3.15, HA_DAILY_BOOKED)
  }),
}
