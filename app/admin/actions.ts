'use server'

import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import { createClientSchema, updateClientSchema } from '@/lib/schemas/client'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { STANDARD_MILESTONES } from '@/prisma/seed-milestones'
import { sendWelcomeEmail, sendTestLeadEmail, sendClientActionEmail } from '@/lib/email'
import type { ClientActionType } from '@/emails/client-action-email'
import { createClientDriveFolder } from '@/lib/google-drive'
import { z } from 'zod'

const resetPasswordSchema = z.object({
  clientId: z.string().cuid(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})

const toggleClientStatusSchema = z.object({
  clientId: z.string().cuid(),
})

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
    confirmPassword: formData.get('confirmPassword'),
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
    const client = await prisma.$transaction(async (tx) => {
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
      const newClient = await tx.client.create({
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
              clientId: newClient.id,
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

      return newClient
    })

    // Create Google Drive folder and persist ID before returning
    // Awaited here (not fire-and-forget) to prevent race condition where admin
    // uploads a document before the async folder creation completes, causing
    // the lazy-init in the upload route to create a second duplicate folder.
    try {
      const driveFolderId = await createClientDriveFolder(companyName, client.id)
      await prisma.client.update({
        where: { id: client.id },
        data: { driveFolderId },
      })
    } catch (err) {
      console.error('Drive folder creation failed:', err)
      // Non-fatal — client exists, folder can be created later via migration script
    }

    // Fire and forget - send welcome email (don't block client creation on email delivery)
    sendWelcomeEmail({
      clientName: name,
      email,
      temporaryPassword: password
    }).catch((err) => console.error('Welcome email failed:', err))

    // Fire and forget - welcome notification in dashboard
    prisma.notification.create({
      data: {
        userId: client.userId,
        title: 'Welcome to BaseAim',
        message: 'Your client dashboard is ready. Log in to track your project progress.',
        type: 'welcome',
        link: '/dashboard',
      },
    }).catch((err) => console.error('Welcome notification failed:', err))

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
    adAccountId: formData.get('adAccountId') || undefined,
    leadsChartEnabled: formData.get('leadsChartEnabled') === 'true',
    baseaimDomainEnabled: formData.get('baseaimDomainEnabled') === 'true',
  }

  const validatedFields = updateClientSchema.safeParse(rawData)

  if (!validatedFields.success) {
    return {
      error: 'Validation failed',
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const { name, companyName, industry, website, phone, address, adAccountId, leadsChartEnabled, baseaimDomainEnabled } = validatedFields.data

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
          adAccountId: adAccountId || null,
          leadsChartEnabled: leadsChartEnabled ?? false,
          baseaimDomainEnabled: baseaimDomainEnabled ?? false,
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

  // Validate input
  let validId: string
  try {
    const parsed = toggleClientStatusSchema.parse({ clientId })
    validId = parsed.clientId
  } catch {
    return { error: 'Invalid client ID' }
  }

  try {
    // Fetch current status
    const currentClient = await prisma.client.findUnique({
      where: { id: validId },
      select: { isActive: true },
    })

    if (!currentClient) {
      return { error: 'Client not found' }
    }

    // Toggle status
    const updatedClient = await prisma.client.update({
      where: { id: validId },
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

/**
 * Reset a client's password
 * Hashes password with bcrypt before updating user record
 */
export async function resetClientPassword(clientId: string, newPassword: string) {
  // Verify admin role
  const { userRole } = await verifySession()
  if (userRole !== 'ADMIN') {
    return { error: 'Unauthorized' }
  }

  // Validate inputs with Zod
  let validClientId: string
  let validPassword: string
  try {
    const parsed = resetPasswordSchema.parse({ clientId, newPassword })
    validClientId = parsed.clientId
    validPassword = parsed.newPassword
  } catch {
    return { error: 'Invalid input' }
  }

  try {
    // Get client and user details for email
    const client = await prisma.client.findUnique({
      where: { id: validClientId },
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    if (!client) {
      return { error: 'Client not found' }
    }

    // Hash password BEFORE updating (avoid slow CPU-bound ops in transaction)
    const hashedPassword = await bcrypt.hash(validPassword, 10)

    // Update user password
    await prisma.user.update({
      where: { id: client.userId },
      data: { password: hashedPassword },
    })

    // Send new credentials email (fire and forget)
    sendWelcomeEmail({
      clientName: client.user.name || client.companyName,
      email: client.user.email,
      temporaryPassword: validPassword,
      subject: 'Your BaseAim Password Has Been Updated',
    }).catch((err) => console.error('Password reset email failed:', err))

    return { success: true }
  } catch (error) {
    console.error('Failed to reset password:', error)
    return { error: 'Failed to reset password. Please try again.' }
  }
}

export interface LeadDestinations {
  email?: {
    enabled: boolean
    address: string
    cc?: string
    tested?: boolean
    testedAt?: string
  }
  sms?: {
    enabled: boolean
    phone?: string
  }
  crmWebhook?: {
    enabled: boolean
    url?: string
  }
  custom?: Array<{
    id: string
    name: string
    enabled: boolean
    url?: string
  }>
}

/**
 * Save lead destination configuration for a client
 */
export async function updateLeadDestinations(
  clientId: string,
  destinations: LeadDestinations
): Promise<{ success: boolean; error?: string }> {
  const { userRole } = await verifySession()
  if (userRole !== 'ADMIN') return { success: false, error: 'Unauthorized' }

  try {
    await prisma.client.update({
      where: { id: clientId },
      data: { leadDestinations: destinations as object },
    })
    revalidatePath(`/admin/clients/${clientId}/edit`)
    return { success: true }
  } catch (error) {
    console.error('updateLeadDestinations failed:', error)
    return { success: false, error: 'Failed to save. Please try again.' }
  }
}

/**
 * Send a test lead email to the configured email destination
 */
export async function sendTestLead(
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  const { userRole } = await verifySession()
  if (userRole !== 'ADMIN') return { success: false, error: 'Unauthorized' }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { companyName: true, leadDestinations: true },
  })

  if (!client) return { success: false, error: 'Client not found' }

  const destinations = client.leadDestinations as LeadDestinations | null
  const emailDest = destinations?.email

  if (!emailDest?.enabled || !emailDest.address) {
    return { success: false, error: 'Email destination is not configured or disabled' }
  }

  const to = emailDest.cc
    ? [emailDest.address, emailDest.cc]
    : emailDest.address

  const result = await sendTestLeadEmail({ to, companyName: client.companyName })

  if (!result.success) {
    return { success: false, error: 'Failed to send test email' }
  }

  // Mark as tested
  const updated: LeadDestinations = {
    ...destinations,
    email: { ...emailDest, tested: true, testedAt: new Date().toISOString() },
  }

  await prisma.client.update({
    where: { id: clientId },
    data: { leadDestinations: updated as object },
  })

  revalidatePath(`/admin/clients/${clientId}/edit`)
  return { success: true }
}

/**
 * Send a magic link email to a client for a specific action.
 * action: 'dashboard' | 'documents' | 'password'
 * documentRequest: optional message describing what to upload (documents action only)
 */
export async function sendClientActionLink(
  clientId: string,
  action: ClientActionType,
  documentRequest?: string
): Promise<{ success: boolean; error?: string }> {
  const { userRole } = await verifySession()
  if (userRole !== 'ADMIN') return { success: false, error: 'Unauthorized' }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { user: { select: { email: true, name: true } } },
  })

  if (!client) return { success: false, error: 'Client not found' }

  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  await prisma.passwordResetToken.create({
    data: { email: client.user.email, token, expiresAt },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirectMap: Record<ClientActionType, string> = {
    dashboard: '/dashboard',
    documents: '/dashboard/documents',
    password: '/dashboard',
  }
  const magicLinkUrl = `${appUrl}/auth/magic-link/${token}?then=${redirectMap[action]}`

  const result = await sendClientActionEmail({
    clientName: client.user.name || client.companyName,
    email: client.user.email,
    magicLinkUrl,
    action,
    documentRequest,
  })

  if (!result.success) {
    return { success: false, error: 'Failed to send email' }
  }

  return { success: true }
}
