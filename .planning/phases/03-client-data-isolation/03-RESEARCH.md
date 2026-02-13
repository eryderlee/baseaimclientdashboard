# Phase 03: Client Data Isolation - Research

**Researched:** 2026-02-13
**Domain:** Authentication & Authorization / Multi-tenant Data Isolation
**Confidence:** HIGH

## Summary

This research investigates how to implement client data isolation in a Next.js 16 application using NextAuth v5 (Auth.js), Prisma ORM, and PostgreSQL. The goal is to ensure each client sees only their own data, while admin users can view all clients' data.

The project already has NextAuth v5 configured with credential-based authentication and a database schema with User and Client models supporting role-based access control (UserRole enum with ADMIN and CLIENT). The database uses client-tenant isolation with a clientId foreign key on all tenant-scoped tables (Milestone, Document, Invoice, etc.).

The standard approach for this scale (1-5 clients initially) is to implement a **Data Access Layer (DAL)** pattern that centralizes authorization logic and automatically filters queries based on the authenticated user's role and associated clientId. This is more appropriate than full PostgreSQL Row-Level Security (RLS) for smaller applications, while still providing robust security.

**Primary recommendation:** Create a Data Access Layer with session verification and client-scoped query helpers that automatically inject clientId filters for CLIENT role users, while allowing ADMIN users unrestricted access.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NextAuth v5 (Auth.js) | 5.0.0-beta.30 | Authentication & session management | Official Next.js authentication solution, built-in JWT/session callbacks for role-based access |
| Prisma ORM | 7.3.0 | Database access with type safety | Industry standard for Next.js/TypeScript, excellent type safety and query building |
| PostgreSQL | Latest | Relational database | Already in use, supports both simple WHERE filtering and advanced RLS if needed later |
| bcryptjs | 3.0.3 | Password hashing | Already installed, standard for secure password storage |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | Latest | Schema validation for server actions | Validate user input in authentication flows and data mutations |
| server-only | Latest | Prevent client-side execution | Ensure DAL functions never execute on client |
| React cache | Built-in | Memoize auth checks | Prevent duplicate session verifications in single render pass |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Simple WHERE filters | PostgreSQL RLS | RLS adds database-level security but increases complexity; overkill for 1-5 clients |
| NextAuth v5 | Clerk/Auth0 | Third-party services handle more complexity but add cost and external dependency |
| Data Access Layer | Prisma Middleware | Middleware works but DAL is more explicit and easier to test/audit |

**Installation:**
```bash
npm install zod server-only
```

## Architecture Patterns

### Recommended Project Structure
```
lib/
├── auth.ts              # Existing NextAuth config
├── prisma.ts            # Existing Prisma client
├── dal.ts               # NEW: Data Access Layer
└── dto.ts               # NEW: Data Transfer Objects (optional, for sensitive data)

app/
├── api/
│   └── [resources]/
│       └── route.ts     # Verify session + check authorization
└── dashboard/
    └── [pages]/
        └── page.tsx     # Call DAL functions, never direct Prisma queries
```

### Pattern 1: Session Verification in DAL
**What:** Centralized function that verifies user session and returns auth context
**When to use:** At the start of every data request, server action, and route handler
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/guides/authentication
import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { auth } from '@/lib/auth'

export const verifySession = cache(async () => {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  return {
    userId: session.user.id,
    userRole: session.user.role as 'ADMIN' | 'CLIENT',
    isAuth: true
  }
})
```

### Pattern 2: Client-Scoped Query Helper
**What:** Helper function that automatically filters queries by clientId for CLIENT role
**When to use:** Every database query that touches client-specific data
**Example:**
```typescript
// Source: Next.js Data Access Layer pattern
import 'server-only'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/dal'

export const getClientMilestones = cache(async () => {
  const { userId, userRole } = await verifySession()

  // Get client profile for non-admin users
  let clientId: string | undefined
  if (userRole === 'CLIENT') {
    const client = await prisma.client.findUnique({
      where: { userId },
      select: { id: true }
    })
    if (!client) throw new Error('Client profile not found')
    clientId = client.id
  }

  // Admin sees all, client sees only their own
  return await prisma.milestone.findMany({
    where: clientId ? { clientId } : {},
    orderBy: { order: 'asc' },
    // Return only necessary fields (DTO pattern)
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      progress: true,
      startDate: true,
      dueDate: true,
      completedAt: true,
      notes: true,
    }
  })
})
```

### Pattern 3: Server Action Authorization
**What:** Verify session and check authorization in every server action
**When to use:** All mutations (create/update/delete operations)
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/guides/authentication
'use server'
import { verifySession } from '@/lib/dal'
import { revalidatePath } from 'next/cache'

export async function updateMilestoneProgress(
  milestoneId: string,
  progress: number
) {
  const { userId, userRole } = await verifySession()

  // Get the milestone to check ownership
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: { client: true }
  })

  if (!milestone) {
    throw new Error('Milestone not found')
  }

  // Authorization check
  if (userRole === 'CLIENT' && milestone.client.userId !== userId) {
    throw new Error('Unauthorized: Cannot update another client\'s milestone')
  }

  // Proceed with mutation
  await prisma.milestone.update({
    where: { id: milestoneId },
    data: { progress, updatedAt: new Date() }
  })

  revalidatePath('/dashboard/progress')
}
```

### Pattern 4: Middleware for Route Protection
**What:** Protect routes at middleware level, but only for optimistic checks
**When to use:** Redirect unauthenticated users, basic role-based route access
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/guides/authentication
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const session = await auth()

  const isAdminRoute = request.nextUrl.pathname.startsWith('/dashboard/admin')
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard')

  // Redirect unauthenticated users
  if (isProtectedRoute && !session?.user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Block non-admin users from admin routes
  if (isAdminRoute && session?.user?.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}
```

### Anti-Patterns to Avoid
- **Direct Prisma queries in components:** Always go through DAL to ensure auth checks happen
- **Relying solely on middleware:** Middleware is optimistic; always verify in DAL and server actions
- **Client-side auth checks only:** UI hiding is not security; server-side verification is mandatory
- **Checking role without verifying session:** Attackers can manipulate client-side role claims
- **Forgetting revalidatePath after mutations:** Next.js won't reflect changes without cache invalidation

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session verification logic | Custom JWT decode/verify | NextAuth's `auth()` helper | Handles edge cases, token refresh, security best practices |
| Authorization middleware | Custom auth wrapper functions | Data Access Layer pattern | Centralized, testable, recommended by Next.js team |
| Password hashing | Custom crypto implementations | bcryptjs (already installed) | Battle-tested, handles salt rounds, timing-attack resistant |
| Role-based component rendering | Custom permission components | Session data in Server Components | Built into Next.js App Router, no extra library needed |
| Query memoization | Manual caching logic | React's `cache()` function | Deduplicates requests in single render pass automatically |

**Key insight:** Authentication and authorization have numerous security edge cases (timing attacks, session fixation, token refresh, race conditions). Use established libraries that have been audited and battle-tested rather than implementing custom security logic.

## Common Pitfalls

### Pitfall 1: Middleware-Only Authorization
**What goes wrong:** Relying solely on middleware to protect routes without server-side verification
**Why it happens:** Middleware is convenient and centralized, feels like enough protection
**How to avoid:** Treat middleware as optimistic UX (redirects), always verify session in DAL before data access
**Warning signs:** No `verifySession()` calls in server components or server actions

### Pitfall 2: Client-Side Authorization Checks
**What goes wrong:** Hiding UI elements based on role, but not protecting API/server actions
**Why it happens:** Client-side checks work during development and feel secure
**How to avoid:** Never trust client-side data; every server action must verify session and authorization
**Warning signs:** Conditional rendering based on `session?.user?.role` without corresponding server checks

### Pitfall 3: Missing clientId Filters
**What goes wrong:** Admin testing bypasses filters; CLIENT users see all data in production
**Why it happens:** Developers test with admin accounts, filters not applied correctly for CLIENT role
**How to avoid:** Always test with both ADMIN and CLIENT role accounts; use helper function that enforces filters
**Warning signs:** Query returns all records regardless of logged-in user; no WHERE clause with clientId

### Pitfall 4: Not Using React cache()
**What goes wrong:** Multiple calls to `verifySession()` in single render create performance issues
**Why it happens:** Unaware that Server Components can call same function multiple times
**How to avoid:** Wrap `verifySession()` and DAL functions with React's `cache()`
**Warning signs:** Database logs show duplicate auth queries within milliseconds; slow page loads

### Pitfall 5: Session Data in Client Components
**What goes wrong:** Passing sensitive session data to client components exposes it to browser
**Why it happens:** Convenience of using session data in interactive components
**How to avoid:** Fetch data in Server Components, pass only non-sensitive data to client
**Warning signs:** Session tokens or user IDs visible in browser DevTools network tab

### Pitfall 6: Forgot to Revalidate After Mutations
**What goes wrong:** Server actions update database but UI doesn't reflect changes
**Why it happens:** Next.js caches pages; mutations don't automatically invalidate cache
**How to avoid:** Call `revalidatePath()` or `revalidateTag()` after every mutation
**Warning signs:** Need to refresh browser to see updated data; stale data persists

### Pitfall 7: Connection Pooling with Wrong Context
**What goes wrong:** In production with connection pooling, wrong client's data might be served
**Why it happens:** PostgreSQL RLS or session variables not set per-request
**How to avoid:** Use application-level filtering (WHERE clauses) rather than database-level context
**Warning signs:** Random data leaks between clients in production but not development

## Code Examples

Verified patterns from official sources:

### Complete Data Access Layer Setup
```typescript
// lib/dal.ts
// Source: https://nextjs.org/docs/app/guides/authentication
import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const verifySession = cache(async () => {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  return {
    userId: session.user.id,
    userRole: session.user.role as 'ADMIN' | 'CLIENT',
    isAuth: true
  }
})

// Helper to get clientId for current user (if CLIENT role)
export const getCurrentClientId = cache(async () => {
  const { userId, userRole } = await verifySession()

  if (userRole === 'ADMIN') {
    return null // Admin can access all clients
  }

  const client = await prisma.client.findUnique({
    where: { userId },
    select: { id: true }
  })

  if (!client) {
    throw new Error('Client profile not found')
  }

  return client.id
})

// Example: Get milestones with automatic filtering
export const getMilestones = cache(async () => {
  const clientId = await getCurrentClientId()

  return await prisma.milestone.findMany({
    where: clientId ? { clientId } : {}, // Empty where = all records (admin)
    orderBy: { order: 'asc' },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      progress: true,
      startDate: true,
      dueDate: true,
      completedAt: true,
      notes: true,
    }
  })
})

// Example: Get documents with automatic filtering
export const getDocuments = cache(async () => {
  const clientId = await getCurrentClientId()

  return await prisma.document.findMany({
    where: clientId ? { clientId } : {},
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      fileUrl: true,
      fileName: true,
      status: true,
      createdAt: true,
    }
  })
})
```

### Server Component Using DAL
```typescript
// app/dashboard/progress/page.tsx
// Source: https://nextjs.org/docs/app/guides/authentication
import { getMilestones } from '@/lib/dal'
import { MilestoneChecklist } from '@/components/dashboard/milestone-checklist'

export default async function ProgressPage() {
  // DAL handles auth check and filtering automatically
  const milestones = await getMilestones()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Progress Tracking</h1>
        <p className="text-neutral-500 mt-1">
          Monitor your project milestones and track progress
        </p>
      </div>

      <MilestoneChecklist milestones={milestones} />
    </div>
  )
}
```

### Server Action with Authorization
```typescript
// app/actions/milestones.ts
// Source: https://nextjs.org/docs/app/guides/authentication
'use server'

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'

export async function updateMilestoneProgress(
  milestoneId: string,
  progress: number
) {
  // 1. Verify session
  const { userId, userRole } = await verifySession()

  // 2. Fetch resource with ownership info
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: { client: true }
  })

  if (!milestone) {
    return { error: 'Milestone not found' }
  }

  // 3. Authorization check
  if (userRole === 'CLIENT' && milestone.client.userId !== userId) {
    return { error: 'Unauthorized' }
  }

  // 4. Perform mutation
  await prisma.milestone.update({
    where: { id: milestoneId },
    data: {
      progress,
      updatedAt: new Date(),
      ...(progress === 100 && !milestone.completedAt
        ? { completedAt: new Date(), status: 'COMPLETED' }
        : {}
      )
    }
  })

  // 5. Revalidate cache
  revalidatePath('/dashboard/progress')
  revalidatePath('/dashboard')

  return { success: true }
}
```

### NextAuth Callbacks for Role-Based Access
```typescript
// lib/auth.ts (already exists, needs role in callbacks)
// Source: https://authjs.dev/guides/role-based-access-control
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { clientProfile: true },
        })

        if (!user) {
          return null
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isValidPassword) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role, // Include role in return
          image: user.image,
        }
      },
    }),
  ],
  callbacks: {
    // JWT callback - persist role in token
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    // Session callback - expose role to session
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Page-level auth checks | Data Access Layer pattern | Next.js 13+ App Router | Centralized, prevents auth bypass via direct API calls |
| getServerSideProps auth | Server Components + `auth()` | Next.js 13+ | Simpler syntax, better performance with streaming |
| API routes for all data | Server Actions for mutations | Next.js 13+ | Type-safe, automatic serialization, less boilerplate |
| Custom middleware wrappers | React `cache()` memoization | React 18+ | Built-in deduplication, no custom cache logic needed |
| NextAuth v4 | NextAuth v5 (Auth.js) | 2024 | Better TypeScript support, simpler API, Edge runtime support |

**Deprecated/outdated:**
- **getServerSideProps for auth:** Use Server Components with `auth()` helper instead
- **Custom HOCs for protected pages:** Use middleware for redirects + DAL for data access
- **API routes returning full user objects:** Use Data Transfer Objects (DTOs) to return only necessary fields
- **Client-side only session checks:** Always verify on server, client checks are only for UX

## Open Questions

Things that couldn't be fully resolved:

1. **Should we implement PostgreSQL RLS for defense-in-depth?**
   - What we know: RLS provides database-level security as a second layer
   - What's unclear: Whether the added complexity is worth it for 1-5 clients initially
   - Recommendation: Start with DAL filtering (simpler, sufficient), add RLS later if scaling to 50+ clients or if compliance requires database-level controls

2. **How to handle admin impersonation for support?**
   - What we know: Admin needs to view client dashboards for troubleshooting
   - What's unclear: Best pattern for "view as client" without compromising security
   - Recommendation: Admin routes show all clients in separate admin interface; avoid session switching which creates audit trail issues

3. **Should client's clientId be stored in session token?**
   - What we know: Would reduce database queries by avoiding clientId lookup per request
   - What's unclear: Security implications of including clientId in JWT payload
   - Recommendation: Keep clientId out of token; query from database using `cache()` to deduplicate. More secure and handles edge cases (client profile deleted, role changed)

## Sources

### Primary (HIGH confidence)
- [Auth.js Role-Based Access Control Guide](https://authjs.dev/guides/role-based-access-control) - Official RBAC pattern with JWT/session callbacks
- [Next.js Authentication Guide](https://nextjs.org/docs/app/guides/authentication) - Official Data Access Layer pattern, session verification, authorization
- [Next.js Data Security Guide](https://nextjs.org/docs/app/guides/data-security) - Official security best practices for App Router
- [Prisma Client Extensions](https://www.prisma.io/blog/client-extensions-preview-8t3w27xkrxxn) - Official multi-tenant filtering patterns

### Secondary (MEDIUM confidence)
- [Postgres RLS Implementation Guide - Permit.io](https://www.permit.io/blog/postgres-rls-implementation-guide) - Detailed RLS patterns and pitfalls
- [Common Postgres Row-Level-Security footguns - Bytebase](https://www.bytebase.com/blog/postgres-row-level-security-footguns/) - Common RLS mistakes
- [Multi-tenant data isolation with PostgreSQL Row Level Security - AWS](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/) - Enterprise RLS patterns
- [Next.js Data Access Layer Explained - Ayush Sharma](https://aysh.me/blogs/data-access-layer-nextjs) - DAL architecture breakdown
- [How to Think About Security in Next.js - Vercel](https://nextjs.org/blog/security-nextjs-server-components-actions) - Security mental models

### Tertiary (LOW confidence)
- [ZenStack Multi-Tenancy with Prisma](https://zenstack.dev/blog/multi-tenant) - Alternative library-based approach
- [Multi-tenancy with Prisma WHERE required - Medium](https://medium.com/@kz-d/multi-tenancy-with-prisma-a-new-approach-to-making-where-required-1e93a3783d9d) - Type-safe filtering enforcement
- Various GitHub discussions on NextAuth v5 middleware patterns - Community solutions, not official

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and in active use; NextAuth v5 and Prisma are industry standard
- Architecture: HIGH - Data Access Layer pattern is officially recommended by Next.js team; verified with official docs
- Pitfalls: MEDIUM - Combination of official sources and community experiences; some are context-specific

**Research date:** 2026-02-13
**Valid until:** 2026-03-15 (30 days for stable ecosystem)
