import { Text, Button } from '@react-email/components'
import { EmailLayout } from './components/email-layout'

interface CardSetupEmailProps {
  clientName: string
  setupUrl: string
}

/**
 * Card setup request email
 * Sent by admin when a client needs to add a payment method before a retainer can start
 */
export function CardSetupEmail({ clientName, setupUrl }: CardSetupEmailProps) {
  return (
    <EmailLayout previewText="Action required: add your payment method to complete billing setup">
      <Text style={headingStyle}>Payment Method Required</Text>

      <Text style={textStyle}>Hi {clientName},</Text>

      <Text style={textStyle}>
        To start your monthly retainer, we need you to add a payment method to
        your account. This is a one-time setup — once your card is saved,
        billing will be fully automatic each month with no action needed from
        you.
      </Text>

      <Text style={textStyle}>
        Click the button below to securely add your card via Stripe:
      </Text>

      <Button href={setupUrl} style={buttonStyle}>
        Add Payment Method
      </Button>

      <Text style={noteStyle}>
        This link is secure, hosted by Stripe, and expires in 24 hours. If you
        need a new link, please contact us.
      </Text>
    </EmailLayout>
  )
}

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
  margin: '16px 0',
}

const noteStyle = {
  fontSize: '13px',
  color: '#888888',
  lineHeight: '20px',
  margin: '16px 0 0',
}
