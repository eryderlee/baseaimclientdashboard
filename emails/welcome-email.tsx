import { Text, Link, Button } from '@react-email/components'
import { EmailLayout } from './components/email-layout'

interface WelcomeEmailProps {
  clientName: string
  email: string
  temporaryPassword: string
  loginUrl: string
}

/**
 * Welcome email template for new clients
 * Sent when admin creates a client account
 * Contains login credentials and dashboard link
 */
export function WelcomeEmail({
  clientName,
  email,
  temporaryPassword,
  loginUrl,
}: WelcomeEmailProps) {
  return (
    <EmailLayout previewText="Welcome to BaseAim - Your account is ready">
      <Text style={headingStyle}>Welcome to BaseAim, {clientName}!</Text>

      <Text style={paragraphStyle}>
        Your client dashboard account has been created. Here are your login
        credentials:
      </Text>

      {/* Credentials box */}
      <div style={credentialsBoxStyle}>
        <div style={credentialRowStyle}>
          <Text style={labelStyle}>Email:</Text>
          <Text style={valueStyle}>{email}</Text>
        </div>
        <div style={credentialRowStyle}>
          <Text style={labelStyle}>Password:</Text>
          <Text style={valueStyle}>{temporaryPassword}</Text>
        </div>
      </div>

      <Text style={warningStyle}>
        Please log in and change your password as soon as possible.
      </Text>

      {/* CTA Button */}
      <div style={buttonContainerStyle}>
        <Link href={loginUrl} style={buttonStyle}>
          Log In to Dashboard
        </Link>
      </div>

      <Text style={footerNoteStyle}>
        If you didn't expect this email, please contact us.
      </Text>
    </EmailLayout>
  )
}

// Export as default for compatibility
export default WelcomeEmail

// Inline styles (email clients don't support Tailwind)
const headingStyle = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#000000',
  marginTop: '0',
  marginBottom: '16px',
}

const paragraphStyle = {
  fontSize: '16px',
  color: '#333333',
  lineHeight: '24px',
  marginTop: '0',
  marginBottom: '16px',
}

const credentialsBoxStyle = {
  backgroundColor: '#f5f5f5',
  padding: '20px',
  borderRadius: '4px',
  marginTop: '16px',
  marginBottom: '16px',
}

const credentialRowStyle = {
  marginBottom: '12px',
}

const labelStyle = {
  fontSize: '14px',
  color: '#666666',
  fontWeight: 'bold',
  marginTop: '0',
  marginBottom: '4px',
}

const valueStyle = {
  fontSize: '16px',
  color: '#000000',
  fontFamily: 'monospace',
  marginTop: '0',
  marginBottom: '0',
}

const warningStyle = {
  fontSize: '14px',
  color: '#dc2626',
  fontWeight: 'bold',
  marginTop: '0',
  marginBottom: '16px',
}

const buttonContainerStyle = {
  textAlign: 'center' as const,
  marginTop: '24px',
  marginBottom: '24px',
}

const buttonStyle = {
  display: 'inline-block',
  backgroundColor: '#000000',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '4px',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: '16px',
}

const footerNoteStyle = {
  fontSize: '12px',
  color: '#999999',
  textAlign: 'center' as const,
  marginTop: '24px',
  marginBottom: '0',
}
