import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { verifySession, getChatSettings } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import { DashboardOverview } from '@/components/dashboard/dashboard-overview'
import { Button } from '@/components/ui/button'

export default async function AdminPreviewPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { userRole } = await verifySession()
  if (userRole !== 'ADMIN') {
    redirect('/dashboard')
  }

  const { clientId } = await params

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      user: { select: { name: true, email: true } },
      milestones: { orderBy: { order: 'asc' } },
    },
  })

  if (!client) {
    redirect('/admin')
  }

  const chatSettings = await getChatSettings()

  const serializedMilestones = client.milestones.map((m) => ({
    id: m.id,
    clientId: m.clientId,
    title: m.title,
    description: m.description,
    status: m.status,
    progress: m.progress,
    startDate: m.startDate ? m.startDate.toISOString() : null,
    dueDate: m.dueDate ? m.dueDate.toISOString() : null,
    completedAt: m.completedAt ? m.completedAt.toISOString() : null,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    order: m.order,
    notes: Array.isArray(m.notes)
      ? m.notes.map((note: any) => ({
          id: note.id || crypto.randomUUID(),
          content: note.content || String(note),
          createdAt: note.createdAt || new Date().toISOString(),
          createdBy: note.createdBy || 'Admin',
        }))
      : [],
  }))

  return (
    <div className="relative min-h-screen bg-transparent">
      {/* Admin preview banner */}
      <div className="sticky top-0 z-50 flex items-center justify-between bg-amber-400 px-4 py-2 text-sm font-medium text-amber-900">
        <div className="flex items-center gap-3">
          <span>Admin Preview — viewing as {client.companyName} ({client.user.email})</span>
        </div>
        <Button variant="ghost" size="sm" className="text-amber-900 hover:bg-amber-500" asChild>
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Admin
          </Link>
        </Button>
      </div>

      <div className="w-full px-4 py-8 md:px-8 lg:px-12 lg:py-12">
        <DashboardOverview
          milestones={serializedMilestones}
          chatSettings={{
            whatsappNumber: chatSettings?.whatsappNumber,
            telegramUsername: chatSettings?.telegramUsername,
          }}
          clientName={client.user.name || 'Client'}
          companyName={client.companyName}
          fbDailyData={null}
          isFbConfigured={false}
          documents={[]}
          activities={[]}
        />
      </div>
    </div>
  )
}
