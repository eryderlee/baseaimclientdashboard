# Phase 1: Dashboard Layout - Research

**Researched:** 2026-02-12
**Domain:** Responsive dashboard layouts with Next.js App Router, React, and Tailwind CSS
**Confidence:** HIGH

## Summary

This research covers implementing a responsive dashboard layout that displays stat cards and an analytics chart. The goal is to reorganize the existing full-width layout into a left-right split on desktop (4 stat cards on left, smaller analytics chart on right), with the ability to expand the chart to full width, and proper mobile stacking behavior.

The standard approach uses Tailwind CSS Grid with responsive breakpoint modifiers to create mobile-first layouts that stack vertically on small screens and display side-by-side on larger screens. State management for the expand/collapse functionality is handled with React's useState hook, and the component should be marked as a client component using the "use client" directive since it requires interactivity.

The existing codebase already has all necessary dependencies: Next.js 16.1.6 with App Router, React 19.2.3, Tailwind CSS 4, and lucide-react 0.563.0 for icons. The current dashboard page uses a grid-based layout but needs restructuring to achieve the two-column desktop layout with expandable chart functionality.

**Primary recommendation:** Use Tailwind's responsive grid utilities (grid-cols-1 lg:grid-cols-3 pattern) combined with React useState for expand/collapse state, keeping the analytics component as a client component while maintaining the page as a server component.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | React framework with App Router | Server-first architecture, file-based routing, official React framework for production |
| React | 19.2.3 | UI library | Industry standard, component-based, excellent ecosystem |
| Tailwind CSS | 4.x | Utility-first CSS framework | Mobile-first approach, responsive utilities, no custom CSS needed |
| lucide-react | 0.563.0 | Icon library | Consistent icons, tree-shakeable, modern SVG-based |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| class-variance-authority | 0.7.1 | Variant-based className management | Already in project for button/component variants |
| clsx | 2.1.1 | Conditional className utility | Combining multiple className conditions |
| tailwind-merge | 3.4.0 | Merge Tailwind classes safely | Preventing class conflicts in component composition |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Tailwind Grid | CSS Grid directly | Tailwind provides responsive utilities out of box, no media queries needed |
| useState | Zustand/Redux | Overkill for simple boolean toggle state, useState is sufficient |
| lucide-react | react-icons | Already installed, consistent with project, excellent TypeScript support |

**Installation:**
```bash
# No new packages needed - all dependencies already installed
# Verify existing packages:
npm list next react tailwind lucide-react
```

## Architecture Patterns

### Recommended Project Structure
```
app/
├── dashboard/
│   ├── page.tsx              # Server component (default)
│   └── layout.tsx            # Server component layout
components/
├── dashboard/
│   ├── analytics-overview.tsx # Client component ("use client")
│   └── stat-cards.tsx         # Can be server component
└── ui/
    ├── card.tsx               # Reusable UI primitives
    └── button.tsx
```

### Pattern 1: Mobile-First Responsive Grid
**What:** Use Tailwind's breakpoint prefixes to define different layouts at different screen sizes, starting with mobile (default) and progressively enhancing for larger screens.

**When to use:** For any responsive layout that needs different column arrangements on mobile vs desktop.

**Example:**
```typescript
// Source: https://tailwindcss.com/docs/responsive-design
// Mobile: stacks vertically (default, no prefix)
// Desktop: two-column layout (lg: prefix at 1024px+)
<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
  {/* Left column: spans full width on mobile, 2 cols on desktop */}
  <div className="lg:col-span-2">
    {/* 4 stat cards in responsive grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <StatCard />
      <StatCard />
      <StatCard />
      <StatCard />
    </div>
  </div>

  {/* Right column: full width on mobile, 1 col on desktop */}
  <div className="lg:col-span-1">
    <AnalyticsChart />
  </div>
</div>
```

### Pattern 2: Client Component for Interactivity
**What:** Mark components requiring state, event handlers, or browser APIs with "use client" directive while keeping parent pages as server components.

**When to use:** When component needs useState, useEffect, onClick handlers, or browser APIs.

**Example:**
```typescript
// Source: https://nextjs.org/docs/app/getting-started/server-and-client-components
"use client"

import { useState } from "react"

export function AnalyticsOverview() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className={isExpanded ? "lg:col-span-3" : "lg:col-span-1"}>
      <Card>
        <CardHeader>
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
          >
            {isExpanded ? "Collapse" : "Expand"}
          </Button>
        </CardHeader>
        {/* Chart content */}
      </Card>
    </div>
  )
}
```

### Pattern 3: Conditional Column Spanning
**What:** Dynamically change grid column span based on component state using conditional className values.

**When to use:** For expandable/collapsible sections that should take different amounts of space.

**Example:**
```typescript
// Source: Verified Tailwind CSS grid utilities
const containerClasses = isExpanded
  ? "lg:col-span-3" // Full width when expanded
  : "lg:col-span-1" // 1/3 width when collapsed

<div className={cn("transition-all duration-300", containerClasses)}>
  <AnalyticsChart />
</div>
```

### Pattern 4: Accessible Toggle Button
**What:** Use aria-expanded attribute to communicate expand/collapse state to screen readers, with visual icon indicating current state.

**When to use:** Any interactive button that shows/hides or expands/collapses content.

**Example:**
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-expanded
import { Maximize2, Minimize2 } from "lucide-react"

<Button
  onClick={() => setIsExpanded(!isExpanded)}
  aria-expanded={isExpanded}
  aria-label={isExpanded ? "Collapse chart to normal size" : "Expand chart to full width"}
  variant="outline"
  size="icon-sm"
>
  {isExpanded ? (
    <Minimize2 className="h-4 w-4" />
  ) : (
    <Maximize2 className="h-4 w-4" />
  )}
</Button>
```

### Anti-Patterns to Avoid
- **Desktop-first responsive design:** Don't define desktop layouts without mobile defaults. Tailwind is mobile-first, so unprefixed utilities apply to all screen sizes. Always start with mobile layout.
- **Hardcoded pixel widths in grid:** Avoid `grid-cols-[300px_300px]` as it breaks on mobile. Use fractional units (fr) or Tailwind's semantic grid-cols-N classes.
- **Client components everywhere:** Don't add "use client" to pages or parent layouts unless necessary. Only the interactive components need it (e.g., the analytics chart with expand button).
- **Missing aria-expanded:** Don't create expand/collapse buttons without aria-expanded attribute - this breaks screen reader accessibility.
- **Complex state management for simple toggles:** Don't use Redux/Zustand for a single boolean state. useState is simpler and sufficient.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Responsive breakpoints | Custom media queries in CSS | Tailwind responsive prefixes (sm:, md:, lg:, xl:) | Tailwind has consistent breakpoints, mobile-first by default, no CSS file needed |
| Conditional class merging | String concatenation with ternaries | `cn()` utility (clsx + tailwind-merge) | Prevents class conflicts, properly merges Tailwind classes, handles conditionals |
| Icon components | SVG files or custom icon system | lucide-react (already installed) | Tree-shakeable, consistent design, TypeScript support, actively maintained |
| Expand/collapse animations | Custom CSS transitions | Tailwind transition utilities + CSS Grid | Grid handles layout changes smoothly, transition-all provides visual feedback |
| Grid layout calculations | Manual column width calculations | Tailwind grid-cols-N and col-span-N | Handles responsive behavior, works with gap, no math required |

**Key insight:** Tailwind CSS provides all necessary responsive utilities out of the box. The mobile-first approach means you write less code - define mobile layout as default, then only add breakpoint modifiers for larger screens. This prevents overcomplication and reduces CSS footprint.

## Common Pitfalls

### Pitfall 1: Using Pixel Values Instead of Fractional Units
**What goes wrong:** Defining grid columns with fixed pixel widths (e.g., `grid-template-columns: 300px 300px 300px`) causes horizontal overflow on mobile screens.

**Why it happens:** Desktop-first thinking where developers define what works on their large screen first, forgetting mobile constraints.

**How to avoid:** Use Tailwind's grid-cols-N utilities which use `minmax(0, 1fr)` internally, ensuring equal distribution. For custom layouts, use fractional units: `grid-cols-[2fr_1fr]` instead of `grid-cols-[600px_300px]`.

**Warning signs:**
- Horizontal scrollbar appears on mobile
- Cards overflow container on tablet
- Layout works on desktop but breaks on smaller viewports

### Pitfall 2: Not Understanding minmax(0, 1fr)
**What goes wrong:** Assuming `1fr` always means "equal width" can lead to uneven columns when content varies significantly.

**Why it happens:** CSS Grid's `1fr` distributes available space, but content can force columns wider if not constrained.

**How to avoid:** Tailwind's grid utilities use `minmax(0, 1fr)` which constrains minimum size to 0, preventing content from forcing column expansion. If using custom grid values, always include minmax: `grid-cols-[minmax(0,2fr)_minmax(0,1fr)]`.

**Warning signs:**
- Columns are different widths despite using 1fr
- Long text or images force one column wider
- Layout looks unbalanced despite equal fr values

### Pitfall 3: Forgetting Mobile-First Approach
**What goes wrong:** Adding breakpoint prefixes to all classes, forgetting that unprefixed utilities apply to all screen sizes.

**Why it happens:** Coming from desktop-first frameworks like older Bootstrap versions.

**How to avoid:** Always define mobile layout first (no prefix), then add larger breakpoints only where layout changes. Example: `grid-cols-1 lg:grid-cols-3` not `sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-3`.

**Warning signs:**
- Writing redundant classes with multiple breakpoint prefixes
- Mobile layout unstyled because everything has sm:, md:, lg: prefixes
- More code than necessary for responsive behavior

### Pitfall 4: Client Components Breaking Server Rendering
**What goes wrong:** Adding "use client" to the page.tsx file forces entire page to client-side render, losing Next.js server component benefits.

**Why it happens:** Misunderstanding Next.js App Router component model - thinking interactivity requires whole page to be client component.

**How to avoid:** Keep pages and layouts as server components (default). Only add "use client" to the specific interactive component (AnalyticsOverview). Import client component into server component - Next.js handles this correctly.

**Warning signs:**
- "use client" at top of page.tsx
- Data fetching moved to useEffect instead of server component
- Loss of streaming and server-side rendering benefits

### Pitfall 5: Missing aria-expanded Updates
**What goes wrong:** aria-expanded attribute is static or not synchronized with actual expand/collapse state.

**Why it happens:** Adding accessibility attributes as an afterthought without connecting them to component state.

**How to avoid:** Bind aria-expanded directly to state variable: `aria-expanded={isExpanded}`. React will update the attribute whenever state changes.

**Warning signs:**
- Screen reader announces wrong state
- aria-expanded always shows "false" even when expanded
- Button has aria-expanded but value doesn't change

### Pitfall 6: Overusing grid-auto-flow: dense
**What goes wrong:** Using `grid-auto-flow: dense` to fill gaps causes items to be reordered visually, breaking logical tab order for keyboard users.

**Why it happens:** Wanting to fill visual gaps in grid layout for aesthetic reasons.

**How to avoid:** Only use `dense` for decorative grids where tab order doesn't matter (e.g., image galleries). For dashboard cards with interactive elements, maintain source order. Let gaps exist at certain breakpoints rather than breaking accessibility.

**Warning signs:**
- Tab order jumps around screen unexpectedly
- Visual order doesn't match DOM order
- Screen reader navigation is confusing

## Code Examples

Verified patterns from official sources:

### Complete Responsive Dashboard Layout
```typescript
// Source: Combining Tailwind docs patterns with Next.js App Router best practices
// File: app/dashboard/page.tsx (Server Component)

import { AnalyticsOverview } from "@/components/dashboard/analytics-overview"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, MessageSquare, TrendingUp, CreditCard } from "lucide-react"

export default async function DashboardPage() {
  // Server-side data fetching possible here

  return (
    <div className="space-y-8">
      {/* Main grid: stacks on mobile, 3-column on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left section: 2/3 width on desktop */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stat cards: 1 col mobile, 2 cols tablet+ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                <FileText className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">24</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
                <MessageSquare className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">65%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                <CreditCard className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$2,450.00</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right section: 1/3 width on desktop, expandable */}
        <AnalyticsOverview
          impressionsData={[]}
          clicksData={[]}
          leadsData={[]}
          bookedCallsData={[]}
          totalAdSpend={3500}
        />
      </div>
    </div>
  )
}
```

### Expandable Analytics Component (Client)
```typescript
// Source: Next.js client component patterns + accessibility best practices
// File: components/dashboard/analytics-overview.tsx

"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Maximize2, Minimize2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface AnalyticsOverviewProps {
  impressionsData: Array<{ date: string; value: number }>
  clicksData: Array<{ date: string; value: number }>
  leadsData: Array<{ date: string; value: number }>
  bookedCallsData: Array<{ date: string; value: number }>
  totalAdSpend: number
}

export function AnalyticsOverview(props: AnalyticsOverviewProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div
      className={cn(
        "transition-all duration-300",
        // Normal: 1/3 width on desktop
        // Expanded: full width on desktop
        isExpanded ? "lg:col-span-3" : "lg:col-span-1"
      )}
    >
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">Campaign Performance</CardTitle>

          {/* Expand/Collapse button - hidden on mobile where it's always full width */}
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            aria-label={
              isExpanded
                ? "Collapse chart to normal size"
                : "Expand chart to full width"
            }
            variant="outline"
            size="icon-sm"
            className="hidden lg:flex"
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </CardHeader>

        <CardContent>
          {/* Chart content - existing implementation */}
        </CardContent>
      </Card>
    </div>
  )
}
```

### Using cn() Utility for Conditional Classes
```typescript
// Source: Project's existing pattern (lib/utils.ts)
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Usage for conditional column spanning:
const columnSpan = cn(
  "transition-all duration-300", // Always applied
  isExpanded ? "lg:col-span-3" : "lg:col-span-1" // Conditional
)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CSS media queries in separate files | Tailwind responsive prefixes in className | Tailwind v2+ (2020) | No separate CSS files needed, mobile-first by default |
| Pages Router with getServerSideProps | App Router with Server Components | Next.js 13+ (2022), stable in 14-15 | Better performance, streaming, less JavaScript to client |
| useState in pages for all state | Server Components by default, client components only for interactivity | Next.js 13+ App Router | Reduced client JavaScript, better SEO, faster initial load |
| Flexbox for two-dimensional layouts | CSS Grid for grid-based layouts | CSS Grid mainstream adoption (2018+) | Simpler code for grid layouts, better responsive behavior |
| Manual breakpoint constants | Tailwind's standardized breakpoints | Tailwind popularity (2019+) | Consistency across projects, less decision fatigue |

**Deprecated/outdated:**
- **Pages Router patterns:** getStaticProps, getServerSideProps are Pages Router concepts. App Router uses async server components directly.
- **_app.tsx for layouts:** App Router uses layout.tsx convention instead.
- **CSS Modules for responsive layouts:** While still supported, Tailwind's utility classes are now standard for most Next.js projects, especially with v15+.
- **aria-controls for expand/collapse:** While not technically deprecated, aria-expanded alone is often sufficient for simple toggle buttons. aria-controls is more useful for complex widgets.

## Open Questions

1. **Should expand state persist across page navigations?**
   - What we know: useState resets when component unmounts. Could use localStorage or URL params to persist.
   - What's unclear: User expectation - should expanded chart stay expanded if user navigates away and back?
   - Recommendation: Start with ephemeral state (useState). If users request persistence, add localStorage in a follow-up phase.

2. **Animation duration for expand/collapse**
   - What we know: Tailwind provides duration-75, duration-150, duration-300, duration-500, etc.
   - What's unclear: What feels best for this specific layout shift (grid column span change)?
   - Recommendation: Use duration-300 (300ms) as starting point - it's Tailwind's default transition duration and works well for layout changes. Can adjust based on user testing.

3. **Mobile breakpoint for stat cards (1 vs 2 columns)**
   - What we know: md: breakpoint is 768px (tablet landscape)
   - What's unclear: Should stat cards go 2-column on larger phones (sm: 640px) or wait until tablet (md: 768px)?
   - Recommendation: Use md: (768px) to keep phones at 1 column for easier reading. 4 cards in 2 columns fits well on tablet+.

## Sources

### Primary (HIGH confidence)
- [Tailwind CSS Responsive Design Official Docs](https://tailwindcss.com/docs/responsive-design) - Verified breakpoints, mobile-first approach, responsive patterns
- [Tailwind CSS Grid Template Columns Docs](https://tailwindcss.com/docs/grid-template-columns) - Verified grid utilities and responsive grid patterns
- [Next.js App Router Server/Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) - Official guidance on when to use client components
- [MDN aria-expanded Attribute](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-expanded) - Accessibility requirements for expand/collapse
- [MDN CSS Grid Common Layouts](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Common_grid_layouts) - Verified grid patterns for responsive layouts

### Secondary (MEDIUM confidence)
- [Tailwind CSS Best Practices 2025-2026](https://www.frontendtools.tech/blog/tailwind-css-best-practices-design-system-patterns) - Container queries and modern patterns
- [Next.js Architecture 2026](https://www.yogijs.tech/blog/nextjs-project-architecture-app-router) - Server-first architecture patterns
- [Tailwind CSS Grid Template Columns Practical Patterns](https://thelinuxcode.com/tailwind-css-grid-template-columns-practical-patterns-for-2026-layouts/) - 2026 responsive patterns
- [CSS Grid Admin Dashboard by Max Böck](https://mxb.dev/blog/css-grid-admin-dashboard/) - Real-world dashboard grid implementation
- [Mozilla 9 Biggest Mistakes with CSS Grid](https://hacks.mozilla.org/2018/07/9-biggest-mistakes-with-css-grid/) - Common pitfalls to avoid

### Tertiary (LOW confidence - general patterns, not specific to 2026)
- [Mastering Responsive Layouts with Tailwind Grid](https://codeparrot.ai/blogs/mastering-responsive-layouts-with-tailwind-grid-in-react) - General responsive patterns
- [lucide-react npm package](https://www.npmjs.com/package/lucide-react) - Version confirmation (0.563.0)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified from package.json, versions confirmed, official documentation consulted
- Architecture: HIGH - Next.js App Router patterns verified from official docs, Tailwind responsive patterns from official docs, React patterns are standard
- Pitfalls: HIGH - Verified from MDN, Mozilla developer blog, and multiple community sources with consistent patterns

**Research date:** 2026-02-12
**Valid until:** 2026-03-14 (30 days - stable ecosystem, mature libraries)

**Notes:**
- No new dependencies required - all necessary tools already in project
- Existing AnalyticsOverview component needs refactoring to support expand/collapse
- Current dashboard page.tsx is server component (correct) and should remain so
- Lucide-react icons already used consistently throughout project
