# Architecture Research: v1.0 External Service Integrations

**Domain:** External Service Integration Layer for Next.js 16 App Router Dashboard
**Researched:** 2026-02-15
**Confidence:** HIGH

## Executive Summary

This architecture research covers integrating 5 external services into an existing Next.js 16 App Router application with Server Components, Data Access Layer (DAL), and Server Actions:

1. **Facebook Ads API** - Campaign metrics display
2. **Google Drive API** - Document storage (replacing Vercel Blob)
3. **Stripe** - Payment processing and subscriptions
4. **Resend** - Transactional email service
5. **Telegram/WhatsApp** - External chat linking

**Key Architectural Principle:** Leverage Next.js 16's Server Components and Server Actions for all external API calls, keeping secrets server-side and using the existing DAL pattern for data access. Each integration follows a consistent pattern: API client instantiation → Server Component/Action execution → Prisma persistence → Cache invalidation.

## Standard Architecture

### System Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER (Client)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Dashboard  │  │   Documents  │  │   Billing    │             │
│  │   Pages      │  │   Pages      │  │   Pages      │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
│         │                 │                 │                       │
│         │ (no API keys)   │                 │                       │
└─────────┼─────────────────┼─────────────────┼───────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌────────────────────────────────────────────────────────────────────┐
│              SERVER LAYER (Next.js App Router - Server)             │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │             SERVER COMPONENTS (Data Fetching)            │       │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │       │
│  │  │  Metrics   │  │  Documents │  │  Invoices  │         │       │
│  │  │  Display   │  │  List      │  │  List      │         │       │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘         │       │
│  └────────┼───────────────┼───────────────┼────────────────┘       │
│           │               │               │                         │
│  ┌────────┼───────────────┼───────────────┼────────────────┐       │
│  │        │  DATA ACCESS LAYER (DAL)      │                │       │
│  │        │  ┌──────────────────────────┐ │                │       │
│  │        └─▶│  verifySession()         │ │                │       │
│  │           │  getCurrentClientId()     │◀┘                │       │
│  │           │  React cache() wrapper    │                  │       │
│  │           └──────────────┬────────────┘                  │       │
│  └──────────────────────────┼─────────────────────────────┘       │
│                             │                                       │
│  ┌─────────────────────────┼─────────────────────────────────┐    │
│  │        SERVER ACTIONS (Mutations)                         │    │
│  │  ┌───────────┐  ┌───────────┐  ┌──────────┐              │    │
│  │  │  Upload   │  │  Create   │  │  Cancel  │              │    │
│  │  │  Document │  │  Checkout │  │  Sub     │              │    │
│  │  └─────┬─────┘  └─────┬─────┘  └────┬─────┘              │    │
│  └────────┼──────────────┼──────────────┼────────────────────┘    │
│           │              │              │                          │
│  ┌────────┼──────────────┼──────────────┼────────────────────┐    │
│  │   INTEGRATION SERVICE LAYER                              │    │
│  │  ┌─────▼──────┐  ┌───▼──────┐  ┌────▼──────┐            │    │
│  │  │  Google    │  │  Stripe  │  │  Facebook │            │    │
│  │  │  Drive     │  │  Client  │  │  Ads      │            │    │
│  │  │  Client    │  │  Service │  │  Client   │            │    │
│  │  └─────┬──────┘  └───┬──────┘  └────┬──────┘            │    │
│  │  ┌─────▼─────┐   ┌───▼─────┐   ┌────▼─────┐            │    │
│  │  │  Resend   │   │  Chat   │   │ (future) │            │    │
│  │  │  Client   │   │  Links  │   │ services │            │    │
│  │  └───────────┘   └─────────┘   └──────────┘            │    │
│  └──────────────────────┬──────────────────────────────────┘    │
│                         │                                        │
└─────────────────────────┼────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────────────┐
│                    DATA PERSISTENCE LAYER                           │
│  ┌──────────────┐         ┌────────────────────────────────┐       │
│  │    Prisma    │────────▶│      PostgreSQL (Supabase)     │       │
│  │    Client    │         │  - Users, Clients, Documents   │       │
│  └──────────────┘         │  - Subscriptions, Invoices     │       │
│                           │  - Milestones, Activities      │       │
│                           └────────────────────────────────┘       │
└────────────────────────────────────────────────────────────────────┘
                          ▲
                          │
┌─────────────────────────┼────────────────────────────────────────┐
│            EXTERNAL SERVICES (3rd Party APIs)                      │
│  ┌────────────┐  ┌──────────┐  ┌─────────┐  ┌─────────┐          │
│  │  Facebook  │  │  Google  │  │ Stripe  │  │ Resend  │          │
│  │  Ads API   │  │  Drive   │  │   API   │  │   API   │          │
│  └────────────┘  └──────────┘  └─────────┘  └─────────┘          │
└────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Server Components** | Fetch and display data from external APIs and DB | RSC with DAL calls, external API clients |
| **Server Actions** | Handle mutations (uploads, payments, CRUD) | `'use server'` functions with revalidatePath |
| **DAL Functions** | Session verification, client scoping, data fetching | `cache()` wrapped functions in `/lib/dal.ts` |
| **Integration Services** | External API communication, token management | `/lib/integrations/[service]/client.ts` |
| **Prisma Client** | Database operations, schema enforcement | `/lib/prisma.ts` singleton |
| **Route Handlers** | Webhooks from external services | `/app/api/webhooks/[service]/route.ts` |

## Integration-Specific Architecture

### 1. Facebook Ads API Integration

**Purpose:** Display campaign metrics on client dashboards

#### Component Structure

```
/lib/integrations/facebook/
├── client.ts              # FacebookAdsClient class
├── types.ts               # TypeScript types for campaigns, metrics
└── cache.ts               # Caching layer for metrics data
```

#### Data Flow

```
[Client Dashboard Page]
    ↓ (Server Component)
[DAL: getClientWithMilestones()]
    ↓
[FacebookAdsClient.getCampaignMetrics(adAccountId)]
    ↓ (API call to Graph API)
[Facebook Ads API v22.0]
    ↓ (returns metrics)
[Transform to UI format]
    ↓
[Cache with 'use cache' for 15 minutes]
    ↓
[Render metrics in Server Component]
```

#### Implementation Details

**API Client Pattern:**
```typescript
// /lib/integrations/facebook/client.ts
import bizSdk from 'facebook-nodejs-business-sdk'

const { FacebookAdsApi, AdAccount, Campaign } = bizSdk

export class FacebookAdsClient {
  private api: typeof FacebookAdsApi

  constructor() {
    this.api = FacebookAdsApi.init(process.env.FACEBOOK_ACCESS_TOKEN!)
  }

  async getCampaignMetrics(adAccountId: string) {
    const account = new AdAccount(`act_${adAccountId}`)
    const campaigns = await account.getCampaigns([
      Campaign.Fields.name,
      Campaign.Fields.status,
      Campaign.Fields.insights
    ])
    return campaigns
  }
}
```

**Server Component Usage:**
```typescript
// /app/dashboard/analytics/page.tsx (Server Component)
import { FacebookAdsClient } from '@/lib/integrations/facebook/client'
import { verifySession, getCurrentClientId } from '@/lib/dal'

export default async function AnalyticsPage() {
  const { userRole } = await verifySession()
  const clientId = await getCurrentClientId()

  // Fetch client's ad account ID from database
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { facebookAdAccountId: true }
  })

  if (!client?.facebookAdAccountId) {
    return <div>No ad account connected</div>
  }

  // Fetch metrics from Facebook
  const fbClient = new FacebookAdsClient()
  const metrics = await fbClient.getCampaignMetrics(client.facebookAdAccountId)

  return <MetricsDisplay data={metrics} />
}
```

#### Data Persistence

**Schema Changes Required:**
```prisma
model Client {
  // ... existing fields
  facebookAdAccountId String?
  facebookLastSyncAt  DateTime?
}
```

**Storage Strategy:**
- Store ad account ID in Client table
- Do NOT store metrics in database (fetch on-demand)
- Cache metrics for 15 minutes using `'use cache'`
- Track last sync timestamp for debugging

#### Token Management

**Approach:** System User Token (long-lived, non-expiring)

**Storage:**
- Environment variable: `FACEBOOK_ACCESS_TOKEN`
- Stored in Vercel project settings
- Never exposed to client
- Rotated manually via Meta Business Manager

**Setup Steps:**
1. Create System User in Meta Business Manager
2. Assign permissions: `ads_read`, `business_management`
3. Generate System User Token
4. Add to `.env.local` and Vercel environment

### 2. Google Drive API Integration

**Purpose:** Replace Vercel Blob with Google Drive for document storage

#### Component Structure

```
/lib/integrations/google-drive/
├── client.ts              # GoogleDriveClient class
├── auth.ts                # Service account authentication
├── types.ts               # File metadata types
└── constants.ts           # Folder IDs, MIME types
```

#### Data Flow

```
[Document Upload Form] (Client Component)
    ↓ (calls Server Action)
[uploadDocument(formData)] (Server Action)
    ↓
[GoogleDriveClient.uploadFile(buffer, metadata)]
    ↓ (API call)
[Google Drive API v3]
    ↓ (returns file ID, webViewLink)
[Save to Prisma: Document table]
    ↓
[revalidatePath('/dashboard/documents')]
    ↓
[Return success to client]
```

#### Implementation Details

**API Client Pattern:**
```typescript
// /lib/integrations/google-drive/client.ts
import { google } from 'googleapis'
import { getServiceAccountAuth } from './auth'

export class GoogleDriveClient {
  private drive

  constructor() {
    const auth = getServiceAccountAuth()
    this.drive = google.drive({ version: 'v3', auth })
  }

  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    folderId: string
  ) {
    const response = await this.drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
        mimeType: mimeType,
      },
      media: {
        mimeType: mimeType,
        body: fileBuffer,
      },
      fields: 'id, webViewLink, webContentLink, size',
    })

    // Make file accessible to anyone with link
    await this.drive.permissions.create({
      fileId: response.data.id!,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    })

    return response.data
  }

  async deleteFile(fileId: string) {
    await this.drive.files.delete({ fileId })
  }

  async getFile(fileId: string) {
    const response = await this.drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size, webViewLink, createdTime',
    })
    return response.data
  }
}
```

**Service Account Auth:**
```typescript
// /lib/integrations/google-drive/auth.ts
import { google } from 'googleapis'

export function getServiceAccountAuth() {
  const credentials = JSON.parse(
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY!
  )

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  })

  return auth
}
```

**Server Action:**
```typescript
// /app/dashboard/documents/actions.ts
'use server'

import { GoogleDriveClient } from '@/lib/integrations/google-drive/client'
import { verifySession, getCurrentClientId } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function uploadDocument(formData: FormData) {
  const { userId } = await verifySession()
  const clientId = await getCurrentClientId()

  const file = formData.get('file') as File
  const title = formData.get('title') as string

  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Upload to Google Drive
  const driveClient = new GoogleDriveClient()
  const driveFile = await driveClient.uploadFile(
    buffer,
    file.name,
    file.type,
    process.env.GOOGLE_DRIVE_FOLDER_ID! // Root folder for client docs
  )

  // Save metadata to database
  await prisma.document.create({
    data: {
      clientId,
      title,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      fileUrl: driveFile.webViewLink!,
      driveFileId: driveFile.id!, // NEW FIELD
      uploadedBy: userId,
      status: 'PENDING',
    },
  })

  revalidatePath('/dashboard/documents')
  return { success: true }
}
```

#### Data Persistence

**Schema Changes Required:**
```prisma
model Document {
  // ... existing fields
  fileUrl     String    // Change to Google Drive webViewLink
  driveFileId String?   // NEW: Google Drive file ID for deletion
  folderId    String?   // Already exists, maps to Drive folder
}
```

**Storage Strategy:**
- Store file metadata in Document table
- Store Google Drive file ID for deletion operations
- Store webViewLink for display/download
- Organize files by client in separate Drive folders

#### Token Management

**Approach:** Service Account with JSON key file

**Storage:**
- Environment variable: `GOOGLE_SERVICE_ACCOUNT_KEY` (JSON string)
- Stored in Vercel project settings
- Never exposed to client
- Scopes: `drive.file` (access only to files created by app)

**Setup Steps:**
1. Create Service Account in Google Cloud Console
2. Enable Google Drive API
3. Generate JSON key file
4. Add entire JSON as environment variable
5. Share Drive folder with service account email

### 3. Stripe Integration

**Purpose:** Payment processing, subscriptions, and billing

#### Component Structure

```
/lib/integrations/stripe/
├── client.ts              # StripeClient class
├── webhooks.ts            # Webhook event handlers
├── types.ts               # Stripe event types
└── utils.ts               # Price formatting, helpers

/app/api/webhooks/stripe/
└── route.ts               # Webhook endpoint
```

#### Data Flow - Checkout

```
[Billing Page] (Client Component)
    ↓ (user clicks "Subscribe")
[createCheckoutSession()] (Server Action)
    ↓
[Stripe.checkout.sessions.create()]
    ↓ (creates session)
[Redirect user to Stripe Checkout]
    ↓ (user completes payment)
[Stripe Webhook: checkout.session.completed]
    ↓
[/api/webhooks/stripe/route.ts]
    ↓ (verify signature)
[Update Subscription in Prisma]
    ↓
[Redirect user to success page]
```

#### Data Flow - Webhooks

```
[Stripe Event] (e.g., invoice.paid, subscription.updated)
    ↓
[POST /api/webhooks/stripe]
    ↓ (verify signature with stripe.webhooks.constructEvent)
[handleWebhookEvent(event)]
    ↓ (switch on event.type)
[Update database based on event type]
    ↓
[Return 200 OK to Stripe]
```

#### Implementation Details

**API Client:**
```typescript
// /lib/integrations/stripe/client.ts
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28',
  typescript: true,
})

export class StripeService {
  async createCheckoutSession(clientId: string, priceId: string) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { user: true },
    })

    // Create or retrieve Stripe customer
    let customerId = client?.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: client!.user.email,
        metadata: { clientId },
      })
      customerId = customer.id

      // Store customer ID
      await prisma.client.update({
        where: { id: clientId },
        data: { stripeCustomerId: customerId },
      })
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/billing/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/billing`,
      metadata: { clientId },
    })

    return session.url
  }

  async cancelSubscription(subscriptionId: string) {
    return await stripe.subscriptions.cancel(subscriptionId)
  }

  async createInvoice(clientId: string, amount: number, description: string) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { stripeCustomerId: true },
    })

    if (!client?.stripeCustomerId) {
      throw new Error('No Stripe customer found')
    }

    const invoice = await stripe.invoices.create({
      customer: client.stripeCustomerId,
      collection_method: 'send_invoice',
      days_until_due: 30,
      metadata: { clientId },
    })

    await stripe.invoiceItems.create({
      customer: client.stripeCustomerId,
      amount: amount * 100, // Convert to cents
      currency: 'usd',
      description,
      invoice: invoice.id,
    })

    return await stripe.invoices.finalizeInvoice(invoice.id)
  }
}
```

**Webhook Handler:**
```typescript
// /app/api/webhooks/stripe/route.ts
import { NextRequest } from 'next/server'
import { stripe } from '@/lib/integrations/stripe/client'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const clientId = session.metadata?.clientId

      if (clientId) {
        await prisma.subscription.upsert({
          where: { stripeSubscriptionId: session.subscription as string },
          create: {
            clientId,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            status: 'active',
          },
          update: {
            status: 'active',
          },
        })
      }
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object
      await prisma.subscription.update({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
      })
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object
      await prisma.subscription.update({
        where: { stripeSubscriptionId: subscription.id },
        data: { status: 'canceled' },
      })
      break
    }

    case 'invoice.paid': {
      const invoice = event.data.object
      const clientId = invoice.metadata?.clientId

      if (clientId) {
        await prisma.invoice.update({
          where: { stripeInvoiceId: invoice.id },
          data: {
            status: 'PAID',
            paidAt: new Date(invoice.status_transitions.paid_at! * 1000),
          },
        })
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object
      await prisma.invoice.update({
        where: { stripeInvoiceId: invoice.id },
        data: { status: 'OVERDUE' },
      })
      break
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 })
}
```

#### Data Persistence

**Schema Changes Required:**
```prisma
model Client {
  // ... existing fields
  stripeCustomerId String? @unique  // NEW: Stripe customer ID
}

model Subscription {
  // ... existing fields (already has stripeCustomerId, stripeSubscriptionId)
  stripePriceId        String?    // NEW: Track which price tier
}

model Invoice {
  // ... existing fields (already has stripeInvoiceId)
  // No changes needed
}
```

**Storage Strategy:**
- Store Stripe customer ID on Client for all future operations
- Store subscription details in Subscription table
- Store invoice metadata in Invoice table
- Webhook events update database (source of truth for subscription status)

#### Token Management

**Keys Required:**
1. **Secret Key**: `STRIPE_SECRET_KEY` (server-side API calls)
2. **Publishable Key**: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (client-side Checkout)
3. **Webhook Secret**: `STRIPE_WEBHOOK_SECRET` (signature verification)

**Storage:**
- Environment variables in Vercel
- Webhook secret obtained from Stripe Dashboard
- Test and production keys stored separately

**Setup Steps:**
1. Create Stripe account
2. Get API keys from Dashboard
3. Set up webhook endpoint in Stripe Dashboard
4. Add webhook secret to environment
5. Configure webhook events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`

### 4. Resend Email Integration

**Purpose:** Transactional emails for client onboarding and notifications

#### Component Structure

```
/lib/integrations/resend/
├── client.ts              # ResendClient wrapper
├── templates/             # React Email templates
│   ├── welcome.tsx
│   ├── milestone-update.tsx
│   └── invoice-sent.tsx
└── send.ts                # Helper functions for common emails
```

#### Data Flow

```
[Trigger Event] (e.g., new client signup, milestone complete)
    ↓
[Server Action or background job]
    ↓
[sendWelcomeEmail(email, data)]
    ↓
[Render React Email template]
    ↓
[resend.emails.send()]
    ↓
[Resend API sends email]
    ↓
[Return success/failure]
```

#### Implementation Details

**API Client:**
```typescript
// /lib/integrations/resend/client.ts
import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY!)
```

**Email Templates:**
```typescript
// /lib/integrations/resend/templates/welcome.tsx
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
} from '@react-email/components'

interface WelcomeEmailProps {
  clientName: string
  loginUrl: string
}

export default function WelcomeEmail({ clientName, loginUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f6f9fc' }}>
        <Container>
          <Section>
            <Text>Welcome to BaseAim, {clientName}!</Text>
            <Text>
              Your client dashboard is ready. Track your campaign progress,
              view metrics, and manage documents all in one place.
            </Text>
            <Button href={loginUrl}>Access Your Dashboard</Button>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
```

**Send Helper:**
```typescript
// /lib/integrations/resend/send.ts
import { resend } from './client'
import WelcomeEmail from './templates/welcome'
import { render } from '@react-email/render'

export async function sendWelcomeEmail(
  to: string,
  clientName: string
) {
  const html = render(
    WelcomeEmail({
      clientName,
      loginUrl: `${process.env.NEXT_PUBLIC_URL}/login`
    })
  )

  const { data, error } = await resend.emails.send({
    from: 'BaseAim <onboarding@baseaim.com>',
    to,
    subject: 'Welcome to BaseAim',
    html,
  })

  if (error) {
    console.error('Failed to send welcome email:', error)
    throw new Error('Failed to send email')
  }

  return data
}

export async function sendMilestoneUpdateEmail(
  to: string,
  milestoneName: string,
  status: string
) {
  const { data, error } = await resend.emails.send({
    from: 'BaseAim <updates@baseaim.com>',
    to,
    subject: `Milestone Update: ${milestoneName}`,
    html: render(
      MilestoneUpdateEmail({ milestoneName, status })
    ),
  })

  if (error) {
    console.error('Failed to send milestone email:', error)
    throw new Error('Failed to send email')
  }

  return data
}
```

**Usage in Server Action:**
```typescript
// /app/admin/clients/actions.ts
'use server'

import { sendWelcomeEmail } from '@/lib/integrations/resend/send'

export async function createClient(formData: FormData) {
  // ... create client in database

  // Send welcome email
  try {
    await sendWelcomeEmail(email, companyName)
  } catch (error) {
    // Log error but don't fail the client creation
    console.error('Welcome email failed:', error)
  }

  return { success: true }
}
```

#### Data Persistence

**No database changes required** - emails are fire-and-forget

**Optional tracking:**
```prisma
model EmailLog {
  id         String   @id @default(cuid())
  to         String
  subject    String
  template   String
  sentAt     DateTime @default(now())
  resendId   String?  // Resend email ID for tracking
  error      String?

  @@map("email_logs")
}
```

#### Token Management

**Key Required:**
- `RESEND_API_KEY` (server-side only)

**Storage:**
- Environment variable in Vercel
- Never exposed to client

**Setup Steps:**
1. Create Resend account
2. Verify domain (baseaim.com)
3. Get API key from dashboard
4. Add to environment variables

### 5. Chat Service Linking (Telegram/WhatsApp)

**Purpose:** Provide external chat links in dashboard

#### Component Structure

```
/lib/integrations/chat/
├── types.ts               # ChatLink type definitions
└── utils.ts               # URL generation helpers
```

#### Data Flow

```
[Settings Page] (Client Component)
    ↓
[Display chat links from database]
    ↓
[Click link → Open in new tab]
    ↓
[External: Telegram/WhatsApp]
```

#### Implementation Details

**No API Integration** - Just URL generation and storage

**URL Helpers:**
```typescript
// /lib/integrations/chat/utils.ts
export function generateTelegramLink(username: string): string {
  return `https://t.me/${username}`
}

export function generateWhatsAppLink(phoneNumber: string): string {
  // Format: remove spaces, add country code
  const formatted = phoneNumber.replace(/\s/g, '')
  return `https://wa.me/${formatted}`
}
```

**Usage:**
```typescript
// /app/dashboard/settings/page.tsx
import { generateTelegramLink } from '@/lib/integrations/chat/utils'

export default async function SettingsPage() {
  const client = await getClient()

  const telegramLink = client.telegramUsername
    ? generateTelegramLink(client.telegramUsername)
    : null

  return (
    <div>
      {telegramLink && (
        <a href={telegramLink} target="_blank">
          Message us on Telegram
        </a>
      )}
    </div>
  )
}
```

#### Data Persistence

**Schema Changes Required:**
```prisma
model Client {
  // ... existing fields
  telegramUsername String?   // NEW: e.g., "baseaimsupport"
  whatsappNumber   String?   // NEW: e.g., "+1234567890"
}
```

**Storage Strategy:**
- Store chat identifiers in Client table
- Generate links dynamically (no external API calls)
- Admin updates via settings page

#### Token Management

**None required** - public URL generation only

## Recommended Project Structure

```
/app/
├── dashboard/
│   ├── analytics/              # Facebook Ads metrics
│   ├── documents/              # Google Drive uploads
│   │   └── actions.ts          # Upload/delete Server Actions
│   ├── billing/                # Stripe checkout/invoices
│   │   └── actions.ts          # Checkout Session creation
│   └── settings/               # Chat links display
├── admin/
│   └── clients/
│       └── actions.ts          # Client creation (triggers email)
└── api/
    └── webhooks/
        └── stripe/
            └── route.ts        # Stripe webhook handler

/lib/
├── dal.ts                      # Existing DAL functions
├── prisma.ts                   # Existing Prisma client
└── integrations/
    ├── facebook/
    │   ├── client.ts           # FacebookAdsClient
    │   ├── types.ts
    │   └── cache.ts
    ├── google-drive/
    │   ├── client.ts           # GoogleDriveClient
    │   ├── auth.ts             # Service account auth
    │   └── types.ts
    ├── stripe/
    │   ├── client.ts           # StripeService
    │   ├── webhooks.ts         # Event handlers
    │   └── types.ts
    ├── resend/
    │   ├── client.ts           # Resend instance
    │   ├── send.ts             # Helper functions
    │   └── templates/
    │       ├── welcome.tsx
    │       ├── milestone-update.tsx
    │       └── invoice-sent.tsx
    └── chat/
        ├── types.ts
        └── utils.ts            # Link generators
```

### Structure Rationale

- **`/lib/integrations/[service]/`:** Centralized location for all external API clients, following single-responsibility principle
- **`client.ts`:** Contains the API client class/instance and core methods
- **Server Actions co-located:** Actions stay in `/app` routes near their usage for clarity
- **Webhooks in `/app/api/`:** Route Handlers for external webhook endpoints that don't fit Server Actions pattern
- **Templates in integration folders:** React Email templates live with Resend integration for cohesion

## Architectural Patterns

### Pattern 1: Server Component Direct Fetching

**What:** Fetch external API data directly in Server Components without intermediate API routes

**When to use:**
- Read-only operations (display metrics, documents)
- Data needed for initial page render
- No client-side interaction required

**Trade-offs:**
- **Pro:** Simpler architecture, fewer network hops, secrets stay server-side
- **Pro:** Automatic request deduplication via React cache()
- **Con:** Can't be called from client components

**Example:**
```typescript
// /app/dashboard/analytics/page.tsx
import { FacebookAdsClient } from '@/lib/integrations/facebook/client'

export default async function AnalyticsPage() {
  // Fetch directly in Server Component
  const fbClient = new FacebookAdsClient()
  const metrics = await fbClient.getCampaignMetrics(adAccountId)

  return <MetricsDisplay data={metrics} />
}
```

### Pattern 2: Server Actions for Mutations

**What:** Use Server Actions for all mutation operations with external APIs

**When to use:**
- User-initiated actions (upload, payment, delete)
- Form submissions
- Operations requiring revalidation

**Trade-offs:**
- **Pro:** Built-in CSRF protection, type-safe, progressive enhancement
- **Pro:** Easy to revalidate cache with revalidatePath()
- **Con:** Only supports POST method

**Example:**
```typescript
// /app/dashboard/documents/actions.ts
'use server'

import { revalidatePath } from 'next/cache'

export async function uploadDocument(formData: FormData) {
  // 1. Verify session
  const { userId } = await verifySession()

  // 2. Upload to Google Drive
  const driveClient = new GoogleDriveClient()
  const file = await driveClient.uploadFile(...)

  // 3. Save to database
  await prisma.document.create({ data: { ... } })

  // 4. Revalidate cache
  revalidatePath('/dashboard/documents')

  return { success: true }
}
```

### Pattern 3: Route Handlers for Webhooks

**What:** Use Route Handlers (not Server Actions) for external webhook endpoints

**When to use:**
- Receiving events from external services (Stripe)
- Need to verify signatures
- External service makes the request

**Trade-offs:**
- **Pro:** Full control over HTTP method, headers, response
- **Pro:** Can verify webhook signatures
- **Con:** Requires manual CSRF protection (not needed for webhooks)

**Example:**
```typescript
// /app/api/webhooks/stripe/route.ts
export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  // Verify signature
  const event = stripe.webhooks.constructEvent(body, signature, secret)

  // Handle event
  await handleEvent(event)

  return new Response('OK', { status: 200 })
}
```

### Pattern 4: Service Client Singleton

**What:** Instantiate API clients as singletons or fresh instances based on statefulness

**When to use:**
- Stateless clients (Stripe, Resend): Singleton
- Stateful clients (Facebook, Google): Fresh instance or singleton with immutable config

**Trade-offs:**
- **Pro:** Reduces instantiation overhead
- **Con:** Must ensure no mutable state between requests

**Example:**
```typescript
// Singleton pattern (Stripe)
// /lib/integrations/stripe/client.ts
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Fresh instance pattern (Google Drive)
// /lib/integrations/google-drive/client.ts
export function createDriveClient() {
  return google.drive({ version: 'v3', auth: getAuth() })
}
```

### Pattern 5: Caching with 'use cache'

**What:** Use Next.js 16's `'use cache'` directive for expensive external API calls

**When to use:**
- Read-only data that changes infrequently (campaign metrics)
- Expensive API calls with rate limits
- Data acceptable to be stale for N minutes

**Trade-offs:**
- **Pro:** Reduces API calls, improves performance
- **Pro:** Built-in cache invalidation
- **Con:** Data may be stale

**Example:**
```typescript
// /lib/integrations/facebook/client.ts
'use cache'
export async function getCachedCampaignMetrics(adAccountId: string) {
  const fbClient = new FacebookAdsClient()
  return await fbClient.getCampaignMetrics(adAccountId)
}

// Automatically cached for default duration
// Can specify: export const revalidate = 900 // 15 minutes
```

## Data Flow Diagrams

### Integration Build Order

```
Phase 1: Foundation (No external dependencies)
│
├─ Chat Links (Simple: just DB fields + URL generation)
│
Phase 2: Email Infrastructure (Enables onboarding)
│
├─ Resend Integration
│  └─ Email templates
│  └─ Server Action integration
│
Phase 3: Document Storage (Replaces Vercel Blob)
│
├─ Google Drive Integration
│  └─ Service account setup
│  └─ Upload/delete Server Actions
│  └─ Document migration from Vercel Blob
│
Phase 4: Payment Processing (Subscription dependency)
│
├─ Stripe Integration
│  └─ Customer creation
│  └─ Checkout sessions
│  └─ Webhook handlers
│  └─ Subscription management
│
Phase 5: Analytics (Requires client ad accounts)
│
└─ Facebook Ads Integration
   └─ System User token setup
   └─ Metrics fetching
   └─ Caching layer
```

**Rationale:**
1. **Chat links first:** Zero external dependencies, pure data storage
2. **Resend second:** Enables client onboarding emails, simple integration
3. **Google Drive third:** Core functionality replacement, needed before production
4. **Stripe fourth:** Complex with webhooks, depends on email for receipts
5. **Facebook last:** Requires client ad accounts (not available initially), metrics are nice-to-have

### Full Request Flow Example: Document Upload

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER INTERACTION (Client Component)                          │
│    <UploadForm onSubmit={(formData) => uploadDocument(formData)}│
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. SERVER ACTION (/app/dashboard/documents/actions.ts)          │
│    'use server'                                                  │
│    async function uploadDocument(formData: FormData)             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. SESSION VERIFICATION (DAL)                                    │
│    const { userId } = await verifySession()                      │
│    const clientId = await getCurrentClientId()                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. FILE PROCESSING                                               │
│    const file = formData.get('file') as File                     │
│    const buffer = Buffer.from(await file.arrayBuffer())          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. EXTERNAL API CALL (Google Drive)                              │
│    const driveClient = new GoogleDriveClient()                   │
│    const driveFile = await driveClient.uploadFile(...)           │
│    → Returns: { id, webViewLink, size }                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. DATABASE PERSISTENCE (Prisma)                                 │
│    await prisma.document.create({                                │
│      data: {                                                     │
│        clientId, fileUrl: driveFile.webViewLink,                 │
│        driveFileId: driveFile.id, ...                            │
│      }                                                           │
│    })                                                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. CACHE INVALIDATION                                            │
│    revalidatePath('/dashboard/documents')                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. RESPONSE                                                      │
│    return { success: true }                                      │
│    → Client component updates UI                                │
└─────────────────────────────────────────────────────────────────┘
```

### Webhook Flow Example: Stripe Subscription Updated

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. EXTERNAL EVENT (Stripe)                                       │
│    User's payment method charged → subscription renewed          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. WEBHOOK REQUEST (Stripe → Next.js)                            │
│    POST /api/webhooks/stripe                                     │
│    Headers: stripe-signature                                     │
│    Body: JSON event data                                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. SIGNATURE VERIFICATION (Route Handler)                        │
│    const event = stripe.webhooks.constructEvent(                 │
│      body, signature, WEBHOOK_SECRET                             │
│    )                                                             │
│    → Throws error if invalid                                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. EVENT ROUTING (Switch statement)                              │
│    switch (event.type) {                                         │
│      case 'customer.subscription.updated': ...                   │
│      case 'invoice.paid': ...                                    │
│    }                                                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. DATABASE UPDATE (Prisma)                                      │
│    await prisma.subscription.update({                            │
│      where: { stripeSubscriptionId: ... },                       │
│      data: { status: 'active', currentPeriodEnd: ... }           │
│    })                                                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. ACKNOWLEDGMENT                                                │
│    return new Response('OK', { status: 200 })                    │
│    → Stripe marks webhook as delivered                           │
└─────────────────────────────────────────────────────────────────┘
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **1-10 clients** | Current architecture sufficient. All integrations run synchronously in Server Actions/Components. Cache Facebook metrics for 15 min. |
| **10-100 clients** | 1. Move Facebook metrics sync to background cron job (Vercel Cron)<br>2. Add Redis for distributed caching<br>3. Implement rate limiting for external APIs<br>4. Consider Google Drive folder-per-client organization |
| **100+ clients** | 1. Extract integrations to separate microservices<br>2. Use message queue (BullMQ, Inngest) for async operations<br>3. Implement webhook retry logic with exponential backoff<br>4. Consider CDN for Google Drive file serving<br>5. Move to Stripe Connect for multi-account support |

### Scaling Priorities

1. **First bottleneck: Facebook API rate limits**
   - **Symptoms:** 429 errors when multiple clients view analytics simultaneously
   - **Solution:** Implement background cron job to sync metrics every 30 min, store in database
   - **Cost:** Add `CampaignMetrics` table to Prisma schema

2. **Second bottleneck: Google Drive API quotas**
   - **Symptoms:** Upload failures during high activity
   - **Solution:** Implement upload queue with retry logic, batch operations
   - **Cost:** Add job queue infrastructure (Inngest or BullMQ)

3. **Third bottleneck: Stripe webhook processing**
   - **Symptoms:** Webhook timeouts, missed events
   - **Solution:** Acknowledge webhook immediately, process asynchronously in queue
   - **Cost:** Background job infrastructure, webhook event log table

## Anti-Patterns

### Anti-Pattern 1: Client-Side API Key Exposure

**What people do:** Store API keys in `NEXT_PUBLIC_*` environment variables to call APIs from client components

**Why it's wrong:**
- Exposes secrets in browser
- Allows unauthorized usage of your API quota
- Security vulnerability

**Do this instead:**
```typescript
// ❌ WRONG
// Client component
'use client'
const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_KEY) // EXPOSED!

// ✅ CORRECT
// Server Action
'use server'
export async function createCheckout() {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY) // Server-only
  return await stripe.checkout.sessions.create(...)
}
```

### Anti-Pattern 2: Mixing Route Handlers and Server Actions Unnecessarily

**What people do:** Create API routes for mutations instead of using Server Actions

**Why it's wrong:**
- More boilerplate (separate route file, fetch call, error handling)
- No automatic CSRF protection
- No progressive enhancement
- Type safety requires extra work

**Do this instead:**
```typescript
// ❌ WRONG
// /app/api/upload/route.ts
export async function POST(req: Request) {
  const formData = await req.formData()
  // ... upload logic
  return Response.json({ success: true })
}

// Client component
const handleUpload = async (formData) => {
  const res = await fetch('/api/upload', { method: 'POST', body: formData })
  return res.json()
}

// ✅ CORRECT
// /app/dashboard/documents/actions.ts
'use server'
export async function uploadDocument(formData: FormData) {
  // ... upload logic
  return { success: true }
}

// Client component
import { uploadDocument } from './actions'
const handleUpload = async (formData) => {
  return await uploadDocument(formData)
}
```

**Exception:** Use Route Handlers for webhooks (external POST requests) and public APIs.

### Anti-Pattern 3: Storing External Data Without Expiry

**What people do:** Cache external API responses in database indefinitely without refresh logic

**Why it's wrong:**
- Data becomes stale
- No sync with source of truth
- Database bloat

**Do this instead:**
```typescript
// ❌ WRONG
// Store metrics in DB, never refresh
await prisma.campaignMetrics.create({ data: metrics })

// ✅ CORRECT
// Use 'use cache' with revalidation
'use cache'
export async function getCampaignMetrics() {
  const fbClient = new FacebookAdsClient()
  return await fbClient.getCampaignMetrics(adAccountId)
}
export const revalidate = 900 // 15 minutes
```

### Anti-Pattern 4: Synchronous External API Calls in Loops

**What people do:** Call external APIs in loops without batching or parallelization

**Why it's wrong:**
- Slow (sequential network calls)
- Rate limit violations
- Poor user experience

**Do this instead:**
```typescript
// ❌ WRONG
for (const client of clients) {
  const metrics = await fbClient.getCampaignMetrics(client.adAccountId)
}

// ✅ CORRECT
const metricsPromises = clients.map(client =>
  fbClient.getCampaignMetrics(client.adAccountId)
)
const metricsResults = await Promise.all(metricsPromises)
```

### Anti-Pattern 5: Ignoring Webhook Idempotency

**What people do:** Process webhook events without checking for duplicates

**Why it's wrong:**
- Stripe (and others) retry webhooks on failure
- Same event can be processed multiple times
- Duplicate charges, incorrect state

**Do this instead:**
```typescript
// ❌ WRONG
case 'checkout.session.completed':
  await prisma.subscription.create({ data: {...} }) // Fails on retry!

// ✅ CORRECT
case 'checkout.session.completed':
  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: session.subscription },
    create: { ... },
    update: { ... }, // Idempotent
  })
```

## Integration Points

### External Services

| Service | Integration Pattern | Auth Method | Notes |
|---------|---------------------|-------------|-------|
| **Facebook Ads API** | Server Component direct fetch | System User Token (long-lived) | Use `'use cache'` for 15-min caching. Rate limit: 200 calls/hour per user. |
| **Google Drive API** | Server Action (upload/delete) | Service Account (JSON key) | Quota: 1B requests/day project-wide. Share folder with service account email. |
| **Stripe** | Server Action + Webhook | Secret Key + Webhook Secret | Always verify webhook signatures. Use idempotent operations. |
| **Resend** | Server Action (fire-and-forget) | API Key | No webhook needed. 100 emails/day free tier. |
| **Chat Links** | Pure client-side (static links) | None | No API integration, just URL generation. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **Server Component ↔ DAL** | Direct function call | DAL functions wrapped in React cache() for deduplication |
| **Client Component ↔ Server Action** | Function import/call | Next.js handles serialization, supports FormData and JSON |
| **Server Action ↔ Integration Service** | Direct class instantiation | Services are stateless or singleton, safe for concurrent use |
| **Integration Service ↔ Prisma** | Direct prisma.model.method() | All DB operations go through Prisma for type safety |
| **External Webhook ↔ Route Handler** | HTTP POST | Signature verification required before processing |

## Token/Secrets Management

### Environment Variables Required

```env
# Facebook Ads
FACEBOOK_ACCESS_TOKEN=                # System User Token (long-lived, non-expiring)

# Google Drive
GOOGLE_SERVICE_ACCOUNT_KEY=           # JSON string of service account credentials
GOOGLE_DRIVE_FOLDER_ID=               # Root folder ID for client documents

# Stripe
STRIPE_SECRET_KEY=                    # Secret key (server-side)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=   # Publishable key (client-side Checkout)
STRIPE_WEBHOOK_SECRET=                # Webhook signature verification secret

# Resend
RESEND_API_KEY=                       # API key (server-side)

# App
NEXT_PUBLIC_URL=                      # Base URL for email links, redirects
```

### Security Best Practices

1. **Never use `NEXT_PUBLIC_` for secrets**
   - Only use for truly public values (Stripe publishable key, public URL)
   - Server-side secrets must NOT have this prefix

2. **Rotate tokens regularly**
   - Stripe: Rotate every 90 days
   - Facebook: Monitor for suspicious activity, rotate if compromised
   - Google: Service accounts less critical but rotate annually

3. **Use Vercel's encrypted environment variables**
   - Production secrets stored in Vercel dashboard
   - Never commit secrets to git
   - Use `.env.local` for development (gitignored)

4. **Verify webhook signatures**
   - Always use `stripe.webhooks.constructEvent()` for signature verification
   - Reject requests with invalid signatures immediately
   - Log failed verification attempts

5. **Principle of least privilege**
   - Facebook: Request only `ads_read` scope (not `ads_management`)
   - Google: Use `drive.file` scope (only files created by app)
   - Stripe: Use restricted API keys if available

## Background Jobs & Cron Requirements

### Current Architecture (1-10 clients)

**No background jobs needed initially.** All integrations work synchronously:

- Facebook metrics: Fetched on-demand, cached 15 min
- Google Drive: Upload on user action
- Stripe: Webhook-driven updates
- Email: Fire-and-forget on user action

### Future Architecture (10+ clients)

**When to add background jobs:**
- Facebook metrics sync (30 min cron)
- Stripe subscription status refresh (daily cron)
- Email retry logic (queue-based)

**Implementation Options:**

1. **Vercel Cron Jobs** (simplest, serverless)
   ```json
   // vercel.json
   {
     "crons": [{
       "path": "/api/cron/sync-facebook-metrics",
       "schedule": "*/30 * * * *"
     }]
   }
   ```

2. **Inngest** (recommended for complex jobs)
   - Supports retries, delays, fan-out
   - Built-in observability
   - Free tier: 50k steps/month

3. **BullMQ + Redis** (if self-hosting or complex workflows)
   - Full control, but requires Redis infrastructure
   - Better for high-volume scenarios

**Recommendation:** Start with Vercel Cron for simple scheduled tasks, migrate to Inngest when job complexity increases.

## Caching Strategy

### Per-Integration Caching

| Integration | Cache Strategy | Duration | Invalidation |
|-------------|---------------|----------|--------------|
| **Facebook Ads** | `'use cache'` on metrics fetch | 15 minutes | Time-based (auto) |
| **Google Drive** | No caching (on-demand fetch) | N/A | `revalidatePath()` after upload/delete |
| **Stripe** | No caching (webhook updates DB) | N/A | Webhook updates database directly |
| **Resend** | No caching (fire-and-forget) | N/A | N/A |

### Next.js 16 Caching Features

**Request Memoization:**
- Automatic deduplication of fetch requests within a render
- DAL functions wrapped in `cache()` leverage this

**Data Cache with 'use cache':**
```typescript
'use cache'
export async function getCampaignMetrics(adAccountId: string) {
  // Cached for default duration
}
export const revalidate = 900 // 15 minutes
```

**Route Cache:**
- Dashboard pages automatically cached if fully static
- Use `export const dynamic = 'force-dynamic'` to opt-out

**Cache Tags (advanced):**
```typescript
import { unstable_cacheTag as cacheTag } from 'next/cache'

export async function getDocuments(clientId: string) {
  cacheTag(`documents-${clientId}`)
  return await prisma.document.findMany({ where: { clientId } })
}

// Invalidate
import { revalidateTag } from 'next/cache'
revalidateTag(`documents-${clientId}`)
```

## Error Handling Patterns

### External API Error Handling

```typescript
// /lib/integrations/google-drive/client.ts
export class GoogleDriveClient {
  async uploadFile(...) {
    try {
      const response = await this.drive.files.create({ ... })
      return response.data
    } catch (error) {
      if (error.code === 403) {
        throw new Error('Insufficient permissions for Google Drive')
      } else if (error.code === 429) {
        throw new Error('Google Drive rate limit exceeded. Try again later.')
      } else {
        console.error('Google Drive upload failed:', error)
        throw new Error('File upload failed')
      }
    }
  }
}
```

### Server Action Error Handling

```typescript
// /app/dashboard/documents/actions.ts
'use server'

export async function uploadDocument(formData: FormData) {
  try {
    const { userId } = await verifySession()
    // ... upload logic
    return { success: true }
  } catch (error) {
    console.error('Upload failed:', error)

    if (error.message.includes('rate limit')) {
      return { error: 'Too many uploads. Please try again in a few minutes.' }
    }

    return { error: 'Upload failed. Please try again.' }
  }
}
```

### Webhook Error Handling

```typescript
// /app/api/webhooks/stripe/route.ts
export async function POST(req: NextRequest) {
  try {
    const event = stripe.webhooks.constructEvent(...)

    try {
      await handleEvent(event)
    } catch (dbError) {
      // Log but return 200 to prevent Stripe retries
      console.error('DB update failed for webhook:', dbError)
      // Send alert to monitoring system
    }

    return new Response('OK', { status: 200 })
  } catch (signatureError) {
    // Invalid signature - reject
    return new Response('Invalid signature', { status: 400 })
  }
}
```

## Testing Considerations

### Integration Testing Strategy

| Integration | Local Testing | Staging Testing |
|-------------|---------------|-----------------|
| **Facebook Ads** | Use Facebook test ad account | Use production tokens with test account |
| **Google Drive** | Use separate test folder | Use separate staging folder |
| **Stripe** | Use Stripe test mode keys | Use Stripe test mode (separate from prod) |
| **Resend** | Use Resend test mode (free) | Use production with tagged emails |

### Webhook Local Testing

**Stripe CLI for local webhook testing:**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
```

## Sources

**Next.js App Router Patterns:**
- [Routing: API Routes | Next.js](https://nextjs.org/docs/pages/building-your-application/routing/api-routes)
- [Getting Started: Server and Client Components | Next.js](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Server Actions vs Route Handlers in Next.js](https://makerkit.dev/blog/tutorials/server-actions-vs-route-handlers)
- [Next.js 16 Route Handlers Explained: 3 Advanced Use Cases](https://strapi.io/blog/nextjs-16-route-handlers-explained-3-advanced-usecases)

**Caching Strategies:**
- [Guides: Caching | Next.js](https://nextjs.org/docs/app/guides/caching)
- [Directives: use cache | Next.js](https://nextjs.org/docs/app/api-reference/directives/use-cache)
- [Next.js Caching and Rendering: A Complete Guide for 2026](https://future.forem.com/md_marufrahman_3552855e/nextjs-caching-and-rendering-a-complete-guide-for-2026-3ha0)

**Facebook Ads API:**
- [Meta Ads API Integration Guide: Complete Setup 2026 | AdStellar](https://www.adstellar.ai/blog/meta-ads-api-integration-guide)
- [facebook-nodejs-business-sdk - npm](https://www.npmjs.com/package/facebook-nodejs-business-sdk)
- [GitHub - facebook/facebook-nodejs-business-sdk](https://github.com/facebook/facebook-nodejs-business-sdk)

**Google Drive API:**
- [Node.js quickstart | Google Drive | Google for Developers](https://developers.google.com/workspace/drive/api/quickstart/nodejs)
- [googleapis - npm](https://www.npmjs.com/package/googleapis)
- [Next.js Google Drive Integration Guide](https://runitbare.com/connect-next-js-to-google-drive-integration/)

**Stripe Integration:**
- [Stripe Checkout and Webhook in a Next.js 15 (2025)](https://medium.com/@gragson.john/stripe-checkout-and-webhook-in-a-next-js-15-2025-925d7529855e)
- [The complete guide to Stripe and Next.js](https://makerkit.dev/blog/tutorials/guide-nextjs-stripe)
- [stripe - npm](https://www.npmjs.com/package/stripe)
- [Stripe + Next.js 15: The Complete 2025 Guide](https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/)

**Email Service (Resend):**
- [Send emails with Next.js - Resend](https://resend.com/docs/send-with-nextjs)
- [Resend vs SendGrid (2026)](https://www.sequenzy.com/versus/resend-vs-sendgrid)
- [How to Create and Send Email Templates Using React Email and Resend](https://www.freecodecamp.org/news/create-and-send-email-templates-using-react-email-and-resend-in-nextjs/)

**Background Jobs:**
- [Cron Jobs | Vercel](https://vercel.com/docs/cron-jobs)
- [Run Next.js functions in the background - Inngest](https://www.inngest.com/blog/run-nextjs-functions-in-the-background)
- [GitHub - spidgorny/nextjs-croner](https://github.com/spidgorny/nextjs-croner)

**Security & Secrets:**
- [Guides: Data Security | Next.js](https://nextjs.org/docs/app/guides/data-security)
- [Next.js Security Hardening: Five Steps to Bulletproof Your App in 2026](https://medium.com/@widyanandaadi22/next-js-security-hardening-five-steps-to-bulletproof-your-app-in-2026-61e00d4c006e)
- [Token Storage - Auth0 Docs](https://auth0.com/docs/secure/security-guidance/data-security/token-storage)

**Database Schema Patterns:**
- [GitHub - sequin-io/stripe-billing-prisma](https://github.com/sequin-io/stripe-billing-prisma)
- [Processing payments with Stripe and webhooks](https://jonmeyers.io/blog/processing-payments-with-stripe-and-webhooks/)

---
*Architecture research for: BaseAim Client Dashboard v1.0 External Service Integrations*
*Researched: 2026-02-15*
