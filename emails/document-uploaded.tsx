import { Text, Link, Button } from '@react-email/components'
import { EmailLayout } from './components/email-layout'

interface DocumentUploadedEmailProps {
  clientName: string
  documentName: string
  uploadedBy: string
  viewUrl: string
}

/**
 * Document uploaded email template
 * Sent when admin uploads document for client (Phase 9 - Google Drive)
 */
export function DocumentUploadedEmail({
  clientName,
  documentName,
  uploadedBy,
  viewUrl,
}: DocumentUploadedEmailProps) {
  return (
    <EmailLayout previewText={`New Document: ${documentName}`}>
      <Text style={headingStyle}>New Document Available</Text>

      <Text style={textStyle}>Hi {clientName},</Text>

      <Text style={textStyle}>
        <strong>{uploadedBy}</strong> has uploaded a new document for you:
      </Text>

      <div style={documentBoxStyle}>
        <div style={documentIconStyle}>📄</div>
        <Text style={documentNameStyle}>{documentName}</Text>
      </div>

      <Text style={textStyle}>
        This document is now available in your dashboard.
      </Text>

      <Button href={viewUrl} style={buttonStyle}>
        View Document
      </Button>

      <Text style={footerTextStyle}>
        You can access all your documents anytime from your dashboard.
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

const documentBoxStyle = {
  backgroundColor: '#f8f9fa',
  border: '1px solid #e5e5e5',
  borderRadius: '6px',
  padding: '20px',
  margin: '16px 0',
  textAlign: 'center' as const,
}

const documentIconStyle = {
  fontSize: '48px',
  margin: '0 0 12px',
}

const documentNameStyle = {
  fontSize: '18px',
  color: '#000000',
  fontWeight: 'bold',
  margin: '0',
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

const footerTextStyle = {
  fontSize: '14px',
  color: '#666666',
  lineHeight: '20px',
  margin: '16px 0 0',
}
