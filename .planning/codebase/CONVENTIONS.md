# Coding Conventions

**Analysis Date:** 2026-02-11

## Naming Patterns

**Files:**
- Components: PascalCase with `.tsx` extension (e.g., `analytics-overview.tsx`, `dashboard-nav.tsx`)
- Utilities: camelCase with `.ts` extension (e.g., `use-mobile.ts`, `utils.ts`)
- API routes: lowercase kebab-case following Next.js App Router structure (e.g., `/api/documents/upload/route.ts`)
- Pages: lowercase with `.tsx` extension (e.g., `page.tsx`, `page-old.tsx`)

**Functions:**
- React components: PascalCase (e.g., `export function AnalyticsOverview(...)`, `export function DashboardNav(...)`)
- Helper functions: camelCase (e.g., `generateDailyData()`, `scrollToBottom()`, `handleFileChange()`)
- Hooks: camelCase with `use` prefix (e.g., `useIsMobile()`, `useRouter()`)
- API handlers: camelCase (e.g., `POST()`, `GET()`, `sendMessage()`, `uploadFiles()`)

**Variables:**
- Local state: camelCase (e.g., `isMobile`, `uploading`, `progress`, `activeTab`)
- Constants: UPPER_SNAKE_CASE for configuration (e.g., `MOBILE_BREAKPOINT = 768`)
- Component props interfaces: PascalCase with suffix `Props` (e.g., `DashboardNavProps`, `AnalyticsOverviewProps`, `ChatInterfaceProps`)

**Types:**
- Interfaces: PascalCase (e.g., `MetricData`, `Message`, `DailyMetric`, `ChatInterfaceProps`)
- Enums: PascalCase (e.g., `UserRole`, `DocumentStatus`, `InvoiceStatus`)
- Type aliases: PascalCase (e.g., `type VariantProps`)

## Code Style

**Formatting:**
- Indentation: 2 spaces (configured in tsconfig.json for bundler module resolution)
- Line length: Follows ESLint configuration (no explicit limit found)
- Quotes: Double quotes in JSX, consistent single/double in JS

**Linting:**
- Tool: ESLint 9+ with `eslint-config-next` (core-web-vitals and typescript)
- Config file: `eslint.config.mjs` (ESLint flat config format)
- Ignored patterns: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`
- Key rules: Enforces Next.js best practices, TypeScript type safety, and web vitals

## Import Organization

**Order:**
1. React and Next.js imports: `import { useState } from "react"`, `import Link from "next/link"`
2. External library imports: `import { Card, CardContent } from "@/components/ui/card"`
3. Internal utility imports: `import { cn } from "@/lib/utils"`, `import { auth } from "@/lib/auth"`
4. Internal component imports: `import { DashboardNav } from "@/components/dashboard/dashboard-nav"`
5. Icon imports (usually Lucide): `import { Home, FileText, MessageSquare } from "lucide-react"`

**Path Aliases:**
- `@/*` resolves to the root directory (configured in tsconfig.json)
- Used consistently across all imports for clarity and maintainability
- Example: `@/components/ui/button`, `@/lib/auth`, `@/hooks/use-mobile`

## Error Handling

**Patterns:**
- API Routes: Try-catch blocks wrapping async operations with console.error logging
- Pattern in `app/api/auth/register/route.ts`: Returns NextResponse with appropriate status codes (400 for validation, 401 for auth, 500 for server errors)
- Client components: Try-catch with error logging via console.error, user feedback via alert()
- Pattern in `components/dashboard/document-upload.tsx`: Catch errors, log to console, display user-friendly alert
- Validation: Check before processing (e.g., `if (!file)`, `if (!session?.user)`, `if (!newMessage.trim())`)
- Early returns: Use early returns for guard clauses instead of nested conditionals

**Example from `app/api/documents/upload/route.ts`:**
```typescript
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // ... operation logic
    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
```

## Logging

**Framework:** Native console methods (console.error, console.log)

**Patterns:**
- Log errors with context prefix: `console.error("Upload error:", error)`
- Used in catch blocks for debugging and monitoring
- Error messages provide action context: "Registration error:", "Get messages error:", "Send message error:"
- No debug-level logging; console.error used for exception tracking only

**Example from `app/api/auth/register/route.ts`:**
```typescript
catch (error) {
  console.error("Registration error:", error)
  return NextResponse.json(...)
}
```

## Comments

**When to Comment:**
- Comments are minimal; code is kept self-documenting through clear naming
- Inline comments used for non-obvious logic (e.g., "Generate realistic variance" in `generateDailyData()`)
- Section comments using `// [Description]` for logical groupings (e.g., "// Meta Metrics", "// Line Chart")
- Comments explain **why**, not **what** (the code shows what it does)

**JSDoc/TSDoc:**
- Not consistently used for function documentation
- Interfaces are self-documenting through property names and types
- No standardized JSDoc convention enforced

**Example from `app/dashboard/page.tsx`:**
```typescript
// Generate mock analytics data for the last 30 days
function generateDailyData(baseValue: number, variance: number, days: number = 30) {
  const data = []
  const today = new Date()

  for (let i = days - 1; i >= 0; i--) {
    // ... logic
    // Generate realistic variance
    const randomVariance = (Math.random() - 0.5) * variance * 2
```

## Function Design

**Size:** Functions range from single-line utilities to ~100 line components; component functions prefer composition over large single functions

**Parameters:**
- Use object destructuring for props: `function AnalyticsOverview({ impressionsData, clicksData, ... })`
- API handlers receive `req: NextRequest` as sole parameter
- Callback handlers: `const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { ... }`

**Return Values:**
- Components: Return JSX.Element implicitly
- API routes: Return NextResponse with status and body
- Async functions: Return Promises (implicitly via async/await)
- Utilities: Return typed values (e.g., `cn()` returns string, `auth()` returns session or null)

**Example from `lib/utils.ts`:**
```typescript
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

## Module Design

**Exports:**
- Named exports preferred for functions and components: `export function AnalyticsOverview(...)`
- Default exports used for page components: `export default async function DashboardPage()`
- Barrel files (index.ts) not used; imports reference specific files directly

**Composition:**
- React components composed by importing and nesting sub-components
- Hooks used for state management and side effects
- Utility functions imported from `lib/` directory for shared logic
- UI components in `components/ui/` inherit from `lib/utils.cn()` for style merging

**Example from `components/ui/card.tsx`:**
```typescript
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
```

## React Patterns

**Client Components:**
- Marked with `"use client"` directive at top of file
- Use hooks for state: `useState`, `useRef`, `useEffect`, `useRouter`, `usePathname`
- Callbacks use useCallback for event handlers to prevent unnecessary re-renders

**Server Components:**
- Pages marked as `async` when using server-side operations
- No `"use client"` directive (default behavior)
- Example: `export default async function DashboardPage()`

**State Management:**
- Local component state via useState
- No global state management library (Redux, Zustand, etc.)
- Form data passed via formData in POST requests

---

*Convention analysis: 2026-02-11*
