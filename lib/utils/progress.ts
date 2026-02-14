import { differenceInDays } from 'date-fns'
import { MilestoneStatus } from '@prisma/client'

export function calculateMilestoneProgress(
  status: MilestoneStatus,
  startDate: Date | null,
  dueDate: Date | null
): number {
  if (status === 'COMPLETED') {
    return 100
  }

  if (status === 'NOT_STARTED' || status === 'BLOCKED') {
    return 0
  }

  // IN_PROGRESS status
  if (startDate && dueDate) {
    const now = new Date()
    const totalDays = differenceInDays(dueDate, startDate)
    const elapsedDays = differenceInDays(now, startDate)

    if (totalDays <= 0) {
      // Due date is before or same as start date
      return 50
    }

    const progress = (elapsedDays / totalDays) * 100

    // Clamp between 0 and 99 (never 100 until explicitly marked complete)
    return Math.min(Math.max(Math.round(progress), 0), 99)
  }

  // IN_PROGRESS without dates: midpoint estimate
  return 50
}

export function calculateOverallProgress(
  milestones: Array<{ progress: number }>
): number {
  if (milestones.length === 0) {
    return 0
  }

  const totalProgress = milestones.reduce((sum, m) => sum + m.progress, 0)
  return Math.round(totalProgress / milestones.length)
}
