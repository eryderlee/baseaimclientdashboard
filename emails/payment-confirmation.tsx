import { Text, Link, Button } from '@react-email/components'
import { EmailLayout } from './components/email-layout'

interface PaymentConfirmationEmailProps {
  clientName: string
  invoiceNumber: string
  amount: number
  currency: string
  paidDate: string
}

/**
 * Payment confirmation email template
 * Sent when payment is received (Phase 10 - Stripe webhook)
 */
export function PaymentConfirmationEmail({
  clientName,
  invoiceNumber,
  amount,
  currency,
  paidDate,
}: PaymentConfirmationEmailProps) {
  // Format amount with currency
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return (
    <EmailLayout previewText="Payment Received - Thank You">
      <Text style={headingStyle}>Payment Received</Text>

      <Text style={textStyle}>Hi {clientName},</Text>

      <Text style={textStyle}>
        Thank you! We've received your payment of <strong>{formattedAmount}</strong> for
        invoice <strong>{invoiceNumber}</strong>.
      </Text>

      <div style={confirmationBoxStyle}>
        <div style={confirmationRowStyle}>
          <Text style={labelStyle}>Invoice Number:</Text>
          <Text style={valueStyle}>{invoiceNumber}</Text>
        </div>
        <div style={confirmationRowStyle}>
          <Text style={labelStyle}>Amount Paid:</Text>
          <Text style={valueStyle}>{formattedAmount}</Text>
        </div>
        <div style={confirmationRowStyle}>
          <Text style={labelStyle}>Payment Date:</Text>
          <Text style={valueStyle}>{paidDate}</Text>
        </div>
        <div style={statusRowStyle}>
          <Text style={statusLabelStyle}>Status:</Text>
          <div style={statusBadgeStyle}>PAID</div>
        </div>
      </div>

      <Text style={textStyle}>
        A receipt has been sent to your email and is available in your dashboard.
      </Text>

      <Button href={`${appUrl}/dashboard/billing`} style={buttonStyle}>
        View Dashboard
      </Button>

      <Text style={footerTextStyle}>
        Thank you for your business!
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

const confirmationBoxStyle = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #86efac',
  borderRadius: '6px',
  padding: '16px',
  margin: '16px 0',
}

const confirmationRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '8px',
}

const statusRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: '12px',
  paddingTop: '12px',
  borderTop: '1px solid #86efac',
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

const statusLabelStyle = {
  fontSize: '14px',
  color: '#666666',
  margin: '0',
  fontWeight: '500',
}

const statusBadgeStyle = {
  backgroundColor: '#22c55e',
  color: '#ffffff',
  padding: '4px 12px',
  borderRadius: '12px',
  fontSize: '12px',
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
