import { Text, Link, Button } from '@react-email/components'
import { EmailLayout } from './components/email-layout'

interface InvoiceCreatedEmailProps {
  clientName: string
  invoiceNumber: string
  amount: number
  currency: string
  dueDate: string
  viewUrl: string
}

/**
 * Invoice created email template
 * Sent when new invoice is generated (Phase 10 - Stripe)
 */
export function InvoiceCreatedEmail({
  clientName,
  invoiceNumber,
  amount,
  currency,
  dueDate,
  viewUrl,
}: InvoiceCreatedEmailProps) {
  // Format amount with currency
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount)

  return (
    <EmailLayout previewText={`Invoice ${invoiceNumber} - ${formattedAmount}`}>
      <Text style={headingStyle}>New Invoice</Text>

      <Text style={textStyle}>Hi {clientName},</Text>

      <Text style={textStyle}>
        A new invoice has been generated for your account.
      </Text>

      <div style={invoiceBoxStyle}>
        <div style={invoiceRowStyle}>
          <Text style={labelStyle}>Invoice Number:</Text>
          <Text style={valueStyle}>{invoiceNumber}</Text>
        </div>
        <div style={invoiceRowStyle}>
          <Text style={labelStyle}>Amount:</Text>
          <Text style={valueStyle}>{formattedAmount}</Text>
        </div>
        <div style={invoiceRowStyle}>
          <Text style={labelStyle}>Due Date:</Text>
          <Text style={valueStyle}>{dueDate}</Text>
        </div>
      </div>

      <Button href={viewUrl} style={buttonStyle}>
        View Invoice
      </Button>

      <Text style={footerTextStyle}>
        If you have any questions about this invoice, please contact us.
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

const invoiceBoxStyle = {
  backgroundColor: '#f8f9fa',
  border: '1px solid #e5e5e5',
  borderRadius: '6px',
  padding: '16px',
  margin: '16px 0',
}

const invoiceRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '8px',
}

const labelStyle = {
  fontSize: '14px',
  color: '#666666',
  margin: '0',
  fontWeight: '500',
}

const valueStyle = {
  fontSize: '14px',
  color: '#000000',
  margin: '0',
  fontWeight: 'bold',
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
