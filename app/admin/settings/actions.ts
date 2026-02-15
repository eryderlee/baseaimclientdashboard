'use server'

import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import { chatSettingsSchema } from '@/lib/schemas/settings'
import { revalidatePath } from 'next/cache'

/**
 * Update chat settings (WhatsApp and Telegram contact details)
 * Uses upsert pattern to create settings if they don't exist
 */
export async function updateChatSettings(formData: FormData) {
  // Verify admin role
  const { userRole } = await verifySession()
  if (userRole !== 'ADMIN') {
    return { error: 'Unauthorized' }
  }

  // Extract form data
  const rawData = {
    whatsappNumber: formData.get('whatsappNumber') || '',
    telegramUsername: formData.get('telegramUsername') || '',
  }

  // Validate with Zod schema
  const validatedFields = chatSettingsSchema.safeParse(rawData)

  if (!validatedFields.success) {
    return {
      error: 'Validation failed',
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const { whatsappNumber, telegramUsername } = validatedFields.data

  try {
    // Get existing settings to determine create vs update
    const existingSettings = await prisma.settings.findFirst()

    if (existingSettings) {
      // Update existing settings
      await prisma.settings.update({
        where: { id: existingSettings.id },
        data: {
          whatsappNumber: whatsappNumber || null,
          telegramUsername: telegramUsername || null,
        },
      })
    } else {
      // Create new settings
      await prisma.settings.create({
        data: {
          whatsappNumber: whatsappNumber || null,
          telegramUsername: telegramUsername || null,
        },
      })
    }

    // Revalidate paths
    revalidatePath('/admin/settings')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    console.error('Failed to update settings:', error)
    return { error: 'Failed to update settings. Please try again.' }
  }
}
