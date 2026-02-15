'use server'

import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import { createClientSchema, updateClientSchema } from '@/lib/schemas/client'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { STANDARD_MILESTONES } from '@/prisma/seed-milestones'

/**
 * Create a new client with User account, Client profile, and standard milestones
 * Uses atomic transaction to ensure all-or-nothing creation
 */
export async function createClient(formData: FormData) {
  // Verify admin role
  const { userRole } = await verifySession()
  if (userRole !== 'ADMIN') {
    return { error: 'Unauthorized' }
  }

  // Extract and validate form data
  const rawData = {
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    companyName: formData.get('companyName'),
    industry: formData.get('industry') || undefined,
    website: formData.get('website') || undefined,
    phone: formData.get('phone') || undefined,
    address: formData.get('address') || undefined,
  }

  const validatedFields = createClientSchema.safeParse(rawData)

  if (!validatedFields.success) {
    return {
      error: 'Validation failed',
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const { name, email, password, companyName, industry, website, phone, address } = validatedFields.data

  // Check for existing user
  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    return { error: 'A user with this email already exists' }
  }

  // Hash password BEFORE transaction (avoid slow CPU-bound ops inside tx)
  const hashedPassword = await bcrypt.hash(password, 10)

  try {
    // Atomic transaction: User + Client + 6 Milestones
    await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: 'CLIENT',
        },
      })

      // Create client profile
      const client = await tx.client.create({
        data: {
          userId: user.id,
          companyName,
          industry,
          website,
          phone,
          address,
          isActive: true,
        },
      })

      // Create standard 6 milestones
      await Promise.all(
        STANDARD_MILESTONES.map((milestone) =>
          tx.milestone.create({
            data: {
              clientId: client.id,
              title: milestone.title,
              description: milestone.description,
              order: milestone.order,
              status: milestone.status,
              progress: milestone.progress,
              dueDate: milestone.dueDate,
              notes: milestone.notes,
            },
          })
        )
      )
    })

    // Revalidate admin page for fresh data
    revalidatePath('/admin')

    // Return success - client-side will handle redirect
    return { success: true }
  } catch (error) {
    console.error('Failed to create client:', error)
    return { error: 'Failed to create client. Please try again.' }
  }
}

/**
 * Update an existing client's details
 * Updates both Client and User records in a transaction
 */
export async function updateClient(clientId: string, formData: FormData) {
  // Verify admin role
  const { userRole } = await verifySession()
  if (userRole !== 'ADMIN') {
    return { error: 'Unauthorized' }
  }

  // Extract and validate form data
  const rawData = {
    name: formData.get('name'),
    companyName: formData.get('companyName'),
    industry: formData.get('industry') || undefined,
    website: formData.get('website') || undefined,
    phone: formData.get('phone') || undefined,
    address: formData.get('address') || undefined,
  }

  const validatedFields = updateClientSchema.safeParse(rawData)

  if (!validatedFields.success) {
    return {
      error: 'Validation failed',
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const { name, companyName, industry, website, phone, address } = validatedFields.data

  try {
    // Update client and user in transaction
    await prisma.$transaction(async (tx) => {
      // Update client details
      const client = await tx.client.update({
        where: { id: clientId },
        data: {
          companyName,
          industry,
          website,
          phone,
          address,
        },
      })

      // Update user name
      await tx.user.update({
        where: { id: client.userId },
        data: { name },
      })
    })

    // Revalidate pages
    revalidatePath('/admin')
    revalidatePath(`/admin/clients/${clientId}/edit`)

    return { success: true }
  } catch (error) {
    console.error('Failed to update client:', error)
    return { error: 'Failed to update client. Please try again.' }
  }
}

/**
 * Toggle a client's active status
 * Flips isActive boolean between true and false
 */
export async function toggleClientStatus(clientId: string) {
  // Verify admin role
  const { userRole } = await verifySession()
  if (userRole !== 'ADMIN') {
    return { error: 'Unauthorized' }
  }

  try {
    // Fetch current status
    const currentClient = await prisma.client.findUnique({
      where: { id: clientId },
      select: { isActive: true },
    })

    if (!currentClient) {
      return { error: 'Client not found' }
    }

    // Toggle status
    const updatedClient = await prisma.client.update({
      where: { id: clientId },
      data: { isActive: !currentClient.isActive },
    })

    // Revalidate admin page
    revalidatePath('/admin')

    return { success: true, isActive: updatedClient.isActive }
  } catch (error) {
    console.error('Failed to toggle client status:', error)
    return { error: 'Failed to toggle client status. Please try again.' }
  }
}
