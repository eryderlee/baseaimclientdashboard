import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendMagicLinkEmail } from '@/lib/email'
import { STANDARD_MILESTONES } from '@/prisma/seed-milestones'
import { MilestoneStatus } from '@prisma/client'
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
  targetGeography: z.array(z.string()).min(1),
  targetRegions: z.string().optional(),
  geographyExclusions: z.string().optional(),
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
          targetGeography: body.targetGeography,
          targetRegions: body.targetRegions,
          geographyExclusions: body.geographyExclusions,
          kickoffCallBooked: body.kickoffCallBooked,
          kickoffCallDate: body.kickoffCallDate
            ? new Date(body.kickoffCallDate)
            : null,
        },
      })

      // Create all milestones — Phase 1 COMPLETED, Phase 2 IN_PROGRESS, rest NOT_STARTED
      await Promise.all(
        STANDARD_MILESTONES.map((milestone, index) => {
          let status: MilestoneStatus = milestone.status as MilestoneStatus
          let progress = milestone.progress
          let dueDate: Date | null = null

          if (index === 0) {
            // Complete intake — done
            status = MilestoneStatus.COMPLETED
            progress = 100
          } else if (index === 1) {
            // Kickoff call — booked / in progress
            status = MilestoneStatus.IN_PROGRESS
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
    // P2002 = unique constraint violation — duplicate email from a concurrent request
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }
    console.error('Survey webhook: transaction failed', error)
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
  }

  // 5. Generate magic link token (72-hour expiry)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000)

  let tokenCreated = false
  try {
    await prisma.passwordResetToken.create({
      data: {
        email: body.email,
        token,
        expiresAt,
      },
    })
    tokenCreated = true
  } catch (error) {
    // Token creation failure is non-fatal — client exists, they can request a new link
    console.error('Survey webhook: magic link token creation failed', error)
  }

  // 6. Send magic link email only if token was successfully stored
  if (tokenCreated) {
    const magicLinkUrl = `${appUrl}/auth/magic-link/${token}`
    sendMagicLinkEmail({
      clientName: body.name,
      email: body.email,
      magicLinkUrl,
    }).catch((err) => console.error('Survey webhook: magic link email failed', err))
  }

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
