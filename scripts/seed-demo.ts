import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const CLEAN = process.argv.includes('--clean')

const DEMO_ADMIN_EMAIL = 'khan@baseaim.co'
const DEMO_ADMIN_PASSWORD = 'BaseAim2026!'

const DEMO_CLIENT_EMAILS = [
  'calloway@callowayklein.com',
  'priya@summitridgeaccounting.com',
  'tosei@meridianfinancial.com',
  'samira@apextaxadvisory.com',
  'elena@hargroveassociates.com',
]

// ---------------------------------------------------------------------------
// Demo client profile definitions
// ---------------------------------------------------------------------------

const DEMO_PROFILES = [
  // -------------------------------------------------------------------------
  // Client 1 — Calloway & Klein CPAs — Early setup (phases 1-2)
  // -------------------------------------------------------------------------
  {
    stableId: 'demo-calloway-klein',
    email: 'calloway@callowayklein.com',
    name: 'Marcus Calloway',
    companyName: 'Calloway & Klein CPAs',
    industry: 'Tax & Financial Advisory',
    onboardingStep: 2,
    adAccountId: null as string | null,
    leadsChartEnabled: false,
    milestones: [
      {
        title: 'Client Onboarding',
        status: 'COMPLETED' as const,
        milestoneType: 'SETUP' as const,
        progress: 100,
        order: 1,
        completedAt: new Date('2026-03-10'),
        startDate: new Date('2026-03-05'),
        dueDate: new Date('2026-03-10'),
        notes: [
          {
            id: 'note-calloway-onboarding',
            content: 'Kickoff call completed. Business goals and ad budget discussed. Signed off on strategy.',
            createdAt: '2026-03-10T14:00:00Z',
            createdBy: 'BaseAim Team',
          },
        ],
      },
      {
        title: 'Ad Account Setup',
        status: 'IN_PROGRESS' as const,
        milestoneType: 'SETUP' as const,
        progress: 60,
        order: 2,
        startDate: new Date('2026-03-15'),
        dueDate: new Date('2026-03-25'),
        completedAt: null,
        notes: undefined,
      },
      {
        title: 'Landing Page Development',
        status: 'NOT_STARTED' as const,
        milestoneType: 'SETUP' as const,
        progress: 0,
        order: 3,
        startDate: null,
        dueDate: null,
        completedAt: null,
        notes: undefined,
      },
      {
        title: 'Campaign Build',
        status: 'NOT_STARTED' as const,
        milestoneType: 'SETUP' as const,
        progress: 0,
        order: 4,
        startDate: null,
        dueDate: null,
        completedAt: null,
        notes: undefined,
      },
      {
        title: 'Launch',
        status: 'NOT_STARTED' as const,
        milestoneType: 'SETUP' as const,
        progress: 0,
        order: 5,
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
        order: 6,
        startDate: null,
        dueDate: null,
        completedAt: null,
        notes: undefined,
      },
    ],
    invoices: [] as InvoiceInput[],
    documents: [] as DocumentInput[],
  },

  // -------------------------------------------------------------------------
  // Client 2 — Summit Ridge Accounting — Mid setup (phases 3-4)
  // -------------------------------------------------------------------------
  {
    stableId: 'demo-summit-ridge',
    email: 'priya@summitridgeaccounting.com',
    name: 'Priya Nair',
    companyName: 'Summit Ridge Accounting',
    industry: 'Accounting & Bookkeeping',
    onboardingStep: 4,
    adAccountId: null as string | null,
    leadsChartEnabled: false,
    milestones: [
      {
        title: 'Client Onboarding',
        status: 'COMPLETED' as const,
        milestoneType: 'SETUP' as const,
        progress: 100,
        order: 1,
        completedAt: new Date('2026-02-20'),
        startDate: new Date('2026-02-14'),
        dueDate: new Date('2026-02-20'),
        notes: [
          {
            id: 'note-summit-onboarding',
            content: 'Initial onboarding completed. Ad budget and target audience defined.',
            createdAt: '2026-02-20T11:00:00Z',
            createdBy: 'BaseAim Team',
          },
        ],
      },
      {
        title: 'Ad Account Setup',
        status: 'COMPLETED' as const,
        milestoneType: 'SETUP' as const,
        progress: 100,
        order: 2,
        completedAt: new Date('2026-02-28'),
        startDate: new Date('2026-02-21'),
        dueDate: new Date('2026-02-28'),
        notes: [
          {
            id: 'note-summit-adaccount',
            content: 'Facebook Business Manager set up. Pixel installed and verified.',
            createdAt: '2026-02-28T15:00:00Z',
            createdBy: 'BaseAim Team',
          },
        ],
      },
      {
        title: 'Landing Page Development',
        status: 'COMPLETED' as const,
        milestoneType: 'SETUP' as const,
        progress: 100,
        order: 3,
        completedAt: new Date('2026-03-10'),
        startDate: new Date('2026-03-01'),
        dueDate: new Date('2026-03-10'),
        notes: [
          {
            id: 'note-summit-lp',
            content: 'Landing page live. A/B test copy variants approved by client.',
            createdAt: '2026-03-10T13:00:00Z',
            createdBy: 'BaseAim Team',
          },
        ],
      },
      {
        title: 'Campaign Build',
        status: 'IN_PROGRESS' as const,
        milestoneType: 'SETUP' as const,
        progress: 75,
        order: 4,
        startDate: new Date('2026-03-12'),
        dueDate: new Date('2026-03-22'),
        completedAt: null,
        notes: undefined,
      },
      {
        title: 'Launch',
        status: 'NOT_STARTED' as const,
        milestoneType: 'SETUP' as const,
        progress: 0,
        order: 5,
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
        order: 6,
        startDate: null,
        dueDate: null,
        completedAt: null,
        notes: undefined,
      },
    ],
    invoices: [] as InvoiceInput[],
    documents: [] as DocumentInput[],
  },

  // -------------------------------------------------------------------------
  // Client 3 — Meridian Financial Group — Recently launched (~1 month post-setup)
  // -------------------------------------------------------------------------
  {
    stableId: 'demo-meridian-financial',
    email: 'tosei@meridianfinancial.com',
    name: 'Thomas Osei',
    companyName: 'Meridian Financial Group',
    industry: 'Financial Planning & Wealth Management',
    onboardingStep: 6,
    adAccountId: 'act_demo_meridian' as string | null,
    leadsChartEnabled: true,
    milestones: [
      {
        title: 'Client Onboarding',
        status: 'COMPLETED' as const,
        milestoneType: 'SETUP' as const,
        progress: 100,
        order: 1,
        completedAt: new Date('2026-01-20'),
        startDate: new Date('2026-01-15'),
        dueDate: new Date('2026-01-20'),
        notes: [
          {
            id: 'note-meridian-onboarding',
            content: 'Strategy session complete. Wealth management lead funnel mapped out.',
            createdAt: '2026-01-20T10:00:00Z',
            createdBy: 'BaseAim Team',
          },
        ],
      },
      {
        title: 'Ad Account Setup',
        status: 'COMPLETED' as const,
        milestoneType: 'SETUP' as const,
        progress: 100,
        order: 2,
        completedAt: new Date('2026-01-27'),
        startDate: new Date('2026-01-21'),
        dueDate: new Date('2026-01-27'),
        notes: undefined,
      },
      {
        title: 'Landing Page Development',
        status: 'COMPLETED' as const,
        milestoneType: 'SETUP' as const,
        progress: 100,
        order: 3,
        completedAt: new Date('2026-02-05'),
        startDate: new Date('2026-01-28'),
        dueDate: new Date('2026-02-05'),
        notes: undefined,
      },
      {
        title: 'Campaign Build',
        status: 'COMPLETED' as const,
        milestoneType: 'SETUP' as const,
        progress: 100,
        order: 4,
        completedAt: new Date('2026-02-12'),
        startDate: new Date('2026-02-06'),
        dueDate: new Date('2026-02-12'),
        notes: undefined,
      },
      {
        title: 'Launch',
        status: 'COMPLETED' as const,
        milestoneType: 'SETUP' as const,
        progress: 100,
        order: 5,
        completedAt: new Date('2026-02-17'),
        startDate: new Date('2026-02-13'),
        dueDate: new Date('2026-02-17'),
        notes: [
          {
            id: 'note-meridian-launch',
            content: 'Campaigns live. Initial leads coming in. Monitoring performance closely.',
            createdAt: '2026-02-17T09:00:00Z',
            createdBy: 'BaseAim Team',
          },
        ],
      },
      {
        title: 'Ongoing Optimization',
        status: 'COMPLETED' as const,
        milestoneType: 'SETUP' as const,
        progress: 100,
        order: 6,
        completedAt: new Date('2026-02-20'),
        startDate: new Date('2026-02-18'),
        dueDate: new Date('2026-02-20'),
        notes: undefined,
      },
      // Growth milestones
      {
        title: 'Monthly Review — March 2026',
        status: 'IN_PROGRESS' as const,
        milestoneType: 'GROWTH' as const,
        progress: 40,
        order: 7,
        startDate: new Date('2026-03-01'),
        dueDate: new Date('2026-03-31'),
        completedAt: null,
        notes: undefined,
      },
      {
        title: 'Monthly Review — April 2026',
        status: 'NOT_STARTED' as const,
        milestoneType: 'GROWTH' as const,
        progress: 0,
        order: 8,
        startDate: null,
        dueDate: new Date('2026-04-30'),
        completedAt: null,
        notes: undefined,
      },
    ],
    invoices: [
      {
        invoiceNumber: 'DEMO-2026-C001',
        amount: 4200,
        status: 'PAID' as const,
        dueDate: new Date('2026-02-01'),
        paidAt: new Date('2026-02-03'),
        description: 'Campaign Setup & Strategy',
        items: [{ description: 'Campaign Setup & Strategy', quantity: 1, unitPrice: 4200 }],
      },
      {
        invoiceNumber: 'DEMO-2026-C002',
        amount: 2800,
        status: 'PAID' as const,
        dueDate: new Date('2026-03-01'),
        paidAt: new Date('2026-03-02'),
        description: 'Monthly Ad Management',
        items: [{ description: 'Monthly Ad Management', quantity: 1, unitPrice: 2800 }],
      },
    ] as InvoiceInput[],
    documents: [
      { title: 'Campaign Strategy Deck', fileName: 'Campaign Strategy Deck.pdf', fileSize: 2450000, fileType: 'application/pdf' },
      { title: 'Landing Page Wireframes', fileName: 'Landing Page Wireframes.pdf', fileSize: 1800000, fileType: 'application/pdf' },
      { title: 'Ad Creative Concepts', fileName: 'Ad Creative Concepts.pdf', fileSize: 3200000, fileType: 'application/pdf' },
    ] as DocumentInput[],
  },

  // -------------------------------------------------------------------------
  // Client 4 — Apex Tax & Advisory — Active 3-4 months
  // -------------------------------------------------------------------------
  {
    stableId: 'demo-apex-tax',
    email: 'samira@apextaxadvisory.com',
    name: 'Samira Holt',
    companyName: 'Apex Tax & Advisory',
    industry: 'Tax Planning & Business Advisory',
    onboardingStep: 6,
    adAccountId: 'act_demo_apex' as string | null,
    leadsChartEnabled: true,
    milestones: [
      {
        title: 'Client Onboarding',
        status: 'COMPLETED' as const,
        milestoneType: 'SETUP' as const,
        progress: 100,
        order: 1,
        completedAt: new Date('2025-11-20'),
        startDate: new Date('2025-11-15'),
        dueDate: new Date('2025-11-20'),
        notes: undefined,
      },
      {
        title: 'Ad Account Setup',
        status: 'COMPLETED' as const,
        milestoneType: 'SETUP' as const,
        progress: 100,
        order: 2,
        completedAt: new Date('2025-11-28'),
        startDate: new Date('2025-11-21'),
        dueDate: new Date('2025-11-28'),
        notes: undefined,
      },
      {
        title: 'Landing Page Development',
        status: 'COMPLETED' as const,
        milestoneType: 'SETUP' as const,
        progress: 100,
        order: 3,
        completedAt: new Date('2025-12-05'),
        startDate: new Date('2025-11-29'),
        dueDate: new Date('2025-12-05'),
        notes: undefined,
      },
      {
        title: 'Campaign Build',
        status: 'COMPLETED' as const,
        milestoneType: 'SETUP' as const,
        progress: 100,
        order: 4,
        completedAt: new Date('2025-12-12'),
        startDate: new Date('2025-12-06'),
        dueDate: new Date('2025-12-12'),
        notes: undefined,
      },
      {
        title: 'Launch',
        status: 'COMPLETED' as const,
        milestoneType: 'SETUP' as const,
        progress: 100,
        order: 5,
        completedAt: new Date('2025-12-17'),
        startDate: new Date('2025-12-13'),
        dueDate: new Date('2025-12-17'),
        notes: [
          {
            id: 'note-apex-launch',
            content: 'All campaigns live. Strong initial click-through rates on tax savings angle.',
            createdAt: '2025-12-17T10:00:00Z',
            createdBy: 'BaseAim Team',
          },
        ],
      },
      {
        title: 'Ongoing Optimization',
        status: 'COMPLETED' as const,
        milestoneType: 'SETUP' as const,
        progress: 100,
        order: 6,
        completedAt: new Date('2025-12-20'),
        startDate: new Date('2025-12-18'),
        dueDate: new Date('2025-12-20'),
        notes: undefined,
      },
      // Growth milestones
      {
        title: 'Monthly Review — January 2026',
        status: 'COMPLETED' as const,
        milestoneType: 'GROWTH' as const,
        progress: 100,
        order: 7,
        completedAt: new Date('2026-01-28'),
        startDate: new Date('2026-01-01'),
        dueDate: new Date('2026-01-31'),
        notes: [
          {
            id: 'note-apex-jan',
            content: 'CTR improved 22% after creative refresh. Scaling top ad set by 30%.',
            createdAt: '2026-01-28T10:00:00Z',
            createdBy: 'BaseAim Team',
          },
        ],
      },
      {
        title: 'Monthly Review — February 2026',
        status: 'COMPLETED' as const,
        milestoneType: 'GROWTH' as const,
        progress: 100,
        order: 8,
        completedAt: new Date('2026-02-26'),
        startDate: new Date('2026-02-01'),
        dueDate: new Date('2026-02-28'),
        notes: [
          {
            id: 'note-apex-feb',
            content: 'Added retargeting campaign. CPC reduced to $0.95. Lead volume up 18%.',
            createdAt: '2026-02-26T10:00:00Z',
            createdBy: 'BaseAim Team',
          },
        ],
      },
      {
        title: 'Monthly Review — March 2026',
        status: 'IN_PROGRESS' as const,
        milestoneType: 'GROWTH' as const,
        progress: 50,
        order: 9,
        startDate: new Date('2026-03-01'),
        dueDate: new Date('2026-03-31'),
        completedAt: null,
        notes: undefined,
      },
      {
        title: 'Monthly Review — April 2026',
        status: 'NOT_STARTED' as const,
        milestoneType: 'GROWTH' as const,
        progress: 0,
        order: 10,
        startDate: null,
        dueDate: new Date('2026-04-30'),
        completedAt: null,
        notes: undefined,
      },
    ],
    invoices: [
      {
        invoiceNumber: 'DEMO-2026-D001',
        amount: 4200,
        status: 'PAID' as const,
        dueDate: new Date('2025-12-01'),
        paidAt: new Date('2025-12-03'),
        description: 'Campaign Setup & Strategy',
        items: [{ description: 'Campaign Setup & Strategy', quantity: 1, unitPrice: 4200 }],
      },
      {
        invoiceNumber: 'DEMO-2026-D002',
        amount: 2800,
        status: 'PAID' as const,
        dueDate: new Date('2026-01-01'),
        paidAt: new Date('2026-01-03'),
        description: 'Monthly Ad Management — January 2026',
        items: [{ description: 'Monthly Ad Management — January 2026', quantity: 1, unitPrice: 2800 }],
      },
      {
        invoiceNumber: 'DEMO-2026-D003',
        amount: 2800,
        status: 'PAID' as const,
        dueDate: new Date('2026-02-01'),
        paidAt: new Date('2026-02-02'),
        description: 'Monthly Ad Management — February 2026',
        items: [{ description: 'Monthly Ad Management — February 2026', quantity: 1, unitPrice: 2800 }],
      },
      {
        invoiceNumber: 'DEMO-2026-D004',
        amount: 2800,
        status: 'PAID' as const,
        dueDate: new Date('2026-03-01'),
        paidAt: new Date('2026-03-03'),
        description: 'Monthly Ad Management — March 2026',
        items: [{ description: 'Monthly Ad Management — March 2026', quantity: 1, unitPrice: 2800 }],
      },
      {
        invoiceNumber: 'DEMO-2026-D005',
        amount: 2800,
        status: 'SENT' as const,
        dueDate: new Date('2026-04-01'),
        paidAt: null,
        description: 'Monthly Ad Management — April 2026',
        items: [{ description: 'Monthly Ad Management — April 2026', quantity: 1, unitPrice: 2800 }],
      },
    ] as InvoiceInput[],
    documents: [
      { title: 'Campaign Strategy Deck', fileName: 'Campaign Strategy Deck.pdf', fileSize: 2450000, fileType: 'application/pdf' },
      { title: 'Landing Page Wireframes', fileName: 'Landing Page Wireframes.pdf', fileSize: 1800000, fileType: 'application/pdf' },
      { title: 'Ad Creative Concepts', fileName: 'Ad Creative Concepts.pdf', fileSize: 3200000, fileType: 'application/pdf' },
      { title: 'Monthly Report — January 2026', fileName: 'Monthly Report — January 2026.pdf', fileSize: 1500000, fileType: 'application/pdf' },
      { title: 'Monthly Report — February 2026', fileName: 'Monthly Report — February 2026.pdf', fileSize: 1650000, fileType: 'application/pdf' },
    ] as DocumentInput[],
  },

  // -------------------------------------------------------------------------
  // Client 5 — Hargrove & Associates — Mature 6+ months
  // -------------------------------------------------------------------------
  {
    stableId: 'demo-hargrove-associates',
    email: 'elena@hargroveassociates.com',
    name: 'Elena Hargrove',
    companyName: 'Hargrove & Associates',
    industry: 'Accounting, Tax & Business Consulting',
    onboardingStep: 6,
    adAccountId: 'act_demo_hargrove' as string | null,
    leadsChartEnabled: true,
    milestones: [
      {
        title: 'Client Onboarding',
        status: 'COMPLETED' as const,
        milestoneType: 'SETUP' as const,
        progress: 100,
        order: 1,
        completedAt: new Date('2025-08-20'),
        startDate: new Date('2025-08-15'),
        dueDate: new Date('2025-08-20'),
        notes: undefined,
      },
      {
        title: 'Ad Account Setup',
        status: 'COMPLETED' as const,
        milestoneType: 'SETUP' as const,
        progress: 100,
        order: 2,
        completedAt: new Date('2025-08-28'),
        startDate: new Date('2025-08-21'),
        dueDate: new Date('2025-08-28'),
        notes: undefined,
      },
      {
        title: 'Landing Page Development',
        status: 'COMPLETED' as const,
        milestoneType: 'SETUP' as const,
        progress: 100,
        order: 3,
        completedAt: new Date('2025-09-05'),
        startDate: new Date('2025-08-29'),
        dueDate: new Date('2025-09-05'),
        notes: undefined,
      },
      {
        title: 'Campaign Build',
        status: 'COMPLETED' as const,
        milestoneType: 'SETUP' as const,
        progress: 100,
        order: 4,
        completedAt: new Date('2025-09-12'),
        startDate: new Date('2025-09-06'),
        dueDate: new Date('2025-09-12'),
        notes: undefined,
      },
      {
        title: 'Launch',
        status: 'COMPLETED' as const,
        milestoneType: 'SETUP' as const,
        progress: 100,
        order: 5,
        completedAt: new Date('2025-09-17'),
        startDate: new Date('2025-09-13'),
        dueDate: new Date('2025-09-17'),
        notes: [
          {
            id: 'note-hargrove-launch',
            content: 'All campaigns live. Multi-service accounting firm angle resonating well with audience.',
            createdAt: '2025-09-17T10:00:00Z',
            createdBy: 'BaseAim Team',
          },
        ],
      },
      {
        title: 'Ongoing Optimization',
        status: 'COMPLETED' as const,
        milestoneType: 'SETUP' as const,
        progress: 100,
        order: 6,
        completedAt: new Date('2025-09-20'),
        startDate: new Date('2025-09-18'),
        dueDate: new Date('2025-09-20'),
        notes: undefined,
      },
      // Growth milestones
      {
        title: 'Monthly Review — October 2025',
        status: 'COMPLETED' as const,
        milestoneType: 'GROWTH' as const,
        progress: 100,
        order: 7,
        completedAt: new Date('2025-10-29'),
        startDate: new Date('2025-10-01'),
        dueDate: new Date('2025-10-31'),
        notes: [
          {
            id: 'note-hargrove-oct',
            content: 'First full month live. 47 leads generated. CPL at $28.40. Strong start — refining targeting for November.',
            createdAt: '2025-10-29T10:00:00Z',
            createdBy: 'BaseAim Team',
          },
        ],
      },
      {
        title: 'Monthly Review — November 2025',
        status: 'COMPLETED' as const,
        milestoneType: 'GROWTH' as const,
        progress: 100,
        order: 8,
        completedAt: new Date('2025-11-27'),
        startDate: new Date('2025-11-01'),
        dueDate: new Date('2025-11-30'),
        notes: [
          {
            id: 'note-hargrove-nov',
            content: '63 leads this month. CPL dropped to $22.10. Added lookalike audience targeting — big win.',
            createdAt: '2025-11-27T10:00:00Z',
            createdBy: 'BaseAim Team',
          },
        ],
      },
      {
        title: 'Monthly Review — December 2025',
        status: 'COMPLETED' as const,
        milestoneType: 'GROWTH' as const,
        progress: 100,
        order: 9,
        completedAt: new Date('2025-12-30'),
        startDate: new Date('2025-12-01'),
        dueDate: new Date('2025-12-31'),
        notes: [
          {
            id: 'note-hargrove-dec',
            content: 'Tax season interest driving high quality leads. 78 leads at $19.80 CPL. ROAS at 2.8.',
            createdAt: '2025-12-30T10:00:00Z',
            createdBy: 'BaseAim Team',
          },
        ],
      },
      {
        title: 'Monthly Review — January 2026',
        status: 'COMPLETED' as const,
        milestoneType: 'GROWTH' as const,
        progress: 100,
        order: 10,
        completedAt: new Date('2026-01-29'),
        startDate: new Date('2026-01-01'),
        dueDate: new Date('2026-01-31'),
        notes: [
          {
            id: 'note-hargrove-jan',
            content: 'Crossed 500 lifetime leads milestone. ROAS consistently above 3.0. Expanding to business tax advisory angle.',
            createdAt: '2026-01-29T10:00:00Z',
            createdBy: 'BaseAim Team',
          },
        ],
      },
      {
        title: 'Monthly Review — February 2026',
        status: 'COMPLETED' as const,
        milestoneType: 'GROWTH' as const,
        progress: 100,
        order: 11,
        completedAt: new Date('2026-02-27'),
        startDate: new Date('2026-02-01'),
        dueDate: new Date('2026-02-28'),
        notes: [
          {
            id: 'note-hargrove-feb',
            content: 'Expanded to Instagram placement. Cost per lead dropped 12%. Highest quality leads coming from Instagram Stories.',
            createdAt: '2026-02-27T10:00:00Z',
            createdBy: 'BaseAim Team',
          },
        ],
      },
      {
        title: 'Monthly Review — March 2026',
        status: 'IN_PROGRESS' as const,
        milestoneType: 'GROWTH' as const,
        progress: 60,
        order: 12,
        startDate: new Date('2026-03-01'),
        dueDate: new Date('2026-03-31'),
        completedAt: null,
        notes: undefined,
      },
      {
        title: 'Monthly Review — April 2026',
        status: 'NOT_STARTED' as const,
        milestoneType: 'GROWTH' as const,
        progress: 0,
        order: 13,
        startDate: null,
        dueDate: new Date('2026-04-30'),
        completedAt: null,
        notes: undefined,
      },
    ],
    invoices: [
      {
        invoiceNumber: 'DEMO-2026-E001',
        amount: 4200,
        status: 'PAID' as const,
        dueDate: new Date('2025-09-01'),
        paidAt: new Date('2025-09-02'),
        description: 'Campaign Setup & Strategy',
        items: [{ description: 'Campaign Setup & Strategy', quantity: 1, unitPrice: 4200 }],
      },
      {
        invoiceNumber: 'DEMO-2026-E002',
        amount: 2800,
        status: 'PAID' as const,
        dueDate: new Date('2025-10-01'),
        paidAt: new Date('2025-10-03'),
        description: 'Monthly Ad Management — October 2025',
        items: [{ description: 'Monthly Ad Management — October 2025', quantity: 1, unitPrice: 2800 }],
      },
      {
        invoiceNumber: 'DEMO-2026-E003',
        amount: 2800,
        status: 'PAID' as const,
        dueDate: new Date('2025-11-01'),
        paidAt: new Date('2025-11-03'),
        description: 'Monthly Ad Management — November 2025',
        items: [{ description: 'Monthly Ad Management — November 2025', quantity: 1, unitPrice: 2800 }],
      },
      {
        invoiceNumber: 'DEMO-2026-E004',
        amount: 2800,
        status: 'PAID' as const,
        dueDate: new Date('2025-12-01'),
        paidAt: new Date('2025-12-03'),
        description: 'Monthly Ad Management — December 2025',
        items: [{ description: 'Monthly Ad Management — December 2025', quantity: 1, unitPrice: 2800 }],
      },
      {
        invoiceNumber: 'DEMO-2026-E005',
        amount: 3200,
        status: 'PAID' as const,
        dueDate: new Date('2026-01-01'),
        paidAt: new Date('2026-01-03'),
        description: 'Monthly Ad Management — January 2026',
        items: [{ description: 'Monthly Ad Management — January 2026', quantity: 1, unitPrice: 3200 }],
      },
      {
        invoiceNumber: 'DEMO-2026-E006',
        amount: 3200,
        status: 'PAID' as const,
        dueDate: new Date('2026-02-01'),
        paidAt: new Date('2026-02-03'),
        description: 'Monthly Ad Management — February 2026',
        items: [{ description: 'Monthly Ad Management — February 2026', quantity: 1, unitPrice: 3200 }],
      },
      {
        invoiceNumber: 'DEMO-2026-E007',
        amount: 3200,
        status: 'PAID' as const,
        dueDate: new Date('2026-03-01'),
        paidAt: new Date('2026-03-03'),
        description: 'Monthly Ad Management — March 2026',
        items: [{ description: 'Monthly Ad Management — March 2026', quantity: 1, unitPrice: 3200 }],
      },
      {
        invoiceNumber: 'DEMO-2026-E008',
        amount: 3200,
        status: 'SENT' as const,
        dueDate: new Date('2026-04-01'),
        paidAt: null,
        description: 'Monthly Ad Management — April 2026',
        items: [{ description: 'Monthly Ad Management — April 2026', quantity: 1, unitPrice: 3200 }],
      },
    ] as InvoiceInput[],
    documents: [
      { title: 'Campaign Strategy Deck', fileName: 'Campaign Strategy Deck.pdf', fileSize: 2450000, fileType: 'application/pdf' },
      { title: 'Landing Page Wireframes', fileName: 'Landing Page Wireframes.pdf', fileSize: 1800000, fileType: 'application/pdf' },
      { title: 'Ad Creative Concepts', fileName: 'Ad Creative Concepts.pdf', fileSize: 3200000, fileType: 'application/pdf' },
      { title: 'Monthly Report — October 2025', fileName: 'Monthly Report — October 2025.pdf', fileSize: 1420000, fileType: 'application/pdf' },
      { title: 'Monthly Report — November 2025', fileName: 'Monthly Report — November 2025.pdf', fileSize: 1510000, fileType: 'application/pdf' },
      { title: 'Monthly Report — December 2025', fileName: 'Monthly Report — December 2025.pdf', fileSize: 1600000, fileType: 'application/pdf' },
      { title: 'Monthly Report — January 2026', fileName: 'Monthly Report — January 2026.pdf', fileSize: 1550000, fileType: 'application/pdf' },
      { title: 'Monthly Report — February 2026', fileName: 'Monthly Report — February 2026.pdf', fileSize: 1680000, fileType: 'application/pdf' },
      { title: 'Quarterly Business Review — Q4 2025', fileName: 'Quarterly Business Review — Q4 2025.pdf', fileSize: 4100000, fileType: 'application/pdf' },
      { title: '2026 Growth Strategy Proposal', fileName: '2026 Growth Strategy Proposal.pdf', fileSize: 2900000, fileType: 'application/pdf' },
    ] as DocumentInput[],
  },
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
  console.log('  5 demo clients:')
  console.log('    - Calloway & Klein CPAs (setup: phases 1-2)')
  console.log('    - Summit Ridge Accounting (setup: phases 3-4)')
  console.log('    - Meridian Financial Group (launched ~1 month)')
  console.log('    - Apex Tax & Advisory (active ~4 months)')
  console.log('    - Hargrove & Associates (mature ~7 months)')
  console.log('')
  console.log('Demo admin credentials:')
  console.log('  Email:    khan@baseaim.co')
  console.log('  Password: BaseAim2026!')
  console.log('')
  console.log('Demo client password (all 5): client123')
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

  console.log('Demo data removed. (1 admin + 5 clients and all associated records)')
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
