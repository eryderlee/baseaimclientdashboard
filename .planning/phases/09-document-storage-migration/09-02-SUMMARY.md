---
phase: 09-document-storage-migration
plan: 02
subsystem: api
tags: [google-drive, file-upload, admin, documents, email-notification, prisma]

# Dependency graph
requires:
  - phase: 09-01
    provides: lib/google-drive.ts with uploadFileToDrive, createClientDriveFolder; Client.driveFolderId schema field
  - phase: 08-email-infrastructure
    provides: sendDocumentUploadedEmail in lib/email.ts
provides:
  - app/api/documents/upload/route.ts using Google Drive instead of Vercel Blob
  - app/api/admin/documents/upload/route.ts for admin document upload to any client's Drive folder
  - components/admin/client-documents.tsx admin document upload + list UI
  - Drive folder creation in createClient() onboarding flow (non-blocking)
  - Admin client detail page shows document section
affects:
  - 09-03 (file download - documents now stored as Drive file IDs in fileUrl)
  - 09-04 (document list UI - fileUrl now holds Drive file ID not a URL)
  - 09-05 (delete + migration - admin upload flow complete)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fire-and-forget Drive folder creation outside DB transaction — external HTTP calls must not be in Prisma transactions"
    - "Transaction returns created entity — prisma.$transaction(() => ...) returns the newClient for use after the transaction"
    - "Lazy Drive folder initialization in admin upload route — creates folder on-demand for clients missing driveFolderId"
    - "fileUrl column stores Google Drive file ID (not URL) — semantically repurposed, documented in code"
    - "Admin uploads set status: APPROVED — bypass approval flow since admin is the source of truth"

key-files:
  created:
    - "app/api/admin/documents/upload/route.ts"
    - "components/admin/client-documents.tsx"
  modified:
    - "app/api/documents/upload/route.ts"
    - "app/admin/actions.ts"
    - "app/admin/clients/[clientId]/page.tsx"

key-decisions:
  - "Drive folder creation is fire-and-forget (promise chain, not await) — client creation must not fail due to Drive API errors"
  - "Lazy folder initialization in admin upload route — handles existing clients onboarded before Drive integration without a migration script"
  - "Admin-uploaded documents have status APPROVED — no admin approval needed for admin-uploaded content"
  - "Document notification email sent fire-and-forget — email failures don't block upload response"
  - "fileUrl column repurposed to store Drive file ID — Option A from research (keep column name, update semantics)"

patterns-established:
  - "Pattern: Drive folder creation after transaction with .then().catch() — non-blocking, errors logged"
  - "Pattern: Lazy Drive folder init in API routes — createClientDriveFolder + client.update if driveFolderId is null"
  - "Pattern: Admin upload component mirrors DocumentUpload but posts clientId + file to admin endpoint"

# Metrics
duration: 6min
completed: 2026-02-20
---

# Phase 9 Plan 02: Google Drive Upload Integration Summary

**Vercel Blob replaced with Google Drive in client upload route; admin document upload endpoint + UI built with Drive folder lazy-init and email notification on upload**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-20T09:40:15Z
- **Completed:** 2026-02-20T09:46:15Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Replaced Vercel Blob upload (with dev fallback) with Google Drive upload in client-facing upload route
- Added Drive folder creation to `createClient()` onboarding — non-blocking, fire-and-forget after transaction commits
- Built `/api/admin/documents/upload` route: ADMIN role verification, lazy Drive folder init, email notification
- Built `ClientDocuments` component: drag-and-drop upload UI + document list with file sizes, dates, and status badges
- Wired `ClientDocuments` into admin client detail page with document fetch from DB

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace client upload route + add folder creation to onboarding** - `9f06c17` (feat)
2. **Task 2: Build admin document upload endpoint and UI component** - `dd50ffb` (feat)

**Plan metadata:** (docs commit - see below)

## Files Created/Modified

- `app/api/documents/upload/route.ts` - Removed Vercel Blob, uses uploadFileToDrive; returns 400 if driveFolderId missing
- `app/admin/actions.ts` - Added createClientDriveFolder call after transaction; transaction now returns newClient
- `app/api/admin/documents/upload/route.ts` - Admin upload route with ADMIN auth, lazy folder init, email notification
- `components/admin/client-documents.tsx` - Admin document upload UI + document list; posts to /api/admin/documents/upload
- `app/admin/clients/[clientId]/page.tsx` - Added document fetch and ClientDocuments section below milestones

## Decisions Made

- **Non-blocking Drive folder creation**: Used `.then().catch()` chain instead of `await` for Drive folder creation after the DB transaction. The client creation must succeed even if Google Drive is temporarily unavailable.
- **Lazy folder initialization**: The admin upload route creates a Drive folder on-demand if `driveFolderId` is null. This handles existing clients who were created before the Drive integration was deployed — no separate migration script needed for them.
- **Admin uploads bypass approval**: Documents uploaded by admin are created with `status: "APPROVED"`. Admin is trusted source of truth; no approval workflow needed for admin-sourced documents.
- **Fire-and-forget email**: `sendDocumentUploadedEmail` called with `.catch()` — email delivery failure does not block the upload response.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - both tasks compiled cleanly on first attempt. Build passed without errors.

## User Setup Required

None beyond what was documented in 09-01-SUMMARY.md (Google Cloud service account setup). The Drive env vars (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_DRIVE_ROOT_FOLDER_ID`) are already required from Plan 01.

## Next Phase Readiness

- Client upload route complete (DRIVE-03)
- Admin upload route and UI complete (DRIVE-04)
- Drive folder creation on onboarding complete (DRIVE-05)
- Email notification on admin upload complete (DRIVE-08)
- Plan 03 (download proxy) can proceed — documents now store Drive file IDs in `fileUrl`; the `DocumentList` component currently calls `window.open(doc.fileUrl)` which won't work for private Drive files
- Plan 04 needs to update `DocumentList` to use `/api/documents/download/[fileId]` proxy instead of direct URL open
- No blockers for code work. Google Cloud setup remains the only prerequisite for end-to-end testing.

---
*Phase: 09-document-storage-migration*
*Completed: 2026-02-20*
