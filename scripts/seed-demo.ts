import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const CLEAN = process.argv.includes('--clean')

const DEMO_ADMIN_EMAIL = 'khan@baseaim.co'
const DEMO_ADMIN_PASSWORD = 'BaseAim2026!'

const DEMO_CLIENT_EMAILS = [
  'elena@hargroveassociates.com',
  'samira@apextaxadvisory.com',
  'calloway@callowayklein.com',
  'tosei@meridianfinancial.com',
  'james@prestigeledger.com',
  'lin@whitfieldassociates.com',
  'priya@summitridgeaccounting.com',
  'rachel@cysaccountants.com',
]

// ---------------------------------------------------------------------------
// Type helpers
// ---------------------------------------------------------------------------

type InvoiceInput = {
  invoiceNumber: string
  amount: number
  status: 'PAID' | 'SENT' | 'DRAFT' | 'OVERDUE' | 'CANCELLED'
  dueDate: Date
  paidAt: Date | null
  description: string
  items: { description: string; quantity: number; unitPrice: number }[]
}

type DocumentInput = {
  title: string
  fileName: string
  fileSize: number
  fileType: string
}

type MilestoneInput = {
  title: string
  description?: string
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED'
  milestoneType: 'SETUP' | 'GROWTH'
  progress: number
  order: number
  startDate: Date | null
  dueDate: Date | null
  completedAt: Date | null
  notes: any
}

// ---------------------------------------------------------------------------
// Helper: standard 6 setup milestones, all COMPLETED
// ---------------------------------------------------------------------------

function completedSetupMilestones(setupStart: Date): MilestoneInput[] {
  // Each phase takes ~7 days, a few days gap between
  const phase = (idx: number) => {
    const start = new Date(setupStart)
    start.setDate(start.getDate() + idx * 10)
    const due = new Date(start)
    due.setDate(due.getDate() + 7)
    const completed = new Date(due)
    completed.setDate(completed.getDate() - 1)
    return { start, due, completed }
  }

  const titles = [
    'Client Onboarding',
    'Ad Account Setup',
    'Landing Page Development',
    'Campaign Build',
    'Launch',
    'Ongoing Optimization',
  ]

  return titles.map((title, i) => {
    const p = phase(i)
    return {
      title,
      status: 'COMPLETED' as const,
      milestoneType: 'SETUP' as const,
      progress: 100,
      order: i + 1,
      startDate: p.start,
      dueDate: p.due,
      completedAt: p.completed,
      notes: i === 0 ? [{
        id: `note-setup-${i}`,
        content: 'Kickoff call completed. Business goals and ad budget discussed.',
        createdAt: p.completed.toISOString(),
        createdBy: 'BaseAim Team',
      }] : i === 4 ? [{
        id: `note-setup-${i}`,
        content: 'All campaigns live. Monitoring performance closely.',
        createdAt: p.completed.toISOString(),
        createdBy: 'BaseAim Team',
      }] : undefined,
    }
  })
}

// ---------------------------------------------------------------------------
// Helper: growth milestones from a start month
// ---------------------------------------------------------------------------

function growthMilestones(startYear: number, startMonth: number, count: number, startOrder: number): MilestoneInput[] {
  const now = new Date('2026-03-28')
  return Array.from({ length: count }, (_, i) => {
    const month = startMonth + i
    const y = startYear + Math.floor((month - 1) / 12)
    const m = ((month - 1) % 12) + 1
    const dueDate = new Date(y, m, 0) // last day of the month
    const startDate = new Date(y, m - 1, 1)
    const monthName = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    const isCompleted = dueDate < now && !(y === now.getFullYear() && m - 1 === now.getMonth())
    const isCurrent = y === now.getFullYear() && m - 1 === now.getMonth()

    return {
      title: `Monthly Review — ${monthName}`,
      description: 'Monthly performance review and optimization session.',
      status: isCompleted ? 'COMPLETED' as const : isCurrent ? 'IN_PROGRESS' as const : 'NOT_STARTED' as const,
      milestoneType: 'GROWTH' as const,
      progress: isCompleted ? 100 : isCurrent ? 50 : 0,
      order: startOrder + i,
      startDate: isCompleted || isCurrent ? startDate : null,
      dueDate,
      completedAt: isCompleted ? new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate() - 2) : null,
      notes: undefined,
    }
  })
}

// ---------------------------------------------------------------------------
// Helper: generate invoices for a client
// ---------------------------------------------------------------------------

let invoiceCounter = 1000

function makeInvoices(setupDate: Date, monthsActive: number): InvoiceInput[] {
  const invoices: InvoiceInput[] = []

  // Setup invoice
  invoiceCounter++
  invoices.push({
    invoiceNumber: `INV-${setupDate.getFullYear()}-${invoiceCounter}`,
    amount: 4200,
    status: 'PAID',
    dueDate: new Date(setupDate.getFullYear(), setupDate.getMonth() + 1, 1),
    paidAt: new Date(setupDate.getFullYear(), setupDate.getMonth() + 1, 3),
    description: 'Campaign Setup & Strategy',
    items: [{ description: 'Campaign Setup & Strategy', quantity: 1, unitPrice: 4200 }],
  })

  // Monthly invoices
  for (let i = 0; i < monthsActive; i++) {
    const d = new Date(setupDate)
    d.setMonth(d.getMonth() + 2 + i) // first month = month after setup
    const dueDate = new Date(d.getFullYear(), d.getMonth(), 1)
    const now = new Date('2026-03-28')
    const isPaid = dueDate < now
    invoiceCounter++

    invoices.push({
      invoiceNumber: `INV-${dueDate.getFullYear()}-${invoiceCounter}`,
      amount: 2800,
      status: isPaid ? 'PAID' : 'SENT',
      dueDate,
      paidAt: isPaid ? new Date(dueDate.getFullYear(), dueDate.getMonth(), 3) : null,
      description: `Monthly Ad Management — ${dueDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      items: [{ description: `Monthly Ad Management — ${dueDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`, quantity: 1, unitPrice: 2800 }],
    })
  }

  return invoices
}

// ---------------------------------------------------------------------------
// Standard docs for post-setup clients
// ---------------------------------------------------------------------------

const STANDARD_DOCS: DocumentInput[] = [
  { title: 'Campaign Strategy Deck', fileName: 'Campaign Strategy Deck.pdf', fileSize: 2450000, fileType: 'application/pdf' },
  { title: 'Landing Page Wireframes', fileName: 'Landing Page Wireframes.pdf', fileSize: 1800000, fileType: 'application/pdf' },
  { title: 'Ad Creative Concepts', fileName: 'Ad Creative Concepts.pdf', fileSize: 3200000, fileType: 'application/pdf' },
]

function docsWithReports(monthlyReportNames: string[]): DocumentInput[] {
  return [
    ...STANDARD_DOCS,
    ...monthlyReportNames.map((name) => ({
      title: name,
      fileName: `${name}.pdf`,
      fileSize: 1500000 + Math.floor(Math.random() * 300000),
      fileType: 'application/pdf',
    })),
  ]
}

// ---------------------------------------------------------------------------
// Demo client profile definitions — 8 clients
// ---------------------------------------------------------------------------

const DEMO_PROFILES = [
  // ── 1. Hargrove & Associates — 365d, $25/day ──
  {
    stableId: 'demo-hargrove-associates',
    email: 'elena@hargroveassociates.com',
    name: 'Elena Hargrove',
    companyName: 'Hargrove & Associates',
    industry: 'Accounting, Tax & Business Consulting',
    onboardingStep: 6,
    adAccountId: 'act_demo_hargrove' as string | null,
    leadsChartEnabled: false,
    milestones: [
      ...completedSetupMilestones(new Date('2025-03-01')),
      ...growthMilestones(2025, 4, 12, 7).map((m, i) => ({
        ...m,
        notes: i === 0 ? [{
          id: 'note-hargrove-apr',
          content: 'First full month live. 47 leads generated. CPL at $28.40. Strong start.',
          createdAt: '2025-04-29T10:00:00Z',
          createdBy: 'BaseAim Team',
        }] : i === 5 ? [{
          id: 'note-hargrove-sep',
          content: 'Crossed 500 lifetime leads milestone. ROAS consistently above 3.0.',
          createdAt: '2025-09-28T10:00:00Z',
          createdBy: 'BaseAim Team',
        }] : m.notes,
      })),
    ] as MilestoneInput[],
    invoices: makeInvoices(new Date('2025-03-01'), 12),
    documents: docsWithReports([
      'Monthly Report — April 2025',
      'Monthly Report — May 2025',
      'Monthly Report — June 2025',
      'Quarterly Business Review — Q2 2025',
      'Monthly Report — July 2025',
      'Monthly Report — August 2025',
      'Monthly Report — September 2025',
      'Quarterly Business Review — Q3 2025',
      'Monthly Report — October 2025',
      'Monthly Report — November 2025',
      'Monthly Report — December 2025',
      'Quarterly Business Review — Q4 2025',
      'Monthly Report — January 2026',
      'Monthly Report — February 2026',
      '2026 Growth Strategy Proposal',
    ]),
  },

  // ── 2. Apex Tax & Advisory — 365d, $22/day ──
  {
    stableId: 'demo-apex-tax',
    email: 'samira@apextaxadvisory.com',
    name: 'Samira Holt',
    companyName: 'Apex Tax & Advisory',
    industry: 'Tax Planning & Business Advisory',
    onboardingStep: 6,
    adAccountId: 'act_demo_apex' as string | null,
    leadsChartEnabled: false,
    milestones: [
      ...completedSetupMilestones(new Date('2025-03-01')),
      ...growthMilestones(2025, 4, 12, 7).map((m, i) => ({
        ...m,
        notes: i === 3 ? [{
          id: 'note-apex-jul',
          content: 'CTR improved 22% after creative refresh. Scaling top ad set by 30%.',
          createdAt: '2025-07-28T10:00:00Z',
          createdBy: 'BaseAim Team',
        }] : i === 7 ? [{
          id: 'note-apex-nov',
          content: 'Added retargeting campaign. CPC reduced to $0.95. Lead volume up 18%.',
          createdAt: '2025-11-26T10:00:00Z',
          createdBy: 'BaseAim Team',
        }] : m.notes,
      })),
    ] as MilestoneInput[],
    invoices: makeInvoices(new Date('2025-03-01'), 12),
    documents: docsWithReports([
      'Monthly Report — April 2025',
      'Monthly Report — May 2025',
      'Monthly Report — June 2025',
      'Monthly Report — July 2025',
      'Monthly Report — August 2025',
      'Monthly Report — September 2025',
      'Monthly Report — October 2025',
      'Monthly Report — November 2025',
      'Monthly Report — December 2025',
      'Monthly Report — January 2026',
      'Monthly Report — February 2026',
    ]),
  },

  // ── 3. Calloway & Klein CPAs — 365d, $18/day ──
  {
    stableId: 'demo-calloway-klein',
    email: 'calloway@callowayklein.com',
    name: 'Marcus Calloway',
    companyName: 'Calloway & Klein CPAs',
    industry: 'Tax & Financial Advisory',
    onboardingStep: 6,
    adAccountId: 'act_demo_calloway' as string | null,
    leadsChartEnabled: false,
    milestones: [
      ...completedSetupMilestones(new Date('2025-03-01')),
      ...growthMilestones(2025, 4, 12, 7).map((m, i) => ({
        ...m,
        notes: i === 0 ? [{
          id: 'note-calloway-apr',
          content: 'Solid first month. 38 leads. CPA funnel resonating with local business owners.',
          createdAt: '2025-04-28T10:00:00Z',
          createdBy: 'BaseAim Team',
        }] : m.notes,
      })),
    ] as MilestoneInput[],
    invoices: makeInvoices(new Date('2025-03-01'), 12),
    documents: docsWithReports([
      'Monthly Report — April 2025',
      'Monthly Report — May 2025',
      'Monthly Report — June 2025',
      'Monthly Report — July 2025',
      'Monthly Report — August 2025',
      'Monthly Report — September 2025',
      'Monthly Report — October 2025',
      'Monthly Report — November 2025',
      'Monthly Report — December 2025',
      'Monthly Report — January 2026',
      'Monthly Report — February 2026',
    ]),
  },

  // ── 4. Meridian Financial Group — 180d, $20/day ──
  {
    stableId: 'demo-meridian-financial',
    email: 'tosei@meridianfinancial.com',
    name: 'Thomas Osei',
    companyName: 'Meridian Financial Group',
    industry: 'Financial Planning & Wealth Management',
    onboardingStep: 6,
    adAccountId: 'act_demo_meridian' as string | null,
    leadsChartEnabled: false,
    milestones: [
      ...completedSetupMilestones(new Date('2025-09-01')),
      ...growthMilestones(2025, 10, 6, 7).map((m, i) => ({
        ...m,
        notes: i === 0 ? [{
          id: 'note-meridian-oct',
          content: 'Strategy session complete. Wealth management lead funnel mapped out.',
          createdAt: '2025-10-20T10:00:00Z',
          createdBy: 'BaseAim Team',
        }] : m.notes,
      })),
    ] as MilestoneInput[],
    invoices: makeInvoices(new Date('2025-09-01'), 6),
    documents: docsWithReports([
      'Monthly Report — October 2025',
      'Monthly Report — November 2025',
      'Monthly Report — December 2025',
      'Monthly Report — January 2026',
      'Monthly Report — February 2026',
    ]),
  },

  // ── 5. Prestige Ledger Group — 120d, $16/day ──
  {
    stableId: 'demo-prestige-ledger',
    email: 'james@prestigeledger.com',
    name: 'James Whitmore',
    companyName: 'Prestige Ledger Group',
    industry: 'Corporate Accounting & Auditing',
    onboardingStep: 6,
    adAccountId: 'act_demo_prestige' as string | null,
    leadsChartEnabled: false,
    milestones: [
      ...completedSetupMilestones(new Date('2025-11-01')),
      ...growthMilestones(2025, 12, 4, 7).map((m, i) => ({
        ...m,
        notes: i === 0 ? [{
          id: 'note-prestige-dec',
          content: 'First month in the books. Lead volume modest but quality is excellent — 3 signed clients.',
          createdAt: '2025-12-28T10:00:00Z',
          createdBy: 'BaseAim Team',
        }] : m.notes,
      })),
    ] as MilestoneInput[],
    invoices: makeInvoices(new Date('2025-11-01'), 4),
    documents: docsWithReports([
      'Monthly Report — December 2025',
      'Monthly Report — January 2026',
      'Monthly Report — February 2026',
    ]),
  },

  // ── 6. Whitfield & Associates — 60d, $14/day (outlier low: ~4 calls/mo) ──
  {
    stableId: 'demo-whitfield-associates',
    email: 'lin@whitfieldassociates.com',
    name: 'Linda Chen',
    companyName: 'Whitfield & Associates',
    industry: 'Tax Resolution & IRS Representation',
    onboardingStep: 6,
    adAccountId: 'act_demo_whitfield' as string | null,
    leadsChartEnabled: false,
    milestones: [
      ...completedSetupMilestones(new Date('2026-01-10')),
      ...growthMilestones(2026, 2, 2, 7),
    ] as MilestoneInput[],
    invoices: makeInvoices(new Date('2026-01-10'), 2),
    documents: docsWithReports([
      'Monthly Report — February 2026',
    ]),
  },

  // ── 7. Summit Ridge Accounting — 60d, $24/day (outlier high: ~12 calls/mo) ──
  {
    stableId: 'demo-summit-ridge',
    email: 'priya@summitridgeaccounting.com',
    name: 'Priya Nair',
    companyName: 'Summit Ridge Accounting',
    industry: 'Accounting & Bookkeeping',
    onboardingStep: 6,
    adAccountId: 'act_demo_summit' as string | null,
    leadsChartEnabled: false,
    milestones: [
      ...completedSetupMilestones(new Date('2026-01-10')),
      ...growthMilestones(2026, 2, 2, 7).map((m, i) => ({
        ...m,
        notes: i === 0 ? [{
          id: 'note-summit-feb',
          content: 'Exceptional first month — 14 booked calls. Highest performer in cohort.',
          createdAt: '2026-02-26T10:00:00Z',
          createdBy: 'BaseAim Team',
        }] : m.notes,
      })),
    ] as MilestoneInput[],
    invoices: makeInvoices(new Date('2026-01-10'), 2),
    documents: docsWithReports([
      'Monthly Report — February 2026',
    ]),
  },

  // ── 8. Cys Accountants — In setup (step 5), MUST be LAST for createdAt ordering ──
  {
    stableId: 'demo-cys-accountants',
    email: 'rachel@cysaccountants.com',
    name: 'Rachel Cyster',
    companyName: 'Cys Accountants',
    industry: 'Small Business Accounting',
    onboardingStep: 5,
    adAccountId: null as string | null,
    leadsChartEnabled: false,
    milestones: [
      {
        title: 'Client Onboarding',
        status: 'COMPLETED' as const,
        milestoneType: 'SETUP' as const,
        progress: 100,
        order: 1,
        startDate: new Date('2026-03-10'),
        dueDate: new Date('2026-03-14'),
        completedAt: new Date('2026-03-13'),
        notes: [{
          id: 'note-cys-onboarding',
          content: 'Kickoff call completed. Rachel wants to focus on small business bookkeeping clients.',
          createdAt: '2026-03-13T10:00:00Z',
          createdBy: 'BaseAim Team',
        }],
      },
      {
        title: 'Ad Account Setup',
        status: 'COMPLETED' as const,
        milestoneType: 'SETUP' as const,
        progress: 100,
        order: 2,
        startDate: new Date('2026-03-15'),
        dueDate: new Date('2026-03-19'),
        completedAt: new Date('2026-03-18'),
        notes: [{
          id: 'note-cys-adaccount',
          content: 'Facebook Business Manager configured. Pixel installed on current site.',
          createdAt: '2026-03-18T14:00:00Z',
          createdBy: 'BaseAim Team',
        }],
      },
      {
        title: 'Landing Page Development',
        status: 'COMPLETED' as const,
        milestoneType: 'SETUP' as const,
        progress: 100,
        order: 3,
        startDate: new Date('2026-03-19'),
        dueDate: new Date('2026-03-23'),
        completedAt: new Date('2026-03-22'),
        notes: undefined,
      },
      {
        title: 'Campaign Build',
        status: 'COMPLETED' as const,
        milestoneType: 'SETUP' as const,
        progress: 100,
        order: 4,
        startDate: new Date('2026-03-23'),
        dueDate: new Date('2026-03-26'),
        completedAt: new Date('2026-03-25'),
        notes: undefined,
      },
      {
        title: 'Website Redesign',
        description: 'Custom phase — full website redesign before campaign launch.',
        status: 'IN_PROGRESS' as const,
        milestoneType: 'SETUP' as const,
        progress: 40,
        order: 5,
        startDate: new Date('2026-03-26'),
        dueDate: new Date('2026-04-10'),
        completedAt: null,
        notes: [{
          id: 'note-cys-website',
          content: 'Designer submitted first draft. Rachel reviewing homepage layout and service pages.',
          createdAt: '2026-03-27T11:00:00Z',
          createdBy: 'BaseAim Team',
        }],
      },
      {
        title: 'Launch',
        status: 'NOT_STARTED' as const,
        milestoneType: 'SETUP' as const,
        progress: 0,
        order: 6,
        startDate: null,
        dueDate: null,
        completedAt: null,
        notes: undefined,
      },
      {
        title: 'Ongoing Optimization',
        status: 'NOT_STARTED' as const,
        milestoneType: 'SETUP' as const,
        progress: 0,
        order: 7,
        startDate: null,
        dueDate: null,
        completedAt: null,
        notes: undefined,
      },
    ] as MilestoneInput[],
    invoices: (() => {
      invoiceCounter++
      return [{
        invoiceNumber: `INV-2026-${invoiceCounter}`,
        amount: 4200,
        status: 'PAID' as const,
        dueDate: new Date('2026-03-15'),
        paidAt: new Date('2026-03-14'),
        description: 'Campaign Setup & Strategy',
        items: [{ description: 'Campaign Setup & Strategy', quantity: 1, unitPrice: 4200 }],
      }]
    })(),
    documents: [] as DocumentInput[],
  },
]

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function seed() {
  console.log('Seeding demo data...')

  const hashedAdminPwd = await bcrypt.hash(DEMO_ADMIN_PASSWORD, 10)
  const hashedClientPwd = await bcrypt.hash('client123', 10)

  // Upsert demo admin
  await prisma.user.upsert({
    where: { email: DEMO_ADMIN_EMAIL },
    update: { name: 'Zara Khan', role: 'ADMIN' },
    create: { email: DEMO_ADMIN_EMAIL, name: 'Zara Khan', password: hashedAdminPwd, role: 'ADMIN' },
  })

  // Seed each demo client profile
  for (const profile of DEMO_PROFILES) {
    // 1. Upsert the user account
    const user = await prisma.user.upsert({
      where: { email: profile.email },
      update: { name: profile.name, role: 'CLIENT' },
      create: {
        email: profile.email,
        name: profile.name,
        password: hashedClientPwd,
        role: 'CLIENT',
      },
    })

    // 2. Upsert the client profile (keyed by demoStableId)
    const client = await prisma.client.upsert({
      where: { demoStableId: profile.stableId },
      update: {
        companyName: profile.companyName,
        industry: profile.industry,
        onboardingStep: profile.onboardingStep,
        adAccountId: profile.adAccountId,
        leadsChartEnabled: profile.leadsChartEnabled,
        isDemo: true,
      },
      create: {
        userId: user.id,
        companyName: profile.companyName,
        industry: profile.industry,
        onboardingStep: profile.onboardingStep,
        adAccountId: profile.adAccountId,
        leadsChartEnabled: profile.leadsChartEnabled,
        isDemo: true,
        demoStableId: profile.stableId,
      },
    })

    // 3. Replace milestones (delete then createMany — safe because we control all demo data)
    await prisma.milestone.deleteMany({ where: { clientId: client.id } })
    if (profile.milestones.length > 0) {
      await prisma.milestone.createMany({
        data: profile.milestones.map((m) => ({
          clientId: client.id,
          title: m.title,
          description: m.description ?? null,
          status: m.status,
          milestoneType: m.milestoneType,
          progress: m.progress,
          order: m.order,
          startDate: m.startDate ?? null,
          dueDate: m.dueDate ?? null,
          completedAt: m.completedAt ?? null,
          notes: m.notes as any,
        })),
      })
    }

    // 4. Replace invoices
    await prisma.invoice.deleteMany({ where: { clientId: client.id } })
    if (profile.invoices.length > 0) {
      await prisma.invoice.createMany({
        data: profile.invoices.map((inv) => ({
          clientId: client.id,
          invoiceNumber: inv.invoiceNumber,
          amount: inv.amount,
          currency: 'usd',
          status: inv.status,
          dueDate: inv.dueDate,
          paidAt: inv.paidAt ?? null,
          description: inv.description,
          items: inv.items,
        })),
      })
    }

    // 5. Replace documents
    await prisma.document.deleteMany({ where: { clientId: client.id } })
    if (profile.documents.length > 0) {
      await prisma.document.createMany({
        data: profile.documents.map((doc) => ({
          clientId: client.id,
          title: doc.title,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          fileType: doc.fileType,
          fileUrl: '#demo',
          status: 'APPROVED' as const,
          uploadedBy: 'BaseAim Team',
        })),
      })
    }
  }

  console.log('')
  console.log('--- Demo Seed Complete ---')
  console.log('Created/updated:')
  console.log('  1 demo admin (Zara Khan)')
  console.log('  8 demo clients:')
  console.log('    - Hargrove & Associates (365d, $25/day)')
  console.log('    - Apex Tax & Advisory (365d, $22/day)')
  console.log('    - Calloway & Klein CPAs (365d, $18/day)')
  console.log('    - Meridian Financial Group (180d, $20/day)')
  console.log('    - Prestige Ledger Group (120d, $16/day)')
  console.log('    - Whitfield & Associates (60d, $14/day)')
  console.log('    - Summit Ridge Accounting (60d, $24/day)')
  console.log('    - Cys Accountants (in-setup, step 5)')
  console.log('')
  console.log('Demo admin credentials:')
  console.log('  Email:    khan@baseaim.co')
  console.log('  Password: BaseAim2026!')
  console.log('')
  console.log('Demo client password (all 8): client123')
}

// ---------------------------------------------------------------------------
// Clean
// ---------------------------------------------------------------------------

async function clean() {
  console.log('Removing all demo data...')

  // Cascade on Client handles milestones, invoices, documents
  await prisma.client.deleteMany({ where: { isDemo: true } })

  // Remove demo client user accounts
  await prisma.user.deleteMany({
    where: { email: { in: DEMO_CLIENT_EMAILS } },
  })

  // Remove demo admin
  await prisma.user.deleteMany({ where: { email: DEMO_ADMIN_EMAIL } })

  console.log('Demo data removed. (1 admin + 8 clients and all associated records)')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (CLEAN) {
    await clean()
    return
  }
  await seed()
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
