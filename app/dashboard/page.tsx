import { getMilestones, getChatSettings, getClientFbDailyInsights } from "@/lib/dal"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getActionValue } from "@/lib/facebook-ads"
import { DashboardOverview } from "@/components/dashboard/dashboard-overview"

export default async function DashboardPage() {
  const [milestones, chatSettings, dailyInsights, session] = await Promise.all([
    getMilestones(),
    getChatSettings(),
    getClientFbDailyInsights(),
    auth(),
  ])

  // Fetch client profile for company name and FB config status
  const client = await prisma.client.findUnique({
    where: { userId: session!.user!.id },
    select: { id: true, companyName: true, adAccountId: true },
  })

  // Fetch recent documents and activities in parallel
  const [documents, activities] = await Promise.all([
    client
      ? prisma.document.findMany({
          where: { clientId: client.id },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, title: true, status: true, createdAt: true },
        })
      : [],
    prisma.activity.findMany({
      where: { userId: session!.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: {
        id: true,
        action: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    }),
  ])

  // Transform daily FB insights into chart-ready format
  const fbDailyData = dailyInsights?.map((day) => ({
    date: new Date(day.date_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    impressions: parseFloat(day.impressions || '0'),
    clicks: parseFloat(day.clicks || '0'),
    spend: parseFloat(day.spend || '0'),
    leads: getActionValue(day.actions, 'lead'),
    bookedCalls: getActionValue(day.actions, 'offsite_conversion.fb_pixel_custom'),
  })) ?? null

  // Serialize dates for client component (JSON serialization)
  const serializedMilestones = milestones.map(m => ({
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
  }))

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
      milestones={serializedMilestones}
      chatSettings={{
        whatsappNumber: chatSettings?.whatsappNumber,
        telegramUsername: chatSettings?.telegramUsername,
      }}
      clientName={session?.user?.name || 'Client'}
      companyName={client?.companyName || 'Company'}
      fbDailyData={fbDailyData}
      isFbConfigured={!!client?.adAccountId}
      documents={serializedDocuments}
      activities={serializedActivities}
    />
  )
}
