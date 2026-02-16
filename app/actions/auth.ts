'use server'

import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'
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
