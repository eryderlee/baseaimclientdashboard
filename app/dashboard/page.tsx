import { Suspense } from 'react'
import { getMilestones, getChatSettings, getClientDashboardProfile, getCurrentUserName, getClientRecentDocuments, getRecentActivities, getClientFbDailyTrendByRange, getClientAdConfig } from '@/lib/dal'
import { buildTrendData, type DatePreset } from '@/lib/facebook-ads'
import { DashboardOverview } from '@/components/dashboard/dashboard-overview'
import { DateRangeSelector } from '@/components/dashboard/date-range-selector'
import { FbTrendChart } from '@/components/dashboard/fb-trend-chart'

type DateRange = '7d' | '30d' | 'all'

function rangToDatePreset(range: DateRange): DatePreset {
  if (range === '7d') return 'last_7d'
  if (range === 'all') return 'maximum'
  return 'last_30d'
}

// ─── Async section: Spend & Leads chart (slow — Facebook API with 6h TTL cache) ─

async function SpendLeadsSection({ dateRange }: { dateRange: DateRange }) {
  try {
    const datePreset = rangToDatePreset(dateRange)
    const [dailyTrend, clientAdConfig] = await Promise.all([
      getClientFbDailyTrendByRange(datePreset),
      getClientAdConfig(),
    ])

    const isConfigured = !!clientAdConfig?.adAccountId
    if (!isConfigured) return null

    const trendData = dailyTrend ? buildTrendData(dailyTrend) : []
    // leadsEnabled will be wired from DB once leadsChartEnabled migration is applied
    const leadsEnabled = false

    return <FbTrendChart data={trendData} leadsEnabled={leadsEnabled} />
  } catch {
    return null
  }
}

function SpendLeadsSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 w-40 bg-slate-200 rounded" />
      <div className="h-[300px] bg-slate-100 rounded-2xl" />
    </div>
  )
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const resolvedParams = await searchParams
  const rawRange = resolvedParams?.range
  const dateRange: DateRange =
    rawRange === '7d' || rawRange === '30d' || rawRange === 'all'
      ? rawRange
      : '30d'

  const [milestones, chatSettings, client, userName, documents, activities] = await Promise.all([
    getMilestones(),
    getChatSettings(),
    getClientDashboardProfile(),
    getCurrentUserName(),
    getClientRecentDocuments(),
    getRecentActivities(),
  ])

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
    <div className="space-y-10 pb-16">
      <DashboardOverview
        milestones={serializedMilestones}
        chatSettings={{
          whatsappNumber: chatSettings?.whatsappNumber,
          telegramUsername: chatSettings?.telegramUsername,
        }}
        clientName={userName || 'Client'}
        companyName={client?.companyName || 'Company'}
        documents={serializedDocuments}
        activities={serializedActivities}
      />

      {/* Ad Performance section — CHART-05/CHART-06 fix */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-2xl text-slate-900">Ad Performance</h3>
          <Suspense>
            <DateRangeSelector />
          </Suspense>
        </div>
        <Suspense fallback={<SpendLeadsSkeleton />}>
          <SpendLeadsSection dateRange={dateRange} />
        </Suspense>
      </div>
    </div>
  )
}
