import { Resend } from 'resend'

// Initialize Resend client with API key from environment
// If no API key is provided, log warning but don't crash (allows dev without key)
const apiKey = process.env.RESEND_API_KEY

if (!apiKey) {
  console.warn('Warning: RESEND_API_KEY not set. Email functionality will not work.')
}

export const resend = new Resend(apiKey || 'placeholder-key-for-dev')
