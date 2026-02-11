# Codebase Structure

**Analysis Date:** 2026-02-11

## Directory Layout

```
client-dashboard/
├── app/                          # Next.js App Router pages and API routes
│   ├── api/                      # Backend API endpoints (Route Handlers)
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── documents/            # Document management endpoints
│   │   ├── messages/             # Message endpoints
│   │   ├── notifications/        # Notification endpoints
│   │   └── user/                 # User settings endpoints
│   ├── dashboard/                # Dashboard pages and layout
│   │   ├── admin/                # Admin dashboard page
│   │   ├── analytics/            # Analytics page
│   │   ├── billing/              # Billing page
│   │   ├── chat/                 # Chat page
│   │   ├── documents/            # Documents page
│   │   ├── progress/             # Progress page
│   │   ├── settings/             # Settings page
│   │   ├── layout.tsx            # Dashboard wrapper layout
│   │   └── page.tsx              # Dashboard home page
│   ├── globals.css               # Global CSS and Tailwind imports
│   ├── layout.tsx                # Root layout (HTML, fonts, metadata)
│   ├── page.tsx                  # Root page (redirects to /dashboard)
│   └── favicon.ico               # Browser favicon
├── components/                   # React components
│   ├── dashboard/                # Dashboard feature components
│   │   ├── analytics-charts.tsx
│   │   ├── analytics-overview.tsx
│   │   ├── chat-interface.tsx
│   │   ├── dashboard-nav.tsx
│   │   ├── document-list.tsx
│   │   ├── document-upload.tsx
│   │   ├── notification-center.tsx
│   │   └── settings-form.tsx
│   └── ui/                       # Radix UI primitive components
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── progress.tsx
│       ├── separator.tsx
│       ├── sheet.tsx
│       ├── sidebar.tsx
│       ├── skeleton.tsx
│       ├── table.tsx
│       ├── tabs.tsx
│       ├── textarea.tsx
│       └── tooltip.tsx
├── hooks/                        # Custom React hooks
│   └── use-mobile.ts             # Mobile breakpoint detection hook
├── lib/                          # Shared utilities and services
│   ├── auth.ts                   # NextAuth configuration
│   ├── prisma.ts                 # Prisma Client singleton
│   ├── stripe.ts                 # Stripe integration
│   └── utils.ts                  # Utility functions (cn helper)
├── prisma/                       # Database schema and migrations
│   ├── migrations/               # Prisma migration files
│   └── schema.prisma             # Database schema definition
├── public/                       # Static assets (images, fonts, etc.)
├── .planning/                    # GSD planning documents
│   └── codebase/                 # Architecture and structure analysis
├── .next/                        # Next.js build output (generated)
├── node_modules/                 # Dependencies (generated)
├── .git/                         # Git repository data
├── .gitignore                    # Git ignore rules
├── components.json               # shadcn/ui configuration
├── eslint.config.mjs             # ESLint configuration
├── next.config.ts                # Next.js configuration
├── next-env.d.ts                 # Next.js type definitions (generated)
├── package.json                  # Project dependencies and scripts
├── package-lock.json             # Dependency lock file
├── postcss.config.mjs            # PostCSS configuration
├── prisma.config.ts              # Prisma configuration
├── README.md                     # Project documentation
└── tsconfig.json                 # TypeScript configuration

```

## Directory Purposes

**app/**
- Purpose: Next.js App Router files - contains all pages, layouts, and API routes
- Contains: `.tsx` page files, `.ts` API route handlers, CSS files
- Key Files: `app/page.tsx` (root), `app/layout.tsx` (root layout), `app/dashboard/layout.tsx` (dashboard wrapper)

**app/api/**
- Purpose: Backend API endpoints that handle server-side business logic
- Contains: Route handlers following the `route.ts` pattern for each HTTP method
- Key Files: `app/api/auth/register/route.ts`, `app/api/documents/upload/route.ts`, `app/api/messages/route.ts`

**app/dashboard/**
- Purpose: All dashboard pages visible to authenticated users
- Contains: Page components for each dashboard section
- Key Files: Main dashboard home page, analytics, documents, chat, billing, progress, settings pages

**components/**
- Purpose: Reusable React components - UI primitives and feature-specific components
- Contains: Two subdirectories: `ui/` for base components, `dashboard/` for dashboard-specific components
- Key Files: DashboardNav, AnalyticsOverview, DocumentUpload, ChatInterface

**components/ui/**
- Purpose: Atomic UI components from Radix UI library
- Contains: Individual component files, each exporting one UI element
- Pattern: All components styled with Tailwind CSS, follow Radix UI patterns for accessibility

**components/dashboard/**
- Purpose: Complex feature components composed of multiple UI primitives
- Contains: Components that manage more business logic and state
- Key Files: `analytics-overview.tsx` (tabs and charts), `dashboard-nav.tsx` (navigation with active state), `document-upload.tsx` (form handling)

**hooks/**
- Purpose: Custom React hooks for reusable logic
- Contains: Hooks that encapsulate stateful behavior
- Key Files: `use-mobile.ts` (detects if user is on mobile device using media queries)

**lib/**
- Purpose: Shared utilities, services, and configuration
- Contains: Authentication setup, database client, payment processing, utility functions
- Key Files:
  - `lib/auth.ts`: NextAuth configuration, credential provider, JWT/session callbacks
  - `lib/prisma.ts`: Prisma Client instance (singleton pattern)
  - `lib/stripe.ts`: Stripe API integration
  - `lib/utils.ts`: Helper functions like `cn()` for classname merging

**prisma/**
- Purpose: Database schema definition and migration history
- Contains: `schema.prisma` (data model) and `migrations/` directory
- Key Files: `schema.prisma` - defines all database models, relationships, indexes, enums

**public/**
- Purpose: Static assets served directly by Next.js
- Contains: Images, icons, fonts, and other static files
- Accessed via: URLs like `/images/file.png` in code

## Key File Locations

**Entry Points:**
- `app/page.tsx`: Root page that redirects to `/dashboard`
- `app/layout.tsx`: Root HTML structure, fonts, metadata setup
- `app/dashboard/layout.tsx`: Dashboard navigation wrapper for all dashboard routes
- `app/dashboard/page.tsx`: Dashboard home page with overview cards and charts

**Configuration:**
- `package.json`: Project name, scripts, dependencies, dev dependencies
- `tsconfig.json`: TypeScript compiler options, path aliases (`@/*` maps to root)
- `next.config.ts`: Next.js build and runtime configuration
- `prisma.config.ts`: Prisma client configuration
- `components.json`: shadcn/ui component configuration for code generation
- `eslint.config.mjs`: ESLint linting rules

**Core Logic:**
- `lib/auth.ts`: Authentication configuration and session management
- `lib/prisma.ts`: Database client singleton
- `lib/stripe.ts`: Payment processing integration
- `app/api/auth/register/route.ts`: User registration endpoint
- `app/api/documents/upload/route.ts`: Document upload endpoint with file handling

**Database:**
- `prisma/schema.prisma`: Data model with User, Client, Document, Message, Notification, Milestone, Invoice, Subscription, Activity, Folder models

**Testing:**
- Not detected - no test files found in repository

## Naming Conventions

**Files:**
- Page files: `page.tsx` (Next.js convention) - e.g., `app/dashboard/page.tsx`, `app/dashboard/chat/page.tsx`
- Layout files: `layout.tsx` (Next.js convention) - e.g., `app/layout.tsx`, `app/dashboard/layout.tsx`
- API routes: `route.ts` (Next.js convention) - e.g., `app/api/documents/upload/route.ts`
- Component files: PascalCase with `.tsx` extension - e.g., `DashboardNav.tsx`, `AnalyticsOverview.tsx`
- Utility files: camelCase with `.ts` extension - e.g., `use-mobile.ts`, `utils.ts`

**Directories:**
- Feature directories: lowercase with hyphens - e.g., `dashboard`, `analytics`, `documents`, `user-settings`
- Component directories: grouped by domain - `components/dashboard/`, `components/ui/`
- API routes: match resource names - `api/documents/`, `api/messages/`, `api/notifications/`

**TypeScript/Code:**
- Components: PascalCase - `DashboardNav`, `AnalyticsOverview`, `DocumentUpload`
- Functions: camelCase - `generateDailyData()`, `useIsMobile()`, `cn()`
- Types/Interfaces: PascalCase - `DashboardNavProps`, `MetricData`, `DailyMetric`
- Constants: UPPER_SNAKE_CASE or camelCase depending on scope - `MOBILE_BREAKPOINT`, `mockData`

## Where to Add New Code

**New Feature (e.g., Reports):**
- Primary code: Create `app/dashboard/reports/page.tsx` for server component
- API endpoint: Create `app/api/reports/route.ts` for backend logic
- Components: Add feature components in `components/dashboard/reports-*.tsx`
- Styling: Use Tailwind CSS classes, follow existing Card/Button/Badge patterns
- Database: Add models to `prisma/schema.prisma`, run `npx prisma migrate dev`

**New Component/Module:**
- UI primitive: Add to `components/ui/[component-name].tsx` if reusable across pages
- Feature component: Add to `components/dashboard/[feature]-*.tsx` if specific to dashboard
- Follow naming: Export as PascalCase component, define Props interface
- Example: `components/dashboard/task-list.tsx` for a task list component

**Utilities:**
- Shared helpers: Add function to `lib/utils.ts` or create new file in `lib/`
- Custom hooks: Add to `hooks/[hook-name].ts` with camelCase naming
- Database services: Import `{ prisma }` from `lib/prisma.ts` and use directly in API routes
- Auth helpers: Use exported functions from `lib/auth.ts` (e.g., `auth()` to get session)

**API Endpoints:**
- Pattern: Create `app/api/[resource]/[action]/route.ts`
- Session check: Start with `const session = await auth()` and validate
- Database operation: Use `prisma.[model].create()`, `update()`, `delete()`, `findUnique()`, `findMany()`
- Response: Return `NextResponse.json(data, { status: 200 })` or error response
- Activity logging: Optionally create activity record via `prisma.activity.create()`

**Database Models:**
- Edit `prisma/schema.prisma` to add models, fields, relationships
- Relationships: Use `@relation()` for foreign keys and back-references
- Indexes: Add `@@index([fieldName])` for frequently queried fields
- Enums: Define with `enum EnumName { VALUE1, VALUE2 }`
- Commands: Run `npx prisma migrate dev --name description` to create migration

## Special Directories

**node_modules/**
- Purpose: Installed npm dependencies
- Generated: Yes (via `npm install`)
- Committed: No (in .gitignore)

**.next/**
- Purpose: Next.js build artifacts and development server cache
- Generated: Yes (by Next.js build process)
- Committed: No (in .gitignore)

**prisma/migrations/**
- Purpose: Tracks database schema changes over time
- Generated: Yes (by `npx prisma migrate` commands)
- Committed: Yes (included in version control)

**.planning/codebase/**
- Purpose: GSD codebase analysis documents (ARCHITECTURE.md, STRUCTURE.md, etc.)
- Generated: Yes (by GSD mapping tools)
- Committed: Yes (for team reference)

---

*Structure analysis: 2026-02-11*
