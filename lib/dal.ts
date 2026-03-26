import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateOverallProgress } from '@/lib/utils/progress'
import { detectClientRisk } from '@/lib/utils/risk-detection'
import { fetchFacebookInsights, fetchFacebookDailyInsights, fetchFacebookCampaignInsights, fetchFacebookPlatformBreakdown, fetchFacebookAdInsights, getActionValue, type DatePreset, type FbCampaignInsight, type FbPlatformRow, type FbDailyInsight } from '@/lib/facebook-ads'
import { stripe } from '@/lib/stripe'

export const verifySession = cache(async () => {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  return {
    userId: session.user.id,
    userRole: session.user.role as 'ADMIN' | 'CLIENT',
    isAuth: true,
  }
})

export const getCurrentClientId = cache(async () => {
  const { userId, userRole } = await verifySession()

  if (userRole === 'ADMIN') {
    return null
  }

  const client = await prisma.client.findUnique({
    where: { userId },
    select: { id: true },
  })

  if (!client) {
    throw new Error('Client profile not found')
  }

  return client.id
})

export const getMilestones = cache(async () => {
  const clientId = await getCurrentClientId()

  return await prisma.milestone.findMany({
    where: clientId ? { clientId } : {},
    orderBy: { order: 'asc' },
    select: {
      id: true,
      clientId: true,
      title: true,
      description: true,
      status: true,
      progress: true,
      startDate: true,
      dueDate: true,
      completedAt: true,
      notes: true,
      order: true,
      createdAt: true,
      updatedAt: true,
    },
  })
})

export const getAllClientsWithMilestones = cache(async () => {
  const { userRole } = await verifySession()

  if (userRole !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required')
  }

  const clients = await prisma.client.findMany({
    relationLoadStrategy: 'join',
    select: {
      id: true,
      companyName: true,
      industry: true,
      website: true,
      phone: true,
      address: true,
      adAccountId: true,
      driveFolderId: true,
      onboardingStep: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      milestones: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          clientId: true,
          title: true,
          status: true,
          progress: true,
          startDate: true,
          dueDate: true,
          order: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return clients
})

export const getClientWithMilestones = cache(async (clientId: string) => {
  const { userRole } = await verifySession()

  if (userRole !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required')
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    relationLoadStrategy: 'join',
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      milestones: {
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!client) {
    throw new Error('Client not found')
  }

  return client
})

export const getClientForEdit = cache(async (clientId: string) => {
  const { userRole } = await verifySession()

  if (userRole !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required')
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    relationLoadStrategy: 'join',
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  })

  if (!client) {
    throw new Error('Client not found')
  }

  return client
})

export const getAdminAnalytics = cache(async () => {
  const { userRole } = await verifySession()

  if (userRole !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required')
  }

  // Reuse cached function to get all clients with milestones
  const clients = await getAllClientsWithMilestones()

  // Calculate total and active clients
  const totalClients = clients.length
  const activeClients = clients.filter((c) => c.isActive).length

  // Calculate average progress across all clients
  let totalProgress = 0
  clients.forEach((client) => {
    const clientProgress = calculateOverallProgress(client.milestones)
    totalProgress += clientProgress
  })
  const averageProgress = totalClients > 0 ? Math.round(totalProgress / totalClients) : 0

  // Count at-risk clients
  const atRiskClients = clients.filter((client) => {
    const risk = detectClientRisk(client)
    return risk.isAtRisk
  }).length

  // Calculate upcoming due dates (within 7 days, not completed)
  const now = new Date()
  const sevenDaysFromNow = new Date()
  sevenDaysFromNow.setDate(now.getDate() + 7)

  const upcomingDueDates: Array<{
    clientName: string
    milestoneTitle: string
    dueDate: Date
  }> = []

  clients.forEach((client) => {
    client.milestones.forEach((milestone) => {
      if (
        milestone.status !== 'COMPLETED' &&
        milestone.dueDate &&
        milestone.dueDate >= now &&
        milestone.dueDate <= sevenDaysFromNow
      ) {
        upcomingDueDates.push({
          clientName: client.companyName,
          milestoneTitle: milestone.title,
          dueDate: milestone.dueDate,
        })
      }
    })
  })

  // Sort upcoming due dates by date
  upcomingDueDates.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())

  // Calculate total and completed milestones
  let totalMilestones = 0
  let completedMilestones = 0

  clients.forEach((client) => {
    totalMilestones += client.milestones.length
    completedMilestones += client.milestones.filter(
      (m) => m.status === 'COMPLETED'
    ).length
  })

  return {
    totalClients,
    activeClients,
    averageProgress,
    atRiskClients,
    upcomingDueDates,
    totalMilestones,
    completedMilestones,
  }
})

/**
 * Shared cached settings fetch — deduplicates across all DAL functions in the same render pass.
 * React cache() ensures this runs at most once per request, even when called from
 * getClientFbInsights, getClientFbCampaigns, getClientFbPlatformBreakdown, etc.
 */
export const getSettings = cache(async () => {
  return prisma.settings.findFirst({
    select: {
      facebookAccessToken: true,
      whatsappNumber: true,
      telegramUsername: true,
    },
  })
})

export const getChatSettings = cache(async () => {
  const settings = await getSettings()
  if (!settings) return null
  return {
    whatsappNumber: settings.whatsappNumber,
    telegramUsername: settings.telegramUsername,
  }
})

/**
 * Get current client's profile with ad account config.
 * Deduplicated via cache() — called by multiple FB DAL functions in the same render.
 */
export const getClientAdConfig = cache(async () => {
  const { userId, userRole } = await verifySession()
  if (userRole !== 'CLIENT') throw new Error('Unauthorized: Client access required')

  return prisma.client.findUnique({
    where: { userId },
    select: { id: true, adAccountId: true },
  })
})

/**
 * Get project analytics for the currently logged-in client.
 * Uses select to fetch only counts and minimal fields — no full document/activity records.
 * Replaces the inline getAnalyticsData() that was in app/dashboard/analytics/page.tsx.
 * CLIENT role only.
 */
export const getClientAnalytics = cache(async () => {
  const { userId } = await verifySession()

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      clientProfile: {
        select: {
          documents: {
            select: { id: true, createdAt: true },
            orderBy: { createdAt: 'asc' as const },
          },
          milestones: {
            select: { title: true, status: true, progress: true },
          },
          invoices: {
            select: { id: true },
          },
        },
      },
      activities: {
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' as const },
        take: 50,
      },
    },
  })

  const docs = user?.clientProfile?.documents || []
  const milestones = user?.clientProfile?.milestones || []
  const activities = user?.activities || []

  const totalDocuments = docs.length
  const completedMilestones = milestones.filter(m => m.status === 'COMPLETED').length
  const totalMilestones = milestones.length
  const progressRate = totalMilestones > 0
    ? Math.round((completedMilestones / totalMilestones) * 100)
    : 0

  // Documents over time
  const documentsData = docs.reduce((acc: Array<{ month: string; count: number }>, doc) => {
    const month = new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    const existing = acc.find(item => item.month === month)
    if (existing) existing.count++
    else acc.push({ month, count: 1 })
    return acc
  }, [])

  // Activity over time (last 50)
  const activityData = activities.reduce((acc: Array<{ date: string; count: number }>, activity) => {
    const date = new Date(activity.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const existing = acc.find(item => item.date === date)
    if (existing) existing.count++
    else acc.push({ date, count: 1 })
    return acc
  }, []).reverse()

  // Milestone progress
  const milestoneData = milestones.map(m => ({
    name: m.title,
    progress: m.progress,
    status: m.status,
  }))

  return {
    totalDocuments,
    completedMilestones,
    totalMilestones,
    progressRate,
    documentsData,
    activityData,
    milestoneData,
  }
})

// ─── Billing DAL Functions ───────────────────────────────────────────────────

/**
 * Get all invoices for the currently logged-in client
 * CLIENT role only
 */
export const getClientInvoices = cache(async () => {
  const clientId = await getCurrentClientId()

  if (!clientId) {
    throw new Error('Client profile not found')
  }

  return await prisma.invoice.findMany({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
  })
})

/**
 * Get complete billing data for the currently logged-in client
 * CLIENT role only — replaces inline getBillingData on billing page
 */
export const getClientBillingData = cache(async () => {
  const clientId = await getCurrentClientId()

  if (!clientId) {
    throw new Error('Client profile not found')
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    relationLoadStrategy: 'join',
    include: {
      invoices: {
        orderBy: { createdAt: 'desc' },
      },
      subscriptions: true,
    },
  })

  if (!client) {
    throw new Error('Client not found')
  }

  return {
    client,
    invoices: client.invoices,
    subscriptions: client.subscriptions,
  }
})

/**
 * Get all invoices for a specific client — admin use
 * ADMIN role only
 */
export const getAdminClientInvoices = cache(async (clientId: string) => {
  const { userRole } = await verifySession()

  if (userRole !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required')
  }

  return await prisma.invoice.findMany({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
  })
})

/**
 * Get subscription status for a specific client — admin use
 * Returns the most recent Subscription record (or null if none)
 * ADMIN role only
 */
export const getAdminClientSubscription = cache(async (clientId: string) => {
  const { userRole } = await verifySession()
  if (userRole !== 'ADMIN') throw new Error('Unauthorized')

  return prisma.subscription.findFirst({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
  })
})

/**
 * Get client data needed for invoice creation — admin use
 * Returns companyName, user email, and subscriptions (stripeCustomerId)
 * ADMIN role only
 */
export const getAdminClientForBilling = cache(async (clientId: string) => {
  const { userRole } = await verifySession()

  if (userRole !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required')
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    relationLoadStrategy: 'join',
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      subscriptions: {
        select: {
          id: true,
          stripeCustomerId: true,
        },
      },
    },
  })

  if (!client) {
    throw new Error('Client not found')
  }

  return client
})

// ─── Facebook Ads DAL Functions ────────────────────────────────────────────────

/**
 * Get Facebook Ads Insights for the currently logged-in client.
 * Uses unstable_cache with 6-hour TTL to avoid rate limits.
 *
 * CRITICAL: verifySession() is called OUTSIDE the unstable_cache boundary.
 * unstable_cache cannot call headers() or cookies() — session must be read first.
 *
 * Returns null when:
 * - Client has no adAccountId configured
 * - Settings has no facebookAccessToken configured
 * - Facebook API returns an error
 * - No data exists for the requested date range
 *
 * CLIENT role only.
 */
export const getClientFbInsights = cache(async (datePreset: DatePreset = 'last_30d') => {
  // Auth OUTSIDE the cache boundary — unstable_cache cannot access session
  const { userRole } = await verifySession()

  if (userRole !== 'CLIENT') {
    throw new Error('Unauthorized: Client access required')
  }

  // Get client's adAccountId from DB (deduplicated via cache)
  const client = await getClientAdConfig()

  if (!client?.adAccountId) {
    // Not configured yet — not an error, show "not configured" state in UI
    return null
  }

  // Get global System User token from Settings singleton (deduplicated via cache)
  const settings = await getSettings()

  if (!settings?.facebookAccessToken) {
    // Token not configured — not an error
    return null
  }

  // Cache per (clientId, datePreset) for 6 hours
  // Each date range gets its own cache entry
  const cachedFetch = unstable_cache(
    async () =>
      fetchFacebookInsights(
        client.adAccountId!,
        datePreset,
        settings.facebookAccessToken!
      ),
    [`fb-insights-${client.id}-${datePreset}`],
    {
      revalidate: 21600, // 6 hours in seconds
      tags: [`fb-insights-${client.id}`],
    }
  )

  return cachedFetch()
})

/**
 * Get 30 days of daily Facebook Ads data for the home page chart.
 * Returns impressions, clicks, leads, and booked calls per day.
 *
 * Lead action type: 'lead' (standard FB pixel Lead event)
 * Booked call action type: 'offsite_conversion.fb_pixel_custom'
 *   — custom events via fbq('trackCustom', 'BookedCall') aggregate here.
 *   — if a dedicated Custom Conversion is created in Events Manager,
 *     it will appear as 'offsite_conversion.custom.{id}' instead.
 *
 * Returns null when adAccountId or token not configured.
 * CLIENT role only.
 */
export const getClientFbDailyInsights = cache(async () => {
  const { userRole } = await verifySession()

  if (userRole !== 'CLIENT') {
    throw new Error('Unauthorized: Client access required')
  }

  const client = await getClientAdConfig()

  if (!client?.adAccountId) return null

  const settings = await getSettings()

  if (!settings?.facebookAccessToken) return null

  const cachedFetch = unstable_cache(
    async () => fetchFacebookDailyInsights(client.adAccountId!, settings.facebookAccessToken!, 'last_90d'),
    [`fb-daily-90d-${client.id}`],
    { revalidate: 21600, tags: [`fb-insights-${client.id}`] }
  )

  return cachedFetch()
})

/**
 * Get top 5 Facebook campaigns sorted by spend for the currently logged-in client.
 * Uses unstable_cache with 6-hour TTL to avoid rate limits.
 *
 * CRITICAL: verifySession() is called OUTSIDE the unstable_cache boundary.
 * unstable_cache cannot call headers() or cookies() — session must be read first.
 *
 * Returns empty array when adAccountId or token not configured.
 * CLIENT role only.
 */
export const getClientFbCampaigns = cache(async (datePreset: DatePreset = 'last_30d'): Promise<FbCampaignInsight[]> => {
  // Auth OUTSIDE the cache boundary — unstable_cache cannot access session
  const { userRole } = await verifySession()

  if (userRole !== 'CLIENT') {
    throw new Error('Unauthorized: Client access required')
  }

  const client = await getClientAdConfig()

  if (!client?.adAccountId) return []

  const settings = await getSettings()

  if (!settings?.facebookAccessToken) return []

  const cachedFetch = unstable_cache(
    async () =>
      fetchFacebookCampaignInsights(
        client.adAccountId!,
        datePreset,
        settings.facebookAccessToken!
      ),
    [`fb-campaigns-${client.id}-${datePreset}`],
    {
      revalidate: 21600, // 6 hours in seconds
      tags: [`fb-insights-${client.id}`],
    }
  )

  return cachedFetch()
})

/**
 * Get Facebook Ads performance breakdown by publisher platform (facebook/instagram/etc.)
 * for the currently logged-in client.
 * Uses unstable_cache with 6-hour TTL to avoid rate limits.
 *
 * CRITICAL: verifySession() is called OUTSIDE the unstable_cache boundary.
 * Note: reach is excluded from platform breakdown — API restriction (June 2025).
 *
 * Returns empty array when adAccountId or token not configured.
 * CLIENT role only.
 */
export const getClientFbPlatformBreakdown = cache(async (datePreset: DatePreset = 'last_30d'): Promise<FbPlatformRow[]> => {
  // Auth OUTSIDE the cache boundary — unstable_cache cannot access session
  const { userRole } = await verifySession()

  if (userRole !== 'CLIENT') {
    throw new Error('Unauthorized: Client access required')
  }

  const client = await getClientAdConfig()

  if (!client?.adAccountId) return []

  const settings = await getSettings()

  if (!settings?.facebookAccessToken) return []

  const cachedFetch = unstable_cache(
    async () =>
      fetchFacebookPlatformBreakdown(
        client.adAccountId!,
        datePreset,
        settings.facebookAccessToken!
      ),
    [`fb-platform-${client.id}-${datePreset}`],
    {
      revalidate: 21600, // 6 hours in seconds
      tags: [`fb-insights-${client.id}`],
    }
  )

  return cachedFetch()
})

/**
 * Get 30 days of daily Facebook Ads trend data for the currently logged-in client.
 * Includes extended fields: reach, actions, and outbound_clicks per day.
 *
 * CRITICAL: verifySession() is called OUTSIDE the unstable_cache boundary.
 *
 * Returns null when adAccountId or token not configured (not an empty array —
 * null signals "not configured" vs "configured but no data").
 * CLIENT role only.
 */
export const getClientFbDailyTrend = cache(async (): Promise<FbDailyInsight[] | null> => {
  // Auth OUTSIDE the cache boundary — unstable_cache cannot access session
  const { userRole } = await verifySession()

  if (userRole !== 'CLIENT') {
    throw new Error('Unauthorized: Client access required')
  }

  const client = await getClientAdConfig()

  if (!client?.adAccountId) return null

  const settings = await getSettings()

  if (!settings?.facebookAccessToken) return null

  const cachedFetch = unstable_cache(
    async () => fetchFacebookDailyInsights(client.adAccountId!, settings.facebookAccessToken!, 'last_90d'),
    [`fb-daily-trend-90d-${client.id}`],
    {
      revalidate: 21600, // 6 hours in seconds
      tags: [`fb-insights-${client.id}`],
    }
  )

  return cachedFetch()
})

// ─── Admin Revenue Analytics ────────────────────────────────────────────────

/**
 * Aggregate Stripe revenue data across all clients.
 * Total revenue: sum of all PAID invoices from local DB (no Stripe API needed).
 * MRR: sum of active Stripe subscriptions' monthly amounts (cached 1 hour).
 *
 * verifySession() called BEFORE unstable_cache boundary.
 * ADMIN role only.
 */
export const getAdminRevenueAnalytics = cache(async () => {
  const { userRole } = await verifySession()
  if (userRole !== 'ADMIN') throw new Error('Unauthorized: Admin access required')

  // Total revenue from local Invoice records — no Stripe API call needed
  const paidInvoices = await prisma.invoice.findMany({
    where: { status: 'PAID' },
    select: { amount: true, currency: true, clientId: true },
  })

  const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0)
  const payingClientCount = new Set(paidInvoices.map(i => i.clientId)).size

  // MRR from active subscriptions — requires Stripe API for live price data
  const activeSubscriptions = await prisma.subscription.findMany({
    where: {
      status: 'active',
      stripeSubscriptionId: { not: null },
    },
    select: { stripeSubscriptionId: true },
  })

  // Cache Stripe API calls with 1-hour TTL
  const mrr = await unstable_cache(
    async () => {
      if (activeSubscriptions.length === 0) return 0

      const results = await Promise.allSettled(
        activeSubscriptions.map(sub =>
          stripe.subscriptions.retrieve(sub.stripeSubscriptionId!)
        )
      )

      return results.reduce((sum, r) => {
        if (r.status === 'fulfilled') {
          const amount = r.value.items.data[0]?.price?.unit_amount ?? 0
          return sum + amount / 100 // cents to dollars
        }
        return sum
      }, 0)
    },
    ['admin-mrr-v1'],
    { revalidate: 3600 } // 1 hour
  )()

  return {
    totalRevenue,
    mrr,
    payingClientCount,
    activeSubscriptionCount: activeSubscriptions.length,
  }
})

/**
 * Aggregate Facebook Ads data across all clients with configured ad accounts.
 * Uses Promise.allSettled for parallel fetching — individual failures don't block others.
 * Cached with 6-hour TTL matching per-client FB cache.
 *
 * verifySession() called BEFORE unstable_cache boundary.
 * ADMIN role only.
 */
export const getAdminFbAggregation = cache(async () => {
  const { userRole } = await verifySession()
  if (userRole !== 'ADMIN') throw new Error('Unauthorized: Admin access required')

  const settings = await getSettings()

  if (!settings?.facebookAccessToken) {
    return { totalSpend: 0, totalLeads: 0, totalImpressions: 0, configuredClients: 0 }
  }

  const clients = await prisma.client.findMany({
    where: { adAccountId: { not: null } },
    select: { id: true, adAccountId: true },
  })

  if (clients.length === 0) {
    return { totalSpend: 0, totalLeads: 0, totalImpressions: 0, configuredClients: 0 }
  }

  const accessToken = settings.facebookAccessToken

  // Cache FB API calls with 6-hour TTL
  const aggregated = await unstable_cache(
    async () => {
      const results = await Promise.allSettled(
        clients.map(c =>
          fetchFacebookInsights(c.adAccountId!, 'last_30d', accessToken)
        )
      )

      let totalSpend = 0
      let totalLeads = 0
      let totalImpressions = 0

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          totalSpend += parseFloat(result.value.spend || '0')
          totalImpressions += parseFloat(result.value.impressions || '0')
          totalLeads += getActionValue(result.value.actions, 'lead')
        }
      }

      return { totalSpend, totalLeads, totalImpressions }
    },
    ['admin-fb-aggregation-v1'],
    { revalidate: 21600 } // 6 hours
  )()

  return { ...aggregated, configuredClients: clients.length }
})

/**
 * Get Facebook Ads Insights per client for the admin dashboard.
 * Returns a map of clientId → { spend, leads } for all clients with configured ad accounts.
 * Uses Promise.allSettled — individual failures are silently skipped.
 *
 * verifySession() called BEFORE unstable_cache boundary.
 * ADMIN role only.
 */
export const getAdminFbPerClient = cache(async (): Promise<Record<string, { spend: number; leads: number }>> => {
  const { userRole } = await verifySession()
  if (userRole !== 'ADMIN') throw new Error('Unauthorized: Admin access required')

  const settings = await getSettings()

  if (!settings?.facebookAccessToken) {
    return {}
  }

  const clients = await prisma.client.findMany({
    where: { adAccountId: { not: null } },
    select: { id: true, adAccountId: true },
  })

  if (clients.length === 0) {
    return {}
  }

  const accessToken = settings.facebookAccessToken

  return unstable_cache(
    async () => {
      const results = await Promise.allSettled(
        clients.map(c =>
          fetchFacebookInsights(c.adAccountId!, 'last_30d', accessToken)
        )
      )

      const perClient: Record<string, { spend: number; leads: number }> = {}

      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        if (result.status === 'fulfilled' && result.value) {
          perClient[clients[i].id] = {
            spend: parseFloat(result.value.spend || '0'),
            leads: getActionValue(result.value.actions, 'lead'),
          }
        }
      }

      return perClient
    },
    ['admin-fb-per-client-v1'],
    { revalidate: 21600 } // 6 hours
  )()
})

/**
 * Aggregate daily Facebook Ads trend data across all clients with configured ad accounts.
 * Returns a sorted array of { date, spend, leads } — one entry per calendar day.
 * Spend and leads are summed across all clients for each date.
 *
 * verifySession() called BEFORE unstable_cache boundary.
 * ADMIN role only.
 */
export const getAdminFbDailyAggregation = cache(async (): Promise<Array<{ date: string; spend: number; leads: number }>> => {
  const { userRole } = await verifySession()
  if (userRole !== 'ADMIN') throw new Error('Unauthorized: Admin access required')

  const settings = await getSettings()

  if (!settings?.facebookAccessToken) {
    return []
  }

  const clients = await prisma.client.findMany({
    where: { adAccountId: { not: null } },
    select: { id: true, adAccountId: true },
  })

  if (clients.length === 0) {
    return []
  }

  const accessToken = settings.facebookAccessToken

  return unstable_cache(
    async () => {
      const results = await Promise.allSettled(
        clients.map(c =>
          fetchFacebookDailyInsights(c.adAccountId!, accessToken, 'last_30d')
        )
      )

      const dateMap = new Map<string, { spend: number; leads: number }>()

      for (const result of results) {
        if (result.status === 'fulfilled') {
          for (const day of result.value) {
            const existing = dateMap.get(day.date_start) ?? { spend: 0, leads: 0 }
            existing.spend += parseFloat(day.spend || '0')
            existing.leads += getActionValue(day.actions, 'lead')
            dateMap.set(day.date_start, existing)
          }
        }
      }

      return Array.from(dateMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, vals]) => ({ date, spend: vals.spend, leads: vals.leads }))
    },
    ['admin-fb-daily-agg-v1'],
    { revalidate: 21600 } // 6 hours
  )()
})

/**
 * Get extended Facebook Ads metrics per client for the admin analytics page.
 * Returns a map of clientId → full metrics object including impressions, CTR, CPC, etc.
 * Uses Promise.allSettled — individual failures are silently skipped.
 *
 * verifySession() called BEFORE unstable_cache boundary.
 * ADMIN role only.
 */
export const getAdminFbMetricsPerClient = cache(async (): Promise<Record<string, {
  spend: number
  leads: number
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  cpm: number
  reach: number
}>> => {
  const { userRole } = await verifySession()
  if (userRole !== 'ADMIN') throw new Error('Unauthorized: Admin access required')

  const settings = await getSettings()
  if (!settings?.facebookAccessToken) return {}

  const clients = await prisma.client.findMany({
    where: { adAccountId: { not: null } },
    select: { id: true, adAccountId: true },
  })
  if (clients.length === 0) return {}

  const accessToken = settings.facebookAccessToken

  const result = await unstable_cache(
    async () => {
      const results = await Promise.allSettled(
        clients.map(c => fetchFacebookInsights(c.adAccountId!, 'last_30d', accessToken))
      )
      const map: Record<string, { spend: number; leads: number; impressions: number; clicks: number; ctr: number; cpc: number; cpm: number; reach: number }> = {}
      results.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value) {
          const v = r.value
          map[clients[i].id] = {
            spend: parseFloat(v.spend || '0'),
            leads: getActionValue(v.actions, 'lead'),
            impressions: parseFloat(v.impressions || '0'),
            clicks: parseFloat(v.clicks || '0'),
            ctr: parseFloat(v.ctr || '0'),
            cpc: parseFloat(v.cpc || '0'),
            cpm: parseFloat(v.cpm || '0'),
            reach: parseFloat(v.reach || '0'),
          }
        }
      })
      return map
    },
    ['admin-fb-metrics-per-client-v1'],
    { revalidate: 21600 }
  )()

  return result
})

/**
 * Get all campaigns across all clients with Facebook ad accounts configured.
 * Returns an array of campaign rows sorted by spend descending.
 *
 * verifySession() called BEFORE unstable_cache boundary.
 * ADMIN role only.
 */
export const getAdminAllCampaigns = cache(async (): Promise<Array<{
  clientId: string
  clientName: string
  campaign_id: string
  campaign_name: string
  spend: number
  leads: number
  impressions: number
  clicks: number
  ctr: number
}>> => {
  const { userRole } = await verifySession()
  if (userRole !== 'ADMIN') throw new Error('Unauthorized: Admin access required')

  const settings = await getSettings()
  if (!settings?.facebookAccessToken) return []

  const clients = await prisma.client.findMany({
    where: { adAccountId: { not: null } },
    select: { id: true, adAccountId: true, companyName: true },
  })
  if (clients.length === 0) return []

  const accessToken = settings.facebookAccessToken

  const result = await unstable_cache(
    async () => {
      const results = await Promise.allSettled(
        clients.map(c => fetchFacebookCampaignInsights(c.adAccountId!, 'last_30d', accessToken))
      )
      const campaigns: Array<{
        clientId: string; clientName: string; campaign_id: string; campaign_name: string
        spend: number; leads: number; impressions: number; clicks: number; ctr: number
      }> = []
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          r.value.forEach(campaign => {
            const clicks = parseFloat(campaign.clicks || '0')
            const impressions = parseFloat(campaign.impressions || '0')
            campaigns.push({
              clientId: clients[i].id,
              clientName: clients[i].companyName,
              campaign_id: campaign.campaign_id,
              campaign_name: campaign.campaign_name,
              spend: parseFloat(campaign.spend || '0'),
              leads: getActionValue(campaign.actions, 'lead'),
              impressions,
              clicks,
              ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
            })
          })
        }
      })
      // Sort by spend descending
      return campaigns.sort((a, b) => b.spend - a.spend)
    },
    ['admin-all-campaigns-v1'],
    { revalidate: 21600 }
  )()

  return result
})

/**
 * Fetch top 5 individual ads per client across all configured ad accounts.
 * Returns a flat list sorted by spend descending.
 *
 * verifySession() called BEFORE unstable_cache boundary.
 * ADMIN role only.
 */
export const getAdminAllAds = cache(async (): Promise<Array<{
  clientId: string
  clientName: string
  ad_id: string
  ad_name: string
  campaign_name: string
  spend: number
  leads: number
  impressions: number
  clicks: number
  ctr: number
}>> => {
  const { userRole } = await verifySession()
  if (userRole !== 'ADMIN') throw new Error('Unauthorized: Admin access required')

  const settings = await getSettings()
  if (!settings?.facebookAccessToken) return []

  const clients = await prisma.client.findMany({
    where: { adAccountId: { not: null } },
    select: { id: true, adAccountId: true, companyName: true },
  })
  if (clients.length === 0) return []

  const accessToken = settings.facebookAccessToken

  const result = await unstable_cache(
    async () => {
      const results = await Promise.allSettled(
        clients.map(c => fetchFacebookAdInsights(c.adAccountId!, 'last_30d', accessToken))
      )
      const ads: Array<{
        clientId: string; clientName: string; ad_id: string; ad_name: string
        campaign_name: string; spend: number; leads: number
        impressions: number; clicks: number; ctr: number
      }> = []
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          r.value.forEach(ad => {
            const clicks = parseFloat(ad.clicks || '0')
            const impressions = parseFloat(ad.impressions || '0')
            ads.push({
              clientId: clients[i].id,
              clientName: clients[i].companyName,
              ad_id: ad.ad_id,
              ad_name: ad.ad_name,
              campaign_name: ad.campaign_name,
              spend: parseFloat(ad.spend || '0'),
              leads: getActionValue(ad.actions, 'lead'),
              impressions,
              clicks,
              ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
            })
          })
        }
      })
      return ads.sort((a, b) => b.spend - a.spend)
    },
    ['admin-all-ads-v1'],
    { revalidate: 21600 }
  )()

  return result
})

// ─── Dashboard Home DAL Functions ────────────────────────────────────────────

/**
 * Get client profile data needed for the dashboard home page.
 * Returns id, companyName, and adAccountId for FB config check.
 * CLIENT role only.
 */
export const getClientDashboardProfile = cache(async () => {
  const { userId } = await verifySession()

  return prisma.client.findUnique({
    where: { userId },
    select: { id: true, companyName: true, adAccountId: true },
  })
})

/**
 * Get the current user's name from their session-linked user record.
 * Used for the greeting on the dashboard home page.
 */
export const getCurrentUserName = cache(async () => {
  const { userId } = await verifySession()

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  })

  return user?.name || null
})

/**
 * Get the 5 most recent documents for the current client.
 * CLIENT role only.
 */
export const getClientRecentDocuments = cache(async () => {
  const client = await getClientDashboardProfile()
  if (!client) return []

  return prisma.document.findMany({
    where: { clientId: client.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, title: true, status: true, createdAt: true },
  })
})

/**
 * Get the 4 most recent activities for the current user.
 * Used for the recent activity feed on the dashboard home page.
 */
export const getRecentActivities = cache(async () => {
  const { userId } = await verifySession()

  return prisma.activity.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 4,
    select: {
      id: true,
      action: true,
      createdAt: true,
      user: { select: { name: true } },
    },
  })
})
