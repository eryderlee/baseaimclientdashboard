import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateOverallProgress } from '@/lib/utils/progress'
import { detectClientRisk } from '@/lib/utils/risk-detection'

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
