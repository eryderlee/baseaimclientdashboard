# Phase 4: Admin Milestone Editing - Research

**Researched:** 2026-02-14
**Domain:** Next.js admin interfaces with inline table editing and server actions
**Confidence:** HIGH

## Summary

Phase 4 builds an admin interface for editing client milestone data using Next.js App Router with dynamic routes, Server Actions for mutations, and table-based inline editing UI. The research confirms that the existing project architecture (DAL pattern, NextAuth, Prisma) provides the foundation needed for this phase.

The standard approach combines Next.js dynamic routes (`/admin/clients/[id]`) with Server Actions for form handling and Zod validation. For the table/spreadsheet interface, headless libraries like TanStack Table are preferred over heavy-featured options, giving full control over the inline editing UX. Date inputs use shadcn/ui's date picker (built on react-day-picker), status dropdowns use native select or shadcn/ui components, and batch updates leverage Prisma transactions.

Key architectural decisions from the context guide implementation: table-style layout with inline editing, manual save button for batch updates, time-based progress calculation for "In Progress" milestones, and direct database writes (no sync layer). The project already has the necessary infrastructure (admin role authentication, DAL pattern, middleware protection) from Phase 3.

**Primary recommendation:** Use Next.js Server Actions with Zod validation for all mutations, implement table editing with controlled React state + optimistic updates, batch all changes in a single Prisma transaction, and protect admin routes with both middleware (UX) and DAL verifySession() (security).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App Router framework | Already in project, provides dynamic routes and Server Actions |
| Zod | 4.3.6 | Schema validation | Already in project, official Next.js recommendation for server-side validation |
| Prisma | 5.22.0 | Database ORM | Already in project, provides transaction support for batch updates |
| NextAuth | 5.0.0-beta.30 | Authentication | Already in project (Phase 3), provides session with user role |
| shadcn/ui | Current | UI components | Already in project pattern, provides date picker and table primitives |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TanStack Table | v8 | Headless table logic | Optional - for advanced sorting/filtering, not required for basic inline editing |
| date-fns | 4.1.0 | Date formatting/calculation | Already in project, use for progress percentage calculation |
| React's useOptimistic | React 19.2.3 | Optimistic UI updates | Built-in hook for instant feedback on edits |
| React's useActionState | React 19.2.3 | Server Action state | Built-in hook for form validation errors and pending state |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Server Actions | API Routes (Route Handlers) | API routes require separate files and manual fetch calls, Server Actions integrate directly with forms and provide automatic progressive enhancement |
| TanStack Table | React Data Grid / Handsontable | Heavy libraries with built-in editing are overkill for 6-row table; custom implementation with controlled state gives better control and smaller bundle |
| Prisma $transaction | Individual updates with Promise.all | Transaction ensures atomicity (all succeed or all fail), Promise.all may exhaust connection pool |

**Installation:**
```bash
# All core dependencies already installed in project
# Optional: Install TanStack Table only if advanced features needed
npm install @tanstack/react-table
```

## Architecture Patterns

### Recommended Project Structure
```
app/
├── admin/
│   ├── page.tsx                    # Admin dashboard (existing)
│   └── clients/
│       └── [clientId]/
│           ├── page.tsx            # Client milestone editing page (NEW)
│           └── actions.ts          # Server Actions for milestone updates (NEW)
lib/
├── dal.ts                          # Add getClientWithMilestones, verifyAdmin functions
└── utils/
    └── progress.ts                 # Add calculateTimeBasedProgress function
components/
└── admin/
    └── milestone-edit-table.tsx    # Client component for table UI (NEW)
```

### Pattern 1: Dynamic Route with Admin Authorization
**What:** Admin-only page at `/admin/clients/[clientId]` that verifies admin role before rendering
**When to use:** All admin pages that should be inaccessible to CLIENT role users
**Example:**
```typescript
// app/admin/clients/[clientId]/page.tsx
import { verifySession } from '@/lib/dal'
import { redirect } from 'next/navigation'

export default async function Page({
  params
}: {
  params: Promise<{ clientId: string }>
}) {
  // Verify admin role (DAL is security boundary)
  const { userRole } = await verifySession()
  if (userRole !== 'ADMIN') {
    redirect('/dashboard')
  }

  // params is a Promise in Next.js 16+
  const { clientId } = await params

  // Fetch client data
  const client = await getClientWithMilestones(clientId)

  return <MilestoneEditTable client={client} />
}
```

### Pattern 2: Server Actions with Zod Validation
**What:** Server functions marked with 'use server' that validate input and mutate database
**When to use:** All form submissions and data mutations in admin interface
**Example:**
```typescript
// app/admin/clients/[clientId]/actions.ts
'use server'

import { z } from 'zod'
import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

const MilestoneUpdateSchema = z.object({
  milestones: z.array(z.object({
    id: z.string(),
    status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']),
    dueDate: z.string().datetime().nullable(),
    notes: z.string().optional(),
  }))
})

export async function updateMilestones(
  clientId: string,
  formData: FormData
) {
  // 1. Verify admin authorization
  const { userRole } = await verifySession()
  if (userRole !== 'ADMIN') {
    return { error: 'Unauthorized' }
  }

  // 2. Parse and validate input
  const rawData = JSON.parse(formData.get('milestones') as string)
  const validatedFields = MilestoneUpdateSchema.safeParse(rawData)

  if (!validatedFields.success) {
    return {
      error: 'Invalid data',
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  // 3. Batch update with transaction
  try {
    await prisma.$transaction(
      validatedFields.data.milestones.map((milestone) =>
        prisma.milestone.update({
          where: { id: milestone.id },
          data: {
            status: milestone.status,
            dueDate: milestone.dueDate ? new Date(milestone.dueDate) : null,
            notes: milestone.notes,
          },
        })
      )
    )

    // 4. Revalidate client dashboard so they see changes immediately
    revalidatePath(`/dashboard/progress`)
    revalidatePath(`/admin/clients/${clientId}`)

    return { success: true }
  } catch (error) {
    return { error: 'Failed to update milestones' }
  }
}
```

### Pattern 3: Inline Editing with Controlled State
**What:** Client component that manages edit state, allows inline changes, and submits batch updates
**When to use:** Table interfaces where multiple cells can be edited before saving
**Example:**
```typescript
// components/admin/milestone-edit-table.tsx
'use client'

import { useState, useTransition } from 'react'
import { updateMilestones } from '@/app/admin/clients/[clientId]/actions'

type EditableMilestone = {
  id: string
  title: string
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
  dueDate: string | null
  progress: number
}

export function MilestoneEditTable({
  clientId,
  initialMilestones
}: {
  clientId: string
  initialMilestones: EditableMilestone[]
}) {
  const [milestones, setMilestones] = useState(initialMilestones)
  const [isPending, startTransition] = useTransition()

  // Update local state on cell edit
  const handleCellChange = (id: string, field: string, value: any) => {
    setMilestones(prev =>
      prev.map(m => m.id === id ? { ...m, [field]: value } : m)
    )
  }

  // Submit all changes in batch
  const handleSave = () => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append('milestones', JSON.stringify(milestones))

      const result = await updateMilestones(clientId, formData)

      if (result.error) {
        // Handle error
        alert(result.error)
      }
    })
  }

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>Milestone</th>
            <th>Status</th>
            <th>Due Date</th>
            <th>Progress %</th>
          </tr>
        </thead>
        <tbody>
          {milestones.map(milestone => (
            <tr key={milestone.id}>
              <td>{milestone.title}</td>
              <td>
                <select
                  value={milestone.status}
                  onChange={(e) => handleCellChange(milestone.id, 'status', e.target.value)}
                >
                  <option value="NOT_STARTED">Not Started</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </td>
              <td>
                <input
                  type="date"
                  value={milestone.dueDate || ''}
                  onChange={(e) => handleCellChange(milestone.id, 'dueDate', e.target.value)}
                />
              </td>
              <td>{milestone.progress}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={handleSave} disabled={isPending}>
        {isPending ? 'Saving...' : 'Save All Changes'}
      </button>
    </div>
  )
}
```

### Pattern 4: Time-Based Progress Calculation
**What:** Calculate progress percentage for "In Progress" milestones based on elapsed time
**When to use:** Displaying realistic progress without manual updates from admin
**Example:**
```typescript
// lib/utils/progress.ts
import { differenceInDays } from 'date-fns'

export function calculateMilestoneProgress(
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED',
  startDate: Date | null,
  dueDate: Date | null
): number {
  // Completed milestones always 100%
  if (status === 'COMPLETED') return 100

  // Not started milestones always 0%
  if (status === 'NOT_STARTED') return 0

  // In Progress: calculate based on time elapsed
  if (status === 'IN_PROGRESS' && startDate && dueDate) {
    const now = new Date()
    const totalDays = differenceInDays(dueDate, startDate)
    const elapsedDays = differenceInDays(now, startDate)

    // Cap at 99% (never show 100% until marked complete)
    const progress = Math.min(
      Math.max(Math.round((elapsedDays / totalDays) * 100), 0),
      99
    )

    return progress
  }

  // Fallback for missing dates
  return 0
}
```

### Anti-Patterns to Avoid
- **Using Server Actions for data fetching:** Server Actions use POST requests and can't be cached. Use async Server Components with DAL functions instead.
- **Client-only validation:** Always validate on server with Zod. Client validation is UX enhancement, not security.
- **Missing authorization in Server Actions:** Middleware is UX (early redirect), DAL verifySession() is the security boundary. Always check role in Server Actions.
- **Individual database updates without transaction:** Use Prisma `$transaction([])` for batch updates to ensure atomicity.
- **Returning internal errors to client:** Catch errors and return user-friendly messages, not database error details.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date picker UI | Custom calendar component | shadcn/ui date picker (react-day-picker) | Handles keyboard nav, accessibility, localization, mobile responsiveness |
| Form validation | Manual field checks | Zod with safeParse() | Type-safe schemas, automatic error messages, composable validations |
| Progress percentage calculation | Ad-hoc math | date-fns differenceInDays + formula | Handles edge cases (leap years, DST, negative ranges) |
| Batch database updates | Loop with individual updates | Prisma $transaction([]) | Ensures atomicity, uses single connection, automatic rollback |
| Optimistic UI updates | Manual state rollback | React useOptimistic hook | Automatic revert on failure, built-in pending state |
| Admin route protection | Custom auth checks | Existing DAL verifySession() | Already implemented in Phase 3, centralized authorization |

**Key insight:** Next.js Server Actions abstract away API route creation, fetch calls, and loading states. Don't build API routes manually when Server Actions can handle form mutations directly.

## Common Pitfalls

### Pitfall 1: Treating Middleware as Security Boundary
**What goes wrong:** Relying on middleware to block unauthorized users, but middleware can be bypassed or misconfigured
**Why it happens:** Middleware runs early in request cycle and feels like security layer
**How to avoid:** Always verify authorization in DAL functions and Server Actions. Middleware is for UX (early redirect), DAL is for security (can't be bypassed)
**Warning signs:** Server Action or DAL function doesn't call verifySession(), assumes user is authorized

### Pitfall 2: Not Handling Async Params in Next.js 16+
**What goes wrong:** Trying to access `params.clientId` directly throws error or returns Promise object
**Why it happens:** Next.js 16+ changed params to Promise for build-time validation support
**How to avoid:** Always await params: `const { clientId } = await params`
**Warning signs:** TypeScript errors about Promise<string> where string expected, runtime errors accessing params properties

### Pitfall 3: Forgetting to Revalidate Client-Facing Routes
**What goes wrong:** Admin saves milestone changes but client dashboard doesn't update until manual refresh
**Why it happens:** Next.js caches Server Component data, needs explicit revalidation after mutations
**How to avoid:** Call `revalidatePath('/dashboard/progress')` in Server Action after database updates
**Warning signs:** Admin sees changes immediately (fresh request), client sees stale data (cached)

### Pitfall 4: Exhausting Database Connections with Promise.all
**What goes wrong:** Batch updates with `Promise.all(updates.map(...))` can create too many simultaneous connections
**Why it happens:** Each Prisma operation grabs a connection from pool, Promise.all runs all concurrently
**How to avoid:** Use Prisma `$transaction([...updates])` which uses single connection
**Warning signs:** Connection pool errors under load, slow performance with many concurrent updates

### Pitfall 5: Missing Loading State During Server Action
**What goes wrong:** User clicks Save, nothing happens visually, clicks again (double submission)
**Why it happens:** Server Actions take time but don't provide automatic loading feedback
**How to avoid:** Use useTransition() or useActionState() to get pending state, disable button and show spinner
**Warning signs:** User reports needing to click multiple times, duplicate entries in database

### Pitfall 6: Inline Editing Without Clear Affordances
**What goes wrong:** Users don't realize cells are editable, try to click elsewhere to edit
**Why it happens:** Inline editing looks like read-only table without visual cues
**How to avoid:** Add hover states, focus rings, edit icons, or "Click to edit" placeholder text
**Warning signs:** User testing shows confusion about how to edit, support requests asking how to change values

### Pitfall 7: Complex Validation in Inline Cells
**What goes wrong:** User edits due date, gets validation error, loses context of what they were doing
**Why it happens:** Inline editing doesn't have space for detailed error messages and field-level help text
**How to avoid:** Keep inline editing simple (dropdowns, date pickers with constraints), validate on save with clear error summary
**Warning signs:** Error messages overflow cell boundaries, users frustrated by validation rules they can't see

### Pitfall 8: Not Calculating Progress on Read
**What goes wrong:** Progress percentage stored in database becomes stale as time passes
**Why it happens:** Progress field updated only when admin saves, not recalculated on every view
**How to avoid:** Make progress a computed field - calculate in DAL function based on current date, status, and dates
**Warning signs:** "In Progress" milestones show same percentage days later, progress doesn't update until admin edits

## Code Examples

Verified patterns from official sources:

### Dynamic Route with Async Params (Next.js 16+)
```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes
export default async function Page({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  return <div>Client: {clientId}</div>
}
```

### Server Action with Zod Validation
```typescript
// Source: https://nextjs.org/docs/app/guides/forms
'use server'

import { z } from 'zod'

const schema = z.object({
  email: z.string({
    invalid_type_error: 'Invalid Email',
  }),
})

export async function createUser(formData: FormData) {
  const validatedFields = schema.safeParse({
    email: formData.get('email'),
  })

  // Return early if the form data is invalid
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  // Mutate data
}
```

### Using useActionState for Validation Errors
```typescript
// Source: https://nextjs.org/docs/app/guides/forms
'use client'

import { useActionState } from 'react'
import { createUser } from '@/app/actions'

const initialState = {
  message: '',
}

export function Signup() {
  const [state, formAction, pending] = useActionState(createUser, initialState)

  return (
    <form action={formAction}>
      <label htmlFor="email">Email</label>
      <input type="text" id="email" name="email" required />
      <p aria-live="polite">{state?.message}</p>
      <button disabled={pending}>Sign up</button>
    </form>
  )
}
```

### Prisma Transaction for Batch Updates
```typescript
// Source: https://www.prisma.io/docs/orm/prisma-client/queries/transactions
const transaction = await prisma.$transaction(
  milestoneIds.map((id) =>
    prisma.milestone.update({
      where: { id },
      data: { status: 'COMPLETED' }
    })
  )
)
```

### shadcn/ui Date Picker
```typescript
// Source: https://ui.shadcn.com/docs/components/radix/date-picker
"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export function DatePickerDemo() {
  const [date, setDate] = React.useState<Date>()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <CalendarIcon />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar mode="single" selected={date} onSelect={setDate} />
      </PopoverContent>
    </Popover>
  )
}
```

### Time-Based Progress Calculation
```typescript
// Source: Derived from date-fns documentation + domain requirements
import { differenceInDays } from 'date-fns'

export function calculateTimeBasedProgress(
  startDate: Date,
  dueDate: Date,
  currentDate: Date = new Date()
): number {
  const totalDays = differenceInDays(dueDate, startDate)
  const elapsedDays = differenceInDays(currentDate, startDate)

  if (totalDays <= 0) return 0

  const percentage = (elapsedDays / totalDays) * 100

  // Clamp between 0 and 99 (never 100 until explicitly marked complete)
  return Math.min(Math.max(Math.round(percentage), 0), 99)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router with API routes | App Router with Server Actions | Next.js 13+ (stable in 14+) | No separate API files needed, automatic form handling, progressive enhancement |
| useFormState (React 18) | useActionState (React 19) | React 19 (Dec 2024) | Renamed for clarity, same functionality |
| Synchronous params | Async params (Promise) | Next.js 15-16 (2024-2025) | Must await params, enables build-time validation |
| Manual optimistic updates | useOptimistic hook | React 19 (Dec 2024) | Built-in state management for optimistic UI |
| Client-side table libraries | Headless UI patterns | 2023-2025 trend | Smaller bundles, full control, better SSR |

**Deprecated/outdated:**
- **useFormState:** Renamed to useActionState in React 19 (still works but use new name)
- **Synchronous params access:** Next.js 15+ deprecation warning, Next.js 16+ requires await
- **getServerSideProps / getStaticProps:** Pages Router API, use Server Components in App Router
- **API Routes for mutations:** Still supported but Server Actions are preferred for form handling

## Open Questions

Things that couldn't be fully resolved:

1. **TanStack Table vs. Custom Implementation**
   - What we know: TanStack Table is headless and flexible, adds ~20KB minified
   - What's unclear: Whether 6-row table benefits from library or if simple controlled state is better
   - Recommendation: Start with custom implementation (simpler, no deps). Add TanStack Table only if sorting/filtering/pagination needed later

2. **Start Date for Time-Based Progress**
   - What we know: Milestone has startDate field, progress calculation needs start and due dates
   - What's unclear: How start date is set (admin manually enters? auto-set when status changes to IN_PROGRESS?)
   - Recommendation: Plan should specify when/how startDate is populated. Default: auto-set when status changes from NOT_STARTED to IN_PROGRESS

3. **Client Selection UI Complexity**
   - What we know: Admin needs to select client from list, current admin page shows all clients in table
   - What's unclear: Whether Phase 4 includes client search/filtering or just uses existing table with links
   - Recommendation: Minimal scope - add "Edit Milestones" link to existing admin table, defer search/filters to Phase 6 (Analytics)

4. **Notes Field Implementation**
   - What we know: Context specifies "Notes: Text area for admin notes or milestone description"
   - What's unclear: Inline text area in table cell vs. modal/expandable row for multi-line input
   - Recommendation: Start with inline textarea but consider modal for long-form notes if inline becomes cramped

## Sources

### Primary (HIGH confidence)
- Next.js Official Documentation (16.1.6) - Dynamic routes, Server Actions, forms
  - https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes
  - https://nextjs.org/docs/app/guides/forms
- Prisma Documentation - Transactions and batch queries
  - https://www.prisma.io/docs/orm/prisma-client/queries/transactions
- shadcn/ui Documentation - Date picker component
  - https://ui.shadcn.com/docs/components/radix/date-picker
- React Documentation - useOptimistic, useActionState hooks
  - https://react.dev/reference/react/useOptimistic
  - https://react.dev/reference/react/useActionState

### Secondary (MEDIUM confidence)
- [Next.js 15: App Router — A Complete Senior-Level Guide](https://medium.com/@livenapps/next-js-15-app-router-a-complete-senior-level-guide-0554a2b820f7)
- [Implement Role-Based Access Control in Next.js 15](https://clerk.com/blog/nextjs-role-based-access-control)
- [Type-Safe Form Validation in Next.js 15: Zod, RHF, & Server Actions](https://www.abstractapi.com/guides/email-validation/type-safe-form-validation-in-next-js-15-with-zod-and-react-hook-form)
- [TanStack Table Editable Data Example](https://tanstack.com/table/v8/docs/framework/react/examples/editable-data)
- [Best Practices for Inline Editing in Table Design](https://uxdworld.com/inline-editing-in-tables-design/)
- [Next.js Server Actions: The Complete Guide (2026)](https://makerkit.dev/blog/tutorials/nextjs-server-actions)

### Tertiary (LOW confidence)
- [App Router pitfalls: common Next.js mistakes and practical ways to avoid them](https://imidef.com/en/2026-02-11-app-router-pitfalls) - WebSearch result, published Feb 2026
- WebSearch results on React table libraries - Multiple sources aggregated, no single authoritative source

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project, verified versions in package.json
- Architecture patterns: HIGH - Patterns verified with official Next.js and React documentation
- Pitfalls: MEDIUM - Combination of official docs warnings and community best practices
- Code examples: HIGH - All examples sourced from official documentation
- Time-based progress calculation: MEDIUM - Formula is straightforward but implementation details need Phase 3 context

**Research date:** 2026-02-14
**Valid until:** 2026-03-14 (30 days - stable stack, unlikely to change significantly)

**Notes:**
- Project already has necessary infrastructure (NextAuth with admin role, DAL pattern, Prisma, middleware)
- CONTEXT.md specifies locked decisions (table layout, batch save, time-based progress) - research focused on HOW not WHAT
- Phase 4 scope is narrow (milestone editing only), defers client management to Phase 5 and analytics to Phase 6
