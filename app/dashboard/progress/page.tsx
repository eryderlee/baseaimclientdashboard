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
  }))

  return <ProgressView milestones={serializedMilestones} />
}
