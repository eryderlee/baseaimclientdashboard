import { differenceInDays } from 'date-fns'
import { MilestoneStatus } from '@prisma/client'

export interface RiskIndicators {
  isAtRisk: boolean
  riskLevel: 'none' | 'low' | 'medium' | 'high'
  reasons: string[]
}

interface MilestoneForRisk {
  status: MilestoneStatus
  dueDate: Date | null
  startDate: Date | null
  progress: number
}

interface ClientForRisk {
  milestones: MilestoneForRisk[]
}

export function detectClientRisk(client: ClientForRisk): RiskIndicators {
  const now = new Date()
  const reasons: string[] = []

  // Count overdue milestones (non-COMPLETED with dueDate in the past)
  const overdueMilestones = client.milestones.filter(
    (m) => m.status !== 'COMPLETED' && m.dueDate && m.dueDate < now
  )
  const overdueCount = overdueMilestones.length

  // Count stalled milestones (IN_PROGRESS for 14+ days with progress < 50)
  const stalledMilestones = client.milestones.filter((m) => {
    if (m.status !== 'IN_PROGRESS' || !m.startDate) {
      return false
    }
    const daysSinceStart = differenceInDays(now, m.startDate)
    return daysSinceStart >= 14 && m.progress < 50
  })
  const stalledCount = stalledMilestones.length

  // Add reasons
  if (overdueCount > 0) {
    reasons.push(`${overdueCount} overdue milestone(s)`)
  }
  if (stalledCount > 0) {
    reasons.push(`${stalledCount} stalled milestone(s)`)
  }

  // Determine risk level
  let riskLevel: 'none' | 'low' | 'medium' | 'high' = 'none'

  if (overdueCount === 0 && stalledCount === 0) {
    riskLevel = 'none'
  } else if (overdueCount === 0 && stalledCount > 0) {
    // Stalled alone = low risk
    riskLevel = 'low'
  } else if (overdueCount === 1 && stalledCount === 0) {
    // 1 overdue = medium risk
    riskLevel = 'medium'
  } else {
    // 2+ overdue OR stalled + overdue = high risk
    riskLevel = 'high'
  }

  return {
    isAtRisk: riskLevel !== 'none',
    riskLevel,
    reasons,
  }
}
