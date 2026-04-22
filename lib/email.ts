import { resend } from '@/lib/resend'
import { render } from '@react-email/render'
import { ReactElement } from 'react'
import { WelcomeEmail } from '@/emails/welcome-email'
import { PasswordResetEmail } from '@/emails/password-reset'
import { InvoiceCreatedEmail } from '@/emails/invoice-created'
import { PaymentConfirmationEmail } from '@/emails/payment-confirmation'
import { DocumentUploadedEmail } from '@/emails/document-uploaded'
import { CardSetupEmail } from '@/emails/card-setup-email'
import { MagicLinkEmail } from '@/emails/magic-link-email'

interface SendEmailParams {
  to: string | string[]
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
  subject?: string
}

/**
 * Send welcome email to newly created client
 * Contains login credentials and dashboard link
 */
export async function sendWelcomeEmail({
  clientName,
  email,
  temporaryPassword,
  subject = 'Welcome to BaseAim - Your Account is Ready',
}: WelcomeEmailParams): Promise<SendEmailResult> {
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`

  return sendEmail({
    to: email,
    subject,
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

interface InvoiceCreatedEmailParams {
  clientName: string
  email: string
  invoiceNumber: string
  amount: number
  currency: string
  dueDate: string
  viewUrl: string
}

/**
 * Send invoice created notification
 * Triggered by Phase 10 (Stripe) when invoice is generated
 */
export async function sendInvoiceCreatedEmail({
  clientName,
  email,
  invoiceNumber,
  amount,
  currency,
  dueDate,
  viewUrl,
}: InvoiceCreatedEmailParams): Promise<SendEmailResult> {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount)

  return sendEmail({
    to: email,
    subject: `Invoice ${invoiceNumber} - ${formattedAmount}`,
    react: InvoiceCreatedEmail({
      clientName,
      invoiceNumber,
      amount,
      currency,
      dueDate,
      viewUrl,
    }),
  })
}

interface PaymentConfirmationEmailParams {
  clientName: string
  email: string
  invoiceNumber: string
  amount: number
  currency: string
  paidDate: string
}

/**
 * Send payment confirmation
 * Triggered by Phase 10 (Stripe webhook) when payment received
 */
export async function sendPaymentConfirmationEmail({
  clientName,
  email,
  invoiceNumber,
  amount,
  currency,
  paidDate,
}: PaymentConfirmationEmailParams): Promise<SendEmailResult> {
  return sendEmail({
    to: email,
    subject: `Payment Confirmed - Invoice ${invoiceNumber}`,
    react: PaymentConfirmationEmail({
      clientName,
      invoiceNumber,
      amount,
      currency,
      paidDate,
    }),
  })
}

interface DocumentUploadedEmailParams {
  clientName: string
  email: string
  documentName: string
  uploadedBy: string
  viewUrl: string
}

interface CardSetupEmailParams {
  clientName: string
  email: string
  setupUrl: string
}

/**
 * Send card setup request email to client
 * Triggered by admin when client needs to add a payment method before retainer can start
 */
export async function sendCardSetupEmail({
  clientName,
  email,
  setupUrl,
}: CardSetupEmailParams): Promise<SendEmailResult> {
  return sendEmail({
    to: email,
    subject: 'Action Required: Add Your Payment Method — BaseAim',
    react: CardSetupEmail({ clientName, setupUrl }),
  })
}

/**
 * Send document uploaded notification
 * Triggered by Phase 9 (Google Drive) when admin uploads document
 */
export async function sendDocumentUploadedEmail({
  clientName,
  email,
  documentName,
  uploadedBy,
  viewUrl,
}: DocumentUploadedEmailParams): Promise<SendEmailResult> {
  return sendEmail({
    to: email,
    subject: `New Document: ${documentName}`,
    react: DocumentUploadedEmail({
      clientName,
      documentName,
      uploadedBy,
      viewUrl,
    }),
  })
}

interface MagicLinkEmailParams {
  clientName: string
  email: string
  magicLinkUrl: string
}

/**
 * Send magic link welcome email to survey-created clients
 * No credentials — single button to access dashboard
 * Link expires in 72 hours
 */
export async function sendMagicLinkEmail({
  clientName,
  email,
  magicLinkUrl,
}: MagicLinkEmailParams): Promise<SendEmailResult> {
  return sendEmail({
    to: email,
    subject: "You're in — access your BaseAim dashboard",
    react: MagicLinkEmail({ clientName, magicLinkUrl }),
  })
}

interface TestLeadEmailParams {
  to: string | string[]
  companyName: string
}

/**
 * Send a test lead notification to verify email destination is working
 */
export async function sendTestLeadEmail({
  to,
  companyName,
}: TestLeadEmailParams): Promise<SendEmailResult> {
  const { TestLeadEmail } = await import('@/emails/test-lead-email')
  return sendEmail({
    to,
    subject: `[TEST] New lead for ${companyName}`,
    react: TestLeadEmail({ companyName }),
  })
}
