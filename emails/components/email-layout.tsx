import {
  Html,
  Head,
  Body,
  Container,
  Img,
  Hr,
  Text,
  Link,
  Preview,
} from '@react-email/components'
import { ReactNode } from 'react'

interface EmailLayoutProps {
  children: ReactNode
  previewText?: string
}

/**
 * Shared email layout with BaseAim branding
 * Provides consistent header, footer, and styling for all emails
 */
export function EmailLayout({ children, previewText }: EmailLayoutProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return (
    <Html>
      <Head />
      {previewText && <Preview>{previewText}</Preview>}
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Header with BaseAim logo */}
          <Img
            src={`${appUrl}/logo-black.png`}
            alt="BaseAim Logo"
            width="120"
            style={logoStyle}
          />
          <Hr style={hrStyle} />

          {/* Email content */}
          <div style={contentStyle}>{children}</div>

          {/* Footer */}
          <Hr style={hrStyle} />
          <Text style={footerTextStyle}>
            © 2026 BaseAim. All rights reserved.
          </Text>
          <div style={footerLinksStyle}>
            <Link href={`${appUrl}/dashboard`} style={footerLinkStyle}>
              Dashboard
            </Link>
            {' • '}
            <Link href={`${appUrl}/settings`} style={footerLinkStyle}>
              Settings
            </Link>
          </div>
        </Container>
      </Body>
    </Html>
  )
}

// Inline styles (email clients don't support Tailwind reliably)
const bodyStyle = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: '0',
  padding: '0',
}

const containerStyle = {
  maxWidth: '600px',
  margin: '0 auto',
  padding: '20px',
}

const logoStyle = {
  display: 'block',
  margin: '0 auto 16px',
}

const hrStyle = {
  borderColor: '#e5e5e5',
  margin: '20px 0',
}

const contentStyle = {
  padding: '20px 0',
}

const footerTextStyle = {
  fontSize: '12px',
  color: '#666666',
  textAlign: 'center' as const,
  margin: '8px 0',
}

const footerLinksStyle = {
  textAlign: 'center' as const,
  fontSize: '12px',
  margin: '8px 0',
}

const footerLinkStyle = {
  color: '#666666',
  textDecoration: 'none',
}
