import { resend } from '@/lib/resend'
import { render } from '@react-email/render'
import { ReactElement } from 'react'
import { WelcomeEmail } from '@/emails/welcome-email'
import { PasswordResetEmail } from '@/emails/password-reset'

interface SendEmailParams {
  to: string
  subject: string
  react: ReactElement
  from?: string
}

interface SendEmailResult {
  success: boolean
  emailId?: string
  error?: string
}

/**
 * Send email using Resend API
 * Converts React component to HTML and sends via Resend
 * Returns result object with success status
 * Never throws - email failures should not crash calling code
 */
export async function sendEmail({
  to,
  subject,
  react,
  from = process.env.RESEND_FROM_EMAIL || 'BaseAim <no-reply@baseaim.com>',
}: SendEmailParams): Promise<SendEmailResult> {
  try {
    // Convert React component to HTML string
    const html = await render(react)

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    })

    if (error) {
      console.error('Email send error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, emailId: data?.id }
  } catch (error) {
    console.error('Email send exception:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

interface WelcomeEmailParams {
  clientName: string
  email: string
  temporaryPassword: string
}

/**
 * Send welcome email to newly created client
 * Contains login credentials and dashboard link
 */
export async function sendWelcomeEmail({
  clientName,
  email,
  temporaryPassword,
}: WelcomeEmailParams): Promise<SendEmailResult> {
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`

  return sendEmail({
    to: email,
    subject: 'Welcome to BaseAim - Your Account is Ready',
    react: WelcomeEmail({
      clientName,
      email,
      temporaryPassword,
      loginUrl,
    }),
  })
}

interface PasswordResetEmailParams {
  email: string
  resetUrl: string
}

/**
 * Send password reset email with secure tokenized link
 * Link expires in 60 minutes
 */
export async function sendPasswordResetEmail({
  email,
  resetUrl,
}: PasswordResetEmailParams): Promise<SendEmailResult> {
  return sendEmail({
    to: email,
    subject: 'Reset Your Password - BaseAim',
    react: PasswordResetEmail({
      resetUrl,
      expiresInMinutes: 60,
    }),
  })
}
