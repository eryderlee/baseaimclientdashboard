# Survey → Dashboard Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a prospect completes the intake survey, their backend POSTs to `/api/webhooks/survey` which creates a User + Client + ClientIntake record, seeds onboarding milestones, and emails a magic login link — replacing the current Google Sheets call.

**Architecture:** A new API webhook endpoint validates an API key, runs a single DB transaction to create all records, then sends a magic link email fire-and-forget. Magic link auth is wired into the existing NextAuth Credentials provider by accepting a `magicToken` credential alongside the existing email/password path.

**Tech Stack:** Next.js 16 App Router, NextAuth v5 (beta), Prisma 5, Supabase (PostgreSQL), Resend, Zod 4, bcryptjs, `next-auth/react` client-side signIn

---

## File Map

| Status | File | What changes |
|--------|------|-------------|
| Modify | `prisma/seed-milestones.ts` | Replace "Client Onboarding" with "Complete intake" + add "Kickoff call" as order 2, renumber rest 3–7 |
| Modify | `prisma/schema.prisma` | Add `ClientIntake` model + `intake ClientIntake?` relation on `Client` |
| Create | `emails/magic-link-email.tsx` | New welcome/magic-link email template |
| Modify | `lib/email.ts` | Add `sendMagicLinkEmail()` function |
| Modify | `lib/auth.ts` | Extend Credentials `authorize()` to accept `magicToken` credential |
| Create | `app/auth/magic-link/[token]/page.tsx` | RSC: validates token, redirects to expired page or renders consumer |
| Create | `app/auth/magic-link/[token]/magic-link-consumer.tsx` | Client component: calls `signIn('credentials', { magicToken })` on mount |
| Create | `app/auth/magic-link/expired/page.tsx` | Expired token page: "resend link" or "set a password" options |
| Modify | `app/actions/auth.ts` | Add `resendMagicLink(email)` server action |
| Create | `app/api/webhooks/survey/route.ts` | Survey webhook: validates key, creates records, sends magic link |

---

## Task 1: Update STANDARD_MILESTONES

**Files:**
- Modify: `prisma/seed-milestones.ts`

- [ ] **Step 1: Replace the STANDARD_MILESTONES array**

Open `prisma/seed-milestones.ts`. Replace the entire `STANDARD_MILESTONES` array (lines 14–75) with:

```typescript
export const STANDARD_MILESTONES = [
  {
    title: "Complete intake",
    description:
      "Initial intake form completed. We have everything we need to design your kickoff call.",
    order: 1,
    status: "NOT_STARTED" as const,
    progress: 0,
    dueDate: null,
    notes: [],
  },
  {
    title: "Kickoff call",
    description:
      "Walk through the first 30 days, confirm strategy, and make sure it's a fit both ways.",
    order: 2,
    status: "NOT_STARTED" as const,
    progress: 0,
    dueDate: null,
    notes: [],
  },
  {
    title: "Ad Account Setup",
    description:
      "Connect Meta Ads account, grant BaseAim access, and configure tracking pixels.",
    order: 3,
    status: "NOT_STARTED" as const,
    progress: 0,
    dueDate: null,
    notes: [],
  },
  {
    title: "Landing Page Development",
    description:
      "Design and build conversion-optimised landing pages tailored to your campaigns and target audience.",
    order: 4,
    status: "NOT_STARTED" as const,
    progress: 0,
    dueDate: null,
    notes: [],
  },
  {
    title: "Campaign Build",
    description:
      "Create ad campaigns, define audiences, develop ad creatives, and set up conversion tracking.",
    order: 5,
    status: "NOT_STARTED" as const,
    progress: 0,
    dueDate: null,
    notes: [],
  },
  {
    title: "Launch",
    description:
      "Go live with your ad campaigns, monitor initial performance, and make early optimisations.",
    order: 6,
    status: "NOT_STARTED" as const,
    progress: 0,
    dueDate: null,
    notes: [],
  },
  {
    title: "Ongoing Optimisation",
    description:
      "Continuous improvement of ad performance, regular reporting, scaling successful campaigns, and testing new strategies.",
    order: 7,
    status: "NOT_STARTED" as const,
    progress: 0,
    dueDate: null,
    notes: [],
  },
]
```

- [ ] **Step 2: Verify the admin client creation still compiles**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors related to `STANDARD_MILESTONES` or `app/admin/actions.ts`.

- [ ] **Step 3: Commit**

```bash
git add prisma/seed-milestones.ts
git commit -m "feat: update standard milestones — add Complete intake + Kickoff call, renumber to 7 phases"
```

---

## Task 2: Add ClientIntake to Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the `ClientIntake` model to schema.prisma**

At the end of `prisma/schema.prisma`, after the `PasswordResetToken` model, add:

```prisma
model ClientIntake {
  id                  String    @id @default(cuid())
  clientId            String    @unique
  decisionMaker       String
  state               String
  servicesOffered     Json
  hasRunPaidAds       Boolean
  hasSocialPage       Boolean
  targetServices      Json
  idealClients        Json
  excludedClientTypes String?
  monthlyCapacity     String
  goals90Day          Json
  currentSituation    Json
  mainConcern         String?
  kickoffCallBooked   Boolean   @default(false)
  kickoffCallDate     DateTime?
  createdAt           DateTime  @default(now())

  client              Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@map("client_intakes")
  @@index([clientId])
}
```

- [ ] **Step 2: Add the relation to the Client model**

In `prisma/schema.prisma`, find the `Client` model's relations block (after `subscriptions Subscription[]`) and add:

```prisma
  intake          ClientIntake?
```

The Client model's relations block should now look like:
```prisma
  // Relations
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  documents       Document[]
  milestones      Milestone[]
  invoices        Invoice[]
  subscriptions   Subscription[]
  intake          ClientIntake?
```

- [ ] **Step 3: Run Prisma generate to regenerate the client types**

```bash
npx prisma generate
```

Expected output: `✔ Generated Prisma Client` with no errors.

- [ ] **Step 4: Run the following SQL in the Supabase SQL Editor**

In your Supabase dashboard → SQL Editor, run this query exactly:

```sql
CREATE TABLE "client_dashboard"."client_intakes" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "decisionMaker" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "servicesOffered" JSONB NOT NULL DEFAULT '[]',
  "hasRunPaidAds" BOOLEAN NOT NULL DEFAULT false,
  "hasSocialPage" BOOLEAN NOT NULL DEFAULT false,
  "targetServices" JSONB NOT NULL DEFAULT '[]',
  "idealClients" JSONB NOT NULL DEFAULT '[]',
  "excludedClientTypes" TEXT,
  "monthlyCapacity" TEXT NOT NULL,
  "goals90Day" JSONB NOT NULL DEFAULT '[]',
  "currentSituation" JSONB NOT NULL DEFAULT '[]',
  "mainConcern" TEXT,
  "kickoffCallBooked" BOOLEAN NOT NULL DEFAULT false,
  "kickoffCallDate" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "client_intakes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "client_intakes_clientId_key" UNIQUE ("clientId"),
  CONSTRAINT "client_intakes_clientId_fkey"
    FOREIGN KEY ("clientId")
    REFERENCES "client_dashboard"."clients"("id")
    ON DELETE CASCADE
);

CREATE INDEX "client_intakes_clientId_idx"
  ON "client_dashboard"."client_intakes"("clientId");
```

Expected: `Success. No rows returned.`

- [ ] **Step 5: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add ClientIntake model to Prisma schema"
```

---

## Task 3: Magic Link Email Template

**Files:**
- Create: `emails/magic-link-email.tsx`
- Modify: `lib/email.ts`

- [ ] **Step 1: Create the magic link email template**

Create `emails/magic-link-email.tsx`:

```typescript
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
```

- [ ] **Step 2: Add sendMagicLinkEmail to lib/email.ts**

In `lib/email.ts`, add the import at the top (after the existing imports):

```typescript
import { MagicLinkEmail } from '@/emails/magic-link-email'
```

Then add this function at the end of the file:

```typescript
interface MagicLinkEmailParams {
  clientName: string
  email: string
  magicLinkUrl: string
}

/**
 * Send magic link welcome email to survey-created clients
 * No credentials — single button to access dashboard
 * Link expires in 72 hours
 */
export async function sendMagicLinkEmail({
  clientName,
  email,
  magicLinkUrl,
}: MagicLinkEmailParams): Promise<SendEmailResult> {
  return sendEmail({
    to: email,
    subject: "You're in — access your BaseAim dashboard",
    react: MagicLinkEmail({ clientName, magicLinkUrl }),
  })
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add emails/magic-link-email.tsx lib/email.ts
git commit -m "feat: add magic link email template and sendMagicLinkEmail function"
```

---

## Task 4: Extend NextAuth to Accept magicToken

**Files:**
- Modify: `lib/auth.ts`

- [ ] **Step 1: Add magicToken support to the Credentials authorize function**

Replace the entire contents of `lib/auth.ts` with:

```typescript
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        magicToken: { label: "Magic Token", type: "text" },
      },
      async authorize(credentials) {
        // --- Magic link path ---
        if (credentials?.magicToken) {
          const magicToken = credentials.magicToken as string

          // Atomically validate + consume the token
          const user = await prisma.$transaction(async (tx) => {
            const tokenRecord = await tx.passwordResetToken.findUnique({
              where: { token: magicToken },
            })

            if (!tokenRecord || tokenRecord.expiresAt < new Date()) return null

            const foundUser = await tx.user.findUnique({
              where: { email: tokenRecord.email },
            })

            if (!foundUser) return null

            // Delete token — one-use only
            await tx.passwordResetToken.delete({
              where: { token: magicToken },
            })

            return foundUser
          })

          if (!user) return null

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image,
          }
        }

        // --- Email + password path (unchanged) ---
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { clientProfile: true },
        })

        if (!user) {
          return null
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isValidPassword) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/auth.ts
git commit -m "feat: extend NextAuth credentials to accept magicToken for magic link sign-in"
```

---

## Task 5: Magic Link Pages + Resend Action

**Files:**
- Create: `app/auth/magic-link/[token]/page.tsx`
- Create: `app/auth/magic-link/[token]/magic-link-consumer.tsx`
- Create: `app/auth/magic-link/expired/page.tsx`
- Modify: `app/actions/auth.ts`

- [ ] **Step 1: Create the magic link consumer client component**

Create `app/auth/magic-link/[token]/magic-link-consumer.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'

interface MagicLinkConsumerProps {
  token: string
}

/**
 * Calls signIn('credentials', { magicToken }) on mount.
 * NextAuth contacts authorize(), which atomically validates + deletes the token,
 * then redirects to /dashboard on success.
 */
export function MagicLinkConsumer({ token }: MagicLinkConsumerProps) {
  const [error, setError] = useState(false)

  useEffect(() => {
    signIn('credentials', {
      magicToken: token,
      callbackUrl: '/dashboard',
    }).then((result) => {
      if (result?.error) {
        setError(true)
      }
    })
  }, [token])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">
          Something went wrong. Please request a new link.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-sm text-slate-500">Signing you in…</p>
    </div>
  )
}
```

- [ ] **Step 2: Create the magic link page (RSC)**

Create `app/auth/magic-link/[token]/page.tsx`:

```typescript
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { MagicLinkConsumer } from './magic-link-consumer'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function MagicLinkPage({ params }: PageProps) {
  const { token } = await params

  // Look up token — expired tokens still exist in DB until consumed or replaced
  const tokenRecord = await prisma.passwordResetToken.findUnique({
    where: { token },
  })

  const isValid = tokenRecord && tokenRecord.expiresAt > new Date()

  if (!isValid) {
    // Pass email to expired page so it can resend without asking for email
    const email = tokenRecord?.email
    redirect(
      email
        ? `/auth/magic-link/expired?email=${encodeURIComponent(email)}`
        : '/auth/magic-link/expired'
    )
  }

  // Token is valid — client component handles the actual sign-in
  return <MagicLinkConsumer token={token} />
}
```

- [ ] **Step 3: Add resendMagicLink server action to app/actions/auth.ts**

Open `app/actions/auth.ts`. The file already imports `crypto` — add `sendMagicLinkEmail` to the existing `@/lib/email` import line:

```typescript
// Before (existing line):
import { sendPasswordResetEmail } from '@/lib/email'

// After:
import { sendPasswordResetEmail, sendMagicLinkEmail } from '@/lib/email'
```

Then add this function at the end of the file:

```typescript
/**
 * Resend a magic link to an existing user
 * Called from the expired-token page
 * Returns success regardless of whether email exists (prevent enumeration)
 */
export async function resendMagicLink(
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    })

    // Don't reveal whether email exists
    if (!user) return { success: true }

    // Replace any existing tokens for this email
    await prisma.passwordResetToken.deleteMany({ where: { email } })

    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000) // 72 hours

    await prisma.passwordResetToken.create({
      data: { email, token, expiresAt },
    })

    const magicLinkUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/magic-link/${token}`

    await sendMagicLinkEmail({
      clientName: user.name || 'there',
      email,
      magicLinkUrl,
    })

    return { success: true }
  } catch (error) {
    console.error('resendMagicLink error:', error)
    return { success: false, error: 'Failed to send link. Please try again.' }
  }
}
```

- [ ] **Step 4: Create the expired token page**

Create `app/auth/magic-link/expired/page.tsx`:

```typescript
'use client'

import { useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { resendMagicLink } from '@/app/actions/auth'

function ExpiredPageInner() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleResend() {
    setLoading(true)
    await resendMagicLink(email)
    setLoading(false)
    setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Link expired</CardTitle>
          <CardDescription>
            This login link has expired. Choose how you'd like to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sent ? (
            <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800">
              A new login link has been sent to{' '}
              <strong>{email || 'your email'}</strong>. Check your inbox.
            </div>
          ) : (
            <Button
              className="w-full"
              onClick={handleResend}
              disabled={loading || !email}
            >
              {loading ? 'Sending…' : 'Send me a new link'}
            </Button>
          )}
          <Link href="/reset-password">
            <Button variant="outline" className="w-full">
              Set a password instead
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="ghost" className="w-full text-slate-500">
              Back to login
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ExpiredPage() {
  return (
    <Suspense>
      <ExpiredPageInner />
    </Suspense>
  )
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/auth/magic-link/ app/actions/auth.ts
git commit -m "feat: magic link pages and resendMagicLink server action"
```

---

## Task 6: Survey Webhook Endpoint

**Files:**
- Create: `app/api/webhooks/survey/route.ts`

- [ ] **Step 1: Add SURVEY_API_KEY to your environment**

In `.env.local` (or your Vercel environment variables), add:

```
SURVEY_API_KEY=your-secret-key-here
```

Generate a secure value with:
```bash
openssl rand -hex 32
```

- [ ] **Step 2: Create the survey webhook route**

Create `app/api/webhooks/survey/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendMagicLinkEmail } from '@/lib/email'
import { STANDARD_MILESTONES } from '@/prisma/seed-milestones'
import { z } from 'zod'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

const surveyPayloadSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  decisionMaker: z.string().min(1),
  companyName: z.string().min(1),
  website: z.string().min(1),
  state: z.string().min(1),
  servicesOffered: z.array(z.string()),
  hasRunPaidAds: z.boolean(),
  hasSocialPage: z.boolean(),
  targetServices: z.array(z.string()).max(3),
  idealClients: z.array(z.string()),
  excludedClientTypes: z.string().optional(),
  monthlyCapacity: z.enum(['1-3', '4-6', '7-10', '10+']),
  goals90Day: z.array(z.string()),
  currentSituation: z.array(z.string()),
  mainConcern: z.string().optional(),
  kickoffCallBooked: z.boolean(),
  kickoffCallDate: z.string().datetime().optional(),
})

/**
 * Survey webhook — creates a new client account from intake form data
 *
 * Auth: x-api-key header must match SURVEY_API_KEY env var
 * Responses:
 *   200 — success, { success: true, clientId }
 *   401 — missing or invalid API key
 *   409 — email already registered
 *   422 — payload validation failed
 *   500 — server error
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Validate API key
  const apiKey = req.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.SURVEY_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse and validate body
  let body: z.infer<typeof surveyPayloadSchema>
  try {
    const raw = await req.json()
    const result = surveyPayloadSchema.safeParse(raw)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: result.error.flatten().fieldErrors },
        { status: 422 }
      )
    }
    body = result.data
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 422 })
  }

  // 3. Check for duplicate email
  const existingUser = await prisma.user.findUnique({
    where: { email: body.email },
  })
  if (existingUser) {
    return NextResponse.json(
      { error: 'Email already registered' },
      { status: 409 }
    )
  }

  // 4. Hash a random placeholder password BEFORE the transaction (bcrypt is CPU-bound)
  // The client never uses this password — they sign in via magic link only.
  // We store a valid bcrypt hash so that password login silently fails rather than throws.
  const hashedPlaceholder = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10)

  // Create User + Client + ClientIntake + Milestones in one transaction
  let newClient: { id: string; userId: string }
  try {
    newClient = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: body.email,
          name: body.name,
          password: hashedPlaceholder,
          role: 'CLIENT',
        },
      })

      // Create client profile
      const client = await tx.client.create({
        data: {
          userId: user.id,
          companyName: body.companyName,
          phone: body.phone,
          website: body.website,
          isActive: true,
          onboardingStep: 0,
        },
      })

      // Create ClientIntake with all survey fields
      await tx.clientIntake.create({
        data: {
          clientId: client.id,
          decisionMaker: body.decisionMaker,
          state: body.state,
          servicesOffered: body.servicesOffered,
          hasRunPaidAds: body.hasRunPaidAds,
          hasSocialPage: body.hasSocialPage,
          targetServices: body.targetServices,
          idealClients: body.idealClients,
          excludedClientTypes: body.excludedClientTypes,
          monthlyCapacity: body.monthlyCapacity,
          goals90Day: body.goals90Day,
          currentSituation: body.currentSituation,
          mainConcern: body.mainConcern,
          kickoffCallBooked: body.kickoffCallBooked,
          kickoffCallDate: body.kickoffCallDate
            ? new Date(body.kickoffCallDate)
            : null,
        },
      })

      // Create all milestones — Phase 1 COMPLETED, Phase 2 IN_PROGRESS, rest NOT_STARTED
      await Promise.all(
        STANDARD_MILESTONES.map((milestone, index) => {
          let status = milestone.status
          let progress = milestone.progress
          let dueDate: Date | null = null

          if (index === 0) {
            // Complete intake — done
            status = 'COMPLETED'
            progress = 100
          } else if (index === 1) {
            // Kickoff call — booked / in progress
            status = 'IN_PROGRESS'
            dueDate = body.kickoffCallDate ? new Date(body.kickoffCallDate) : null
          }

          return tx.milestone.create({
            data: {
              clientId: client.id,
              title: milestone.title,
              description: milestone.description,
              order: milestone.order,
              status,
              milestoneType: 'SETUP',
              progress,
              dueDate,
              notes: milestone.notes,
            },
          })
        })
      )

      return { id: client.id, userId: user.id }
    })
  } catch (error) {
    console.error('Survey webhook: transaction failed', error)
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
  }

  // 5. Generate magic link token (72-hour expiry)
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000)

  try {
    await prisma.passwordResetToken.create({
      data: {
        email: body.email,
        token,
        expiresAt,
      },
    })
  } catch (error) {
    // Token creation failure is non-fatal — client exists, they can request a new link
    console.error('Survey webhook: magic link token creation failed', error)
  }

  // 6. Send magic link email (fire-and-forget — don't block the response)
  const magicLinkUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/magic-link/${token}`

  sendMagicLinkEmail({
    clientName: body.name,
    email: body.email,
    magicLinkUrl,
  }).catch((err) => console.error('Survey webhook: magic link email failed', err))

  // 7. Welcome notification (fire-and-forget)
  prisma.notification.create({
    data: {
      userId: newClient.userId,
      title: 'Welcome to BaseAim',
      message: 'Your dashboard is live. Check your email for your login link.',
      type: 'welcome',
      link: '/dashboard',
    },
  }).catch((err) => console.error('Survey webhook: notification failed', err))

  return NextResponse.json({ success: true, clientId: newClient.id })
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Start the dev server and smoke-test the endpoint**

Start dev server:
```bash
npm run dev
```

In a second terminal, test the happy path:
```bash
curl -X POST http://localhost:3000/api/webhooks/survey \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-key-here" \
  -d '{
    "name": "Test Client",
    "email": "test-survey@example.com",
    "phone": "0412 345 678",
    "decisionMaker": "just_me",
    "companyName": "Test Firm",
    "website": "testfirm.com.au",
    "state": "NSW",
    "servicesOffered": ["Individual tax returns", "Bookkeeping"],
    "hasRunPaidAds": false,
    "hasSocialPage": true,
    "targetServices": ["Individual tax returns"],
    "idealClients": ["Sole traders & contractors"],
    "monthlyCapacity": "4-6",
    "goals90Day": ["Consistent, predictable new client flow"],
    "currentSituation": ["Lead flow is inconsistent and unpredictable"],
    "kickoffCallBooked": false
  }'
```

Expected response:
```json
{ "success": true, "clientId": "c..." }
```

Test with bad API key:
```bash
curl -X POST http://localhost:3000/api/webhooks/survey \
  -H "Content-Type: application/json" \
  -H "x-api-key: wrong-key" \
  -d '{}'
```

Expected: `{"error":"Unauthorized"}` with HTTP 401.

Test duplicate email (run the happy-path curl again with the same email):

Expected: `{"error":"Email already registered"}` with HTTP 409.

- [ ] **Step 5: Verify in the database**

Check that records were created by looking in your Supabase Table Editor:
- `client_dashboard.users` — new row with `role = CLIENT`
- `client_dashboard.clients` — new row linked to the user
- `client_dashboard.client_intakes` — new row with all intake fields
- `client_dashboard.milestones` — 7 rows: first has `status = COMPLETED`, second has `status = IN_PROGRESS`, rest have `status = NOT_STARTED`

- [ ] **Step 6: Verify the magic link flow**

Check `client_dashboard.password_reset_tokens` — there should be a row for the test email with `expiresAt` set 72 hours from now.

Visit `http://localhost:3000/auth/magic-link/<token>` in a browser. Expected: brief "Signing you in…" message followed by redirect to `/dashboard`.

Visit an expired or nonexistent token URL: `http://localhost:3000/auth/magic-link/fake-token`. Expected: redirect to `/auth/magic-link/expired`.

- [ ] **Step 7: Commit**

```bash
git add app/api/webhooks/survey/ .env.local
git commit -m "feat: survey webhook endpoint — creates client, intake, milestones, sends magic link"
```

---

## Handoff to Survey Developer

After all tasks are complete, give the survey developer:

1. **Endpoint:** `https://yourdomain.com/api/webhooks/survey`
2. **Header:** `x-api-key: <value of SURVEY_API_KEY>`
3. **The full Section 6 of the spec doc:** `docs/superpowers/specs/2026-04-21-survey-dashboard-integration-design.md`

The spec doc contains the complete field reference table, payload example, response codes, and drop-in completion screen tracker HTML/CSS/JS.
