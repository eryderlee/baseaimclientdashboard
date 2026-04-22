export type OnboardingChecklistKey = 'confirm' | 'decide' | 'collect' | 'align' | 'compliance' | 'book'

export interface OnboardingChecklist {
  confirm: boolean[]     // 11
  decide: boolean[]      // 8
  collect: boolean[]     // 7
  align: boolean[]       // 9
  compliance: boolean[]  // 5
  book: boolean[]        // 4
}

export const CHECKLIST_SECTION_LENGTHS: Record<OnboardingChecklistKey, number> = {
  confirm: 11,
  decide: 8,
  collect: 7,
  align: 9,
  compliance: 5,
  book: 4,
}

export const CHECKLIST_TOTAL = 44

export const CHECKLIST_DEFAULTS: OnboardingChecklist = {
  confirm:    Array(11).fill(false),
  decide:     Array(8).fill(false),
  collect:    Array(7).fill(false),
  align:      Array(9).fill(false),
  compliance: Array(5).fill(false),
  book:       Array(4).fill(false),
}

export interface ChecklistSection {
  key: OnboardingChecklistKey
  title: string
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
    key: 'decide',
    title: 'Section 2 — Decide',
    items: [
      'Landing page: BaseAim domain (default) or client subdomain (adds 5–10 days)',
      'Booking system path locked (existing → link confirmed and tested live; or BaseAim-provisioned → calendar, call length, hours, buffer, notifications)',
      'Lead delivery path decided (by default, leads book into booking system)',
      'Booking system auto-notifies of new bookings? (if yes, done)',
      'Additional notifications needed? (SMS / secondary email / CRM webhook)',
      'Lead response protocol — who owns the booked call, what happens between booking and call',
      'No-show handling — auto-rebook email / nurture sequence / personal follow-up',
      'Offer/hook approved — landing page offer framing matches what they\'re comfortable with',
    ],
  },
  {
    key: 'collect',
    title: 'Section 3 — Collect',
    items: [
      'Logo file (SVG or high-res PNG) dropped into shared Drive folder',
      'Brand colors (hex codes, or "whatever\'s on your website is fine")',
      'Specific messaging requirements or phrases they want (or forbid) on the landing page',
      'Facebook page admin access granted (if needed for setup)',
      'Booking system credentials/connection obtained (needed for tracking)',
      'Professional body / registration number if required on ads or landing page',
      'Existing client photos or videos confirmed (usually none — that\'s fine)',
    ],
  },
  {
    key: 'align',
    title: 'Section 4 — Align',
    items: [
      'First lead timeline set: Day 7–10',
      'Learning phase reality acknowledged: weeks 2–4 CPL will be high, that\'s normal',
      '"Good lead" definition agreed: what counts as qualified, what doesn\'t',
      'Dispute policy understood: flag within 48h via dashboard, auto-review in ≤48h',
      'Communication rhythm confirmed: weekly Loom, monthly call, quarterly review',
      'Emergency contact protocol — Sora\'s direct channel, what counts as urgent',
      'Capacity adjustment process — how they signal they\'re too busy or want more leads',
      'Tax season plan — pre-agreed throttling for their peak period',
      'Pause/cancel terms confirmed (whatever\'s in the contract, said aloud)',
    ],
  },
  {
    key: 'compliance',
    title: 'Section 5 — Compliance',
    items: [
      'Professional body rules they\'re bound by (CPA Australia, CA ANZ, IPA)',
      'Language they\'re required to include on any marketing (e.g. registration number)',
      'Language they\'re prohibited from using ("specialist," "best," guarantees)',
      'Testimonial/case study policy — can you reference them in future marketing',
      'Anything unusual about their jurisdiction',
    ],
  },
  {
    key: 'book',
    title: 'Section 6 — Book',
    items: [
      'Day 30 monthly review call booked on both calendars before hanging up',
      'Sora\'s direct contact (email + WhatsApp if applicable) delivered and saved by client',
      'Client login to dashboard tested live (magic link sent during call, client logs in on their phone)',
      'Test booking completed (Sora books a fake slot, cancels it, confirms end-to-end flow)',
    ],
  },
]

export function mergeChecklistWithDefaults(raw: unknown): OnboardingChecklist {
  const defaults = {
    confirm:    [...CHECKLIST_DEFAULTS.confirm],
    decide:     [...CHECKLIST_DEFAULTS.decide],
    collect:    [...CHECKLIST_DEFAULTS.collect],
    align:      [...CHECKLIST_DEFAULTS.align],
    compliance: [...CHECKLIST_DEFAULTS.compliance],
    book:       [...CHECKLIST_DEFAULTS.book],
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults
  const r = raw as Record<string, unknown>
  const keys: OnboardingChecklistKey[] = ['confirm', 'decide', 'collect', 'align', 'compliance', 'book']
  for (const key of keys) {
    const section = r[key]
    if (Array.isArray(section)) {
      const expected = CHECKLIST_SECTION_LENGTHS[key]
      defaults[key] = Array.from({ length: expected }, (_, i) => Boolean(section[i] ?? false))
    }
  }
  return defaults
}

export function countChecked(checklist: OnboardingChecklist): number {
  return Object.values(checklist).flat().filter(Boolean).length
}
