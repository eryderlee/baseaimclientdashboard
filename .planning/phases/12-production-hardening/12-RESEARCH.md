# Phase 12: Production Hardening - Research

**Researched:** 2026-02-22
**Domain:** Security, Monitoring, Error Handling, Loading States, Environment Validation
**Confidence:** HIGH (core patterns), MEDIUM (CSP specifics), LOW (Sentry+Turbopack edge cases)

---

## Summary

Phase 12 covers eight production-hardening requirements: Sentry error monitoring, loading states, rate limiting on auth, CSRF verification, Zod validation audit, security headers, error boundaries, and env var validation. The project runs Next.js 16.1.6 with Turbopack, next-auth v5 beta, and is deployed on Vercel.

The standard approach for each requirement is well-established in the Next.js 16 ecosystem. Sentry v10.x supports Turbopack natively via OpenTelemetry rather than Webpack loaders. Security headers go in `next.config.ts` via the `headers()` function. CSP nonce-based implementation forces dynamic rendering — for this internal dashboard that is acceptable. Rate limiting on auth endpoints uses `@upstash/ratelimit` in middleware. Error boundaries use Next.js file conventions (`error.tsx` / `global-error.tsx`). Env validation uses `@t3-oss/env-nextjs`. Loading states use `loading.tsx` files or inline `<Suspense>` with the existing `shadcn/ui` `Skeleton` component (already installed).

**Primary recommendation:** Implement each requirement as a self-contained task, starting with Sentry (needed before other items so errors are tracked), then security headers, then the rest in parallel-friendly order.

---

## Standard Stack

### Core Libraries to Install

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@sentry/nextjs` | 10.39.0 (latest) | Error monitoring | Official Sentry SDK for Next.js with App Router, Turbopack support |
| `@upstash/ratelimit` | 2.0.8 (latest) | Rate limiting | Serverless-native, edge-compatible, sliding window algorithm |
| `@upstash/redis` | 1.36.2 (latest) | Redis client for Upstash | Required peer for ratelimit, REST-based (works on Vercel edge) |
| `@t3-oss/env-nextjs` | 0.13.10 (latest) | Env var validation | Type-safe, validates at build time, Next.js-aware |

### Already Present (No Install Needed)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `zod` | 4.3.6 | Schema validation | Already used in actions, schemas directory |
| `shadcn/ui Skeleton` | — | Loading skeleton UI | `components/ui/skeleton.tsx` exists |
| Next.js `error.tsx` | Built-in | Error boundaries | File-system convention, no install |
| Next.js `loading.tsx` | Built-in | Loading states | File-system convention, no install |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@upstash/ratelimit` | Vercel WAF rate limiting | WAF is configuration-only, no code changes, but requires paid Vercel plan and is less granular |
| `@t3-oss/env-nextjs` | Manual Zod env validation | Manual works but requires more boilerplate and misses Next.js NEXT_PUBLIC_ split |
| Nonce-based CSP | Static CSP with `'unsafe-inline'` | Nonce is stricter but forces dynamic rendering; `'unsafe-inline'` is weaker but simpler for internal dashboards |
| `@sentry/nextjs` wizard | Manual setup | Wizard is faster but manual gives full control over file contents |

**Installation:**

```bash
npm install @sentry/nextjs @upstash/ratelimit @upstash/redis @t3-oss/env-nextjs
```

Also requires Upstash Redis database creation (free tier available at upstash.com).

---

## Architecture Patterns

### Recommended File Structure for Phase 12

```
/                                  # Project root
├── instrumentation.ts             # NEW: Sentry server/edge registration
├── instrumentation-client.ts      # NEW: Sentry client-side init
├── sentry.server.config.ts        # NEW: Sentry server config
├── sentry.edge.config.ts          # NEW: Sentry edge config
├── middleware.ts                  # MODIFIED: add rate limiting
├── next.config.ts                 # MODIFIED: withSentryConfig + security headers
├── lib/
│   └── env.ts                     # NEW: @t3-oss/env-nextjs validation
└── app/
    ├── global-error.tsx           # NEW: Sentry-integrated global error boundary
    ├── error.tsx                  # NEW: App-level error boundary (non-root)
    ├── dashboard/
    │   ├── loading.tsx            # NEW: Dashboard loading skeleton
    │   ├── error.tsx              # NEW: Dashboard error boundary
    │   ├── analytics/loading.tsx  # NEW: Analytics loading skeleton
    │   ├── billing/loading.tsx    # NEW: Billing loading skeleton
    │   └── ...
    └── admin/
        ├── loading.tsx            # NEW: Admin loading skeleton
        ├── error.tsx              # NEW: Admin error boundary
        └── ...
```

### Pattern 1: Sentry Setup with Next.js 16 Turbopack

**What:** Sentry v10 uses OpenTelemetry (not Webpack loaders) for instrumentation in Turbopack mode. The `withSentryConfig` wrapper is still required in `next.config.ts` for source map uploads and build-time configuration.

**When to use:** All environments (guarded by DSN env var being set in production).

**Source:** https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/ and https://blog.sentry.io/turbopack-support-next-js-sdk/

```typescript
// instrumentation.ts (project root)
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
```

```typescript
// sentry.server.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  environment: process.env.NODE_ENV,
});
```

```typescript
// instrumentation-client.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [Sentry.replayIntegration()],
  environment: process.env.NODE_ENV,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
```

```typescript
// next.config.ts (MODIFIED)
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ... existing config ...
  async headers() {
    return [/* security headers - see pattern 3 */];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  // Turbopack: autoInstrumentServerFunctions is a no-op, OpenTelemetry handles it
});
```

```tsx
// app/global-error.tsx
"use client";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div>
          <h2>Something went wrong</h2>
          <button onClick={() => reset()}>Try again</button>
        </div>
      </body>
    </html>
  );
}
```

### Pattern 2: Rate Limiting in Middleware (Auth Endpoints Only)

**What:** Rate limiting applied in middleware at the edge, keyed by IP address, targeting only login/auth endpoints. Uses sliding window algorithm (allows burst, tracks over rolling window). Upstash Redis stores the counter state.

**Source:** https://upstash.com/blog/edge-rate-limiting

**Important:** The existing `middleware.ts` handles auth routing. Rate limiting must be added to it without breaking existing logic — run rate limiting check first, then fall through to existing auth routing.

```typescript
// middleware.ts (MODIFIED - add rate limiting to auth routes)
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { auth } from "@/lib/auth";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 10 attempts per 60 seconds per IP on auth endpoints
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60 s"),
});

const authRoutes = ["/login", "/reset-password", "/api/auth"];

export default auth(async (req) => {
  // Rate limit only auth-related routes
  const isAuthRoute = authRoutes.some((route) =>
    req.nextUrl.pathname.startsWith(route)
  );

  if (isAuthRoute) {
    const ip = req.ip ?? req.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const { success } = await ratelimit.limit(`auth_${ip}`);

    if (!success) {
      return new NextResponse("Too many requests. Please try again later.", {
        status: 429,
        headers: { "Retry-After": "60" },
      });
    }
  }

  // Existing auth routing logic continues below...
  const isLoggedIn = !!req.auth;
  // ... rest of existing middleware
});
```

**Caveats:**
- Requires `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` env vars
- Upstash free tier: 10,000 requests/day — adequate for this use case
- Middleware runs on Vercel Edge runtime where `@upstash/redis` REST API works correctly

### Pattern 3: Security Headers in next.config.ts

**What:** Add HTTP security headers to all routes via Next.js `headers()` config. CSP approach: static (with `'unsafe-inline'`) rather than nonce-based — nonce forces dynamic rendering of all pages which is a significant performance cost for an internal dashboard where the security tradeoff doesn't justify it.

**Source:** https://nextjs.org/docs/app/api-reference/config/next-config-js/headers (official docs, updated 2026-02-20)

```typescript
// In next.config.ts headers() function:
const isDev = process.env.NODE_ENV === "development";

const cspHeader = [
  "default-src 'self'",
  // unsafe-inline needed for Next.js App Router inline scripts/styles
  // unsafe-eval needed in dev for React debugging
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Allow images from self, data URIs, blob (for dynamic content)
  "img-src 'self' blob: data:",
  // Google Fonts if used
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // frame-ancestors replaces X-Frame-Options
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "Content-Security-Policy", value: cspHeader },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
        // HSTS: 2 years, include subdomains, preload
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "X-DNS-Prefetch-Control", value: "on" },
      ],
    },
  ];
}
```

**CSP note:** The `connect-src` directive may need to include Sentry's ingest URL once DSN is known: `connect-src 'self' https://*.sentry.io`. Verify after Sentry is configured.

### Pattern 4: Error Boundaries (File Convention)

**What:** Next.js App Router uses file-system error boundaries. `error.tsx` catches errors in that route segment; `global-error.tsx` catches errors in the root layout itself. Both MUST be `'use client'` components.

**Source:** https://nextjs.org/docs/app/getting-started/error-handling (official docs, 2026-02-20)

```tsx
// app/dashboard/error.tsx (and similar for admin/error.tsx)
"use client";
import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
    // Sentry captures automatically via onRequestError in instrumentation.ts
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred"}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
      >
        Try again
      </button>
    </div>
  );
}
```

### Pattern 5: Loading States with loading.tsx

**What:** `loading.tsx` files wrap the `page.tsx` in a React Suspense boundary automatically. Uses the existing `Skeleton` component from `components/ui/skeleton.tsx`.

**Source:** https://nextjs.org/docs/app/api-reference/file-conventions/loading (official docs, 2026-02-20)

```tsx
// app/dashboard/loading.tsx (example — customize shape per page)
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
      {/* Content area */}
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}
```

**Required loading files** (one per route segment that fetches data):
- `app/dashboard/loading.tsx`
- `app/dashboard/analytics/loading.tsx`
- `app/dashboard/billing/loading.tsx`
- `app/dashboard/progress/loading.tsx`
- `app/dashboard/documents/loading.tsx`
- `app/dashboard/settings/loading.tsx`
- `app/dashboard/chat/loading.tsx`
- `app/admin/loading.tsx`
- `app/admin/clients/[clientId]/loading.tsx`

### Pattern 6: Environment Variable Validation

**What:** `@t3-oss/env-nextjs` creates a type-safe env object that validates all vars at build time and startup. Import it in `next.config.ts` so missing vars fail builds before deployment.

**Source:** https://env.t3.gg/docs/nextjs

```typescript
// lib/env.ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    // Database
    DATABASE_URL: z.string().url(),
    // Auth
    AUTH_SECRET: z.string().min(32),
    // Stripe — validate it's a live key in production
    STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
    // Email
    RESEND_API_KEY: z.string().min(1),
    RESEND_FROM_EMAIL: z.string().email().optional(),
    // Google Drive
    GOOGLE_OAUTH_CLIENT_ID: z.string().min(1),
    GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1),
    GOOGLE_OAUTH_REFRESH_TOKEN: z.string().min(1),
    GOOGLE_DRIVE_ROOT_FOLDER_ID: z.string().min(1),
    // Upstash (rate limiting)
    UPSTASH_REDIS_REST_URL: z.string().url(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
    // Sentry
    SENTRY_DSN: z.string().url().optional(),
    SENTRY_ORG: z.string().optional(),
    SENTRY_PROJECT: z.string().optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_").optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    GOOGLE_OAUTH_CLIENT_ID: process.env.GOOGLE_OAUTH_CLIENT_ID,
    GOOGLE_OAUTH_CLIENT_SECRET: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    GOOGLE_OAUTH_REFRESH_TOKEN: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
    GOOGLE_DRIVE_ROOT_FOLDER_ID: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_ORG: process.env.SENTRY_ORG,
    SENTRY_PROJECT: process.env.SENTRY_PROJECT,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
});
```

```typescript
// next.config.ts (add import at top to trigger validation)
import "./lib/env";
```

**Stripe key validation:** PROD-08 requires no test keys in production. Use `.refine()`:
```typescript
STRIPE_SECRET_KEY: z.string()
  .startsWith("sk_")
  .refine(
    (key) => process.env.NODE_ENV !== "production" || key.startsWith("sk_live_"),
    { message: "Production requires a live Stripe key (sk_live_...)" }
  ),
```

### Pattern 7: CSRF Verification for Server Actions

**What:** Next.js 14+ Server Actions have built-in CSRF protection: POST-only, Origin vs Host header comparison. This is automatic — no code changes needed for the verification task. The task is to AUDIT and DOCUMENT that protection is in place, not to add tokens.

**Source:** https://nextjs.org/blog/security-nextjs-server-components-actions (official Next.js security blog)

Key facts:
1. Server Actions only accept POST requests — GET-based CSRF impossible
2. Next.js compares `Origin` header to `Host`/`X-Forwarded-Host` and rejects mismatches
3. next-auth v5 beta sessions use `SameSite: lax` cookies — blocks cross-origin POSTs in modern browsers
4. Custom Route Handlers (`route.tsx`) do NOT have this protection — but this project has no such handlers exposing mutations

The CSRF verification task is: confirm no `route.tsx` files exist that accept POST mutations without protection, and confirm `serverActions.allowedOrigins` is configured if needed.

```bash
# Audit command: find all route handlers
find app -name "route.ts" -o -name "route.tsx" 2>/dev/null
```

### Pattern 8: Zod Audit for All Server Actions

**What:** Systematically verify every 'use server' file validates its inputs with Zod.

**Current state of Zod usage:**
- `app/actions/auth.ts` — HAS Zod schemas (requestResetSchema, resetPasswordSchema, changePasswordSchema)
- `app/actions/billing.ts` — HAS Zod schemas (InvoiceItemSchema, CreateInvoiceSchema, StartSubscriptionSchema)
- `app/admin/actions.ts` — Uses schemas from `lib/schemas/client.ts` (createClientSchema, updateClientSchema)
- `app/admin/clients/[clientId]/actions.ts` — HAS inline Zod schema (MilestoneUpdateSchema)
- `app/admin/settings/actions.ts` — Uses schemas from `lib/schemas/settings.ts` (chatSettingsSchema, fbSettingsSchema)

**Missing Zod validation (identified during research):**
- `app/admin/actions.ts` - `resetClientPassword(clientId, newPassword)`: uses manual length check, not Zod
- `app/admin/actions.ts` - `toggleClientStatus(clientId)`: no validation of `clientId` format

These are low-risk (admin-only, DAL auth check comes first) but should be brought in line.

### Anti-Patterns to Avoid

- **Nonce-based CSP for this project:** Forces dynamic rendering on all pages, disabling ISR/static optimization. The performance cost is not justified for an internal dashboard. Use static CSP with `'unsafe-inline'`.
- **Rate limiting in Server Actions directly:** Server Actions run as POST requests to page endpoints — rate limiting belongs in middleware where you have access to IP via `request.ip`.
- **Calling `Sentry.captureException` in error.tsx event handlers manually:** The `onRequestError` export in `instrumentation.ts` handles server-side errors automatically. For client-side error boundaries, use `useEffect` to call `Sentry.captureException`.
- **Using `@t3-oss/env-nextjs` for runtime-only env access:** The library validates at import time. Don't import `lib/env.ts` in middleware (edge runtime) — middleware has limited runtime support. Use `process.env` directly in middleware.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate limiting (in-memory) | Custom Map + setTimeout counter | `@upstash/ratelimit` | In-memory doesn't survive serverless restarts, doesn't work across multiple instances |
| Env var validation | Manual `if (!process.env.X) throw` checks | `@t3-oss/env-nextjs` | Handles Next.js NEXT_PUBLIC_ split, provides type safety, validates at build time |
| Error capturing | Custom `try/catch` + `fetch('/api/log')` | `@sentry/nextjs` | Stack traces, breadcrumbs, session replay, alerting — order of magnitude more useful |
| CSRF tokens | Custom token generation in Server Actions | Nothing (built-in) | Next.js 14+ Server Actions have built-in Origin header checking |
| Skeleton components | Custom CSS shimmer divs | `shadcn/ui Skeleton` | Already installed at `components/ui/skeleton.tsx` |

**Key insight:** Production hardening has well-solved, widely-adopted solutions for each sub-problem. The risk of custom implementations is in edge cases (distributed rate limiting, security bypasses, missed error paths) that libraries have already solved.

---

## Common Pitfalls

### Pitfall 1: Sentry Tunnel Route Not Excluded from Middleware

**What goes wrong:** When Sentry is configured with a tunnel route (to bypass ad blockers), the existing middleware may intercept it and redirect unauthenticated users to login instead of letting Sentry through.

**Why it happens:** Middleware matches all routes including the Sentry tunnel endpoint.

**How to avoid:** Add the Sentry tunnel path (e.g., `/monitoring`) to the middleware matcher exclusions, or explicitly allow it before auth checks.

**Warning signs:** Sentry events not appearing in dashboard despite SDK being initialized; browser console shows 302 redirects on Sentry requests.

### Pitfall 2: Rate Limiter Breaks Existing Middleware Auth Flow

**What goes wrong:** The middleware runs in the Vercel edge runtime. If the Upstash Redis connection fails (wrong env vars, network issue), the entire middleware throws and all requests fail — including authenticated dashboard requests.

**How to avoid:** Wrap rate limit check in try/catch; on failure, log and allow the request through rather than blocking everything.

```typescript
try {
  const { success } = await ratelimit.limit(`auth_${ip}`);
  if (!success) return new NextResponse("Too many requests", { status: 429 });
} catch (e) {
  console.error("Rate limit check failed, allowing request:", e);
  // Fall through — don't block on rate limiter failure
}
```

**Warning signs:** All routes return 500 after adding rate limiting code.

### Pitfall 3: CSP Blocks Google Fonts (Next.js Font Optimization)

**What goes wrong:** The project uses `next/font/google` for multiple fonts (Inter, Montserrat, Poppins, etc.) in `app/layout.tsx`. Next.js downloads and serves these fonts locally at build time — they are NOT loaded from `fonts.googleapis.com` at runtime. Standard CSP with `font-src 'self'` is correct and sufficient.

**Why it happens:** Developers assume Google Fonts requires `https://fonts.googleapis.com` in CSP, but Next.js font optimization removes that dependency.

**How to avoid:** Verify fonts are served from `/_next/static/` (they will be). `font-src 'self'` is correct.

**Warning signs:** Font loading errors in browser console mentioning `fonts.googleapis.com` being blocked.

### Pitfall 4: @t3-oss/env-nextjs with Turbopack Module Resolution

**What goes wrong:** `@t3-oss/env-nextjs` is an ESM-only package requiring `Bundler` module resolution in TypeScript. Projects with `"moduleResolution": "node"` in tsconfig may fail to import it.

**How to avoid:** Check `tsconfig.json` — if `moduleResolution` is set to `node`, change to `bundler` or `node16`. Next.js 14+ recommends `bundler`.

**Warning signs:** TypeScript errors about `cannot find module '@t3-oss/env-nextjs'`.

### Pitfall 5: Sentry DSN in Production Only

**What goes wrong:** Sentry is initialized with a hardcoded DSN or always-on init, sending development errors to the production Sentry project, polluting the error stream.

**How to avoid:** Gate DSN on `process.env.NODE_ENV === 'production'` or use a separate dev DSN. The simplest approach: only set `SENTRY_DSN` env var in Vercel production environment, not locally.

**Warning signs:** Development console errors appearing in Sentry dashboard.

### Pitfall 6: Missing error.tsx Files Cause White Screens

**What goes wrong:** Without `error.tsx` files, uncaught errors in server components (e.g., DB connection failure) cause a full white screen with no user feedback.

**How to avoid:** Add `error.tsx` files at minimum at `app/dashboard/error.tsx` and `app/admin/error.tsx`. The `global-error.tsx` handles root layout errors but is rarely triggered.

**Warning signs:** Any unhandled throw in a Server Component shows a blank page in production.

---

## Code Examples

### Verified: Sentry global-error.tsx

```tsx
// Source: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
"use client";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <h2>Something went wrong!</h2>
        <button onClick={() => reset()}>Try again</button>
      </body>
    </html>
  );
}
```

### Verified: Next.js loading.tsx with Skeleton

```tsx
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/loading
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <LoadingSkeleton />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}
```

### Verified: error.tsx (route-level boundary)

```tsx
// Source: https://nextjs.org/docs/app/getting-started/error-handling
"use client";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

### Verified: Upstash rate limiting in middleware

```typescript
// Source: https://upstash.com/blog/edge-rate-limiting
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),  // reads UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  analytics: true,  // optional: tracks usage in Upstash console
});

// In middleware:
const ip = req.ip ?? req.headers.get("x-forwarded-for") ?? "127.0.0.1";
const { success, limit, remaining } = await ratelimit.limit(`auth:${ip}`);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Sentry + Webpack loaders for instrumentation | Sentry + OpenTelemetry (Next.js native) | Next.js 15.4+ / Sentry 10.x | Faster builds, `autoInstrumentServerFunctions` is now a no-op |
| `experimental.instrumentationHook: true` in next.config | Not needed (instrumentation is stable) | Next.js 15 | Remove if present — causes warning in Next.js 16 |
| Nonce-based CSP | Static CSP preferred for most apps | Next.js 13.4+ nonce support | Nonce requires dynamic rendering — significant performance cost |
| `@next/env` for env validation | `@t3-oss/env-nextjs` | Community standard | Type-safe, validates at build time, widely adopted in T3 stack |

**Deprecated/outdated:**
- `experimental.instrumentationHook`: Not needed in Next.js 15+, causes warning in 16. Do not add.
- `autoInstrumentServerFunctions` in `withSentryConfig`: No-op with Turbopack. Can be omitted.

---

## Codebase-Specific Findings

### Current Security State (Baseline)

**Strengths already in place:**
- DAL pattern (`lib/dal.ts`) with `verifySession()` on every action — good authorization baseline
- Zod validation on most Server Actions (5 of 5 action files use Zod or schemas)
- next-auth v5 beta with `SameSite: lax` cookie defaults — CSRF protection via browser
- `server-only` import in `lib/dal.ts` — prevents DAL from being imported client-side
- Password hashing with bcrypt in auth actions

**Gaps to address:**
- No `loading.tsx` files anywhere — pages show nothing during data fetch
- No `error.tsx` files anywhere — crashes show white screen in production
- No security headers configured in `next.config.ts`
- No rate limiting on auth endpoints (`/login`, password reset)
- No Sentry monitoring
- No env var validation (direct `process.env.*` access, silent failures possible)

### Actions Missing Zod (Minor Issues)

- `app/admin/actions.ts` - `resetClientPassword`: uses `if (!newPassword || newPassword.length < 8)` check, not Zod schema
- `app/admin/actions.ts` - `toggleClientStatus`: `clientId: string` parameter unchecked (CUID format)

Both are admin-only and behind `verifySession()` — low risk, but worth standardizing.

### Middleware Integration Point

The existing `middleware.ts` uses `auth` from `@/lib/auth` as the middleware handler. Rate limiting needs to be added inside this handler, before the routing logic. The function signature wraps the core logic.

### Environment Variables Complete List

All `process.env.*` references found in `lib/` and `app/`:
- `DATABASE_URL` (in Prisma schema)
- `AUTH_SECRET` (next-auth, implicit)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REFRESH_TOKEN`
- `GOOGLE_DRIVE_ROOT_FOLDER_ID`
- `NEXT_PUBLIC_APP_URL`
- `NODE_ENV` (built-in, not needed in schema)

New env vars this phase adds:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `SENTRY_DSN` (server-side)
- `NEXT_PUBLIC_SENTRY_DSN` (client-side)
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN` (CI/CD only, for source maps)

---

## Open Questions

1. **Sentry DSN**
   - What we know: Sentry account needs to be created, project created, DSN obtained
   - What's unclear: Whether a Sentry account already exists for this project
   - Recommendation: Create a new Sentry project during task execution; treat DSN as a required env var

2. **Upstash Redis credentials**
   - What we know: Requires free Upstash account and database creation
   - What's unclear: Whether Upstash is already provisioned for the project
   - Recommendation: Task should include creating Upstash database if not present

3. **Stripe key validation in production**
   - What we know: PROD-08 requires no test keys; Stripe key starts with `sk_test_` in dev
   - What's unclear: Whether the current `STRIPE_SECRET_KEY` in the Vercel environment is already a live key
   - Recommendation: Env validation should warn (not hard-fail) on test keys, allowing dev to still work

4. **CSP and Sentry's Ingest URL**
   - What we know: CSP `connect-src` may need to allow `https://*.sentry.io` for client-side event transmission
   - What's unclear: Exact Sentry DSN ingest hostname until account is created
   - Recommendation: Add `https://*.sentry.io` to `connect-src` as a conservative allow-list entry

5. **Next.js 16 and Turbopack `withSentryConfig` build time**
   - What we know: Turbopack support works in Sentry 10.x; `withSentryConfig` is still required for source maps
   - What's unclear: Whether source map upload works correctly with this project's Turbopack config
   - Recommendation: Start with `silent: true` in `withSentryConfig`, verify builds complete, then enable source maps

---

## Sources

### Primary (HIGH confidence)
- `https://nextjs.org/docs/app/getting-started/error-handling` — error.tsx and global-error.tsx patterns (docs v16.1.6, updated 2026-02-20)
- `https://nextjs.org/docs/app/api-reference/file-conventions/loading` — loading.tsx convention (docs v16.1.6, updated 2026-02-20)
- `https://nextjs.org/docs/app/api-reference/config/next-config-js/headers` — security headers configuration (docs v16.1.6, updated 2026-02-20)
- `https://nextjs.org/docs/app/guides/content-security-policy` — CSP guide (docs v16.1.6, updated 2026-02-20)
- `https://nextjs.org/blog/security-nextjs-server-components-actions` — CSRF built-in protection details (official Next.js blog)
- `https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/` — Sentry manual setup for Next.js
- `https://env.t3.gg/docs/nextjs` — @t3-oss/env-nextjs setup

### Secondary (MEDIUM confidence)
- `https://upstash.com/blog/edge-rate-limiting` — Upstash rate limiting in Next.js middleware (official Upstash docs/blog)
- `https://blog.sentry.io/turbopack-support-next-js-sdk/` — Sentry Turbopack architecture changes (official Sentry blog)
- npm version queries for `@sentry/nextjs@10.39.0`, `@upstash/ratelimit@2.0.8`, `@upstash/redis@1.36.2`, `@t3-oss/env-nextjs@0.13.10`

### Tertiary (LOW confidence)
- WebSearch: Sentry+Turbopack debug log issue in CI (GitHub issue, recent) — minor operational concern
- WebSearch: next-auth v5 SameSite Lax cookie behavior — verified against official Next.js security blog

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — packages verified via npm, documentation current
- Architecture: HIGH — official Next.js docs used for all patterns
- CSRF finding: HIGH — official Next.js security blog is authoritative
- Pitfalls: MEDIUM — most verified against official sources; Turbopack/Sentry CI issue is LOW (single GitHub issue)
- Rate limiting pattern: MEDIUM — Upstash official blog, but implementation details depend on middleware integration specifics

**Research date:** 2026-02-22
**Valid until:** 2026-03-22 (Sentry version changes fast; verify @sentry/nextjs version before installing)
