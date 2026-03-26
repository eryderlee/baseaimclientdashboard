# Phase 19: Admin Preview + Status Badge - Research

**Researched:** 2026-03-26
**Domain:** Next.js App Router admin impersonation, cookie-based preview mode, DAL extension for admin-as-client access
**Confidence:** HIGH (codebase read directly; Next.js 16 docs fetched from official source)

---

## Summary

Phase 19 has two independent goals: (1) let admin browse all `/dashboard/*` pages as a specific client, with a sticky "Viewing as [Client Name]" banner and an "Exit Preview" button; and (2) show a setup completion badge ("Setup Complete" / "Setting Up") per client in the admin client list table.

**The preview system already exists at 50% completion.** `/admin/preview/[clientId]/page.tsx` already fetches client data, renders a `DashboardOverview` component with a yellow admin banner, and links back to `/admin`. The gap is that only the home page (`DashboardOverview`) is previewable — progress, analytics, billing, and documents pages are not. Those pages call DAL functions that check `userRole !== 'CLIENT'` and throw, because the logged-in user is ADMIN.

The cleanest architecture for full preview is a **cookie-based preview session** combined with **DAL extension**. When admin navigates to `/admin/preview/[clientId]`, a Server Action sets an `admin_preview_clientId` cookie. All `/dashboard/*` pages and their DAL calls check for this cookie and, when present, use the stored `clientId` instead of the session's `userId`. The dashboard layout reads the cookie to conditionally render the preview banner. A Server Action clears the cookie on "Exit Preview".

**The status badge is straightforward.** The admin page already fetches all clients with all their milestones via `getAllClientsWithMilestones()`. Since every client has exactly 6 milestones (order 1–6), "Setup Complete" = all 6 milestones have status `COMPLETED`. This is a pure compute addition with no new DB queries — derive it in the data processing step and pass it as a new field on `ClientData`.

**Primary recommendation:** Use an `httpOnly` cookie (`admin_preview_clientId`) set via Server Action, read via `cookies()` in Server Components and DAL, and cleared via another Server Action. This avoids session impersonation, works with React `cache()`, and requires no middleware/proxy.

---

## Standard Stack

No new libraries are needed. This phase uses only what already exists.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next/headers` (cookies) | 16.1.6 | Read cookie in Server Components and DAL | Built-in, async, works in server context |
| NextAuth `auth()` | 5.0.0-beta.30 | Verify admin is authenticated before preview | Already used throughout |
| Prisma | existing | Fetch client data by explicit clientId | Already used in DAL |
| `next/navigation` redirect | 16.1.6 | Exit preview redirect | Already used |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React `cache()` | 18 | Deduplicate preview clientId read | Wrap preview cookie reader as cached helper |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Cookie approach | URL query param (`?preview=clientId`) on every dashboard page | Query params would pollute every URL, require passing through layouts, break on direct navigation |
| Cookie approach | Actual session impersonation (signing in as client) | Requires logging out admin; breaks admin's own session; security risk |
| Cookie approach | `x-preview-client-id` request header set in proxy.ts | Requires creating proxy.ts (does not exist); adds complexity; cookies are simpler to read/clear |
| Cookie approach | In-memory/server-side store | Doesn't survive page navigations; stateless server model |

**Installation:** None required.

---

## Architecture Patterns

### Recommended Project Structure
```
app/
├── admin/
│   ├── preview/
│   │   └── [clientId]/
│   │       └── page.tsx              ← Already exists; add "start preview" Server Action call here
├── dashboard/
│   ├── layout.tsx                    ← Add preview banner here (reads cookie)
│   ├── page.tsx                      ← No change needed (already renders DashboardOverview)
│   ├── progress/page.tsx             ← No change needed once DAL is patched
│   ├── analytics/page.tsx            ← No change needed once DAL is patched
│   ├── billing/page.tsx              ← No change needed once DAL is patched
│   └── documents/page.tsx            ← No change needed once DAL is patched
lib/
├── dal.ts                            ← Add getPreviewClientId(), patch getCurrentClientId()
├── preview-actions.ts (new)          ← Server Actions: startPreview(), exitPreview()
components/
├── dashboard/
│   └── preview-banner.tsx (new)      ← Client component: sticky banner + Exit Preview button
├── admin/
│   └── client-analytics-table.tsx   ← Add setupStatus field + badge column
```

### Pattern 1: Cookie-Based Preview Mode

**What:** Admin triggers a Server Action that sets an `httpOnly` cookie (`admin_preview_clientId=<id>`). All subsequent requests to `/dashboard/*` carry this cookie. DAL functions read it and short-circuit their normal session-based clientId lookup.

**When to use:** When admin navigates to `/admin/preview/[clientId]`.

**How the flow works:**
1. Admin visits `/admin/preview/[clientId]/page.tsx`
2. This page (already exists) renders `DashboardOverview` + banner with "View Full Dashboard" link
3. **New:** The page also calls `startPreview(clientId)` Server Action which sets the cookie, then redirects admin to `/dashboard`
4. `/dashboard/layout.tsx` reads the cookie → renders sticky `PreviewBanner` with client name + Exit button
5. All `/dashboard/*` pages call DAL functions as normal — DAL now checks preview cookie first
6. Admin clicks "Exit Preview" → calls `exitPreview(returnUrl)` Server Action which clears cookie, redirects to `/admin`

**Key implementation note:** `cookies()` can only be SET in Server Actions/Route Handlers, but can be READ in Server Components. The DAL (`lib/dal.ts`) runs server-side and can import `cookies` from `next/headers` to read the preview cookie.

**Example — Server Action:**
```typescript
// lib/preview-actions.ts
'use server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export async function startPreview(clientId: string, returnTo?: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') throw new Error('Unauthorized')

  const cookieStore = await cookies()
  cookieStore.set('admin_preview_clientId', clientId, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    // No maxAge — session cookie, cleared when browser closes or on Exit Preview
  })

  redirect('/dashboard')
}

export async function exitPreview(returnTo: string = '/admin') {
  const cookieStore = await cookies()
  cookieStore.delete('admin_preview_clientId')
  redirect(returnTo)
}
```

**Example — Patched `getCurrentClientId()` in DAL:**
```typescript
// lib/dal.ts (modified)
import { cookies } from 'next/headers'

export const getCurrentClientId = cache(async () => {
  const { userId, userRole } = await verifySession()

  // Admin preview mode: use the preview clientId from cookie
  if (userRole === 'ADMIN') {
    const cookieStore = await cookies()
    const previewClientId = cookieStore.get('admin_preview_clientId')?.value
    if (previewClientId) return previewClientId
    return null  // non-preview admin access — no clientId (existing behavior)
  }

  const client = await prisma.client.findUnique({
    where: { userId },
    select: { id: true },
  })

  if (!client) throw new Error('Client profile not found')
  return client.id
})
```

**Example — Dashboard layout reads cookie for banner:**
```typescript
// app/dashboard/layout.tsx (modified)
import { cookies } from 'next/headers'

export default async function DashboardLayout({ children }) {
  const cookieStore = await cookies()
  const previewClientId = cookieStore.get('admin_preview_clientId')?.value

  let previewClient = null
  if (previewClientId) {
    previewClient = await prisma.client.findUnique({
      where: { id: previewClientId },
      select: { companyName: true },
    })
  }

  return (
    <div>
      {previewClient && (
        <PreviewBanner clientName={previewClient.companyName} />
      )}
      <DashboardNav ... />
      <main>{children}</main>
    </div>
  )
}
```

### Pattern 2: DAL Functions That Need Patching

The following CLIENT-only DAL functions call `getCurrentClientId()` and will "just work" once `getCurrentClientId()` is patched:

- `getMilestones()` — used by progress, home
- `getClientBillingData()` / `getClientInvoices()` — used by billing
- `getClientRecentDocuments()` / `getClientDashboardProfile()` — used by home
- `getRecentActivities()` — used by home

The following CLIENT-only DAL functions do NOT call `getCurrentClientId()` — they check `userRole !== 'CLIENT'` directly and will throw in preview mode:

- `getClientAdConfig()` — checks `userRole !== 'CLIENT'` explicitly, used by all FB functions
- `getClientFbInsights()`, `getClientFbCampaigns()`, `getClientFbPlatformBreakdown()`, `getClientFbDailyInsights()`, `getClientFbDailyTrend()` — each checks `userRole !== 'CLIENT'`
- `getClientAnalytics()` — checks session role

These functions need an additional fix: check for the preview cookie before rejecting ADMIN role.

**Helper to extract:**
```typescript
export const getPreviewClientId = cache(async (): Promise<string | null> => {
  const cookieStore = await cookies()
  return cookieStore.get('admin_preview_clientId')?.value ?? null
})
```

Then each `if (userRole !== 'CLIENT')` check becomes:
```typescript
const { userRole } = await verifySession()
const previewClientId = await getPreviewClientId()
if (userRole !== 'CLIENT' && !previewClientId) {
  throw new Error('Unauthorized: Client access required')
}
// If previewClientId, use it instead of looking up from session
```

**Documents page special case:** `app/dashboard/documents/page.tsx` does NOT use the DAL — it calls `prisma` directly via `session?.user?.id`. This page needs explicit preview handling: check cookie, if set, fetch documents by clientId instead.

### Pattern 3: Status Badge Derivation

**What:** Every client has exactly 6 milestones (order 1–6, created from `STANDARD_MILESTONES` template). "Setup Complete" = all 6 milestones have `status === 'COMPLETED'`.

**Where to compute:** In `getAdminData()` in `app/admin/page.tsx`, which already maps `client.milestones`. Add `setupStatus` to the processed client object.

**Example:**
```typescript
// In app/admin/page.tsx — getAdminData()
const isSetupComplete = client.milestones.length === 6 &&
  client.milestones.every((m) => m.status === 'COMPLETED')

return {
  ...existingFields,
  setupStatus: isSetupComplete ? 'complete' : 'setting-up',
}
```

**In `ClientAnalyticsTable`:** Add `setupStatus` to `ClientData` interface, render a `Badge` in a new column or adjacent to the company name.

**Badge design recommendation:**
- `'complete'` → green Badge: "Setup Complete"
- `'setting-up'` → gray/secondary Badge: "Setting Up"

**No new DB query needed.** `getAllClientsWithMilestones()` already returns all milestones per client.

### Anti-Patterns to Avoid

- **Do not use `redirect()` inside `getCurrentClientId()`**: redirects from DAL functions are unexpected. The DAL should return null/throw, and pages handle redirection.
- **Do not skip `verifySession()`**: preview mode must still verify the ADMIN is authenticated. Never bypass auth.
- **Do not store clientId in a non-httpOnly cookie**: it's not a secret but httpOnly prevents XSS abuse.
- **Do not use `unstable_cache` for the preview clientId read**: preview state changes per-request and is session-specific. Use React `cache()` only.
- **Do not implement preview by creating a temporary CLIENT session**: would log admin out.
- **Do not add `?previewClientId=` to dashboard URLs**: query params would need to be threaded through every `Link` and every Server Component prop chain.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cookie set/clear | Custom API route for cookie management | Server Actions with `cookies()` from `next/headers` | App Router pattern; co-located with usage; no extra round-trip |
| Preview state | Global server-side store or DB table | `httpOnly` session cookie | Cookies are request-scoped, zero infrastructure |
| Status badge logic | Separate DB query for setup milestones | Derive from existing `milestones` array in `getAllClientsWithMilestones()` | Data already fetched; no N+1 risk |

**Key insight:** Preview mode doesn't require session impersonation — it only requires knowing which `clientId` to query. All DAL functions already accept `clientId` as a parameter (admin functions) or derive it from session (client functions). The cookie is just a way to pass that `clientId` into client-mode DAL functions without changing the session.

---

## Common Pitfalls

### Pitfall 1: React cache() Breaks Cookie Isolation Between Requests
**What goes wrong:** `getCurrentClientId` is wrapped in React `cache()`. If the same server process handles two concurrent requests (one preview, one normal), caching could leak the preview clientId across requests.
**Why it happens:** React `cache()` is request-scoped per React render tree, not process-scoped. This is safe.
**How to avoid:** React `cache()` creates a new cache per request. No action needed. Verified by understanding that `cache()` is per-render-pass, not global.
**Warning signs:** None — this is not actually a problem, just a common misunderstanding.

### Pitfall 2: Documents Page Bypasses DAL
**What goes wrong:** `app/dashboard/documents/page.tsx` imports `auth()` and `prisma` directly — it does NOT use any DAL function that `getCurrentClientId()` feeds. Preview mode won't work there.
**Why it happens:** The documents page was built differently from other pages.
**How to avoid:** Either (a) migrate documents page to use a new DAL function `getClientDocuments(clientId)`, or (b) add preview cookie check inline on the documents page. Option (a) is cleaner and consistent with the DAL pattern.
**Warning signs:** Documents page shows admin's documents (none) instead of client's documents during preview.

### Pitfall 3: Analytics Page FB Functions Throw on ADMIN Role
**What goes wrong:** All `getClientFb*` functions throw `'Unauthorized: Client access required'` when `userRole !== 'CLIENT'`. Preview mode admin hits analytics page → crash.
**Why it happens:** Each FB function independently checks role with no preview fallback.
**How to avoid:** Add `getPreviewClientId()` check to each FB function, using preview clientId for the FB API call when present. Or gracefully return `null` (show "not configured" state) for FB data during preview — simpler and still useful.
**Warning signs:** 500 error on `/dashboard/analytics` during preview.

### Pitfall 4: Exit Preview Doesn't Return to Correct Admin Page
**What goes wrong:** Admin was on `/admin/clients/abc123` (the milestone edit page), clicked "View as client" from there, previewed, clicked Exit — lands on `/admin` instead.
**Why it happens:** Exit Preview calls `redirect('/admin')` hardcoded.
**How to avoid:** Pass `returnTo` URL as part of preview start. Store it either in the cookie value or as a second cookie. Then exit redirects to stored URL.
**Implementation:** Store as `admin_preview_return_to` cookie alongside `admin_preview_clientId`. Or encode returnTo in the cookie value as JSON.
**Warning signs:** Admin loses their navigation context every time they preview.

### Pitfall 5: Preview Cookie Survives Browser Sessions Unexpectedly
**What goes wrong:** Admin sets preview cookie, closes tab, reopens site — still in preview mode as client.
**Why it happens:** Cookie was set with `maxAge` or `expires`, making it persistent.
**How to avoid:** Set cookie WITHOUT `maxAge` or `expires` — this makes it a session cookie, cleared when browser closes.
**Warning signs:** Admin accidentally sees client view on next login.

### Pitfall 6: Next.js 16 Renamed middleware.ts to proxy.ts
**What goes wrong:** Developer creates `middleware.ts` following pre-16 docs — Next.js 16 now uses `proxy.ts`.
**Why it happens:** Next.js 16.0.0 deprecated and renamed the file convention.
**How to avoid:** This phase does NOT need middleware/proxy at all (using cookies + Server Actions instead), so this is not a concern for the implementation. Just be aware if middleware is added later.
**Warning signs:** N/A — middleware is not needed for this approach.

---

## Code Examples

Verified patterns from official sources (Next.js 16.2.1 docs, fetched 2026-03-25):

### Setting a Cookie in a Server Action
```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/cookies
'use server'
import { cookies } from 'next/headers'

export async function startPreview(clientId: string) {
  const cookieStore = await cookies()
  cookieStore.set('admin_preview_clientId', clientId, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    // No maxAge = session cookie (cleared on browser close)
  })
}
```

### Reading a Cookie in a Server Component
```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/cookies
import { cookies } from 'next/headers'

export default async function Layout({ children }) {
  const cookieStore = await cookies()
  const previewClientId = cookieStore.get('admin_preview_clientId')?.value
  // Use previewClientId to conditionally render banner
}
```

### Deleting a Cookie in a Server Action
```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/cookies
'use server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function exitPreview(returnTo: string = '/admin') {
  const cookieStore = await cookies()
  cookieStore.delete('admin_preview_clientId')
  cookieStore.delete('admin_preview_return_to')
  redirect(returnTo)
}
```

### Setting a Request Header in proxy.ts (NOT used for this phase, documented for reference)
```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
// Note: middleware.ts is renamed to proxy.ts in Next.js 16
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-preview-client-id', 'some-id')
  return NextResponse.next({ request: { headers: requestHeaders } })
}
```

### Status Badge Derivation (No New DB Query)
```typescript
// In getAdminData() — app/admin/page.tsx
// All 6 milestones with COMPLETED status = setup complete
const isSetupComplete =
  client.milestones.length === 6 &&
  client.milestones.every((m) => m.status === 'COMPLETED')

const setupStatus = isSetupComplete ? 'complete' : 'setting-up'
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` | `proxy.ts` (renamed) | Next.js 16.0.0 | File must be named `proxy.ts` in new projects; codemod available |
| `cookies()` synchronous | `cookies()` async (returns Promise) | Next.js 15.0.0-RC | Must `await cookies()` — already used correctly in this codebase |
| Session impersonation | Cookie-based preview state | N/A (pattern choice) | No logout required; admin session preserved |

**Deprecated/outdated:**
- `middleware.ts`: renamed to `proxy.ts` in Next.js 16. This project does not have a middleware/proxy file yet — if one is created, it must be named `proxy.ts`.

---

## Open Questions

1. **Should FB analytics show real client data or "not configured" state during preview?**
   - What we know: FB DAL functions throw on ADMIN role; preview admin has no adAccountId in session; fetching real FB data would require patching 5+ DAL functions to accept explicit clientId
   - What's unclear: Whether the business value of showing real FB data during preview justifies the implementation complexity
   - Recommendation: Show graceful "not configured" state for FB analytics during preview (return null from FB functions when previewClientId is present but FB API is not being called with admin-owned account). This is consistent with how the existing `/admin/preview/[clientId]/page.tsx` already passes `fbDailyData={null}` and `isFbConfigured={false}`.

2. **Should the "View as client" button be on the admin client list table or only on the individual client page?**
   - What we know: The table already has an `Eye` / "View" button linking to `/admin/preview/[clientId]`. The existing preview page only shows the home dashboard. The success criterion says admin clicks "View as client" on client's admin page.
   - What's unclear: Whether the trigger should remain at `/admin/preview/[clientId]` (which then starts the full preview via cookie + redirect to `/dashboard`) or be a direct button in the table
   - Recommendation: Keep the existing "View" link in the table. Modify the `/admin/preview/[clientId]/page.tsx` to call `startPreview(clientId)` and redirect to `/dashboard` instead of rendering an inline dashboard preview.

3. **How many milestones define "setup complete" if a client gets extra milestones added?**
   - What we know: `STANDARD_MILESTONES` always creates exactly 6 milestones (order 1–6). There is no schema field marking milestones as "setup" vs "ongoing."
   - What's unclear: Whether admins can add extra milestones (order 7+) and whether those should affect the badge
   - Recommendation: "Setup Complete" = first 6 milestones (by order, 1-6) all have status `COMPLETED`. Use `milestones.slice(0, 6).every(m => m.status === 'COMPLETED')` after sorting by order. This is future-proof if extra milestones are added.

---

## Sources

### Primary (HIGH confidence)
- https://nextjs.org/docs/app/api-reference/functions/cookies (fetched 2026-03-25, version 16.2.1) — cookies API, set/delete in Server Actions, read in Server Components
- https://nextjs.org/docs/app/api-reference/file-conventions/proxy (fetched 2026-03-25, version 16.2.1) — middleware renamed to proxy in Next.js 16, cookie manipulation in proxy
- Direct codebase reading — `lib/dal.ts`, `lib/auth.ts`, `app/dashboard/layout.tsx`, `app/admin/preview/[clientId]/page.tsx`, `app/dashboard/documents/page.tsx`, `components/admin/client-analytics-table.tsx`, `prisma/seed-milestones.ts`, `prisma/schema.prisma`

### Secondary (MEDIUM confidence)
- None required — all claims verified directly from official docs or codebase

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all verified from existing codebase
- Architecture: HIGH — cookie set/read pattern verified from official Next.js 16 docs; DAL patching approach derived from direct code reading
- Pitfalls: HIGH for pitfalls 2/3/4/5 (derived from direct code reading); HIGH for pitfall 6 (verified from official docs); MEDIUM for pitfall 1 (React cache() scoping is well-understood but not re-verified from docs for this session)

**Research date:** 2026-03-26
**Valid until:** 2026-04-25 (Next.js releases frequently; core cookie API stable, proxy.ts rename is current)
