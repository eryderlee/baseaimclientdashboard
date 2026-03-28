import { getSetupMilestones, getGrowthMilestones, getChatSettings, getClientFbDailyTrend, getClientDashboardProfile, getCurrentUserName, getClientRecentDocuments, getRecentActivities, getClientFbInsights, verifySession, getCurrentClientId } from "@/lib/dal"
import { getActionValue, getRoas } from "@/lib/facebook-ads"
import { DashboardOverview } from "@/components/dashboard/dashboard-overview"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  // Admin without preview context has no client — redirect to admin home
  const { userRole } = await verifySession()
  if (userRole === 'ADMIN') {
    const clientId = await getCurrentClientId()
    if (!clientId) redirect('/admin')
  }
  const [setupMilestones, growthMilestones, chatSettings, dailyInsights, client, userName, documents, activities, fbInsights] = await Promise.all([
    getSetupMilestones(),
    getGrowthMilestones(),
    getChatSettings(),
    getClientFbDailyTrend(),
    getClientDashboardProfile(),
    getCurrentUserName(),
    getClientRecentDocuments(),
    getRecentActivities(),
    getClientFbInsights('last_30d'),
  ])

  const setupComplete =
    setupMilestones.length >= 6 &&
    setupMilestones.every((m) => m.status === 'COMPLETED')

  const roas = getRoas(fbInsights?.purchase_roas ?? undefined)

  // Transform daily FB insights into chart-ready format
  const fbDailyData = dailyInsights?.map((day) => ({
    date: new Date(day.date_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    rawDate: day.date_start, // "YYYY-MM-DD" — used for calendar-based range filtering
    impressions: parseFloat(day.impressions || '0'),
    clicks: parseFloat(day.clicks || '0'),
    spend: parseFloat(day.spend || '0'),
    leads: getActionValue(day.actions, 'lead'),
    bookedCalls: getActionValue(day.actions, 'offsite_conversion.fb_pixel_custom'),
  })) ?? null

  const serializeMilestone = (m: typeof setupMilestones[number]) => ({
    ...m,
    startDate: m.startDate ? new Date(m.startDate).toISOString() : null,
    dueDate: m.dueDate ? new Date(m.dueDate).toISOString() : null,
    completedAt: m.completedAt ? new Date(m.completedAt).toISOString() : null,
    createdAt: new Date(m.createdAt).toISOString(),
    updatedAt: new Date(m.updatedAt).toISOString(),
    notes: Array.isArray(m.notes)
      ? m.notes.map((note: any) => ({
          id: note.id || crypto.randomUUID(),
          content: note.content || String(note),
          createdAt: note.createdAt || new Date().toISOString(),
          createdBy: note.createdBy || 'Admin',
        }))
      : [],
  })

  // Serialize dates for client component (JSON serialization)
  const serializedSetupMilestones = setupMilestones.map(serializeMilestone)
  const serializedGrowthMilestones = growthMilestones.map(serializeMilestone)

  const serializedDocuments = documents.map((d) => ({
    ...d,
    createdAt: d.createdAt.toISOString(),
  }))

  const serializedActivities = activities.map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
  }))

  return (
    <DashboardOverview
      setupMilestones={serializedSetupMilestones}
      growthMilestones={serializedGrowthMilestones}
      setupComplete={setupComplete}
      chatSettings={{
        whatsappNumber: chatSettings?.whatsappNumber,
        telegramUsername: chatSettings?.telegramUsername,
      }}
      clientName={userName || 'Client'}
      companyName={client?.companyName || 'Company'}
      fbDailyData={fbDailyData}
      isFbConfigured={!!client?.adAccountId || !!client?.isDemo}
      leadsEnabled={client?.leadsChartEnabled ?? false}
      roas={roas}
      documents={serializedDocuments}
      activities={serializedActivities}
      campaignStartDate={dailyInsights?.[0]?.date_start ?? null}
    />
  )
}
