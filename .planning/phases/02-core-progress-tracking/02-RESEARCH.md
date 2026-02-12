# Phase 2: Core Progress Tracking - Research

**Researched:** 2026-02-12
**Domain:** React/Next.js milestone checklist UI with status tracking
**Confidence:** HIGH

## Summary

This phase implements a linear milestone checklist UI to display project progress for BaseAim clients. The requirements specify a straightforward checklist-style progress tracker (not a timeline/Gantt chart) showing standardized milestones with status indicators, progress percentages, dates, and optional notes.

The standard approach uses React component composition with Radix UI primitives (Progress component), Lucide React status icons, and Tailwind CSS for styling. State management for this UI feature layer should use local useState/useReducer since milestone data flows from the database (Prisma/PostgreSQL) and doesn't require global client state management. The existing Prisma Milestone model provides most required fields but needs a notes field added (using Json type for array of changelog entries).

Best practices emphasize accessibility (WCAG 2.1 AA compliance with ARIA labels, screen reader support, and color-blind-safe status indicators), clear visual hierarchy (currently active milestone highlighted), and week-level date precision using native JavaScript Intl.DateTimeFormat or lightweight libraries like date-fns/dayjs.

**Primary recommendation:** Build custom milestone checklist components using existing Radix UI Progress + Lucide icons rather than heavyweight timeline libraries. Store progress notes as Json field in Prisma schema, render with vertical timeline styling using Tailwind CSS connector lines and status badges.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @radix-ui/react-progress | 1.1.8 | Accessible progress bars | WAI-ARIA compliant, 2.76 kB gzipped, already in project |
| lucide-react | 0.563.0 | Status icons (CheckCircle2, Clock, Circle) | Already in project, tree-shakeable, comprehensive icon set |
| Tailwind CSS | 4.x | Styling and layout | Already in project, utility-first approach |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 3.x | Week-level date formatting | Comprehensive date utilities, tree-shakeable, TypeScript support |
| dayjs | 1.11.x | Lightweight date formatting | Alternative to date-fns (2kb vs 14kb), simpler API for basic needs |
| Intl.DateTimeFormat | Native | Date formatting | Zero dependencies, sufficient for basic "Week of Jan 15" formatting |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom checklist | React Gantt libraries (KendoReact, DayPilot) | Gantt charts are overkill for linear process, confuse non-technical clients (explicitly out of scope) |
| date-fns/dayjs | Moment.js | Moment is legacy (deprecated), larger bundle size, mutable API |
| Radix Progress | Custom progress bar | Reinventing accessibility is wasteful, Radix provides WCAG compliance out of box |

**Installation:**
```bash
# Only if date-fns needed (check if native Intl sufficient first)
npm install date-fns
# OR for lightweight alternative
npm install dayjs
```

**Note:** No additional UI libraries needed - all required components exist in current stack.

## Architecture Patterns

### Recommended Project Structure
```
app/
├── dashboard/
│   └── progress/
│       └── page.tsx              # Existing progress page (refactor to real data)
components/
├── dashboard/
│   ├── milestone-checklist.tsx   # Main checklist component
│   ├── milestone-item.tsx        # Individual milestone row
│   ├── milestone-progress.tsx    # Progress indicator with percentage
│   └── milestone-status-badge.tsx # Status badge with icon
lib/
├── milestone-utils.ts            # Status helpers, date formatting
└── types/
    └── milestone.ts              # TypeScript types for milestones
```

### Pattern 1: Vertical Checklist with Status Indicators
**What:** Linear list of milestones with left-aligned status icons, connector lines, and expandable details
**When to use:** For sequential processes where clients need to see "where am I now" at a glance
**Example:**
```typescript
// Source: Flowbite Tailwind CSS Timeline patterns + Radix UI Progress API
// https://flowbite.com/docs/components/timeline/
// https://www.radix-ui.com/primitives/docs/components/progress

interface MilestoneItemProps {
  milestone: {
    id: string
    title: string
    description: string | null
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED'
    progress: number
    dueDate: Date | null
    completedAt: Date | null
    order: number
  }
  isActive: boolean
  isLast: boolean
}

function MilestoneItem({ milestone, isActive, isLast }: MilestoneItemProps) {
  return (
    <div className="relative">
      {/* Connector line to next milestone */}
      {!isLast && (
        <div className="absolute left-3 top-12 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-800" />
      )}

      <div className="flex gap-4">
        {/* Status icon */}
        <div className="flex-shrink-0 mt-1 relative z-10">
          {getStatusIcon(milestone.status)}
        </div>

        {/* Content */}
        <div className={`flex-1 pb-8 ${isActive ? 'ring-2 ring-primary rounded-lg p-4' : ''}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-lg">{milestone.title}</h3>
              {milestone.description && (
                <p className="text-sm text-slate-500 mt-1">{milestone.description}</p>
              )}
            </div>
            <StatusBadge status={milestone.status} />
          </div>

          {/* Progress bar */}
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Progress</span>
              <span className="font-medium">{milestone.progress}%</span>
            </div>
            <Progress.Root value={milestone.progress} className="h-2">
              <Progress.Indicator
                className="bg-primary h-full transition-all"
                style={{ transform: `translateX(-${100 - milestone.progress}%)` }}
              />
            </Progress.Root>
          </div>

          {/* Dates */}
          {milestone.dueDate && (
            <p className="text-xs text-slate-500 mt-2">
              Due: {formatWeekLevel(milestone.dueDate)}
            </p>
          )}
          {milestone.completedAt && (
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              Completed {formatWeekLevel(milestone.completedAt)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
```

### Pattern 2: Status Icon Mapping with Accessibility
**What:** Consistent icon usage for milestone statuses with ARIA labels and color-blind-safe colors
**When to use:** All milestone status indicators
**Example:**
```typescript
// Source: Lucide React icons + WCAG color contrast guidelines
// https://lucide.dev/icons/
// https://www.section508.gov/create/making-color-usage-accessible/

function getStatusIcon(status: MilestoneStatus) {
  switch (status) {
    case 'COMPLETED':
      return (
        <CheckCircle2
          className="h-6 w-6 text-emerald-500"
          aria-label="Completed"
        />
      )
    case 'IN_PROGRESS':
      return (
        <Clock
          className="h-6 w-6 text-blue-500 animate-pulse"
          aria-label="In Progress"
        />
      )
    case 'BLOCKED':
      return (
        <AlertCircle
          className="h-6 w-6 text-red-500"
          aria-label="Blocked"
        />
      )
    default: // NOT_STARTED
      return (
        <Circle
          className="h-6 w-6 text-slate-300"
          aria-label="Not Started"
        />
      )
  }
}

// Color-blind safe status badges (don't rely on color alone)
function StatusBadge({ status }: { status: MilestoneStatus }) {
  const variants = {
    COMPLETED: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    IN_PROGRESS: 'bg-blue-100 text-blue-700 border-blue-300',
    BLOCKED: 'bg-red-100 text-red-700 border-red-300',
    NOT_STARTED: 'bg-slate-100 text-slate-600 border-slate-300'
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${variants[status]}`}>
      {status.replace('_', ' ')}
    </span>
  )
}
```

### Pattern 3: Week-Level Date Formatting
**What:** Display dates with week-level precision ("Week of Jan 15" instead of exact dates)
**When to use:** Due dates and completion dates for milestones
**Example:**
```typescript
// Source: Native Intl.DateTimeFormat or date-fns
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat

// Option 1: Native Intl API (zero dependencies)
function formatWeekLevel(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
  return `Week of ${formatter.format(date)}`
}

// Option 2: date-fns (if more control needed)
import { format, startOfWeek } from 'date-fns'

function formatWeekLevelWithDateFns(date: Date): string {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 }) // Monday
  return `Week of ${format(weekStart, 'MMM d, yyyy')}`
}
```

### Pattern 4: Progress Notes Storage
**What:** Store milestone changelog notes as JSON array in database
**When to use:** PROG-09 requirement - mini-changelog entries per milestone
**Example:**
```typescript
// Source: Prisma JSON fields documentation
// https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-json-fields

// Prisma schema update needed:
// model Milestone {
//   ...existing fields...
//   notes Json? @default("[]")
// }

// TypeScript type for notes
interface MilestoneNote {
  id: string
  content: string
  createdAt: string // ISO date string
  createdBy: string
}

// Reading notes
const milestone = await prisma.milestone.findUnique({ where: { id } })
const notes = milestone.notes as Prisma.JsonArray
const typedNotes: MilestoneNote[] = notes.map(n => n as MilestoneNote)

// Adding a note
const existingNotes = (milestone.notes as Prisma.JsonArray) || []
const newNote: MilestoneNote = {
  id: crypto.randomUUID(),
  content: "Landing page approved, moving to dev",
  createdAt: new Date().toISOString(),
  createdBy: "admin"
}
await prisma.milestone.update({
  where: { id },
  data: { notes: [...existingNotes, newNote] }
})
```

### Anti-Patterns to Avoid
- **Gantt charts / dependency graphs:** Overkill for linear process, confuses non-technical clients (explicitly out of scope in requirements)
- **Editable milestones by clients:** Agency defines process, clients only view progress (read-only UI)
- **Real-time updates:** Over-engineering; milestone updates happen admin-side via Google Sheets sync
- **Individual task breakdowns:** Too granular, creates noise (milestone-level granularity is sufficient)
- **Complex state management:** Local component state sufficient, no need for Zustand/Redux for this feature

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accessible progress bars | Custom div with width% | Radix UI Progress component | WAI-ARIA compliance, screen reader support, keyboard navigation built-in |
| Date formatting | String concatenation with Date methods | Intl.DateTimeFormat or date-fns | Handles timezones, locales, edge cases (DST, leap years) |
| Status icons | SVG files or custom icon components | Lucide React | Tree-shakeable, consistent design system, TypeScript types, already in project |
| Timeline connector lines | Custom positioned divs | Tailwind CSS pseudo-elements pattern | Standard approach, responsive, maintainable |
| Color-blind safe palettes | Guessing color combinations | WCAG color guidelines + icon+text patterns | Accessibility requirement, legal compliance (ADA 2026 deadline) |

**Key insight:** Milestone checklist UI is composition of existing primitives, not a novel problem requiring custom solutions. Focus implementation effort on business logic (data fetching, status calculations) rather than reinventing UI patterns.

## Common Pitfalls

### Pitfall 1: Color-Only Status Indicators
**What goes wrong:** Using only color to distinguish milestone statuses (red/yellow/green) fails for color-blind users (8% of men, 0.5% of women)
**Why it happens:** Developers rely on color as the primary differentiator without considering accessibility
**How to avoid:** Always combine color with icons and text labels; use color-blind-safe palettes (blue/orange, not red/green)
**Warning signs:** Milestone status changes but user can't tell which milestone is active; accessibility audit failures

### Pitfall 2: Vague or Unrealistic Milestone Descriptions
**What goes wrong:** Milestones like "Setup Phase" or "Build Campaign" are too vague, leading to misaligned expectations
**Why it happens:** Copy-pasting generic milestone names without client-specific context
**How to avoid:** Use specific, measurable descriptions (PROG-05 requirement: 1-2 sentence descriptions); example: "Ad account setup: Connect Google Ads account and grant BaseAim access"
**Warning signs:** Clients asking "what does this milestone mean?" or "when will this be done?"

### Pitfall 3: Not Updating Progress Notes
**What goes wrong:** Milestones sit at "In Progress" for weeks with no visible activity, eroding client trust
**Why it happens:** Admin forgets to add progress notes when updating status in Google Sheets
**How to avoid:** Make notes field prominent in UI; consider validation requiring note when status changes
**Warning signs:** Clients sending messages asking "any updates on this?" despite backend progress

### Pitfall 4: Incorrect Progress Percentage Calculation
**What goes wrong:** Overall progress shows 75% but visually only 2 of 6 milestones are complete (33%)
**Why it happens:** Using sum of individual milestone.progress values instead of completion count
**How to avoid:** Calculate overall progress as `(completedCount / totalCount) * 100`, not average of progress values
**Warning signs:** Client confusion about how close they are to launch; progress bar jumps unexpectedly

### Pitfall 5: Missing Active Milestone Highlighting
**What goes wrong:** User can't quickly identify which milestone is currently active without reading all statuses
**Why it happens:** Treating all "IN_PROGRESS" milestones equally without visual hierarchy
**How to avoid:** Apply distinct visual treatment (ring, background color, border) to the currently active milestone; ensure only one milestone is active at a time in UI logic
**Warning signs:** Clients asking "what are you working on now?" when it should be obvious

### Pitfall 6: Ignoring Week-Level Precision Requirement
**What goes wrong:** Showing exact dates ("Due: Feb 15, 2026 3:42 PM") implies false precision for week-level planning
**Why it happens:** Using default Date.toLocaleString() without formatting
**How to avoid:** Format dates as "Week of Feb 15" or "Feb 15-22" to match actual planning precision (PROG-06 requirement)
**Warning signs:** Clients holding team to exact day deadlines when project planning is week-based

### Pitfall 7: Accessibility Violations in Progress UI
**What goes wrong:** Screen readers can't announce progress updates; keyboard users can't navigate milestone list
**Why it happens:** Not using semantic HTML and ARIA attributes for progress indicators
**How to avoid:** Use Radix UI Progress (provides ARIA out of box); add aria-label to status icons; ensure keyboard focus order follows visual order
**Warning signs:** WCAG audit failures; complaints from users with assistive technology

## Code Examples

Verified patterns from official sources:

### Overall Progress Calculation
```typescript
// Source: Project requirements + common calculation pattern
function calculateOverallProgress(milestones: Milestone[]): number {
  if (milestones.length === 0) return 0

  const completedCount = milestones.filter(
    m => m.status === 'COMPLETED'
  ).length

  return Math.round((completedCount / milestones.length) * 100)
}

// Usage in component
const overallProgress = calculateOverallProgress(milestones)
```

### Active Milestone Identification
```typescript
// Source: Business logic from requirements
function getActiveMilestone(milestones: Milestone[]): Milestone | null {
  // Prefer IN_PROGRESS status
  const inProgress = milestones.find(m => m.status === 'IN_PROGRESS')
  if (inProgress) return inProgress

  // Fallback: first NOT_STARTED milestone
  const notStarted = milestones.find(m => m.status === 'NOT_STARTED')
  if (notStarted) return notStarted

  // All complete or blocked
  return null
}
```

### Fetching Milestone Data (Server Component)
```typescript
// Source: Next.js App Router + Prisma patterns
// app/dashboard/progress/page.tsx
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import MilestoneChecklist from '@/components/dashboard/milestone-checklist'

export default async function ProgressPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  // Get client milestones ordered by sequence
  const milestones = await prisma.milestone.findMany({
    where: {
      client: {
        userId: session.user.id
      }
    },
    orderBy: {
      order: 'asc'
    }
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Progress Tracking</h1>
        <p className="text-slate-500 mt-1">
          Monitor your project milestones and track progress
        </p>
      </div>

      <MilestoneChecklist milestones={milestones} />
    </div>
  )
}
```

### Status Change Detection for ARIA Live Region
```typescript
// Source: WCAG screen reader requirements
// https://www.atomica11y.com/accessible-web/progress/

function MilestoneChecklist({ milestones }: { milestones: Milestone[] }) {
  const overallProgress = calculateOverallProgress(milestones)
  const activeMilestone = getActiveMilestone(milestones)

  return (
    <div>
      {/* Progress summary with ARIA live region */}
      <div
        className="mb-6"
        role="status"
        aria-live="polite"
        aria-label={`Overall progress: ${overallProgress}% complete`}
      >
        <Card>
          <CardHeader>
            <CardTitle>Overall Progress</CardTitle>
            <CardDescription>
              {milestones.filter(m => m.status === 'COMPLETED').length} of {milestones.length} milestones completed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress.Root value={overallProgress} className="h-4">
              <Progress.Indicator
                className="bg-primary h-full transition-all"
                style={{ transform: `translateX(-${100 - overallProgress}%)` }}
              />
            </Progress.Root>
            <p className="text-3xl font-bold text-primary mt-3">
              {overallProgress}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Milestone list */}
      <Card>
        <CardHeader>
          <CardTitle>Milestones Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {milestones.map((milestone, index) => (
              <MilestoneItem
                key={milestone.id}
                milestone={milestone}
                isActive={milestone.id === activeMilestone?.id}
                isLast={index === milestones.length - 1}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Moment.js for dates | date-fns or dayjs | ~2020 | Moment deprecated, modern alternatives tree-shakeable and immutable |
| Redux for all state | Hybrid: React Query + local state | 2022-2024 | Server state separate from UI state, less boilerplate |
| Custom progress bars | Radix UI primitives | 2023+ | Accessibility built-in, faster development |
| Exact date precision | Week-level precision for planning | 2024+ | Reduces false precision, aligns with Agile sprint planning |

**Deprecated/outdated:**
- Moment.js: Officially deprecated, use date-fns or dayjs instead
- Redux for simple UI state: Overkill for component-level state
- react-dates library: Unmaintained, use native input[type="date"] or shadcn DatePicker

## Open Questions

Things that couldn't be fully resolved:

1. **Should progress notes be separate table or JSON field?**
   - What we know: Prisma Json field supports arrays, filtering limited to PostgreSQL path syntax
   - What's unclear: If admin needs to query/filter by note content, separate MilestoneNote table may be better
   - Recommendation: Start with Json field (simpler schema); migrate to separate table if filtering needed later

2. **What's the appropriate cache/revalidation strategy for milestone data?**
   - What we know: Google Sheets sync happens every 15-60 min (Phase 5); data not real-time
   - What's unclear: Should milestone page use static generation with revalidation or dynamic rendering?
   - Recommendation: Start with dynamic rendering (getServerSideProps equivalent in App Router); optimize with ISR if performance issues arise

3. **Should there be animation when milestone status changes?**
   - What we know: Requirements don't specify animations; v2 has "celebratory animation" for major milestones
   - What's unclear: Would subtle status change animation improve UX or distract?
   - Recommendation: Defer animations to v2; focus on clarity and accessibility first

## Sources

### Primary (HIGH confidence)
- Radix UI Progress API - https://www.radix-ui.com/primitives/docs/components/progress
- Prisma JSON Fields Documentation - https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-json-fields
- Lucide React Icons - https://lucide.dev/guide/packages/lucide-react
- WCAG Color Accessibility Guidelines - https://www.section508.gov/create/making-color-usage-accessible/
- MDN Intl.DateTimeFormat - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat

### Secondary (MEDIUM confidence)
- [Flowbite Tailwind CSS Timeline](https://flowbite.com/docs/components/timeline/) - Verified vertical timeline patterns
- [Preline UI Timeline Component](https://preline.co/docs/timeline.html) - Connector line techniques
- [WCAG 2.1 AA Compliance Checklist](https://www.webability.io/blog/wcag-2-1-aa-the-standard-for-accessible-web-design) - Accessibility standards
- [State Management in 2026: Redux, Context API, and Modern Patterns](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns) - Current state management recommendations
- [Next.js Google Sheets Integration Guide](https://manuelsanchezdev.com/blog/nextjs-react-typescript-google-sheets/) - Integration patterns

### Tertiary (LOW confidence)
- WebSearch results on React design patterns 2026 - General trends, not milestone-specific
- WebSearch results on milestone tracking pitfalls - Business perspective, not technical implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project (Radix UI, Lucide, Tailwind) with official documentation
- Architecture: HIGH - Patterns verified through official docs (Radix, Prisma) and established Tailwind timeline examples
- Pitfalls: MEDIUM - Mix of WCAG requirements (HIGH) and experiential knowledge from project management research (MEDIUM)

**Research date:** 2026-02-12
**Valid until:** ~30 days (2026-03-15) - Stack is stable, but verify if Next.js 16.x introduces breaking changes to App Router data fetching
