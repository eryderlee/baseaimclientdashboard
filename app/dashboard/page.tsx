import { getMilestones, getChatSettings } from "@/lib/dal"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardOverview } from "@/components/dashboard/dashboard-overview"

export default async function DashboardPage() {
  const milestones = await getMilestones()
  const chatSettings = await getChatSettings()
  const session = await auth()

  // Fetch client profile for company name
  const client = await prisma.client.findUnique({
    where: { userId: session!.user!.id },
    select: { companyName: true }
  })

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

  return (
    <DashboardOverview
      milestones={serializedMilestones}
      chatSettings={{
        whatsappNumber: chatSettings?.whatsappNumber,
        telegramUsername: chatSettings?.telegramUsername
      }}
      clientName={session?.user?.name || 'Client'}
      companyName={client?.companyName || 'Company'}
    />
  )
}
