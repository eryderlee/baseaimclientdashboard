import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateOverallProgress } from '@/lib/utils/progress'
import { detectClientRisk } from '@/lib/utils/risk-detection'
import { fetchFacebookInsights, fetchFacebookDailyInsights, getActionValue, type DatePreset } from '@/lib/facebook-ads'
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

export const getChatSettings = cache(async () => {
  const settings = await prisma.settings.findFirst({
    select: {
      whatsappNumber: true,
      telegramUsername: true,
    },
  })

  return settings
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
  const { userId, userRole } = await verifySession()

  if (userRole !== 'CLIENT') {
    throw new Error('Unauthorized: Client access required')
  }

  // Get client's adAccountId from DB
  const client = await prisma.client.findUnique({
    where: { userId },
    select: { id: true, adAccountId: true },
  })

  if (!client?.adAccountId) {
    // Not configured yet — not an error, show "not configured" state in UI
    return null
  }

  // Get global System User token from Settings singleton
  const settings = await prisma.settings.findFirst({
    select: { facebookAccessToken: true },
  })

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
  const { userId, userRole } = await verifySession()

  if (userRole !== 'CLIENT') {
    throw new Error('Unauthorized: Client access required')
  }

  const client = await prisma.client.findUnique({
    where: { userId },
    select: { id: true, adAccountId: true },
  })

  if (!client?.adAccountId) return null

  const settings = await prisma.settings.findFirst({
    select: { facebookAccessToken: true },
  })

  if (!settings?.facebookAccessToken) return null

  const cachedFetch = unstable_cache(
    async () => fetchFacebookDailyInsights(client.adAccountId!, settings.facebookAccessToken!),
    [`fb-daily-${client.id}`],
    { revalidate: 21600, tags: [`fb-insights-${client.id}`] }
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

  const settings = await prisma.settings.findFirst({
    select: { facebookAccessToken: true },
  })

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
