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
}

export interface FbDailyInsight {
  spend: string
  impressions: string
  clicks: string
  actions?: FbAction[]
  date_start: string
  date_stop: string
}

export type DatePreset = 'last_7d' | 'last_30d' | 'maximum'

const GRAPH_API_VERSION = 'v22.0'
const INSIGHTS_FIELDS = 'spend,impressions,clicks,ctr,cpc,cpm,actions'
const DAILY_FIELDS = 'spend,impressions,clicks,actions'

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
 * Includes actions so leads and booked calls can be extracted per day.
 * Returns empty array on error.
 */
export async function fetchFacebookDailyInsights(
  adAccountId: string,
  accessToken: string
): Promise<FbDailyInsight[]> {
  const url = new URL(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${adAccountId}/insights`
  )
  url.searchParams.set('fields', DAILY_FIELDS)
  url.searchParams.set('date_preset', 'last_30d')
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
