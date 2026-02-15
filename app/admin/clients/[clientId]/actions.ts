'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import { calculateMilestoneProgress } from '@/lib/utils/progress'

const MilestoneUpdateSchema = z.object({
  milestones: z.array(
    z.object({
      id: z.string(),
      status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED']),
      dueDate: z.string().nullable(),
      newNote: z.string().optional(),
    })
  ),
})

export async function updateMilestones(clientId: string, rawData: unknown) {
  // 1. Verify admin role
  try {
    const { userRole } = await verifySession()
    if (userRole !== 'ADMIN') {
      return { error: 'Unauthorized' }
    }
  } catch (error) {
    return { error: 'Unauthorized' }
  }

  // 2. Validate input data
  const validation = MilestoneUpdateSchema.safeParse(rawData)
  if (!validation.success) {
    return { error: 'Invalid data', issues: validation.error.issues }
  }

  const { milestones } = validation.data

  try {
    // 3. Fetch current milestones to determine status changes and read existing notes
    const currentMilestones = await prisma.milestone.findMany({
      where: { clientId },
      select: {
        id: true,
        status: true,
        startDate: true,
        notes: true,
      },
    })

    const currentMilestonesMap = new Map(
      currentMilestones.map((m) => [m.id, m])
    )

    // 4-6. Build transaction updates
    const updates = milestones.map((milestone) => {
      const current = currentMilestonesMap.get(milestone.id)
      if (!current) {
        throw new Error(`Milestone ${milestone.id} not found`)
      }

      const updateData: any = {
        status: milestone.status,
        dueDate: milestone.dueDate ? new Date(milestone.dueDate) : null,
      }

      // Handle status transitions for dates
      if (milestone.status === 'IN_PROGRESS' && current.status !== 'IN_PROGRESS') {
        // Transitioning TO IN_PROGRESS
        if (!current.startDate) {
          updateData.startDate = new Date()
        }
      }

      if (milestone.status === 'NOT_STARTED') {
        // Transitioning TO NOT_STARTED
        updateData.startDate = null
        updateData.completedAt = null
      }

      if (milestone.status === 'COMPLETED' && current.status !== 'COMPLETED') {
        // Transitioning TO COMPLETED
        updateData.completedAt = new Date()
      }

      // Handle notes - append to existing JSON array with proper structure
      if (milestone.newNote && milestone.newNote.trim()) {
        const existingNotes = Array.isArray(current.notes)
          ? current.notes
          : []

        // Create structured note object matching MilestoneNote interface
        const newNoteObject = {
          id: crypto.randomUUID(),
          content: milestone.newNote.trim(),
          createdAt: new Date().toISOString(),
          createdBy: 'Admin', // TODO: Get actual admin user name from session
        }

        updateData.notes = [...existingNotes, newNoteObject]
      }

      // Calculate and store progress
      const progress = calculateMilestoneProgress(
        milestone.status,
        updateData.startDate ?? current.startDate,
        updateData.dueDate
      )
      updateData.progress = progress

      return prisma.milestone.update({
        where: { id: milestone.id },
        data: updateData,
      })
    })

    // Execute transaction
    await prisma.$transaction(updates)

    // 7. Revalidate paths
    revalidatePath('/dashboard/progress')
    revalidatePath(`/admin/clients/${clientId}`)

    // 8. Return success
    return { success: true }
  } catch (error) {
    console.error('Failed to update milestones:', error)
    return { error: 'Failed to update milestones' }
  }
}

/**
 * Update an existing note in a milestone
 */
export async function updateNote(
  clientId: string,
  milestoneId: string,
  noteId: string,
  newContent: string
) {
  // 1. Verify admin role
  try {
    const { userRole } = await verifySession()
    if (userRole !== 'ADMIN') {
      return { error: 'Unauthorized' }
    }
  } catch (error) {
    return { error: 'Unauthorized' }
  }

  // 2. Validate input
  if (!newContent.trim()) {
    return { error: 'Note content cannot be empty' }
  }

  try {
    // 3. Fetch current milestone
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      select: { notes: true, clientId: true },
    })

    if (!milestone) {
      return { error: 'Milestone not found' }
    }

    if (milestone.clientId !== clientId) {
      return { error: 'Milestone does not belong to this client' }
    }

    // 4. Update the specific note in the array
    const notesArray = Array.isArray(milestone.notes) ? milestone.notes : []
    const updatedNotes = notesArray.map((note: any) => {
      if (note.id === noteId) {
        return {
          ...note,
          content: newContent.trim(),
          editedAt: new Date().toISOString(),
        }
      }
      return note
    })

    // 5. Save updated notes array
    await prisma.milestone.update({
      where: { id: milestoneId },
      data: { notes: updatedNotes },
    })

    // 6. Revalidate paths
    revalidatePath('/dashboard/progress')
    revalidatePath(`/admin/clients/${clientId}`)

    return { success: true }
  } catch (error) {
    console.error('Failed to update note:', error)
    return { error: 'Failed to update note' }
  }
}

/**
 * Delete a note from a milestone
 */
export async function deleteNote(
  clientId: string,
  milestoneId: string,
  noteId: string
) {
  // 1. Verify admin role
  try {
    const { userRole } = await verifySession()
    if (userRole !== 'ADMIN') {
      return { error: 'Unauthorized' }
    }
  } catch (error) {
    return { error: 'Unauthorized' }
  }

  try {
    // 2. Fetch current milestone
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      select: { notes: true, clientId: true },
    })

    if (!milestone) {
      return { error: 'Milestone not found' }
    }

    if (milestone.clientId !== clientId) {
      return { error: 'Milestone does not belong to this client' }
    }

    // 3. Filter out the note to delete
    const notesArray = Array.isArray(milestone.notes) ? milestone.notes : []
    const updatedNotes = notesArray.filter((note: any) => note.id !== noteId)

    // 4. Save updated notes array
    await prisma.milestone.update({
      where: { id: milestoneId },
      data: { notes: updatedNotes },
    })

    // 5. Revalidate paths
    revalidatePath('/dashboard/progress')
    revalidatePath(`/admin/clients/${clientId}`)

    return { success: true }
  } catch (error) {
    console.error('Failed to delete note:', error)
    return { error: 'Failed to delete note' }
  }
}
