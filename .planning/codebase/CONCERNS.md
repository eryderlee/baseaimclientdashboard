# Codebase Concerns

**Analysis Date:** 2026-02-11

## Tech Debt

**Abandoned Dashboard Page:**
- Issue: `app/dashboard/page-old.tsx` (323 lines) is a deprecated version left in codebase
- Files: `app/dashboard/page-old.tsx`
- Impact: Code duplication, maintenance burden, confusion about which implementation is current
- Fix approach: Remove file if functionality is fully migrated to `app/dashboard/page.tsx`, or restore if it's needed as a fallback

**Minimal NextAuth Route Handler:**
- Issue: `app/api/auth/[...nextauth]/route.ts` is just 3 lines, delegates to `lib/auth.ts`
- Files: `app/api/auth/[...nextauth]/route.ts`
- Impact: Extra indirection layer adds minimal value
- Fix approach: Document this pattern as intentional or move handlers directly to route

## Security Considerations

**Generic Error Responses Without Logging Details:**
- Risk: All API endpoints catch errors and return generic "Internal server error" with console.error only, making debugging and security auditing difficult
- Files:
  - `app/api/documents/upload/route.ts` (lines 74-79)
  - `app/api/documents/[id]/route.ts` (lines 64-69)
  - `app/api/messages/route.ts` (lines 33-38, 100-105)
  - `app/api/notifications/[id]/route.ts` (lines 38-43)
  - `app/api/user/settings/route.ts` (lines 45-50)
  - `app/api/auth/register/route.ts` (lines 50-55)
- Current mitigation: console.error logs exist but only visible on server
- Recommendations:
  - Implement structured error logging with timestamps and request IDs
  - Log to persistent log service (e.g., Sentry, LogRocket) for production
  - Create custom error handler middleware that captures full stack traces separately

**Incomplete File Upload Validation:**
- Risk: `app/api/documents/upload/route.ts` doesn't validate file size, type, or MIME type before storing
- Files: `app/api/documents/upload/route.ts` (lines 13-31)
- Current mitigation: File is stored with original name without sanitization
- Recommendations:
  - Add file size limit validation (check before upload)
  - Validate MIME type server-side (not just client)
  - Sanitize file names to prevent directory traversal and special characters
  - Consider file type whitelist approach

**Password Reset Missing:**
- Risk: No password reset functionality exists despite having authentication with passwords
- Files: `lib/auth.ts`, `app/api/auth/register/route.ts`
- Current mitigation: None - users with forgotten passwords cannot recover
- Recommendations:
  - Implement password reset flow with time-limited tokens
  - Add email verification on registration
  - Consider adding "forgot password" endpoint

**Environment Variable Exposure Risk:**
- Risk: Stripe key initialized with empty string fallback: `process.env.STRIPE_SECRET_KEY || ""`
- Files: `lib/stripe.ts` (line 3)
- Current mitigation: None
- Recommendations:
  - Validate required env vars at startup, fail fast if missing
  - Use schema validation tool (e.g., zod) for env var validation

**Blob Storage Fallback to Unimplemented Local Storage:**
- Risk: Document upload falls back to `/uploads/{file.name}` when BLOB_READ_WRITE_TOKEN missing, but local uploads not implemented
- Files: `app/api/documents/upload/route.ts` (lines 23-31)
- Current mitigation: Only affects development mode
- Recommendations:
  - Either implement local file upload handler or require blob storage in all environments
  - Add warnings in development when blob storage is unavailable

**Insufficient Authorization Checks:**
- Risk: Some endpoints check only that `session.user` exists, don't verify user.role
- Files:
  - `app/api/messages/route.ts` - allows any authenticated user to fetch all messages for themselves or others
  - `app/api/documents/upload/route.ts` - doesn't validate ADMIN role for sensitive operations
- Current mitigation: Partial: document DELETE checks ownership at line 32, but upload doesn't validate upload permissions
- Recommendations:
  - Add role-based access control (RBAC) checks
  - Verify ownership/authorization for all data access operations
  - Create middleware for common authorization patterns

## Known Bugs

**Message Receiver Query Vulnerability:**
- Symptoms: In `app/api/messages/route.ts` GET endpoint, user can see all messages where they're either sender OR receiver, but receiverId field is optional (nullable) in schema
- Files: `app/api/messages/route.ts` (lines 13-17), `prisma/schema.prisma` (line 123)
- Trigger: User authenticates and calls GET /api/messages
- Workaround: None - this is by design but could allow viewing messages not intended for them if receiverId isn't enforced

**Async Error in Auth Configuration:**
- Symptoms: NextAuth configuration references `user.role` without type assertion safety
- Files: `lib/auth.ts` (lines 49, 56)
- Trigger: Authentication flow when role token is missing or undefined
- Workaround: Current cast `as string` is weak; could fail silently

## Performance Bottlenecks

**N+1 Query Risk in Dashboard Page:**
- Problem: `app/dashboard/page-old.tsx` fetches user with nested includes, but doesn't limit related records effectively
- Files: `app/dashboard/page-old.tsx` (lines 20-68)
- Cause: Uses `take: 5` and `take: 3` on documents, milestones, invoices but these load entirely into memory before slicing
- Improvement path:
  - Use Prisma `skip` and `take` consistently
  - Consider implementing cursor-based pagination
  - Move activity fetching to separate API call with infinite scroll

**Missing Database Indexes:**
- Problem: Frequently queried fields lack indexes or partial optimization
- Files: `prisma/schema.prisma`
- Current state: Indexes exist on foreign keys and userId, but missing on:
  - `Message.receiverId` (line 134)
  - `Notification.userId` (line 151) - exists but queries filter by both userId and isRead frequently
  - `Document.status` (no index, common filter)
  - `Milestone.status` (no index, common filter)
- Improvement path: Add composite indexes for common filter + sort combinations

**Document Upload Progress Not Tracked at File Slice Level:**
- Problem: `components/dashboard/document-upload.tsx` sends files sequentially (lines 44-59) but progress bar shows bulk progress, not per-file
- Files: `components/dashboard/document-upload.tsx` (lines 37-70)
- Cause: Loop uploads files one-by-one but updates progress for each file equally, even if files have different sizes
- Improvement path:
  - Track bytes uploaded per file
  - Calculate weighted progress based on file sizes
  - Consider parallel uploads with Promise.all() for better UX

## Fragile Areas

**Auth State Management Across Server/Client Boundary:**
- Files: `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`, all dashboard pages
- Why fragile: NextAuth v5 beta introduces server/client split; session access requires `auth()` call in server components, but types don't enforce this
- Safe modification:
  - Always use `await auth()` for server components
  - Use `useSession()` hook with proper error boundaries for client components
  - Never assume session exists without null checks
- Test coverage: Gaps in session availability scenarios during transitions

**Message/Notification Creation Without Transaction:**
- Files: `app/api/messages/route.ts` (lines 58-97), `app/api/documents/upload/route.ts` (lines 47-71)
- Why fragile: Message created, then separate activity log created - can fail partially
- Safe modification:
  - Wrap create operations in Prisma transaction
  - Or make activity creation non-critical (fire-and-forget with error swallowing)
- Test coverage: No tests for partial failure scenarios

**Folder Hierarchy Not Implemented:**
- Files: `prisma/schema.prisma` (lines 104-117)
- Why fragile: Folder model exists with self-referential hierarchy, but no API endpoints or UI implement it
- Safe modification: Either remove unused Folder model or fully implement CRUD operations
- Test coverage: No tests for folder operations

## Scaling Limits

**Single Prisma Client Instance:**
- Current capacity: Works for moderate load but relies on global singleton
- Files: `lib/prisma.ts`
- Limit: Each Next.js function gets same PrismaClient instance; connection pool sizing becomes critical
- Scaling path:
  - Monitor connection pool usage as concurrent requests grow
  - Consider adding middleware to track query counts per request
  - May need connection pooling service (e.g., PgBouncer) at higher scales

**Blob Storage Unlimited File Size:**
- Current capacity: No file size limit enforced
- Files: `app/api/documents/upload/route.ts`
- Limit: Vercel Blob or local storage could fill disk or hit API limits
- Scaling path:
  - Add `maxFileSize` configuration
  - Implement quota system per client
  - Add cleanup policy for old/deleted documents

**Missing Pagination on All Queries:**
- Current capacity: Dashboard loads 5-10 records of each type
- Files: `app/dashboard/page-old.tsx`, API endpoints
- Limit: As data grows, queries become slow; frontend components don't support infinite scroll
- Scaling path:
  - Implement cursor-based pagination in all list endpoints
  - Add pagination UI to all data tables
  - Use `take`/`skip` consistently

## Dependencies at Risk

**NextAuth v5 Beta:**
- Risk: Codebase uses `next-auth: ^5.0.0-beta.30` (beta version)
- Impact: Breaking changes likely before v5 final release; API may change
- Migration plan:
  - Pin exact version during development
  - Monitor NextAuth releases for beta → stable transition
  - Have upgrade path ready when v5 becomes stable

**Prisma Client Version Mismatch:**
- Risk: Using Prisma `^7.3.0` with beta NextAuth; schema requires careful migration planning
- Impact: Database migrations could fail during version updates
- Migration plan:
  - Keep Prisma and schema in sync
  - Test migrations on development database before production
  - Have rollback plan for schema changes

**Unversioned Radix UI:**
- Risk: `radix-ui: ^1.4.3` uses caret versioning - allows minor updates that could include breaking changes
- Impact: Components might subtly change rendering or behavior
- Migration plan:
  - Pin to exact version if stability is critical
  - Add visual regression tests before updating
  - Document any UI component updates in release notes

## Test Coverage Gaps

**No Authentication Tests:**
- What's not tested: Login flow, session persistence, password hashing, token expiration
- Files: `lib/auth.ts`, `app/api/auth/**/*.ts`
- Risk: Critical security paths could fail silently; password hashing could be misconfigured
- Priority: High

**No API Authorization Tests:**
- What's not tested: Role-based access, ownership checks, permission validation
- Files: All `app/api/**/*.ts` routes
- Risk: Unauthorized users could access sensitive data or perform restricted actions
- Priority: High

**No Document Upload Tests:**
- What's not tested: File validation, upload success/failure, blob storage fallback behavior
- Files: `app/api/documents/upload/route.ts`, `components/dashboard/document-upload.tsx`
- Risk: File uploads could silently fail or accept malicious files
- Priority: High

**No Database Transaction Tests:**
- What's not tested: Partial failure scenarios when creating related records
- Files: All routes that create multiple records
- Risk: Inconsistent database state after failures (e.g., message created but activity log missing)
- Priority: Medium

**No Client Component Error Handling Tests:**
- What's not tested: Error boundaries in document upload, message submission, notifications
- Files: `components/dashboard/document-upload.tsx`, chat interface, notification center
- Risk: UI could hang or crash on network errors without proper fallback
- Priority: Medium

**No End-to-End Tests:**
- What's not tested: Full user workflows (register → login → upload → message → view progress)
- Files: Entire application flow
- Risk: Integration issues between components only discovered in production
- Priority: Medium

---

*Concerns audit: 2026-02-11*
