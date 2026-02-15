# Phase 6: Admin Analytics - Research

**Researched:** 2026-02-15
**Domain:** Admin dashboard analytics with filtering, sorting, and at-risk client detection
**Confidence:** HIGH

## Summary

Phase 6 builds an admin analytics dashboard providing bird's-eye view of all clients, progress tracking, and at-risk project identification. This phase builds on established patterns from Phases 4-5 (admin client management) to create aggregate views with filtering and sorting capabilities.

The standard approach combines server-side data aggregation with client-side filtering state managed via URL search parameters. Modern React patterns use Next.js Server Components for initial data fetching, client components for interactive filtering/sorting, and URL state management for shareable filtered views. The project already has the infrastructure needed: DAL functions for client data access, Recharts for visualization, and shadcn/ui components for filters.

Key architectural decisions guide implementation: analytics dashboard at /admin/analytics (or enhanced /admin page), server-side data aggregation, client-side filtering with URL state, at-risk detection based on overdue milestones and stalled progress, and reuse of existing components (Table, Card, Badge) for consistency. The codebase already demonstrates patterns for client lists (admin/page.tsx), chart rendering (analytics-charts.tsx), and progress calculation (lib/utils/progress.ts).

**Primary recommendation:** Enhance the existing admin dashboard with filtering/sorting using URL search parameters (useSearchParams hook), calculate at-risk indicators server-side with clear visual warnings, and reuse Recharts for aggregate analytics charts showing portfolio health metrics.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App Router framework | Already in project, provides useSearchParams hook for URL state |
| Recharts | 3.7.0 | Chart library | Already in project, used for analytics visualization |
| date-fns | 4.1.0 | Date calculations | Already in project, needed for overdue detection |
| Prisma | 5.22.0 | Database ORM | Already in project, provides aggregate queries for analytics |
| shadcn/ui | Current | UI components | Already in project, provides Table, Card, Badge, Select for filters |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React cache() | React 19.2.3 | Deduplication | Already used in DAL pattern, ensures single DB query per render |
| lucide-react | 0.563.0 | Icons | Already in project, provides AlertTriangle, TrendingDown for risk indicators |
| useSearchParams | Next.js 16.1.6 | URL state management | Built-in hook for filter/sort state in URL |
| React's useMemo | React 19.2.3 | Client-side filtering performance | Memoize filtered/sorted results to prevent recalculation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| URL state with useSearchParams | useState for filters | URL state enables bookmarking/sharing filtered views, state doesn't persist across page loads |
| Recharts | Chart.js / Victory | Recharts already in project with working examples, changing adds migration risk |
| Server-side filtering | Client-side only | Server filtering reduces data transfer but adds complexity; client-side fine for <100 clients |
| Custom at-risk logic | Third-party dashboard library | Custom logic fits business requirements exactly, libraries add bloat |

**Installation:**
```bash
# All dependencies already installed in project
# No additional packages needed for Phase 6
```

## Architecture Patterns

### Recommended Project Structure
```
app/
├── admin/
│   ├── page.tsx                    # Enhanced with filters/analytics (MODIFY)
│   └── actions.ts                  # Server Actions if needed (NEW, optional)
lib/
├── dal.ts                          # Add analytics-specific queries (MODIFY)
└── utils/
    ├── progress.ts                 # Already has progress calculation
    └── risk-detection.ts           # At-risk client detection logic (NEW)
components/
└── admin/
    ├── client-filters.tsx          # Filter UI component (NEW)
    ├── at-risk-indicator.tsx       # Risk badge/warning component (NEW)
    └── analytics-summary.tsx       # Portfolio metrics cards (NEW)
```

### Pattern 1: URL-Based Filter State
**What:** Client component manages filter state in URL search params for shareable views
**When to use:** Any list/table that needs filtering, sorting, or pagination
**Example:**
```typescript
// components/admin/client-filters.tsx
'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Select } from '@/components/ui/select'

export function ClientFilters() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const statusFilter = searchParams.get('status') || 'all'
  const sortBy = searchParams.get('sort') || 'name'

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex gap-4">
      <Select
        value={statusFilter}
        onValueChange={(value) => updateFilter('status', value)}
      >
        <option value="all">All Clients</option>
        <option value="active">Active Only</option>
        <option value="at-risk">At Risk</option>
      </Select>

      <Select
        value={sortBy}
        onValueChange={(value) => updateFilter('sort', value)}
      >
        <option value="name">Sort by Name</option>
        <option value="progress">Sort by Progress</option>
        <option value="due-date">Sort by Next Due Date</option>
      </Select>
    </div>
  )
}
```

### Pattern 2: Server-Side At-Risk Detection
**What:** Calculate at-risk status during data fetch based on milestone dates and progress
**When to use:** Analytics queries that need to identify problems across all clients
**Example:**
```typescript
// lib/utils/risk-detection.ts
import { differenceInDays } from 'date-fns'

export interface RiskIndicators {
  isAtRisk: boolean
  riskLevel: 'none' | 'low' | 'medium' | 'high'
  reasons: string[]
}

export function detectClientRisk(client: {
  milestones: Array<{
    status: string
    dueDate: Date | null
    startDate: Date | null
    progress: number
  }>
}): RiskIndicators {
  const reasons: string[] = []
  let riskLevel: 'none' | 'low' | 'medium' | 'high' = 'none'

  const now = new Date()

  // Check for overdue milestones
  const overdueMilestones = client.milestones.filter(m => {
    if (m.status === 'COMPLETED') return false
    if (!m.dueDate) return false
    return m.dueDate < now
  })

  if (overdueMilestones.length > 0) {
    reasons.push(`${overdueMilestones.length} overdue milestone(s)`)
    riskLevel = overdueMilestones.length >= 2 ? 'high' : 'medium'
  }

  // Check for stalled progress (IN_PROGRESS with no recent updates)
  const stalledMilestones = client.milestones.filter(m => {
    if (m.status !== 'IN_PROGRESS') return false
    if (!m.startDate) return false

    const daysSinceStart = differenceInDays(now, m.startDate)
    // If started more than 14 days ago and still under 50% progress
    return daysSinceStart > 14 && m.progress < 50
  })

  if (stalledMilestones.length > 0) {
    reasons.push(`${stalledMilestones.length} stalled milestone(s)`)
    if (riskLevel === 'none') riskLevel = 'low'
    if (riskLevel === 'medium') riskLevel = 'high'
  }

  // Check for blocked milestones
  const blockedMilestones = client.milestones.filter(m => m.status === 'BLOCKED')
  if (blockedMilestones.length > 0) {
    reasons.push(`${blockedMilestones.length} blocked milestone(s)`)
    riskLevel = 'high'
  }

  return {
    isAtRisk: riskLevel !== 'none',
    riskLevel,
    reasons,
  }
}
```

### Pattern 3: Client-Side Filtering with useMemo
**What:** Filter and sort client data on client side with memoization for performance
**When to use:** Small to medium datasets (<500 items) where server filtering adds complexity
**Example:**
```typescript
// app/admin/page.tsx (client component section)
'use client'

import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'

export function ClientTable({ clients }: { clients: ClientWithRisk[] }) {
  const searchParams = useSearchParams()

  const filteredClients = useMemo(() => {
    let result = [...clients]

    // Filter by status
    const statusFilter = searchParams.get('status')
    if (statusFilter === 'active') {
      result = result.filter(c => c.isActive)
    } else if (statusFilter === 'at-risk') {
      result = result.filter(c => c.riskIndicators.isAtRisk)
    }

    // Sort
    const sortBy = searchParams.get('sort') || 'name'
    if (sortBy === 'name') {
      result.sort((a, b) => a.companyName.localeCompare(b.companyName))
    } else if (sortBy === 'progress') {
      result.sort((a, b) => b.overallProgress - a.overallProgress)
    } else if (sortBy === 'due-date') {
      result.sort((a, b) => {
        const aDate = a.nextDueDate?.getTime() || Infinity
        const bDate = b.nextDueDate?.getTime() || Infinity
        return aDate - bDate
      })
    }

    return result
  }, [clients, searchParams])

  return (
    <Table>
      {/* Render filteredClients */}
    </Table>
  )
}
```

### Pattern 4: Portfolio Analytics Aggregation
**What:** Calculate summary metrics across all clients for dashboard KPI cards
**When to use:** Dashboard overview showing aggregate statistics
**Example:**
```typescript
// lib/dal.ts addition
export const getAdminAnalytics = cache(async () => {
  const { userRole } = await verifySession()
  if (userRole !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required')
  }

  const clients = await getAllClientsWithMilestones()

  // Calculate aggregate metrics
  const totalClients = clients.length
  const activeClients = clients.filter(c => c.isActive).length

  const totalMilestones = clients.reduce((sum, c) => sum + c.milestones.length, 0)
  const completedMilestones = clients.reduce(
    (sum, c) => sum + c.milestones.filter(m => m.status === 'COMPLETED').length,
    0
  )

  const averageProgress = Math.round(
    clients.reduce((sum, c) => {
      const progress = calculateOverallProgress(c.milestones)
      return sum + progress
    }, 0) / totalClients
  )

  // Identify at-risk clients
  const atRiskClients = clients.filter(c => {
    const risk = detectClientRisk(c)
    return risk.isAtRisk
  }).length

  // Find upcoming due dates (next 7 days)
  const now = new Date()
  const upcomingDueDates = clients.flatMap(c =>
    c.milestones
      .filter(m => m.dueDate && differenceInDays(m.dueDate, now) <= 7 && m.status !== 'COMPLETED')
      .map(m => ({ client: c.companyName, milestone: m.title, dueDate: m.dueDate }))
  )

  return {
    totalClients,
    activeClients,
    averageProgress,
    atRiskClients,
    upcomingDueDates,
    totalMilestones,
    completedMilestones,
  }
})
```

### Anti-Patterns to Avoid
- **Filtering in Server Component with params:** Server Components can't use useSearchParams. Use client component wrapper for filter UI, pass URL params as props if server filtering needed.
- **Storing filter state in useState only:** State doesn't persist across page loads or allow sharing. Always use URL search params for filters/sorts.
- **Fetching individual client data in loops:** Use Prisma's include to fetch related data in single query, not N+1 queries.
- **Complex client-side filtering on large datasets:** If client count exceeds ~500, move filtering to database queries to reduce data transfer.
- **Hardcoded risk thresholds:** Extract risk detection logic to utility functions with configurable thresholds for easy adjustment.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL state management | Custom query string parsing | Next.js useSearchParams hook | Handles encoding, multiple params, type safety, integrates with router |
| Date comparisons for overdue | Manual date math | date-fns differenceInDays, isBefore, isAfter | Handles timezones, DST, leap years correctly |
| Client-side sorting | Custom sort functions | Array.sort with localeCompare for strings | Locale-aware sorting, handles accents and special characters |
| Chart rendering | Custom SVG/Canvas | Recharts (already in project) | Handles responsiveness, tooltips, legends, accessibility |
| Risk level badges | Custom colored divs | shadcn/ui Badge with variant | Consistent styling, accessibility, dark mode support |
| Filter dropdowns | Custom select components | shadcn/ui Select | Keyboard navigation, ARIA attributes, mobile-friendly |

**Key insight:** Analytics dashboards have well-established patterns. Don't rebuild filtering, sorting, or charting from scratch when the project already has working examples and libraries.

## Common Pitfalls

### Pitfall 1: Using useSearchParams in Server Component
**What goes wrong:** Trying to access URL search params in async Server Component throws error
**Why it happens:** useSearchParams is a client-side hook, Server Components can't use hooks
**How to avoid:** Create client component wrapper for filter UI, pass searchParams as props to Server Component via searchParams prop from page component
**Warning signs:** "useSearchParams() should be wrapped in a Suspense boundary" error

### Pitfall 2: Not Memoizing Filtered Results
**What goes wrong:** Filtering/sorting runs on every render, causing performance issues
**Why it happens:** Filter logic in component body runs every render, not just when dependencies change
**How to avoid:** Wrap filtering/sorting logic in useMemo with searchParams as dependency
**Warning signs:** UI feels sluggish, React DevTools shows excessive re-renders

### Pitfall 3: Stale At-Risk Calculations
**What goes wrong:** At-risk status doesn't update until page refresh, shows outdated risk
**Why it happens:** Risk calculated once during initial fetch, not recalculated when date changes
**How to avoid:** Calculate risk server-side on every page load (server components run on each request), or use time-based revalidation
**Warning signs:** Milestone due tomorrow but not flagged as at-risk until refresh

### Pitfall 4: Inconsistent Risk Detection Logic
**What goes wrong:** Different parts of dashboard show conflicting at-risk status
**Why it happens:** Risk logic duplicated across components with different thresholds
**How to avoid:** Centralize risk detection in single utility function (lib/utils/risk-detection.ts), import everywhere
**Warning signs:** Client shows "At Risk" in one view, "On Track" in another

### Pitfall 5: Missing Empty States for Filters
**What goes wrong:** Filtering to "At Risk" shows empty table with no explanation
**Why it happens:** Filter UI doesn't handle case where no items match filter
**How to avoid:** Add conditional rendering for empty results with clear message and "Clear Filters" action
**Warning signs:** Users report "nothing shows up" when filtering, confusion about whether feature works

### Pitfall 6: Overloading Page Load with Analytics Queries
**What goes wrong:** Admin dashboard takes 5+ seconds to load due to complex aggregations
**Why it happens:** Running multiple complex queries sequentially or calculating analytics in client
**How to avoid:** Use Prisma's aggregation queries (count, avg), calculate server-side, consider caching results for 5-15 minutes
**Warning signs:** Admin page load time significantly slower than client dashboard

### Pitfall 7: Non-Shareable Filter States
**What goes wrong:** Admin filters clients to "At Risk", sends link to colleague, link shows all clients
**Why it happens:** Filter state stored in component state, not in URL
**How to avoid:** Always use URL search params for filters/sorts, never just useState
**Warning signs:** Copy/pasting URL doesn't preserve filters, bookmarks don't work

## Code Examples

Verified patterns from official sources:

### Using useSearchParams Hook
```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/use-search-params
'use client'

import { useSearchParams } from 'next/navigation'

export default function SearchBar() {
  const searchParams = useSearchParams()

  const search = searchParams.get('search')

  // URL: /dashboard?search=value
  // search: 'value'
  return <>Search: {search}</>
}
```

### Date Comparison with date-fns
```typescript
// Source: https://date-fns.org/docs/Getting-Started
import { differenceInDays, isBefore, isAfter } from 'date-fns'

const now = new Date()
const dueDate = new Date('2026-02-20')

const daysUntilDue = differenceInDays(dueDate, now)
const isOverdue = isBefore(dueDate, now)
const isUpcoming = differenceInDays(dueDate, now) <= 7 && differenceInDays(dueDate, now) > 0
```

### Recharts Composition for Dashboard
```typescript
// Source: Project's components/dashboard/analytics-charts.tsx (verified pattern)
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const data = [
  { name: 'Completed', count: 45 },
  { name: 'In Progress', count: 23 },
  { name: 'Not Started', count: 12 },
  { name: 'At Risk', count: 8 },
]

<ResponsiveContainer width="100%" height={300}>
  <BarChart data={data}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="name" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Bar dataKey="count" fill="#3b82f6" name="Clients" />
  </BarChart>
</ResponsiveContainer>
```

### Prisma Aggregation Queries
```typescript
// Source: https://www.prisma.io/docs/orm/prisma-client/queries/aggregation-grouping-summarizing
// Efficient count and aggregation
const analytics = await prisma.milestone.aggregate({
  where: { client: { isActive: true } },
  _count: { id: true },
  _avg: { progress: true },
})

// Group by status
const statusCounts = await prisma.milestone.groupBy({
  by: ['status'],
  _count: { id: true },
})
```

### Risk Indicator Component
```typescript
// Source: Derived from project's Badge component pattern
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'

export function RiskBadge({ level }: { level: 'none' | 'low' | 'medium' | 'high' }) {
  if (level === 'none') return null

  const config = {
    low: { variant: 'secondary', label: 'Low Risk', color: 'text-yellow-600' },
    medium: { variant: 'warning', label: 'At Risk', color: 'text-orange-600' },
    high: { variant: 'destructive', label: 'High Risk', color: 'text-red-600' },
  }[level]

  return (
    <Badge variant={config.variant} className="gap-1">
      <AlertTriangle className={`h-3 w-3 ${config.color}`} />
      {config.label}
    </Badge>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| useState for filters | URL search params with useSearchParams | Next.js 13+ App Router | Shareable/bookmarkable filtered views, persists across reloads |
| Client-side only filtering | Hybrid: server aggregation + client filtering | 2024-2026 trend | Reduces initial data transfer, maintains interactivity |
| Manual date math | date-fns utility functions | Industry standard since 2020+ | Handles edge cases, timezones, more reliable |
| Custom dashboard components | Headless component libraries (shadcn/ui) | 2023-2026 trend | Smaller bundles, full control, consistent patterns |
| Real-time analytics queries | Cached aggregations with revalidation | Next.js best practice | Reduces database load, acceptable staleness (5-15 min) |

**Deprecated/outdated:**
- **Pages Router query params:** Use App Router's useSearchParams hook, not router.query
- **getServerSideProps for analytics:** Use Server Components with cache(), not SSR functions
- **Heavy table libraries (AG Grid, react-table v7):** Modern trend toward headless libraries or custom implementations with smaller bundles
- **Redux for filter state:** URL search params are simpler, more standard for dashboard filters

## Open Questions

Things that couldn't be fully resolved:

1. **At-Risk Threshold Configuration**
   - What we know: Risk detection needs thresholds (e.g., "overdue by X days", "stalled after Y days")
   - What's unclear: Whether thresholds should be hardcoded or configurable per-deployment
   - Recommendation: Start with hardcoded reasonable defaults (14 days for stalled, any overdue is risk), make configurable later if needed

2. **Server vs. Client Filtering Strategy**
   - What we know: Client count currently small (<10 test clients), could grow to 50-100+
   - What's unclear: At what scale client-side filtering becomes too slow
   - Recommendation: Start with client-side filtering (simpler, instant feedback), move to server-side if client count exceeds 200 or performance issues arise

3. **Analytics Caching Strategy**
   - What we know: Aggregate queries can be slow on large datasets, analytics don't need real-time accuracy
   - What's unclear: Acceptable staleness for analytics (5 min? 15 min? 1 hour?)
   - Recommendation: No caching for MVP (client count is small), add Next.js revalidate with 300s (5 min) if performance becomes issue

4. **Chart Types for Portfolio Analytics**
   - What we know: Recharts supports bar, line, pie charts; project already uses these
   - What's unclear: Which chart types best represent portfolio health (trend over time vs. current snapshot)
   - Recommendation: Start with bar charts for status distribution, progress distribution by client, defer trend charts to later iteration

## Sources

### Primary (HIGH confidence)
- Next.js Official Documentation (16.1.6) - useSearchParams, Server Components
  - https://nextjs.org/docs/app/api-reference/functions/use-search-params
  - https://nextjs.org/docs/app/building-your-application/rendering/server-components
- date-fns Documentation (4.1.0) - Date calculations
  - https://date-fns.org/docs/Getting-Started
  - https://date-fns.org/docs/differenceInDays
- Prisma Documentation - Aggregation and grouping
  - https://www.prisma.io/docs/orm/prisma-client/queries/aggregation-grouping-summarizing
- Recharts Documentation - Already verified in project's analytics-charts.tsx
- Project codebase - Existing patterns verified in app/admin/page.tsx, lib/dal.ts, lib/utils/progress.ts

### Secondary (MEDIUM confidence)
- [Why URL state matters: A guide to useSearchParams in React](https://blog.logrocket.com/url-state-usesearchparams/) - LogRocket, 2024
- [React Server Components: Practical Guide (2026)](https://inhaq.com/blog/react-server-components-practical-guide-2026.html) - Best practices for server/client component split
- [Mastering Next.js API Features: Search, Pagination, Filters, Sorting](https://medium.com/@letscodefuture/mastering-next-js-api-features-search-pagination-filters-sorting-and-limits-made-easy-2150735df0f7) - Medium, patterns for filtering
- [Project milestones: strategic planning and execution tips for 2026](https://monday.com/blog/project-management/project-milestones/) - Risk detection patterns

### Tertiary (LOW confidence)
- WebSearch results on at-risk project detection - Multiple sources, no single authoritative standard
- WebSearch results on admin dashboard analytics patterns - General industry trends, not framework-specific

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project, no new dependencies needed
- Architecture patterns: HIGH - Patterns verified with official Next.js docs and existing codebase examples
- Pitfalls: MEDIUM - Based on common Next.js patterns and community best practices
- Code examples: HIGH - Examples sourced from official docs and verified project code
- Risk detection logic: MEDIUM - Business logic domain-specific, requires validation with stakeholders

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (30 days - stable stack, minor updates expected)

**Notes:**
- Project already has all necessary infrastructure (admin auth, DAL, Recharts, Table components)
- Phase 5 just completed, so admin page exists with client list - this phase enhances it
- No CONTEXT.md exists, researcher has full discretion on approach
- Focus on reusing existing patterns rather than introducing new libraries or architectures
