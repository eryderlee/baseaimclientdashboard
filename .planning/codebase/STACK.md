# Technology Stack

**Analysis Date:** 2026-02-11

## Languages

**Primary:**
- TypeScript 5.x - Full application codebase (all `.ts` and `.tsx` files)

**Secondary:**
- JavaScript (ESM) - Configuration files (`eslint.config.mjs`, `postcss.config.mjs`)

## Runtime

**Environment:**
- Node.js (18+) - Required for development and deployment
- Next.js 16.1.6 - Full-stack framework with App Router

**Package Manager:**
- npm - Dependency management
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack React framework with App Router, API routes, and server-side rendering
- React 19.2.3 - UI library for component rendering
- React DOM 19.2.3 - DOM rendering for React components

**Authentication:**
- NextAuth.js 5.0.0-beta.30 - Session management with JWT callbacks and Credentials provider
- bcryptjs 3.0.3 - Password hashing and verification

**Database:**
- Prisma 7.3.0 - ORM for PostgreSQL with client SDK
- @prisma/client 7.3.0 - Generated Prisma client for database queries

**UI Components:**
- shadcn/ui (implicit via components.json) - Accessible component library
- Radix UI 1.4.3 - Headless component library (foundation for shadcn/ui)
- Tailwind CSS 4.x - Utility-first CSS framework
- Lucide React 0.563.0 - Icon library

**Charts & Visualization:**
- Recharts 3.7.0 - React charting library for dashboard analytics

**Styling & Layout:**
- class-variance-authority 0.7.1 - CSS class composition utility
- clsx 2.1.1 - Conditional CSS class builder
- tailwind-merge 3.4.0 - Tailwind CSS class conflict resolution

**Testing & Build:**
- TypeScript 5.x - Type checking and compilation
- ESLint 9.x - Code linting (eslint-config-next extensions for Web Vitals and TypeScript)
- Tailwind CSS PostCSS 4.x - PostCSS plugin for Tailwind
- tw-animate-css 1.4.0 - Additional animation utilities for Tailwind

**Payment Integration:**
- Stripe 20.3.0 - Server-side Stripe API client for invoice and payment processing
- @stripe/stripe-js 8.7.0 - Client-side Stripe JavaScript SDK for payment UI

**File Storage:**
- @vercel/blob 2.0.1 - Vercel Blob storage client for file uploads

## Configuration

**Environment:**
- Configuration via `.env` file (pattern: `e:\websites\clientdashboard\.env`)
- Critical env vars: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `STRIPE_SECRET_KEY`, `BLOB_READ_WRITE_TOKEN`
- Configuration loading: Prisma config at `prisma.config.ts` uses dotenv

**Build:**
- TypeScript config: `tsconfig.json` with strict mode, ES2017 target, JSX preset as react-jsx
- Next.js config: `next.config.ts` (minimal configuration)
- ESLint config: `eslint.config.mjs` with Next.js Web Vitals and TypeScript extensions
- PostCSS config: `postcss.config.mjs` with Tailwind CSS plugin
- shadcn/ui components config: `components.json` with Tailwind and Lucide icon setup

## Platform Requirements

**Development:**
- Node.js 18 or higher (inferred from Next.js 16.1.6 and modern dependency versions)
- npm (any recent version supporting lockfile)
- PostgreSQL database (local or remote via `DATABASE_URL`)

**Production:**
- Deployment target: Vercel (preferred, implied by use of @vercel/blob and Next.js)
- Alternative: Any Node.js 18+ hosting platform
- Database: PostgreSQL with connection via `DATABASE_URL` env var
- File Storage: Vercel Blob (configurable to fallback to local storage)

---

*Stack analysis: 2026-02-11*
