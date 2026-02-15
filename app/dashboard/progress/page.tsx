import { getMilestones } from "@/lib/dal"
import { ProgressView } from "@/components/dashboard/progress-view"

export default async function ProgressPage() {
  const milestones = await getMilestones()

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

  return <ProgressView milestones={serializedMilestones} />
}
