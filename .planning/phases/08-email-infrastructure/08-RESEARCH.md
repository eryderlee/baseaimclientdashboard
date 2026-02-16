# Phase 8: Email Infrastructure - Research

**Researched:** 2026-02-16
**Domain:** Transactional email systems (Next.js/React)
**Confidence:** HIGH

## Summary

Email infrastructure for Next.js applications in 2026 has a clear standard stack: **Resend** (email delivery API) + **React Email** (template library). This combination is purpose-built for developers building transactional email systems and integrates seamlessly with Next.js App Router and Server Actions.

Resend handles the complex deliverability infrastructure (SPF, DKIM, DMARC) automatically when you verify a domain, while React Email provides type-safe, testable components that render to cross-client compatible HTML. The ecosystem is mature, well-documented, and battle-tested across email clients.

Key architectural pattern: Email templates live in `emails/` folder as React components, Server Actions call Resend API with rendered HTML, and webhooks provide delivery tracking. The critical gotchas are domain verification (MUST be done before production), sender email alignment (from address must match verified domain), and understanding free tier limits (100 emails/day, 3,000/month).

**Primary recommendation:** Use Resend + React Email with Next.js Server Actions, verify a custom domain immediately, start with p=none DMARC policy, and separate transactional email infrastructure from any future marketing emails.

## Standard Stack

The established libraries/tools for transactional email in Next.js applications:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `resend` | 6.9.2+ | Email delivery API client | Built for developers, automatic SPF/DKIM setup, webhooks, official Vercel partnership |
| `react-email` | Latest | Email template components | Type-safe React components, cross-client tested, Tailwind support, dev preview server |
| `@react-email/components` | Latest | Pre-built email components | Button, Link, Image, Text, etc. - battle-tested for email client compatibility |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@react-email/render` | Latest | Convert React to HTML string | Server-side rendering of templates before sending |
| `@react-email/tailwind` | Latest | Tailwind CSS for emails | Styling templates (uses pixel-based preset for email clients) |
| `date-fns` | Already in project | Format dates in emails | Already available, use for invoice dates, timestamps |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Resend | SendGrid | SendGrid is more mature but less developer-friendly, more complex setup |
| Resend | Amazon SES | SES is cheaper at scale but requires manual SMTP config, no React Email integration |
| Resend | Nodemailer + SMTP | DIY approach loses deliverability expertise, webhook infrastructure, domain reputation management |
| React Email | Hand-coded HTML tables | Massive complexity, poor maintainability, no type safety, easy to break email clients |

**Installation:**
```bash
npm install resend react-email @react-email/components
```

## Architecture Patterns

### Recommended Project Structure
```
emails/                          # Email template components
├── welcome-email.tsx            # Welcome email with credentials
├── password-reset.tsx           # Password reset with link
├── invoice-created.tsx          # Invoice notification
├── payment-confirmation.tsx     # Payment success
├── document-uploaded.tsx        # Document notification
├── weekly-digest.tsx            # Progress summary (optional)
└── components/                  # Reusable email components
    ├── email-layout.tsx         # Wrapper with branding
    ├── email-button.tsx         # Branded CTA button
    └── email-footer.tsx         # Company info, unsubscribe

lib/
├── email.ts                     # Email sending utilities
└── resend-client.ts             # Configured Resend instance

app/
├── api/
│   └── webhooks/
│       └── resend/
│           └── route.ts         # Webhook handler for delivery events
└── actions/
    └── send-email.ts            # Server Actions for sending emails
```

### Pattern 1: React Email Template Component
**What:** Email templates as React components with TypeScript props
**When to use:** Every email template in the system
**Example:**
```typescript
// emails/welcome-email.tsx
import { Html, Head, Body, Container, Section, Text, Button, Link } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface WelcomeEmailProps {
  clientName: string;
  email: string;
  temporaryPassword: string;
  loginUrl: string;
}

export const WelcomeEmail = ({ clientName, email, temporaryPassword, loginUrl }: WelcomeEmailProps) => (
  <EmailLayout>
    <Section>
      <Text style={heading}>Welcome to BaseAim, {clientName}!</Text>
      <Text style={paragraph}>
        Your account has been created. Here are your login credentials:
      </Text>
      <Container style={credentialsBox}>
        <Text style={label}>Email:</Text>
        <Text style={value}>{email}</Text>
        <Text style={label}>Temporary Password:</Text>
        <Text style={value}>{temporaryPassword}</Text>
      </Container>
      <Text style={paragraph}>
        Please log in and change your password immediately.
      </Text>
      <Button href={loginUrl} style={button}>
        Log In to Dashboard
      </Button>
    </Section>
  </EmailLayout>
);

const heading = { fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' };
const paragraph = { fontSize: '16px', lineHeight: '24px', marginBottom: '16px' };
const button = { backgroundColor: '#000', color: '#fff', padding: '12px 24px', borderRadius: '4px' };
const credentialsBox = { backgroundColor: '#f4f4f4', padding: '16px', marginBottom: '16px' };
const label = { fontSize: '12px', textTransform: 'uppercase', color: '#666' };
const value = { fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' };

export default WelcomeEmail;
```

### Pattern 2: Server Action Email Sender
**What:** Server Action that renders template and sends via Resend
**When to use:** Triggering emails from user actions or system events
**Example:**
```typescript
// app/actions/send-email.ts
'use server';

import { Resend } from 'resend';
import { render } from '@react-email/render';
import { WelcomeEmail } from '@/emails/welcome-email';
import { InvoiceCreatedEmail } from '@/emails/invoice-created';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(clientName: string, email: string, temporaryPassword: string) {
  try {
    const html = await render(<WelcomeEmail
      clientName={clientName}
      email={email}
      temporaryPassword={temporaryPassword}
      loginUrl={`${process.env.NEXT_PUBLIC_APP_URL}/login`}
    />);

    const { data, error } = await resend.emails.send({
      from: 'BaseAim <[email protected]>',
      to: email,
      subject: 'Welcome to BaseAim - Your Account is Ready',
      html,
    });

    if (error) {
      console.error('Failed to send welcome email:', error);
      throw new Error('Failed to send email');
    }

    return { success: true, emailId: data?.id };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

export async function sendInvoiceNotification(clientEmail: string, invoiceNumber: string, amount: number, dueDate: Date) {
  try {
    const html = await render(<InvoiceCreatedEmail
      invoiceNumber={invoiceNumber}
      amount={amount}
      dueDate={dueDate}
      viewUrl={`${process.env.NEXT_PUBLIC_APP_URL}/invoices/${invoiceNumber}`}
    />);

    const { data, error } = await resend.emails.send({
      from: 'BaseAim Billing <[email protected]>',
      to: clientEmail,
      subject: `Invoice ${invoiceNumber} - ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)}`,
      html,
    });

    if (error) {
      console.error('Failed to send invoice email:', error);
      throw new Error('Failed to send invoice notification');
    }

    return { success: true, emailId: data?.id };
  } catch (error) {
    console.error('Error sending invoice notification:', error);
    return { success: false, error: 'Failed to send email' };
  }
}
```

### Pattern 3: Webhook Handler for Delivery Events
**What:** API route to receive Resend webhook events (delivered, bounced, opened, clicked)
**When to use:** Track email delivery status, handle bounces, monitor engagement
**Example:**
```typescript
// app/api/webhooks/resend/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, data } = body;

    // Verify webhook signature (Resend provides this)
    const signature = req.headers.get('svix-signature');
    // TODO: Implement signature verification

    switch (type) {
      case 'email.delivered':
        await db.emailLog.update({
          where: { resendId: data.email_id },
          data: { status: 'delivered', deliveredAt: new Date() },
        });
        break;

      case 'email.bounced':
        await db.emailLog.update({
          where: { resendId: data.email_id },
          data: { status: 'bounced', error: data.error },
        });
        // Consider flagging the email address as invalid
        break;

      case 'email.opened':
        await db.emailLog.update({
          where: { resendId: data.email_id },
          data: { openedAt: new Date() },
        });
        break;

      case 'email.clicked':
        await db.emailLog.update({
          where: { resendId: data.email_id },
          data: { clickedAt: new Date() },
        });
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
```

### Pattern 4: Email Layout Component (Branding Consistency)
**What:** Reusable wrapper component with BaseAim branding
**When to use:** Wrap all email templates for consistent header/footer
**Example:**
```typescript
// emails/components/email-layout.tsx
import { Html, Head, Body, Container, Img, Hr, Text, Link } from '@react-email/components';

interface EmailLayoutProps {
  children: React.ReactNode;
  previewText?: string;
}

export const EmailLayout = ({ children, previewText }: EmailLayoutProps) => (
  <Html>
    <Head>
      {previewText && <meta name="preview" content={previewText} />}
    </Head>
    <Body style={body}>
      <Container style={container}>
        {/* Header with logo */}
        <Img
          src={`${process.env.NEXT_PUBLIC_APP_URL}/logo-black.png`}
          alt="BaseAim"
          width="120"
          style={logo}
        />
        <Hr style={divider} />

        {/* Email content */}
        {children}

        {/* Footer */}
        <Hr style={divider} />
        <Text style={footer}>
          © 2026 BaseAim. All rights reserved.
        </Text>
        <Text style={footer}>
          <Link href={`${process.env.NEXT_PUBLIC_APP_URL}`}>Dashboard</Link>
          {' | '}
          <Link href={`${process.env.NEXT_PUBLIC_APP_URL}/settings`}>Settings</Link>
        </Text>
      </Container>
    </Body>
  </Html>
);

const body = { backgroundColor: '#ffffff', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' };
const container = { margin: '0 auto', padding: '40px 20px', maxWidth: '600px' };
const logo = { margin: '0 auto 24px', display: 'block' };
const divider = { borderColor: '#e5e5e5', margin: '24px 0' };
const footer = { fontSize: '12px', color: '#666', textAlign: 'center' as const, marginTop: '8px' };
```

### Anti-Patterns to Avoid
- **Hardcoding email addresses in templates:** Use environment variables for URLs and sender addresses
- **Sending emails without try/catch:** Email APIs can fail; always handle errors gracefully
- **Not testing in multiple email clients:** Outlook, Gmail, Apple Mail render differently
- **Using SVG images:** Not supported by most email clients; use PNG/JPG only
- **Forgetting mobile optimization:** 60%+ of emails opened on mobile; test responsive layouts
- **Sending from unverified domain:** Will land in spam or be rejected
- **Using rem/flexbox in styles:** Email clients don't support modern CSS; use pixels and tables
- **Storing passwords in plain text for welcome emails:** Hash immediately, send temporary password once

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email HTML rendering | Custom template engine | React Email | Email HTML is archaic (tables, inline styles), React Email handles cross-client compatibility |
| Email delivery | Nodemailer + SMTP | Resend API | SMTP requires server config, IP reputation management, bounce handling, rate limiting |
| SPF/DKIM/DMARC setup | Manual DNS records | Resend auto-setup | Complex DNS configuration, easy to misconfigure and tank deliverability |
| Template preview | Manual testing | React Email dev server | Dev server shows real-time updates at localhost:3000 with desktop/mobile toggle |
| Bounce handling | Parse SMTP errors | Resend webhooks | Bounce reasons are inconsistent across providers; webhooks provide structured data |
| Rate limiting | Custom queue | Resend handles it | Free tier: 100/day, Pro: automatic scaling; server-side throttling is complex |
| Email tracking (opens/clicks) | Pixel/link injection | Resend webhooks | Tracking pixels/UTM params are manual; webhooks provide email.opened/clicked events |
| Unsubscribe management | Custom database | React Email + Resend List-Unsubscribe | Email clients require RFC compliance; Resend handles header injection |
| Dark mode email design | Media queries | React Email components | Email clients have inconsistent dark mode; components handle fallbacks |

**Key insight:** Email deliverability is a specialized domain with decades of accumulated complexity (spam filters, authentication protocols, client rendering quirks). Resend/React Email abstract this complexity while maintaining developer control over content and logic.

## Common Pitfalls

### Pitfall 1: Not Verifying Domain Before Sending Production Emails
**What goes wrong:** Emails sent from unverified domains are rejected or land in spam folders. Resend provides a test domain (onboarding@resend.dev) but it's rate-limited and unprofessional.
**Why it happens:** Developers skip domain verification during development, forget to set it up before launch.
**How to avoid:**
- Add and verify your sending domain in Resend dashboard immediately after account creation
- Use format like `[email protected]` for transactional emails
- Test with your verified domain in development, not the Resend test domain
**Warning signs:** Emails not arriving in inbox, high bounce rates, Gmail/Outlook warnings

### Pitfall 2: Sender Email Doesn't Match Verified Domain
**What goes wrong:** `from` field like `[email protected]` when only `baseaim.com` is verified causes authentication failures.
**Why it happens:** Confusion between "Reply-To" and "From" addresses, copying examples without updating domain.
**How to avoid:**
- From address MUST use verified domain: `from: 'BaseAim <[email protected]>'`
- You can use different subdomains (billing@, support@, no-reply@) as long as parent domain is verified
- Reply-To can be different if needed: `reply_to: '[email protected]'`
**Warning signs:** DKIM/SPF failures in email headers, "via resend.dev" shown in Gmail

### Pitfall 3: Exceeding Free Tier Limits Without Monitoring
**What goes wrong:** Free tier is 100 emails/day and 3,000/month. App hits limit silently, critical emails fail.
**Why it happens:** No monitoring on email send volume, unexpected user growth.
**How to avoid:**
- Track email sends in application database (log every send attempt)
- Set up alerts when approaching 80% of daily/monthly limits
- Plan upgrade to Pro plan ($20/month for 50k emails) before launch
- Use separate domains for different email types (transactional vs marketing)
**Warning signs:** Users reporting missing emails, Resend API returning quota errors

### Pitfall 4: Starting with Strict DMARC Policy
**What goes wrong:** Setting DMARC policy to `p=quarantine` or `p=reject` immediately breaks email delivery if SPF/DKIM aren't perfectly aligned.
**Why it happens:** Following security advice without understanding email infrastructure.
**How to avoid:**
- Start with `p=none` to monitor without enforcement: `v=DMARC1; p=none; rua=mailto:[email protected]`
- Review DMARC reports for 1-2 weeks to verify all emails pass SPF/DKIM
- Gradually upgrade to `p=quarantine`, then `p=reject` after confirming 100% pass rate
- Resend handles SPF/DKIM automatically, but verify with tools like mail-tester.com
**Warning signs:** Sudden drop in email deliverability after DMARC changes

### Pitfall 5: Using Complex CSS or JavaScript in Email Templates
**What goes wrong:** Modern CSS (flexbox, grid, custom fonts) and JavaScript don't work in most email clients. Outlook uses Word rendering engine.
**Why it happens:** Treating email like a web page, copying web component styles.
**How to avoid:**
- Use React Email's Tailwind preset (pixel-based, email-safe subset)
- Stick to inline styles and table layouts (React Email handles this)
- Test in Litmus/Email on Acid or Resend's preview
- Avoid: rem/em units, flexbox, grid, position: absolute, background-image (unreliable), custom fonts (fallback to system fonts)
- Safe: pixels, tables, inline styles, web-safe fonts, background-color
**Warning signs:** Beautiful in browser preview, broken in Outlook/Gmail

### Pitfall 6: Not Handling Email Send Failures Gracefully
**What goes wrong:** Email API call fails (network issue, rate limit, invalid email), user never knows critical action failed.
**Why it happens:** Assuming email send always succeeds, not implementing retry logic.
**How to avoid:**
- Wrap email sends in try/catch, return success/failure to caller
- For critical emails (password reset, invoices), retry with exponential backoff
- Log all send attempts with status to database for debugging
- Show user-facing error if email send fails: "We couldn't send the email. Please contact support."
- Consider queue system for high-volume sends (Inngest, BullMQ)
**Warning signs:** Users complaining about missing emails, no error logs

### Pitfall 7: Hardcoding Email Content (No Localization Path)
**What goes wrong:** All emails in English, no way to support multi-language clients later without rewriting templates.
**Why it happens:** Building for current requirements, not considering future internationalization.
**How to avoid:**
- Even if v1 is English-only, structure templates to accept text props
- Extract strings to variables: `const subject = 'Welcome to BaseAim'` instead of hardcoding
- Consider future pattern: `{ t('email.welcome.subject') }` with i18n library
- BaseAim v1 is English-only, but keep structure flexible
**Warning signs:** Text hardcoded in JSX, no way to swap language without template changes

### Pitfall 8: Forgetting to Test Password Reset Email Speed
**What goes wrong:** Password reset emails take 30-60+ seconds to arrive, users think it failed and request multiple times.
**Why it happens:** Not testing end-to-end flow under realistic conditions, server-side delays.
**How to avoid:**
- Benchmark password reset email delivery time (should be <20 seconds)
- Ensure Server Action responds immediately (don't await email send in UI flow)
- Use background job for email send if needed: send email async, return success to user
- Test from production environment (network latency differs from localhost)
**Warning signs:** Users requesting multiple password resets, complaints about "emails not arriving"

## Code Examples

Verified patterns from documentation and official sources:

### Basic Resend Email Send
```typescript
// Source: https://resend.com/docs/send-with-nextjs
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const { data, error } = await resend.emails.send({
  from: 'BaseAim <[email protected]>',
  to: '[email protected]',
  subject: 'Hello World',
  html: '<strong>It works!</strong>',
});
```

### React Email with Tailwind
```typescript
// Source: https://react.email/docs/components/tailwind
import { Button, Tailwind } from '@react-email/components';

export const EmailTemplate = () => (
  <Tailwind
    config={{
      theme: {
        extend: {
          colors: {
            brand: '#000000',
          },
        },
      },
    }}
  >
    <Button
      href="https://example.com"
      className="bg-brand px-3 py-2 font-medium leading-4 text-white"
    >
      Click me
    </Button>
  </Tailwind>
);
```

### Password Reset Email Pattern
```typescript
// Based on: https://postmarkapp.com/guides/password-reset-email-best-practices
import { Button, Container, Text, Section } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface PasswordResetEmailProps {
  resetUrl: string;
  expiresInMinutes: number;
}

export const PasswordResetEmail = ({ resetUrl, expiresInMinutes }: PasswordResetEmailProps) => (
  <EmailLayout previewText="Reset your password">
    <Section>
      <Text style={heading}>Reset your password</Text>
      <Text style={paragraph}>
        We received a request to reset your password. Click the button below to choose a new password.
      </Text>
      <Button href={resetUrl} style={button}>
        Reset Password
      </Button>
      <Text style={paragraph}>
        This link will expire in {expiresInMinutes} minutes.
      </Text>
      <Text style={footnote}>
        If you didn't request a password reset, you can safely ignore this email.
      </Text>
    </Section>
  </EmailLayout>
);

const heading = { fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' };
const paragraph = { fontSize: '16px', lineHeight: '24px', marginBottom: '16px' };
const button = {
  backgroundColor: '#000',
  color: '#fff',
  padding: '12px 24px',
  borderRadius: '4px',
  textDecoration: 'none',
  display: 'inline-block'
};
const footnote = { fontSize: '14px', color: '#666', marginTop: '24px' };
```

### Environment Variables Setup
```bash
# .env.local
# Source: https://resend.com/docs/send-with-nextjs

# Get API key from https://resend.com/api-keys
RESEND_API_KEY=re_xxxxxxxxxxxx

# Your verified domain
RESEND_FROM_DOMAIN=baseaim.com

# App URL for links in emails
NEXT_PUBLIC_APP_URL=https://dashboard.baseaim.com
```

### Email Preview Development Server
```bash
# Source: https://react.email/docs/cli
# Run in separate terminal during development

npm install -g react-email
cd emails
email dev

# Opens preview at http://localhost:3000
# Shows all templates with hot reload
```

### Sending Email with Error Handling and Retry
```typescript
// Pattern based on: https://docs.particular.net/transports/sqs/troubleshooting
async function sendEmailWithRetry(emailFn: () => Promise<any>, maxRetries = 3) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await emailFn();
      return { success: true, data: result };
    } catch (error: any) {
      lastError = error;

      // Don't retry on validation errors (400-level)
      if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
        return { success: false, error: error.message };
      }

      // Exponential backoff for retries (5xx errors, network issues)
      if (attempt < maxRetries - 1) {
        const delayMs = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  return { success: false, error: lastError };
}

// Usage
const result = await sendEmailWithRetry(() =>
  resend.emails.send({
    from: 'BaseAim <[email protected]>',
    to: clientEmail,
    subject: 'Welcome',
    html: renderedHtml,
  })
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Nodemailer + SMTP | Resend/SendGrid APIs | 2020-2023 | APIs provide webhooks, better deliverability, managed infrastructure |
| Template strings with HTML | React Email components | 2022-2024 | Type safety, component reuse, better developer experience |
| Manual SPF/DKIM setup | Provider auto-config | 2023-2024 | Resend handles DNS automatically, reduces misconfiguration |
| Mailgun/SendGrid dominance | Resend emerging | 2023-2026 | Resend designed for modern stacks (React, Next.js), better DX |
| Inline CSS strings | Tailwind CSS preset | 2024-2025 | React Email Tailwind preset makes styling easier while staying email-safe |
| Self-hosted email servers | Cloud email APIs | 2015-2020 | IP reputation management is complex, APIs handle deliverability |

**Deprecated/outdated:**
- **MJML:** XML-based email framework; React Email provides better DX with familiar React syntax
- **Foundation for Emails:** Sass-based framework; replaced by component libraries like React Email
- **Handlebars email templates:** String templating; modern approach uses React components for type safety
- **Mandrill:** Mailchimp's transactional service was deprecated; users migrated to Mailgun, SendGrid, Resend

## Open Questions

Things that couldn't be fully resolved:

1. **Resend's long-term pricing stability**
   - What we know: Currently $20/month for 50k emails, free tier 3,000/month
   - What's unclear: Will pricing increase as Resend matures? Free tier sustainability?
   - Recommendation: Start with Resend (best DX), but design email abstraction layer to allow provider swap if needed

2. **Multi-language email support pattern**
   - What we know: No standard i18n pattern for React Email yet, manual prop-based approach works
   - What's unclear: Best practice for storing/managing translated email content
   - Recommendation: BaseAim v1 is English-only, but structure templates to accept text as props for future i18n

3. **Email attachment handling for invoice PDFs**
   - What we know: Resend supports attachments (<2MB), but impacts deliverability and rate limits
   - What's unclear: Should invoices be attached or linked? User preference?
   - Recommendation: Link to invoice PDF in email (better deliverability), add attachment support in Phase 10 if requested

4. **Optimal email logging/tracking strategy**
   - What we know: Resend webhooks provide delivered/bounced/opened/clicked events
   - What's unclear: Should we store full email content in DB or just metadata? Retention period?
   - Recommendation: Log metadata (to, subject, status, emailId) for debugging; store Resend emailId for webhook correlation

5. **Weekly digest email timing and content**
   - What we know: EMAIL-06 requires weekly progress digest, but no spec on content or timing
   - What's unclear: What goes in digest? When to send (e.g., Monday mornings)? How to handle inactive clients?
   - Recommendation: Defer digest implementation to later; focus on critical transactional emails first (welcome, password reset, invoice)

## Sources

### Primary (HIGH confidence)
- [Resend Next.js Documentation](https://resend.com/nextjs) - Official integration guide
- [Resend Send with Next.js](https://resend.com/docs/send-with-nextjs) - Code examples and best practices
- [React Email Documentation](https://react.email) - Component library and patterns
- [React Email Components](https://react.email/components) - Pre-built component reference
- [Resend Webhooks Documentation](https://resend.com/docs/dashboard/webhooks/introduction) - Event handling
- [React Email Tailwind Integration](https://react.email/docs/components/tailwind) - Styling patterns
- [Resend Pricing](https://resend.com/pricing) - Current free tier and paid plan limits

### Secondary (MEDIUM confidence)
- [Password Reset Email Best Practices - Postmark](https://postmarkapp.com/guides/password-reset-email-best-practices) - Industry patterns
- [Transactional Email Best Practices 2026 - Moosend](https://moosend.com/blog/transactional-email-best-practices/) - Design and content guidance
- [Email Authentication Guide - Resend Blog](https://resend.com/blog/email-authentication-a-developers-guide) - SPF/DKIM/DMARC explanation
- [Next.js Security Guide](https://nextjs.org/blog/security-nextjs-server-components-actions) - Environment variable security
- [Email Attachments Best Practices - EmailVendorSelection](https://www.emailvendorselection.com/email-attachments-transactional-email/) - When to use attachments

### Secondary (MEDIUM confidence - WebSearch verified)
- [Implementing DMARC - Resend](https://resend.com/docs/dashboard/domains/dmarc) - DMARC setup steps
- [DmarcDkim.com Resend Guide](https://dmarcdkim.com/setup/how-to-setup-resend-spf-dkim-and-dmarc-records) - Step-by-step configuration
- [Email Design Trends 2026 - Brevo](https://www.brevo.com/blog/email-design-best-practices/) - Design patterns and mobile optimization
- [MailerSend Domain Verification](https://www.mailersend.com/help/how-to-verify-and-authenticate-a-sending-domain) - Sender verification process

### Tertiary (LOW confidence - for further validation)
- [Email Testing Tools 2026 - testRigor](https://testrigor.com/blog/email-testing-tools/) - Litmus/Email on Acid alternatives
- [Email Localization Guide - Crowdin](https://crowdin.com/blog/how-to-localize-emails) - Multi-language email patterns
- [Resend Rate Limiting with Cloud Run - Medium](https://dalenguyen.medium.com/mastering-email-rate-limits-a-deep-dive-into-resend-api-and-cloud-run-debugging-f1b97c995904) - Queue implementation patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Resend + React Email is the clear leader for Next.js transactional email in 2026
- Architecture: HIGH - Patterns verified from official docs, widely adopted in Next.js ecosystem
- Pitfalls: HIGH - Domain verification, sender alignment, rate limits documented in official sources
- Code examples: HIGH - All examples based on official Resend and React Email documentation
- Open questions: MEDIUM - Multi-language and digest implementation need product decisions

**Research date:** 2026-02-16
**Valid until:** March 2026 (30 days) - Stable ecosystem, but verify Resend pricing and React Email version before implementation
