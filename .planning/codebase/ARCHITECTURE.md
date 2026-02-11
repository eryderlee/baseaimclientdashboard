# Architecture

**Analysis Date:** 2026-02-11

## Pattern Overview

**Overall:** Next.js 16 Full-Stack Application with Server-Driven Components and API Routes

**Key Characteristics:**
- Next.js App Router with Parallel and Nested Layouts
- API Routes as Backend Endpoints (Route Handlers)
- Prisma ORM for Data Persistence with PostgreSQL
- Server Components as Default with Client-Side Interactivity Where Needed
- TypeScript for Type Safety Across the Stack
- Tailwind CSS with Radix UI for Consistent UI
- NextAuth for Authentication with Credential-Based Providers

## Layers

**API Layer:**
- Purpose: Expose backend operations through RESTful HTTP endpoints
- Location: `app/api/`
- Contains: Route handlers for authentication, documents, messages, notifications, and user settings
- Depends on: Prisma Client (`lib/prisma`), Auth utilities (`lib/auth`)
- Used by: Frontend components and external services via HTTP requests
- Pattern: Each resource has its own directory with `route.ts` handling POST, GET, DELETE operations

**Business Logic Layer:**
- Purpose: Centralized utilities and services for authentication, database access, and payment processing
- Location: `lib/`
- Contains:
  - `lib/auth.ts`: NextAuth configuration, credential provider, JWT/session callbacks
  - `lib/prisma.ts`: Singleton Prisma Client instance with dev-mode optimization
  - `lib/stripe.ts`: Stripe integration and payment processing
  - `lib/utils.ts`: Utility functions (className merging with `cn()`)
- Depends on: External packages (NextAuth, Prisma, Stripe, bcryptjs)
- Used by: API routes, page components, and server components

**Presentation Layer - Server Components:**
- Purpose: Render server-side UI, fetch data directly from database, compose layouts
- Location: `app/` (pages and layouts without "use client" directive)
- Contains:
  - Root layout (`app/layout.tsx`): HTML structure, fonts, metadata
  - Dashboard layout (`app/dashboard/layout.tsx`): Navigation wrapper for all dashboard pages
  - Dashboard pages: `app/dashboard/page.tsx`, `analytics/page.tsx`, `billing/page.tsx`, `chat/page.tsx`, `documents/page.tsx`, `progress/page.tsx`, `settings/page.tsx`
- Depends on: Client components, UI components, mock data or database queries
- Used by: Browser via Next.js routing

**Presentation Layer - Client Components:**
- Purpose: Interactive UI elements, state management, event handlers, real-time updates
- Location: `components/` (marked with "use client" directive)
- Contains:
  - Dashboard components: `dashboard-nav.tsx`, `analytics-overview.tsx`, `analytics-charts.tsx`, `chat-interface.tsx`, `document-list.tsx`, `document-upload.tsx`, `notification-center.tsx`, `settings-form.tsx`
  - UI primitive components: `ui/button.tsx`, `ui/card.tsx`, `ui/dialog.tsx`, `ui/tabs.tsx`, `ui/input.tsx`, `ui/textarea.tsx`, etc.
- Depends on: React, Radix UI primitives, icons from lucide-react, CSS utilities from Tailwind
- Used by: Server pages and other client components

**Data Layer:**
- Purpose: Define and manage database schema and relationships
- Location: `prisma/schema.prisma`
- Contains: 10 models (User, Client, Document, Folder, Message, Notification, Milestone, Invoice, Subscription, Activity) with relationships and indexes
- Depends on: PostgreSQL database connection string from environment
- Used by: Prisma Client throughout application

## Data Flow

**User Registration Flow:**
1. User submits registration form to `POST /api/auth/register`
2. Route handler validates input, hashes password with bcryptjs
3. Prisma creates User and associated Client profile in database
4. Response returns userId with 201 status
5. User can then authenticate via Credentials provider

**Document Upload Flow:**
1. User submits file in `document-upload.tsx` (client component)
2. FormData sent to `POST /api/documents/upload`
3. Route handler authenticates via NextAuth session
4. File uploaded to Vercel Blob storage (or local `/uploads` fallback)
5. Prisma creates Document record with metadata
6. Activity log entry created via `prisma.activity.create()`
7. Document returned to client for UI update

**Authentication & Session Flow:**
1. User submits credentials on login page
2. NextAuth Credentials provider verifies email/password against Prisma database
3. Password compared with bcrypt-hashed value
4. On successful auth, JWT token created with user role and id
5. Session callback enriches session object with role and id
6. Protected pages access session via `auth()` function from `lib/auth.ts`
7. API routes validate session before processing requests

**Analytics Dashboard Flow:**
1. Server component `app/dashboard/page.tsx` generates mock analytics data
2. Data passed to client component `AnalyticsOverview` as props
3. Client component maintains activeTab state for metric selection
4. Recharts library renders interactive line charts
5. Metric calculations (CTR, CPC, CPA, conversion rates) computed client-side
6. Tab switching triggers state update and chart re-render

**State Management:**
- Server-side: State held in database via Prisma, accessed on demand by route handlers
- Client-side: React hooks (useState, useEffect) in "use client" components for UI state
- Cross-request: Session state via NextAuth, stored in JWT tokens
- No centralized state management tool (Redux, Zustand) - data flows directly from database to components

## Key Abstractions

**Authentication Module:**
- Purpose: Centralized credential verification and session management
- Location: `lib/auth.ts`
- Exports: `auth()` function to get current session, `signIn`, `signOut`, `handlers`
- Pattern: NextAuth configuration with custom JWT and session callbacks

**Prisma Client:**
- Purpose: Type-safe database access with single connection instance
- Location: `lib/prisma.ts`
- Pattern: Singleton pattern to prevent multiple connections in development
- Usage: Imported as `import { prisma } from "@/lib/prisma"` in API routes and server components

**UI Component Library:**
- Purpose: Reusable, accessible UI primitives from Radix UI wrapped with Tailwind styling
- Location: `components/ui/`
- Pattern: Each component exports a single UI element (Button, Card, Dialog, etc.)
- Usage: Imported and composed into feature components and pages

**Dashboard Navigation State:**
- Purpose: Route-aware navigation with active indicator
- Location: `components/dashboard/dashboard-nav.tsx`
- Pattern: Uses `usePathname()` hook to highlight current route
- Example: Navigation item is highlighted when `pathname === "/dashboard/chat"`

## Entry Points

**Public Entry:**
- Location: `app/page.tsx`
- Triggers: User visits root URL `/`
- Responsibilities: Redirects to `/dashboard` via `redirect()` function

**Dashboard Entry:**
- Location: `app/dashboard/layout.tsx`
- Triggers: All requests to `/dashboard/*`
- Responsibilities: Renders DashboardNav wrapper, applies layout styles, provides navigation context for all nested pages

**API Entry Points:**
- Authentication: `app/api/auth/[...nextauth]/route.ts`, `app/api/auth/register/route.ts`
- Documents: `app/api/documents/upload/route.ts`, `app/api/documents/[id]/route.ts`
- Messages: `app/api/messages/route.ts`
- Notifications: `app/api/notifications/[id]/route.ts`, `app/api/notifications/mark-all-read/route.ts`
- User Settings: `app/api/user/settings/route.ts`

## Error Handling

**Strategy:** Try-catch blocks with informative error responses and console logging

**Patterns:**
- API routes wrap business logic in try-catch, return NextResponse.json with error message and appropriate HTTP status
- Example: `POST /api/auth/register` returns 400 for missing fields, 400 for duplicate email, 500 for unexpected errors
- Client-side: Components handle form submission errors and display user-facing messages (not yet fully implemented in mock pages)
- Database errors: Prisma errors propagate to catch blocks and are logged to console with generic error response to client

## Cross-Cutting Concerns

**Logging:** `console.error()` used in API routes to log errors server-side (e.g., registration error, upload error). No structured logging framework present.

**Validation:**
- API routes validate required fields manually (check for null/undefined)
- Prisma schema enforces data types and relationships
- NextAuth validates credentials via custom authorize callback
- Frontend uses HTML5 form validation and manual field checks

**Authentication:**
- NextAuth with Credentials provider
- Passwords hashed with bcryptjs (10 salt rounds)
- Sessions stored in JWT tokens
- Protected API routes check `await auth()` before processing
- Session data includes user id, email, name, role (CLIENT or ADMIN)

**File Upload Handling:**
- Dual-mode: Production uses Vercel Blob with BLOB_READ_WRITE_TOKEN
- Development fallback: Creates URL pointing to `/uploads/{filename}`
- File metadata stored in database for tracking and retrieval

---

*Architecture analysis: 2026-02-11*
