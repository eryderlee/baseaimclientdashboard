import { Text, Link, Button } from '@react-email/components'
import { EmailLayout } from './components/email-layout'

interface PasswordResetEmailProps {
  resetUrl: string
  expiresInMinutes: number
}

/**
 * Password reset email template
 * Sent when user requests password reset
 * Contains secure tokenized link with expiry
 */
export function PasswordResetEmail({
  resetUrl,
  expiresInMinutes,
}: PasswordResetEmailProps) {
  return (
    <EmailLayout previewText="Reset your password">
      <Text style={headingStyle}>Reset your password</Text>

      <Text style={textStyle}>
        You recently requested to reset your password for your BaseAim account.
        Click the button below to reset it.
      </Text>

      <Button href={resetUrl} style={buttonStyle}>
        Reset Password
      </Button>

      <Text style={textStyle}>
        This link will expire in <strong>{expiresInMinutes} minutes</strong>.
      </Text>

      <Text style={warningTextStyle}>
        If you didn't request a password reset, you can safely ignore this email.
        Your password will remain unchanged.
      </Text>
    </EmailLayout>
  )
}

// Inline styles for email compatibility
const headingStyle = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#000000',
  margin: '0 0 16px',
}

const textStyle = {
  fontSize: '16px',
  color: '#333333',
  lineHeight: '24px',
  margin: '0 0 16px',
}

const buttonStyle = {
  backgroundColor: '#000000',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: '16px',
  display: 'inline-block',
  margin: '8px 0 24px',
}

const warningTextStyle = {
  fontSize: '14px',
  color: '#666666',
  lineHeight: '20px',
  margin: '24px 0 0',
}
