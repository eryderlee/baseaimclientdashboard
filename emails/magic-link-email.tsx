import { Text, Button } from '@react-email/components'
import { EmailLayout } from './components/email-layout'

interface MagicLinkEmailProps {
  clientName: string
  magicLinkUrl: string
}

/**
 * Magic link welcome email for survey-created clients
 * Sent immediately after survey submission
 * Single CTA button — no password, no credentials shown
 */
export function MagicLinkEmail({ clientName, magicLinkUrl }: MagicLinkEmailProps) {
  return (
    <EmailLayout previewText="You're in — access your BaseAim dashboard">
      <Text style={headingStyle}>You're in, {clientName}.</Text>

      <Text style={paragraphStyle}>
        Your dashboard is live. Click the button below to access it — no
        password needed.
      </Text>

      <div style={buttonContainerStyle}>
        <Button href={magicLinkUrl} style={buttonStyle}>
          Access my dashboard →
        </Button>
      </div>

      <Text style={expiryStyle}>This link expires in 72 hours.</Text>

      <Text style={footerNoteStyle}>
        Sora will walk you through everything on your kickoff call. In the
        meantime, your dashboard is ready to explore.
      </Text>
    </EmailLayout>
  )
}

export default MagicLinkEmail

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
  marginBottom: '24px',
}

const buttonContainerStyle = {
  textAlign: 'center' as const,
  marginTop: '8px',
  marginBottom: '24px',
}

const buttonStyle = {
  display: 'inline-block',
  backgroundColor: '#000000',
  color: '#ffffff',
  padding: '14px 28px',
  borderRadius: '4px',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: '16px',
}

const expiryStyle = {
  fontSize: '13px',
  color: '#888888',
  textAlign: 'center' as const,
  marginTop: '0',
  marginBottom: '24px',
}

const footerNoteStyle = {
  fontSize: '14px',
  color: '#666666',
  lineHeight: '22px',
  marginTop: '0',
  marginBottom: '0',
}
