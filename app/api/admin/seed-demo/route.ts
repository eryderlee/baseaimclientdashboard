import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// ONE-TIME USE ENDPOINT — delete this file after running
// Protected by SURVEY_API_KEY header (reusing existing secret)

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
  'sarah@thorntonadvisory.com.au',
  'david@parksidetax.com.au',
]

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

type IntakeInput = {
  decisionMaker: string
  state: string
  servicesOffered: string[]
  hasRunPaidAds: boolean
  hasSocialPage: boolean
  targetServices: string[]
  idealClients: string[]
  excludedClientTypes?: string | null
  monthlyCapacity: string
  goals90Day: string[]
  currentSituation: string[]
  mainConcern?: string | null
  targetGeography: string[]
  targetRegions?: string | null
  geographyExclusions?: string | null
  kickoffCallBooked: boolean
  kickoffCallDate?: Date | null
}

function completedSetupMilestones(setupStart: Date): MilestoneInput[] {
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
    'Complete intake',
    'Kickoff call',
    'Ad Account Setup',
    'Landing Page Development',
    'Campaign Build',
    'Launch',
    'Ongoing Optimisation',
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
      notes: i === 0
        ? [{ id: `note-s${i}`, content: 'Intake form completed.', createdAt: p.completed.toISOString(), createdBy: 'BaseAim Team' }]
        : i === 1
        ? [{ id: `note-s${i}`, content: 'Kickoff call completed. Business goals and ad budget discussed.', createdAt: p.completed.toISOString(), createdBy: 'BaseAim Team' }]
        : i === 5
        ? [{ id: `note-s${i}`, content: 'All campaigns live. Monitoring performance closely.', createdAt: p.completed.toISOString(), createdBy: 'BaseAim Team' }]
        : undefined,
    }
  })
}

function growthMilestones(startYear: number, startMonth: number, count: number, startOrder: number): MilestoneInput[] {
  const now = new Date('2026-03-28')
  return Array.from({ length: count }, (_, i) => {
    const month = startMonth + i
    const y = startYear + Math.floor((month - 1) / 12)
    const m = ((month - 1) % 12) + 1
    const dueDate = new Date(y, m, 0)
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

let invoiceCounter = 1000

function makeInvoices(setupDate: Date, monthsActive: number): InvoiceInput[] {
  const invoices: InvoiceInput[] = []
  invoiceCounter++
  invoices.push({
    invoiceNumber: `INV-${setupDate.getFullYear()}-${invoiceCounter}`,
    amount: 4200, status: 'PAID',
    dueDate: new Date(setupDate.getFullYear(), setupDate.getMonth() + 1, 1),
    paidAt: new Date(setupDate.getFullYear(), setupDate.getMonth() + 1, 3),
    description: 'Campaign Setup & Strategy',
    items: [{ description: 'Campaign Setup & Strategy', quantity: 1, unitPrice: 4200 }],
  })
  for (let i = 0; i < monthsActive; i++) {
    const d = new Date(setupDate)
    d.setMonth(d.getMonth() + 2 + i)
    const dueDate = new Date(d.getFullYear(), d.getMonth(), 1)
    const isPaid = dueDate < new Date('2026-03-28')
    invoiceCounter++
    const label = dueDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    invoices.push({
      invoiceNumber: `INV-${dueDate.getFullYear()}-${invoiceCounter}`,
      amount: 2800, status: isPaid ? 'PAID' : 'SENT',
      dueDate, paidAt: isPaid ? new Date(dueDate.getFullYear(), dueDate.getMonth(), 3) : null,
      description: `Monthly Ad Management — ${label}`,
      items: [{ description: `Monthly Ad Management — ${label}`, quantity: 1, unitPrice: 2800 }],
    })
  }
  return invoices
}

const STANDARD_DOCS: DocumentInput[] = [
  { title: 'Campaign Strategy Deck', fileName: 'Campaign Strategy Deck.pdf', fileSize: 2450000, fileType: 'application/pdf' },
  { title: 'Landing Page Wireframes', fileName: 'Landing Page Wireframes.pdf', fileSize: 1800000, fileType: 'application/pdf' },
  { title: 'Ad Creative Concepts', fileName: 'Ad Creative Concepts.pdf', fileSize: 3200000, fileType: 'application/pdf' },
]

function docsWithReports(names: string[]): DocumentInput[] {
  return [...STANDARD_DOCS, ...names.map(n => ({ title: n, fileName: `${n}.pdf`, fileSize: 1500000, fileType: 'application/pdf' }))]
}

const DEMO_PROFILES: Array<{
  stableId: string; email: string; name: string; companyName: string; industry: string
  onboardingStep: number; adAccountId: string | null; milestones: MilestoneInput[]
  invoices: InvoiceInput[]; documents: DocumentInput[]; intake?: IntakeInput
}> = [
  {
    stableId: 'demo-hargrove-associates', email: 'elena@hargroveassociates.com', name: 'Elena Hargrove',
    companyName: 'Hargrove & Associates', industry: 'Accounting, Tax & Business Consulting',
    onboardingStep: 6, adAccountId: 'act_demo_hargrove',
    milestones: [
      ...completedSetupMilestones(new Date('2025-03-01')),
      ...growthMilestones(2025, 4, 12, 8).map((m, i) => ({
        ...m,
        notes: i === 0 ? [{ id: 'n1', content: 'First full month live. 47 leads generated. CPL at $28.40.', createdAt: '2025-04-29T10:00:00Z', createdBy: 'BaseAim Team' }]
          : i === 5 ? [{ id: 'n2', content: 'Crossed 500 lifetime leads milestone. ROAS consistently above 3.0.', createdAt: '2025-09-28T10:00:00Z', createdBy: 'BaseAim Team' }]
          : m.notes,
      })),
    ],
    invoices: makeInvoices(new Date('2025-03-01'), 12),
    documents: docsWithReports(['Monthly Report — April 2025','Monthly Report — May 2025','Monthly Report — June 2025','Quarterly Business Review — Q2 2025','Monthly Report — July 2025','Monthly Report — August 2025','Monthly Report — September 2025','Quarterly Business Review — Q3 2025','Monthly Report — October 2025','Monthly Report — November 2025','Monthly Report — December 2025','Quarterly Business Review — Q4 2025','Monthly Report — January 2026','Monthly Report — February 2026','2026 Growth Strategy Proposal']),
  },
  {
    stableId: 'demo-apex-tax', email: 'samira@apextaxadvisory.com', name: 'Samira Holt',
    companyName: 'Apex Tax & Advisory', industry: 'Tax Planning & Business Advisory',
    onboardingStep: 6, adAccountId: 'act_demo_apex',
    milestones: [
      ...completedSetupMilestones(new Date('2025-03-01')),
      ...growthMilestones(2025, 4, 12, 8).map((m, i) => ({
        ...m,
        notes: i === 3 ? [{ id: 'n1', content: 'CTR improved 22% after creative refresh. Scaling top ad set by 30%.', createdAt: '2025-07-28T10:00:00Z', createdBy: 'BaseAim Team' }]
          : i === 7 ? [{ id: 'n2', content: 'Added retargeting campaign. CPC reduced to $0.95. Lead volume up 18%.', createdAt: '2025-11-26T10:00:00Z', createdBy: 'BaseAim Team' }]
          : m.notes,
      })),
    ],
    invoices: makeInvoices(new Date('2025-03-01'), 12),
    documents: docsWithReports(['Monthly Report — April 2025','Monthly Report — May 2025','Monthly Report — June 2025','Monthly Report — July 2025','Monthly Report — August 2025','Monthly Report — September 2025','Monthly Report — October 2025','Monthly Report — November 2025','Monthly Report — December 2025','Monthly Report — January 2026','Monthly Report — February 2026']),
  },
  {
    stableId: 'demo-calloway-klein', email: 'calloway@callowayklein.com', name: 'Marcus Calloway',
    companyName: 'Calloway & Klein CPAs', industry: 'Tax & Financial Advisory',
    onboardingStep: 6, adAccountId: 'act_demo_calloway',
    milestones: [
      ...completedSetupMilestones(new Date('2025-03-01')),
      ...growthMilestones(2025, 4, 12, 8).map((m, i) => ({
        ...m,
        notes: i === 0 ? [{ id: 'n1', content: 'Solid first month. 38 leads. CPA funnel resonating with local business owners.', createdAt: '2025-04-28T10:00:00Z', createdBy: 'BaseAim Team' }] : m.notes,
      })),
    ],
    invoices: makeInvoices(new Date('2025-03-01'), 12),
    documents: docsWithReports(['Monthly Report — April 2025','Monthly Report — May 2025','Monthly Report — June 2025','Monthly Report — July 2025','Monthly Report — August 2025','Monthly Report — September 2025','Monthly Report — October 2025','Monthly Report — November 2025','Monthly Report — December 2025','Monthly Report — January 2026','Monthly Report — February 2026']),
  },
  {
    stableId: 'demo-meridian-financial', email: 'tosei@meridianfinancial.com', name: 'Thomas Osei',
    companyName: 'Meridian Financial Group', industry: 'Financial Planning & Wealth Management',
    onboardingStep: 6, adAccountId: 'act_demo_meridian',
    milestones: [
      ...completedSetupMilestones(new Date('2025-09-01')),
      ...growthMilestones(2025, 10, 6, 8).map((m, i) => ({
        ...m,
        notes: i === 0 ? [{ id: 'n1', content: 'Strategy session complete. Wealth management lead funnel mapped out.', createdAt: '2025-10-20T10:00:00Z', createdBy: 'BaseAim Team' }] : m.notes,
      })),
    ],
    invoices: makeInvoices(new Date('2025-09-01'), 6),
    documents: docsWithReports(['Monthly Report — October 2025','Monthly Report — November 2025','Monthly Report — December 2025','Monthly Report — January 2026','Monthly Report — February 2026']),
  },
  {
    stableId: 'demo-prestige-ledger', email: 'james@prestigeledger.com', name: 'James Whitmore',
    companyName: 'Prestige Ledger Group', industry: 'Corporate Accounting & Auditing',
    onboardingStep: 6, adAccountId: 'act_demo_prestige',
    milestones: [
      ...completedSetupMilestones(new Date('2025-11-01')),
      ...growthMilestones(2025, 12, 4, 8).map((m, i) => ({
        ...m,
        notes: i === 0 ? [{ id: 'n1', content: 'First month in the books. Lead volume modest but quality is excellent — 3 signed clients.', createdAt: '2025-12-28T10:00:00Z', createdBy: 'BaseAim Team' }] : m.notes,
      })),
    ],
    invoices: makeInvoices(new Date('2025-11-01'), 4),
    documents: docsWithReports(['Monthly Report — December 2025','Monthly Report — January 2026','Monthly Report — February 2026']),
  },
  {
    stableId: 'demo-whitfield-associates', email: 'lin@whitfieldassociates.com', name: 'Linda Chen',
    companyName: 'Whitfield & Associates', industry: 'Tax Resolution & IRS Representation',
    onboardingStep: 6, adAccountId: 'act_demo_whitfield',
    milestones: [...completedSetupMilestones(new Date('2026-01-10')), ...growthMilestones(2026, 2, 2, 8)],
    invoices: makeInvoices(new Date('2026-01-10'), 2),
    documents: docsWithReports(['Monthly Report — February 2026']),
  },
  {
    stableId: 'demo-summit-ridge', email: 'priya@summitridgeaccounting.com', name: 'Priya Nair',
    companyName: 'Summit Ridge Accounting', industry: 'Accounting & Bookkeeping',
    onboardingStep: 6, adAccountId: 'act_demo_summit',
    milestones: [
      ...completedSetupMilestones(new Date('2026-01-10')),
      ...growthMilestones(2026, 2, 2, 8).map((m, i) => ({
        ...m,
        notes: i === 0 ? [{ id: 'n1', content: 'Exceptional first month — 14 booked calls. Highest performer in cohort.', createdAt: '2026-02-26T10:00:00Z', createdBy: 'BaseAim Team' }] : m.notes,
      })),
    ],
    invoices: makeInvoices(new Date('2026-01-10'), 2),
    documents: docsWithReports(['Monthly Report — February 2026']),
  },
  {
    stableId: 'demo-cys-accountants', email: 'rachel@cysaccountants.com', name: 'Rachel Cyster',
    companyName: 'Cys Accountants', industry: 'Small Business Accounting',
    onboardingStep: 5, adAccountId: null,
    milestones: [
      { title: 'Complete intake', status: 'COMPLETED', milestoneType: 'SETUP', progress: 100, order: 1, startDate: new Date('2026-03-10'), dueDate: new Date('2026-03-11'), completedAt: new Date('2026-03-10'), notes: [{ id: 'n1', content: 'Intake form completed. Rachel wants to focus on small business bookkeeping clients.', createdAt: '2026-03-10T10:00:00Z', createdBy: 'BaseAim Team' }] },
      { title: 'Kickoff call', status: 'COMPLETED', milestoneType: 'SETUP', progress: 100, order: 2, startDate: new Date('2026-03-12'), dueDate: new Date('2026-03-13'), completedAt: new Date('2026-03-13'), notes: [{ id: 'n2', content: 'Kickoff call completed. Targeting sole traders and micro-businesses in Melbourne.', createdAt: '2026-03-13T10:00:00Z', createdBy: 'BaseAim Team' }] },
      { title: 'Ad Account Setup', status: 'COMPLETED', milestoneType: 'SETUP', progress: 100, order: 3, startDate: new Date('2026-03-15'), dueDate: new Date('2026-03-19'), completedAt: new Date('2026-03-18'), notes: [{ id: 'n3', content: 'Facebook Business Manager configured. Pixel installed on current site.', createdAt: '2026-03-18T14:00:00Z', createdBy: 'BaseAim Team' }] },
      { title: 'Landing Page Development', status: 'COMPLETED', milestoneType: 'SETUP', progress: 100, order: 4, startDate: new Date('2026-03-19'), dueDate: new Date('2026-03-23'), completedAt: new Date('2026-03-22'), notes: undefined },
      { title: 'Campaign Build', status: 'COMPLETED', milestoneType: 'SETUP', progress: 100, order: 5, startDate: new Date('2026-03-23'), dueDate: new Date('2026-03-26'), completedAt: new Date('2026-03-25'), notes: undefined },
      { title: 'Website Redesign', description: 'Custom phase — full website redesign before campaign launch.', status: 'IN_PROGRESS', milestoneType: 'SETUP', progress: 40, order: 6, startDate: new Date('2026-03-26'), dueDate: new Date('2026-04-10'), completedAt: null, notes: [{ id: 'n4', content: 'Designer submitted first draft. Rachel reviewing homepage layout.', createdAt: '2026-03-27T11:00:00Z', createdBy: 'BaseAim Team' }] },
      { title: 'Launch', status: 'NOT_STARTED', milestoneType: 'SETUP', progress: 0, order: 7, startDate: null, dueDate: null, completedAt: null, notes: undefined },
      { title: 'Ongoing Optimisation', status: 'NOT_STARTED', milestoneType: 'SETUP', progress: 0, order: 8, startDate: null, dueDate: null, completedAt: null, notes: undefined },
    ],
    invoices: [{ invoiceNumber: 'INV-2026-1099', amount: 4200, status: 'PAID', dueDate: new Date('2026-03-15'), paidAt: new Date('2026-03-14'), description: 'Campaign Setup & Strategy', items: [{ description: 'Campaign Setup & Strategy', quantity: 1, unitPrice: 4200 }] }],
    documents: [],
  },
  {
    stableId: 'demo-thornton-advisory', email: 'sarah@thorntonadvisory.com.au', name: 'Sarah Thornton',
    companyName: 'Thornton Advisory Group', industry: 'Tax & Business Advisory',
    onboardingStep: 1, adAccountId: null,
    milestones: [
      { title: 'Complete intake', status: 'COMPLETED', milestoneType: 'SETUP', progress: 100, order: 1, startDate: new Date('2026-04-18'), dueDate: new Date('2026-04-18'), completedAt: new Date('2026-04-18'), notes: [{ id: 'n1', content: 'Survey completed via website. All intake data received.', createdAt: '2026-04-18T14:22:00Z', createdBy: 'BaseAim Team' }] },
      { title: 'Kickoff call', status: 'IN_PROGRESS', milestoneType: 'SETUP', progress: 0, order: 2, startDate: null, dueDate: new Date('2026-04-28'), completedAt: null, notes: undefined },
      { title: 'Ad Account Setup', status: 'NOT_STARTED', milestoneType: 'SETUP', progress: 0, order: 3, startDate: null, dueDate: null, completedAt: null, notes: undefined },
      { title: 'Landing Page Development', status: 'NOT_STARTED', milestoneType: 'SETUP', progress: 0, order: 4, startDate: null, dueDate: null, completedAt: null, notes: undefined },
      { title: 'Campaign Build', status: 'NOT_STARTED', milestoneType: 'SETUP', progress: 0, order: 5, startDate: null, dueDate: null, completedAt: null, notes: undefined },
      { title: 'Launch', status: 'NOT_STARTED', milestoneType: 'SETUP', progress: 0, order: 6, startDate: null, dueDate: null, completedAt: null, notes: undefined },
      { title: 'Ongoing Optimisation', status: 'NOT_STARTED', milestoneType: 'SETUP', progress: 0, order: 7, startDate: null, dueDate: null, completedAt: null, notes: undefined },
    ],
    invoices: [],
    documents: [],
    intake: {
      decisionMaker: 'just_me', state: 'NSW',
      servicesOffered: ['Individual tax returns', 'Business tax returns', 'BAS lodgement', 'SMSF accounting'],
      hasRunPaidAds: false, hasSocialPage: true,
      targetServices: ['Individual tax returns', 'Business tax returns'],
      idealClients: ['Sole traders & contractors', 'Small business owners (1–10 staff)'],
      monthlyCapacity: '4-6',
      goals90Day: ['Consistent, predictable new client flow', 'Reduce reliance on referrals'],
      currentSituation: ['Lead flow is inconsistent and unpredictable', 'Most clients come from word of mouth only'],
      mainConcern: 'Not sure if paid ads will work for an accounting firm in my area.',
      targetGeography: ['📍 My home state only'],
      kickoffCallBooked: true, kickoffCallDate: new Date('2026-04-28T10:00:00Z'),
    },
  },
  {
    stableId: 'demo-parkside-tax', email: 'david@parksidetax.com.au', name: 'David Park',
    companyName: 'Parkside Tax Solutions', industry: 'Tax Advisory & Compliance',
    onboardingStep: 1, adAccountId: null,
    milestones: [
      { title: 'Complete intake', status: 'COMPLETED', milestoneType: 'SETUP', progress: 100, order: 1, startDate: new Date('2026-04-20'), dueDate: new Date('2026-04-20'), completedAt: new Date('2026-04-20'), notes: [{ id: 'n1', content: 'Survey completed via website. Intake data received.', createdAt: '2026-04-20T09:45:00Z', createdBy: 'BaseAim Team' }] },
      { title: 'Kickoff call', status: 'IN_PROGRESS', milestoneType: 'SETUP', progress: 0, order: 2, startDate: null, dueDate: null, completedAt: null, notes: undefined },
      { title: 'Ad Account Setup', status: 'NOT_STARTED', milestoneType: 'SETUP', progress: 0, order: 3, startDate: null, dueDate: null, completedAt: null, notes: undefined },
      { title: 'Landing Page Development', status: 'NOT_STARTED', milestoneType: 'SETUP', progress: 0, order: 4, startDate: null, dueDate: null, completedAt: null, notes: undefined },
      { title: 'Campaign Build', status: 'NOT_STARTED', milestoneType: 'SETUP', progress: 0, order: 5, startDate: null, dueDate: null, completedAt: null, notes: undefined },
      { title: 'Launch', status: 'NOT_STARTED', milestoneType: 'SETUP', progress: 0, order: 6, startDate: null, dueDate: null, completedAt: null, notes: undefined },
      { title: 'Ongoing Optimisation', status: 'NOT_STARTED', milestoneType: 'SETUP', progress: 0, order: 7, startDate: null, dueDate: null, completedAt: null, notes: undefined },
    ],
    invoices: [],
    documents: [],
    intake: {
      decisionMaker: 'partner_involved', state: 'VIC',
      servicesOffered: ['Individual tax returns', 'Business tax returns', 'Bookkeeping', 'Payroll'],
      hasRunPaidAds: false, hasSocialPage: false,
      targetServices: ['Individual tax returns', 'Bookkeeping'],
      idealClients: ['Sole traders & contractors', 'Investors (property / shares)'],
      excludedClientTypes: 'Large corporates — too complex for our current team size.',
      monthlyCapacity: '1-3',
      goals90Day: ['Get our first paid lead within 30 days', 'Understand what makes a good ad for our niche'],
      currentSituation: ["We've never done paid advertising before", "Not sure where to start or what budget makes sense"],
      mainConcern: "Budget risk — we're a small firm and can't afford to waste money on ads that don't convert.",
      targetGeography: ['🏙️ Only my local city / metro area'],
      geographyExclusions: 'Regional Victoria — too far for face-to-face meetings which our clients prefer.',
      kickoffCallBooked: false,
    },
  },
]

export async function POST(req: NextRequest): Promise<NextResponse> {
  const apiKey = req.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.SURVEY_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const action = req.nextUrl.searchParams.get('action') // 'clean' or 'seed'

  try {
    if (action === 'clean') {
      await prisma.client.deleteMany({ where: { isDemo: true } })
      await prisma.user.deleteMany({ where: { email: { in: DEMO_CLIENT_EMAILS } } })
      await prisma.user.deleteMany({ where: { email: DEMO_ADMIN_EMAIL } })
      return NextResponse.json({ success: true, message: 'Demo data cleaned' })
    }

    if (action === 'seed') {
      const hashedAdminPwd = await bcrypt.hash(DEMO_ADMIN_PASSWORD, 10)
      const hashedClientPwd = await bcrypt.hash('client123', 10)

      await prisma.user.upsert({
        where: { email: DEMO_ADMIN_EMAIL },
        update: { name: 'Zara Khan', role: 'ADMIN' },
        create: { email: DEMO_ADMIN_EMAIL, name: 'Zara Khan', password: hashedAdminPwd, role: 'ADMIN' },
      })

      const results: string[] = []

      for (const profile of DEMO_PROFILES) {
        const user = await prisma.user.upsert({
          where: { email: profile.email },
          update: { name: profile.name, role: 'CLIENT' },
          create: { email: profile.email, name: profile.name, password: hashedClientPwd, role: 'CLIENT' },
        })

        const client = await prisma.client.upsert({
          where: { demoStableId: profile.stableId },
          update: { companyName: profile.companyName, industry: profile.industry, onboardingStep: profile.onboardingStep, adAccountId: profile.adAccountId, leadsChartEnabled: false, isDemo: true },
          create: { userId: user.id, companyName: profile.companyName, industry: profile.industry, onboardingStep: profile.onboardingStep, adAccountId: profile.adAccountId, leadsChartEnabled: false, isDemo: true, demoStableId: profile.stableId },
        })

        await prisma.milestone.deleteMany({ where: { clientId: client.id } })
        if (profile.milestones.length > 0) {
          await prisma.milestone.createMany({
            data: profile.milestones.map(m => ({
              clientId: client.id, title: m.title, description: m.description ?? null,
              status: m.status, milestoneType: m.milestoneType, progress: m.progress,
              order: m.order, startDate: m.startDate ?? null, dueDate: m.dueDate ?? null,
              completedAt: m.completedAt ?? null, notes: m.notes as any,
            })),
          })
        }

        await prisma.invoice.deleteMany({ where: { clientId: client.id } })
        if (profile.invoices.length > 0) {
          await prisma.invoice.createMany({
            data: profile.invoices.map(inv => ({
              clientId: client.id, invoiceNumber: inv.invoiceNumber, amount: inv.amount,
              currency: 'usd', status: inv.status, dueDate: inv.dueDate,
              paidAt: inv.paidAt ?? null, description: inv.description, items: inv.items,
            })),
          })
        }

        await prisma.document.deleteMany({ where: { clientId: client.id } })
        if (profile.documents.length > 0) {
          await prisma.document.createMany({
            data: profile.documents.map(doc => ({
              clientId: client.id, title: doc.title, fileName: doc.fileName,
              fileSize: doc.fileSize, fileType: doc.fileType, fileUrl: '#demo',
              status: 'APPROVED' as const, uploadedBy: 'BaseAim Team',
            })),
          })
        }

        if (profile.intake) {
          const intake = profile.intake
          await prisma.clientIntake.upsert({
            where: { clientId: client.id },
            update: {
              decisionMaker: intake.decisionMaker, state: intake.state,
              servicesOffered: intake.servicesOffered, hasRunPaidAds: intake.hasRunPaidAds,
              hasSocialPage: intake.hasSocialPage, targetServices: intake.targetServices,
              idealClients: intake.idealClients, excludedClientTypes: intake.excludedClientTypes ?? null,
              monthlyCapacity: intake.monthlyCapacity, goals90Day: intake.goals90Day,
              currentSituation: intake.currentSituation, mainConcern: intake.mainConcern ?? null,
              targetGeography: intake.targetGeography, targetRegions: intake.targetRegions ?? null,
              geographyExclusions: intake.geographyExclusions ?? null,
              kickoffCallBooked: intake.kickoffCallBooked, kickoffCallDate: intake.kickoffCallDate ?? null,
            },
            create: {
              clientId: client.id, decisionMaker: intake.decisionMaker, state: intake.state,
              servicesOffered: intake.servicesOffered, hasRunPaidAds: intake.hasRunPaidAds,
              hasSocialPage: intake.hasSocialPage, targetServices: intake.targetServices,
              idealClients: intake.idealClients, excludedClientTypes: intake.excludedClientTypes ?? null,
              monthlyCapacity: intake.monthlyCapacity, goals90Day: intake.goals90Day,
              currentSituation: intake.currentSituation, mainConcern: intake.mainConcern ?? null,
              targetGeography: intake.targetGeography, targetRegions: intake.targetRegions ?? null,
              geographyExclusions: intake.geographyExclusions ?? null,
              kickoffCallBooked: intake.kickoffCallBooked, kickoffCallDate: intake.kickoffCallDate ?? null,
            },
          })
        }

        results.push(profile.companyName)
      }

      return NextResponse.json({ success: true, seeded: results })
    }

    return NextResponse.json({ error: 'Provide ?action=clean or ?action=seed' }, { status: 400 })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
