export type OnboardingChecklistKey = 'confirm' | 'align' | 'setup' | 'compliance' | 'preview' | 'book' | 'postcall'

export interface OnboardingChecklist {
  confirm:    boolean[]  // 11
  align:      boolean[]  // 8
  setup:      boolean[]  // 11
  compliance: boolean[]  // 5
  preview:    boolean[]  // 1
  book:       boolean[]  // 4
  postcall:   boolean[]  // 5
}

export const CHECKLIST_SECTION_LENGTHS: Record<OnboardingChecklistKey, number> = {
  confirm:    11,
  align:      8,
  setup:      11,
  compliance: 5,
  preview:    1,
  book:       4,
  postcall:   5,
}

/** Maximum possible total — some items may be inactive (conditional) */
export const CHECKLIST_MAX_TOTAL = 45

export const CHECKLIST_DEFAULTS: OnboardingChecklist = {
  confirm:    Array(11).fill(false),
  align:      Array(8).fill(false),
  setup:      Array(11).fill(false),
  compliance: Array(5).fill(false),
  preview:    Array(1).fill(false),
  book:       Array(4).fill(false),
  postcall:   Array(5).fill(false),
}

export interface ChecklistSection {
  key: OnboardingChecklistKey
  title: string
  subtitle?: string
  items: string[]
}

export const CHECKLIST_SECTIONS: ChecklistSection[] = [
  {
    key: 'confirm',
    title: 'Section 1 — Confirm',
    items: [
      'Firm legal name (for invoicing + contracts)',
      'Decision-maker on all calls (who\'s on every monthly review)',
      'Services they offer (multi-select confirmed)',
      'Focus services they want leads for (top 3, ranked if possible)',
      'Ideal client types confirmed',
      'Geography — where they want clients from (nationwide / state / specific regions)',
      'Geographic exclusions confirmed',
      'Client-type exclusions confirmed (industries they won\'t take)',
      'Monthly capacity number confirmed (and what "comfortable" actually means — with or without existing referral flow?)',
      'Existing Facebook/Instagram page confirmed',
      'Booking system answer from Form A confirmed (existing / needs setup / unsure)',
    ],
  },
  {
    key: 'align',
    title: 'Section 2 — Align',
    subtitle: 'Expectations locked in before decisions get made. Most items here are tick-only — the script sets expectations verbally and the tick records acknowledgement.',
    items: [
      'First lead timeline confirmed: 4–6 weeks from today',
      'Build phase acknowledged: roughly 1 month (landing page 1–2 weeks, ads 3–4 weeks)',
      'Learning phase reality acknowledged: first 3–4 weeks of ads, CPL 50–100% above target — normal behaviour',
      '"Good lead" definition agreed',
      'Dispute policy understood: flag within 48h via dashboard chat, auto-review in ≤48h, credit back if valid',
      'Communication rhythm confirmed: weekly email updates during build, Loom on first lead + major milestones, monthly review call, Day 90 quarterly',
      'What we need from client understood: answer booked calls, flag off leads within 48h, signal capacity changes',
      'Tax season throttling plan flagged',
    ],
  },
  {
    key: 'setup',
    title: 'Section 3 — Set up',
    subtitle: 'Live decisions and access grants. Every item here must be locked before the block ends.',
    items: [
      'Landing page path',
      'Booking system path locked',
      'Test booking completed end-to-end',
      'Lead response protocol',
      'Additional notifications',
      'No-show handling',
      'Offer / hook approved',
      'Brand assets magic link sent to client email',
      'Logo approach decided',
      'Brand colours decided',
      'Facebook page access granted — MANDATORY',
    ],
  },
  {
    key: 'compliance',
    title: 'Section 4 — Compliance',
    subtitle: 'Protect the client\'s professional standing and our own ad copy.',
    items: [
      'Professional body registration confirmed',
      'Required language captured',
      'Prohibited language captured',
      'Testimonial / case study policy',
      'Jurisdiction-specific flags captured',
    ],
  },
  {
    key: 'preview',
    title: 'Section 5 — Preview',
    subtitle: 'Client sees what their dashboard will look like. No decisions here, just orientation.',
    items: [
      'Dashboard walkthrough completed',
    ],
  },
  {
    key: 'book',
    title: 'Section 6 — Book',
    subtitle: 'Lock in the next touchpoint and communication channels.',
    items: [
      'Day 30 monthly review booked on both calendars',
      'Emergency contact protocol understood: urgent (actively broken) = same-day via chat/WhatsApp; routine = within 24h',
      'Sora\'s direct contact delivered: dashboard chat (primary), email + WhatsApp (backup)',
      'Dashboard magic link sent — password setup flagged as client action within 48h',
    ],
  },
  {
    key: 'postcall',
    title: 'Section 7 — Post-call',
    subtitle: 'Client self-serve via dashboard, first 48h. Items only active if triggered by decisions in Section 3.',
    items: [
      'Logo file uploaded',
      'Brand guide uploaded',
      'Existing client photos / videos uploaded (or N/A confirmed)',
      'Dashboard password set + first login completed',
      'DNS records added to domain provider',
    ],
  },
]

// ─── Per-item note types ─────────────────────────────────────────────────────

export type ItemNoteConfig =
  | { type: 'none' }
  | { type: 'text'; placeholder: string }
  | { type: 'choice'; options: string[] }
  | { type: 'choice-with-conditional'; options: string[]; conditionalNotes: Partial<Record<string, string>> }

/** String-keyed notes: index as string key, plus "{index}_note" for conditional text fields */
export type ChecklistNotes = Partial<Record<OnboardingChecklistKey, Record<string, string>>>

const N: ItemNoteConfig = { type: 'none' }
const t = (placeholder: string): ItemNoteConfig => ({ type: 'text', placeholder })
const c = (...options: string[]): ItemNoteConfig => ({ type: 'choice', options })
const cc = (options: string[], conditionalNotes: Partial<Record<string, string>>): ItemNoteConfig =>
  ({ type: 'choice-with-conditional', options, conditionalNotes })

export const CHECKLIST_ITEM_NOTES: Record<OnboardingChecklistKey, ItemNoteConfig[]> = {
  // Section 1 — all none (data is in the editable kickoff form above)
  confirm: [N, N, N, N, N, N, N, N, N, N, N],

  // Section 2 — Align
  align: [
    N,
    N,
    N,
    t('e.g. Business owner in professional services, budget >$5k/yr, not a price-shopper'),
    N,
    N,
    N,
    t('e.g. July–September blackout — or "defer to Day 60"'),
  ],

  // Section 3 — Set up
  setup: [
    cc(
      ['BaseAim domain', 'Client subdomain'],
      { 'Client subdomain': 'Domain provider (e.g. GoDaddy, Crazy Domains, Ventraip) and who has the login' }
    ),
    cc(
      ['Existing', 'BaseAim-provisioned (Cal.com)'],
      {
        'Existing': 'Platform name, booking link — confirm admin access granted live',
        'BaseAim-provisioned (Cal.com)': 'Call length, buffer, calendar type, working hours',
      }
    ),
    N,
    t('e.g. Jane owns all calls; prep email sent 1h before booking'),
    c('Just the default booking email', 'SMS', 'Secondary email', 'CRM webhook'),
    c('Auto-rebook email', 'Nurture sequence', 'Personal follow-up'),
    t('e.g. "Stop missing tax deadlines — get it sorted in one call"'),
    N, // item 27 — has inline magic link button
    c('Upload existing file (post-call via dashboard)', "Use logo from client's website", 'BaseAim to design from scratch'),
    cc(
      ['Hex codes specified below', "Match client's website colours", 'Upload brand guide (post-call via dashboard)', 'BaseAim to extract from logo'],
      { 'Hex codes specified below': 'e.g. #1A2B3C, #FFFFFF' }
    ),
    c(
      'Path A (existing FB account + page → admin access granted)',
      'Path B (account exists, page created live → admin access granted)',
      'Path C (no FB account, both created live → admin access granted)'
    ),
  ],

  // Section 4 — Compliance
  compliance: [
    cc(
      ['CPA Australia', 'CA ANZ', 'IPA', 'Other'],
      { 'Other': 'Name of professional body' }
    ),
    t('"CPA Lic. 12345 must appear on all ads" — or "None"'),
    t('Cannot use "specialist", "best", guarantees — or "None beyond defaults"'),
    c('Yes', 'No', 'Case-by-case (ask before each use)'),
    t('e.g. None — or describe any unusual requirement'),
  ],

  // Section 5 — Preview
  preview: [N],

  // Section 6 — Book
  book: [
    t('e.g. 15 May 2025, 2pm AEST'),
    N,
    N,
    N, // item 40 — has inline magic link button
  ],

  // Section 7 — Post-call
  postcall: [N, N, N, N, N],
}

// ─── Conditional items ───────────────────────────────────────────────────────

export const CONDITIONAL_ITEMS: Array<{
  sectionKey: OnboardingChecklistKey
  index: number
  label: string
  isActive: (notes: ChecklistNotes) => boolean
}> = [
  {
    sectionKey: 'postcall',
    index: 0,
    label: 'Logo upload',
    isActive: (notes) => notes.setup?.['8'] === 'Upload existing file (post-call via dashboard)',
  },
  {
    sectionKey: 'postcall',
    index: 1,
    label: 'Brand guide upload',
    isActive: (notes) => notes.setup?.['9'] === 'Upload brand guide (post-call via dashboard)',
  },
  {
    sectionKey: 'postcall',
    index: 4,
    label: 'DNS records',
    isActive: (notes) => notes.setup?.['0'] === 'Client subdomain',
  },
]

export function isItemActive(sectionKey: OnboardingChecklistKey, index: number, notes: ChecklistNotes): boolean {
  const conditional = CONDITIONAL_ITEMS.find(c => c.sectionKey === sectionKey && c.index === index)
  if (!conditional) return true
  return conditional.isActive(notes)
}

export function computeActiveTotal(notes: ChecklistNotes): number {
  const inactiveCount = CONDITIONAL_ITEMS.filter(item => !item.isActive(notes)).length
  return CHECKLIST_MAX_TOTAL - inactiveCount
}

// ─── Chase templates (shown when item is active but unchecked) ───────────────

export const CHECKLIST_ITEM_CHASE_TEMPLATES: Partial<Record<OnboardingChecklistKey, Partial<Record<number, string>>>> = {
  postcall: {
    0: `Heya [name], quick nudge — we're ready to start on your landing page build but need your logo file from you first. Five minutes in the dashboard will unblock us. Link: [magic link]`,
    1: `Heya [name], quick nudge — we're ready to start on your landing page build but need your brand guide from you first. Five minutes in the dashboard will unblock us. Link: [magic link]`,
    2: `Heya [name], quick nudge — we're ready to start on your landing page build but wanted to confirm on client photos / videos. Even if you have none, just let us know and we'll get moving. Link: [magic link]`,
    3: `Heya [name], quick nudge — we're ready to start on your landing page build but need your dashboard password set first. Five minutes in the dashboard will unblock us. Link: [magic link]`,
    4: `Heya [name], flagging this one because it's on the critical path — those DNS records I emailed through on [date]. Once they're added and propagated (5–10 days) we can push your landing page live on your subdomain. Happy to jump on a 10-min screenshare to walk you through it if that's easier than sorting it solo.`,
  },
}

// ─── Utility functions ───────────────────────────────────────────────────────

export function mergeChecklistWithDefaults(raw: unknown): OnboardingChecklist {
  const defaults = {
    confirm:    [...CHECKLIST_DEFAULTS.confirm],
    align:      [...CHECKLIST_DEFAULTS.align],
    setup:      [...CHECKLIST_DEFAULTS.setup],
    compliance: [...CHECKLIST_DEFAULTS.compliance],
    preview:    [...CHECKLIST_DEFAULTS.preview],
    book:       [...CHECKLIST_DEFAULTS.book],
    postcall:   [...CHECKLIST_DEFAULTS.postcall],
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults
  const r = raw as Record<string, unknown>
  const keys: OnboardingChecklistKey[] = ['confirm', 'align', 'setup', 'compliance', 'preview', 'book', 'postcall']
  for (const key of keys) {
    const section = r[key]
    if (Array.isArray(section)) {
      const expected = CHECKLIST_SECTION_LENGTHS[key]
      defaults[key] = Array.from({ length: expected }, (_, i) => Boolean(section[i] ?? false))
    }
  }
  return defaults
}

export function countChecked(checklist: OnboardingChecklist, notes?: ChecklistNotes): number {
  let count = 0
  const keys = Object.keys(CHECKLIST_SECTION_LENGTHS) as OnboardingChecklistKey[]
  for (const key of keys) {
    checklist[key].forEach((checked, index) => {
      if (!checked) return
      if (notes && !isItemActive(key, index, notes)) return
      count++
    })
  }
  return count
}
