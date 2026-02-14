import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
