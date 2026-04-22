import { Text, Button, Hr } from '@react-email/components'
import { EmailLayout } from './components/email-layout'

export type ClientActionType = 'dashboard' | 'documents' | 'password'

interface ClientActionEmailProps {
  clientName: string
  magicLinkUrl: string
  action: ClientActionType
  documentRequest?: string // only used when action === 'documents'
}

export function ClientActionEmail({
  clientName,
  magicLinkUrl,
  action,
  documentRequest,
}: ClientActionEmailProps) {
  const content = getContent(action, clientName, documentRequest)

  return (
    <EmailLayout previewText={content.preview}>
      <Text style={headingStyle}>{content.heading}</Text>

      {content.body.map((line, i) => (
        <Text key={i} style={bodyStyle}>{line}</Text>
      ))}

      <div style={buttonContainerStyle}>
        <Button href={magicLinkUrl} style={buttonStyle}>
          {content.cta}
        </Button>
      </div>

      <Text style={expiryStyle}>This link expires in 24 hours.</Text>

      <Hr style={hrStyle} />

      <Text style={footerStyle}>
        If you weren't expecting this email, you can safely ignore it. Reply to
        this email if you have any questions.
      </Text>
    </EmailLayout>
  )
}

export default ClientActionEmail

function getContent(
  action: ClientActionType,
  clientName: string,
  documentRequest?: string
) {
  switch (action) {
    case 'dashboard':
      return {
        preview: 'Your BaseAim dashboard link',
        heading: `Hi ${clientName},`,
        body: [
          'Here\'s your link to access your BaseAim client dashboard. Click below to log in — no password needed.',
        ],
        cta: 'Access my dashboard →',
      }

    case 'documents':
      return {
        preview: 'Action required — document upload',
        heading: `Hi ${clientName}, we need a document from you.`,
        body: [
          documentRequest
            ? `We need you to upload the following: ${documentRequest}`
            : 'We need you to upload some documents to your dashboard.',
          'Click the button below to log in and head to the Documents section to upload.',
        ],
        cta: 'Upload documents →',
      }

    case 'password':
      return {
        preview: 'Set your BaseAim dashboard password',
        heading: `Hi ${clientName},`,
        body: [
          'Click the button below to log in to your dashboard. Once you\'re in, go to Account Settings to set a permanent password so you can log in any time.',
        ],
        cta: 'Log in and set password →',
      }
  }
}

const headingStyle = {
  fontSize: '22px',
  fontWeight: 'bold',
  color: '#000',
  marginTop: '0',
  marginBottom: '16px',
}

const bodyStyle = {
  fontSize: '15px',
  color: '#333',
  lineHeight: '24px',
  marginTop: '0',
  marginBottom: '12px',
}

const buttonContainerStyle = {
  textAlign: 'center' as const,
  marginTop: '24px',
  marginBottom: '16px',
}

const buttonStyle = {
  display: 'inline-block',
  backgroundColor: '#000',
  color: '#fff',
  padding: '14px 28px',
  borderRadius: '4px',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: '15px',
}

const expiryStyle = {
  fontSize: '13px',
  color: '#888',
  textAlign: 'center' as const,
  marginTop: '0',
  marginBottom: '24px',
}

const hrStyle = {
  borderColor: '#e5e7eb',
  marginBottom: '16px',
}

const footerStyle = {
  fontSize: '13px',
  color: '#888',
  lineHeight: '20px',
  marginTop: '0',
  marginBottom: '0',
}
