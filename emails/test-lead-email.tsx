import { Text, Hr } from '@react-email/components'
import { EmailLayout } from './components/email-layout'

interface TestLeadEmailProps {
  companyName: string
}

export function TestLeadEmail({ companyName }: TestLeadEmailProps) {
  return (
    <EmailLayout previewText={`[TEST] New lead for ${companyName}`}>
      <Text style={headingStyle}>[TEST] Lead notification</Text>
      <Text style={bodyStyle}>
        This is a test lead notification for <strong>{companyName}</strong>.
      </Text>
      <Text style={bodyStyle}>
        If you received this, your email lead destination is configured correctly.
      </Text>
      <Hr style={hrStyle} />
      <Text style={footerStyle}>
        Sent from BaseAim dashboard — lead destination test
      </Text>
    </EmailLayout>
  )
}

export default TestLeadEmail

const headingStyle = {
  fontSize: '20px',
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

const hrStyle = {
  borderColor: '#e5e7eb',
  marginTop: '24px',
  marginBottom: '16px',
}

const footerStyle = {
  fontSize: '12px',
  color: '#888',
  marginTop: '0',
  marginBottom: '0',
}
