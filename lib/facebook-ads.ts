// lib/facebook-ads.ts
// Plain fetch wrapper for Facebook Marketing API Insights endpoint
// No SDK — single endpoint, read-only, no bundle complexity needed

export interface FbAction {
  action_type: string
  value: string
}

export interface FbInsights {
  spend: string        // e.g. "1234.56" — always parseFloat() before display
  impressions: string  // e.g. "45000"
  clicks: string       // e.g. "1200"
  ctr: string          // e.g. "2.666667" — already a percentage (2.67%), not a decimal
  cpc: string          // e.g. "1.028600" — dollars per click
  cpm: string          // e.g. "27.434111" — dollars per 1000 impressions
  actions?: FbAction[]
  date_start: string   // e.g. "2026-01-22"
  date_stop: string    // e.g. "2026-02-21"
  reach: string        // e.g. "12000" — unique people reached
  frequency: string    // e.g. "3.75" — avg impressions per unique person
  outbound_clicks?: FbAction[]  // list of AdsActionStats (NOT a string) — use getActionValue
  quality_ranking?: string      // ABOVE_AVERAGE | AVERAGE | BELOW_AVERAGE_35 | BELOW_AVERAGE_20 | BELOW_AVERAGE_10 | UNKNOWN
  engagement_rate_ranking?: string  // same enum as quality_ranking
  conversion_rate_ranking?: string  // same enum as quality_ranking
}

export interface FbDailyInsight {
  spend: string
  impressions: string
  clicks: string
  reach?: string
  actions?: FbAction[]
  outbound_clicks?: FbAction[]
  date_start: string
  date_stop: string
}

export type DatePreset = 'last_7d' | 'last_30d' | 'last_90d' | 'maximum'

export interface FbCampaignInsight {
  campaign_id: string
  campaign_name: string
  spend: string
  impressions: string
  clicks: string
  reach: string
  actions?: FbAction[]
  date_start: string
  date_stop: string
}

export interface FbAdInsight {
  ad_id: string
  ad_name: string
  campaign_name: string
  spend: string
  impressions: string
  clicks: string
  reach: string
  actions?: FbAction[]
  date_start: string
  date_stop: string
}

export interface FbPlatformRow {
  publisher_platform: string
  impressions: string
  spend: string
  clicks: string
  date_start: string
  date_stop: string
}

const GRAPH_API_VERSION = 'v22.0'
const INSIGHTS_FIELDS = 'spend,impressions,clicks,ctr,cpc,cpm,actions,reach,frequency,outbound_clicks,quality_ranking,engagement_rate_ranking,conversion_rate_ranking'
const DAILY_FIELDS = 'spend,impressions,clicks,reach,actions,outbound_clicks'

/**
 * Extract a numeric value from a FB actions array by action_type.
 * Returns 0 if the action type is not present.
 *
 * Action types:
 * - 'lead'                              → standard Lead pixel event
 * - 'offsite_conversion.fb_pixel_custom' → custom pixel events (e.g. BookedCall via fbq('trackCustom', ...))
 */
export function getActionValue(actions: FbAction[] | undefined, actionType: string): number {
  const action = actions?.find((a) => a.action_type === actionType)
  return action ? parseFloat(action.value) : 0
}

/**
 * Fetch Facebook Ads Insights from the Marketing API.
 * Returns null on API error or when no data exists for the range.
 * All numeric values in FbInsights are STRINGS — always parseFloat() before arithmetic.
 *
 * @param adAccountId - Must include act_ prefix, e.g. "act_123456789"
 * @param datePreset  - 'last_7d' | 'last_30d' | 'maximum' (all-time)
 * @param accessToken - System User token from Meta Business Manager (no expiry)
 */
export async function fetchFacebookInsights(
  adAccountId: string,
  datePreset: DatePreset,
  accessToken: string
): Promise<FbInsights | null> {
  const url = new URL(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${adAccountId}/insights`
  )
  url.searchParams.set('fields', INSIGHTS_FIELDS)
  url.searchParams.set('date_preset', datePreset)
  url.searchParams.set('level', 'account')
  url.searchParams.set('access_token', accessToken)

  let res: Response
  try {
    // cache: 'no-store' — caching handled by unstable_cache in the DAL layer
    res = await fetch(url.toString(), { cache: 'no-store' })
  } catch (err) {
    console.error('[facebook-ads] Network error fetching insights:', err)
    return null
  }

  const json = await res.json()

  if (!res.ok) {
    // Error code 190 = invalid/expired token
    // Error code 100 = invalid parameter (wrong adAccountId format)
    // Error code 200 = permissions error (System User lacks access to ad account)
    console.error('[facebook-ads] API error:', json.error ?? json)
    return null
  }

  // data is an array; level=account always returns 0 or 1 rows
  // Returns null if no data for the date range (not an error — normal for new accounts)
  return (json.data as FbInsights[])?.[0] ?? null
}

/**
 * Fetch daily Facebook Ads Insights for the last 30 days.
 * Uses time_increment=1 to get one record per day.
 * Includes actions and outbound_clicks so leads and clicks can be extracted per day.
 * Returns empty array on error.
 */
export async function fetchFacebookDailyInsights(
  adAccountId: string,
  accessToken: string,
  datePreset: DatePreset = 'last_90d'
): Promise<FbDailyInsight[]> {
  const url = new URL(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${adAccountId}/insights`
  )
  url.searchParams.set('fields', DAILY_FIELDS)
  url.searchParams.set('date_preset', datePreset)
  url.searchParams.set('time_increment', '1')
  url.searchParams.set('level', 'account')
  url.searchParams.set('access_token', accessToken)

  let res: Response
  try {
    res = await fetch(url.toString(), { cache: 'no-store' })
  } catch (err) {
    console.error('[facebook-ads] Network error fetching daily insights:', err)
    return []
  }

  const json = await res.json()

  if (!res.ok) {
    console.error('[facebook-ads] API error (daily):', json.error ?? json)
    return []
  }

  return (json.data as FbDailyInsight[]) ?? []
}

/**
 * Fetch top 5 Facebook campaigns sorted by spend (descending).
 * Returns campaign-level breakdown for the given date preset.
 * Returns empty array on API error or when no campaign data exists.
 *
 * @param adAccountId - Must include act_ prefix, e.g. "act_123456789"
 * @param datePreset  - 'last_7d' | 'last_30d' | 'maximum' (all-time)
 * @param accessToken - System User token from Meta Business Manager (no expiry)
 */
export async function fetchFacebookCampaignInsights(
  adAccountId: string,
  datePreset: DatePreset,
  accessToken: string
): Promise<FbCampaignInsight[]> {
  const url = new URL(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${adAccountId}/insights`
  )
  url.searchParams.set('fields', 'campaign_id,campaign_name,spend,impressions,clicks,reach,actions')
  url.searchParams.set('date_preset', datePreset)
  url.searchParams.set('level', 'campaign')
  url.searchParams.set('sort', 'spend_descending')
  url.searchParams.set('limit', '5')
  url.searchParams.set('access_token', accessToken)

  let res: Response
  try {
    res = await fetch(url.toString(), { cache: 'no-store' })
  } catch (err) {
    console.error('[facebook-ads] Network error fetching campaign insights:', err)
    return []
  }

  const json = await res.json()

  if (!res.ok) {
    console.error('[facebook-ads] API error (campaigns):', json.error ?? json)
    return []
  }

  return (json.data as FbCampaignInsight[]) ?? []
}

/**
 * Fetch Facebook Ads performance broken down by publisher platform (facebook/instagram/etc.).
 * Uses breakdowns=publisher_platform at account level.
 *
 * NOTE: 'reach' is intentionally excluded from fields — June 2025 API restriction
 * prevents combining reach with publisher_platform breakdown.
 *
 * Returns empty array on API error.
 *
 * @param adAccountId - Must include act_ prefix, e.g. "act_123456789"
 * @param datePreset  - 'last_7d' | 'last_30d' | 'maximum' (all-time)
 * @param accessToken - System User token from Meta Business Manager (no expiry)
 */
export async function fetchFacebookPlatformBreakdown(
  adAccountId: string,
  datePreset: DatePreset,
  accessToken: string
): Promise<FbPlatformRow[]> {
  const url = new URL(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${adAccountId}/insights`
  )
  // NOTE: Do NOT add 'reach' here — API restriction: reach cannot be combined with publisher_platform breakdown
  url.searchParams.set('fields', 'publisher_platform,impressions,spend,clicks')
  url.searchParams.set('date_preset', datePreset)
  url.searchParams.set('level', 'account')
  url.searchParams.set('breakdowns', 'publisher_platform')
  url.searchParams.set('access_token', accessToken)

  let res: Response
  try {
    res = await fetch(url.toString(), { cache: 'no-store' })
  } catch (err) {
    console.error('[facebook-ads] Network error fetching platform breakdown:', err)
    return []
  }

  const json = await res.json()

  if (!res.ok) {
    console.error('[facebook-ads] API error (platform breakdown):', json.error ?? json)
    return []
  }

  return (json.data as FbPlatformRow[]) ?? []
}

// ─── Chart Helpers ─────────────────────────────────────────────────────────────
// Kept here (not in the 'use client' chart component) so server components
// can call buildTrendData before passing the result as a prop.

export interface TrendDataPoint {
  date: string
  spend: number
  leads: number
}

/**
 * Fetch top 5 individual ads sorted by spend (descending).
 * Returns ad-level breakdown for the given date preset.
 * Returns empty array on API error or when no ad data exists.
 */
export async function fetchFacebookAdInsights(
  adAccountId: string,
  datePreset: DatePreset,
  accessToken: string
): Promise<FbAdInsight[]> {
  const url = new URL(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${adAccountId}/insights`
  )
  url.searchParams.set('fields', 'ad_id,ad_name,campaign_name,spend,impressions,clicks,reach,actions')
  url.searchParams.set('date_preset', datePreset)
  url.searchParams.set('level', 'ad')
  url.searchParams.set('sort', 'spend_descending')
  url.searchParams.set('limit', '5')
  url.searchParams.set('access_token', accessToken)

  let res: Response
  try {
    res = await fetch(url.toString(), { cache: 'no-store' })
  } catch (err) {
    console.error('[facebook-ads] Network error fetching ad insights:', err)
    return []
  }

  const json = await res.json()

  if (!res.ok) {
    console.error('[facebook-ads] API error (ads):', json.error ?? json)
    return []
  }

  return (json.data as FbAdInsight[]) ?? []
}

export function buildTrendData(daily: FbDailyInsight[]): TrendDataPoint[] {
  return daily.map((d) => ({
    date: new Date(d.date_start).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    spend: parseFloat(d.spend),
    leads:
      getActionValue(d.actions, 'lead') +
      getActionValue(d.actions, 'offsite_conversion.fb_pixel_lead'),
  }))
}
