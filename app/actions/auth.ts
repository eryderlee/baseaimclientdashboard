'use server'

import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail, sendMagicLinkEmail } from '@/lib/email'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const requestResetSchema = z.object({
  email: z.string().email('Invalid email address'),
})

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

interface ActionResult {
  success?: boolean
  error?: string
  message?: string
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

/**
 * Change password for the currently logged-in user
 * Requires current password verification
 */
export async function changePassword(
  prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { error: 'Not authenticated' }
    }

    const result = changePasswordSchema.safeParse({
      currentPassword: formData.get('currentPassword'),
      newPassword: formData.get('newPassword'),
      confirmPassword: formData.get('confirmPassword'),
    })

    if (!result.success) {
      return { error: result.error.issues[0].message }
    }

    const { currentPassword, newPassword } = result.data

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    })

    if (!user?.password) {
      return { error: 'User not found' }
    }

    const isValid = await bcrypt.compare(currentPassword, user.password)
    if (!isValid) {
      return { error: 'Current password is incorrect' }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    })

    return { success: true, message: 'Password updated successfully' }
  } catch (error) {
    console.error('Change password error:', error)
    return { error: 'Failed to update password. Please try again.' }
  }
}

const setPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

/**
 * Set a new password for the currently logged-in user — no current password required.
 * Used when the client arrives via a magic link sent by the admin.
 */
export async function setPassword(
  prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { error: 'Not authenticated' }
    }

    const result = setPasswordSchema.safeParse({
      newPassword: formData.get('newPassword'),
      confirmPassword: formData.get('confirmPassword'),
    })

    if (!result.success) {
      return { error: result.error.issues[0].message }
    }

    const hashedPassword = await bcrypt.hash(result.data.newPassword, 10)
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    })

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    })

    return { success: true, message: user?.email ?? '' }
  } catch (error) {
    console.error('Set password error:', error)
    return { error: 'Failed to set password. Please try again.' }
  }
}

/**
 * Request password reset
 * Sends email with secure reset link
 * Returns success even if email not found (prevents enumeration)
 */
export async function requestPasswordReset(
  prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    // Validate email
    const result = requestResetSchema.safeParse({
      email: formData.get('email'),
    })

    if (!result.success) {
      return { error: result.error.issues[0].message }
    }

    const { email } = result.data

    // Look up user by email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    // If user not found, still return success (prevent email enumeration)
    if (!user) {
      return {
        success: true,
        message:
          'If an account exists with that email, a reset link has been sent.',
      }
    }

    // Delete any existing tokens for this email (one active token at a time)
    await prisma.passwordResetToken.deleteMany({
      where: { email },
    })

    // Generate secure token
    const token = crypto.randomUUID()

    // Create token with 60-minute expiry
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 60)

    await prisma.passwordResetToken.create({
      data: {
        email,
        token,
        expiresAt,
      },
    })

    // Send reset email
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password/${token}`

    await sendPasswordResetEmail({
      email,
      resetUrl,
    })

    return {
      success: true,
      message:
        'If an account exists with that email, a reset link has been sent.',
    }
  } catch (error) {
    console.error('Password reset request error:', error)
    return {
      error: 'Failed to process password reset request. Please try again.',
    }
  }
}

/**
 * Reset password using token
 * Validates token, updates password, deletes token
 */
export async function resetPassword(
  token: string,
  prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    // Validate password fields
    const result = resetPasswordSchema.safeParse({
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
    })

    if (!result.success) {
      return { error: result.error.issues[0].message }
    }

    const { password } = result.data

    // Find token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    })

    // Check if token exists and isn't expired
    if (!resetToken || resetToken.expiresAt < new Date()) {
      return { error: 'Invalid or expired reset link' }
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: resetToken.email },
    })

    if (!user) {
      return { error: 'User not found' }
    }

    // Hash new password BEFORE transaction
    const hashedPassword = await bcrypt.hash(password, 10)

    // Update password and delete token in transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.delete({
        where: { token },
      }),
    ])

    return { success: true }
  } catch (error) {
    console.error('Password reset error:', error)
    return { error: 'Failed to reset password. Please try again.' }
  }
}

/**
 * Resend a magic link to an existing user
 * Called from the expired-token page
 * Returns success regardless of whether email exists (prevent enumeration)
 *
 * Note: Does NOT delete existing tokens before creating — avoids wiping
 * a pending password-reset token that may be in the same table.
 */
export async function resendMagicLink(
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    })

    // Don't reveal whether email exists
    if (!user) return { success: true }

    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000) // 72 hours

    await prisma.passwordResetToken.create({
      data: { email, token, expiresAt },
    })

    const magicLinkUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/magic-link/${token}`

    await sendMagicLinkEmail({
      clientName: user.name || 'there',
      email,
      magicLinkUrl,
    })

    return { success: true }
  } catch (error) {
    console.error('resendMagicLink error:', error)
    return { success: false, error: 'Failed to send link. Please try again.' }
  }
}
