---
phase: 09-document-storage-migration
plan: 03
subsystem: api
tags: [google-drive, streaming, download-proxy, authorization, vercel-blob-removal]

# Dependency graph
requires:
  - phase: 09-01
    provides: lib/google-drive.ts with streamFileFromDrive and deleteFileFromDrive exports
provides:
  - Streaming download proxy route at /api/documents/download/[fileId]
  - Document delete route updated to use Google Drive instead of Vercel Blob
  - DocumentList component updated to use download proxy
affects:
  - 09-04 (upload route — will also reference lib/google-drive.ts patterns)
  - 09-05 (migration script — delete route now Drive-native, Blob removal is complete for this file)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Streaming download proxy: return new Response(nodeStream as unknown as ReadableStream) with Content-Disposition"
    - "Document auth pattern: isOwner || isAdmin — both client owner and admin can access/delete"
    - "Drive delete with graceful fallback: catch Drive error, continue DB deletion regardless"
    - "prisma.document.findFirst({ where: { fileUrl: fileId } }) to look up document by Drive file ID"

key-files:
  created:
    - "app/api/documents/download/[fileId]/route.ts"
  modified:
    - "components/dashboard/document-list.tsx"
    - "app/api/documents/[id]/route.ts"

key-decisions:
  - "Streaming response (not buffered) for Drive download — avoids Vercel 4.5 MB response body limit"
  - "Authorization on download: isOwner OR isAdmin — admin needs to access client documents"
  - "Drive delete is graceful (try/catch): DB deletion always proceeds even if Drive delete fails"
  - "encodeURIComponent(fileName) in Content-Disposition — handles file names with spaces/special chars"

patterns-established:
  - "Pattern: /api/documents/download/${doc.fileUrl} — download proxy URL pattern for Drive files"
  - "Pattern: findFirst({ where: { fileUrl: fileId } }) to resolve Drive file ID to a Document record"

# Metrics
duration: 4min
completed: 2026-02-20
---

# Phase 9 Plan 03: Download Proxy and Drive Delete Summary

**Streaming download proxy route + Drive-backed delete replacing Vercel Blob, with dual auth (owner OR admin) on both operations**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-20T09:40:19Z
- **Completed:** 2026-02-20T09:44:31Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created `/api/documents/download/[fileId]` streaming proxy that authenticates, authorizes (owner or admin), then streams the Drive file via `streamFileFromDrive` with proper `Content-Disposition` and `Cache-Control` headers
- Updated `DocumentList` download button from `window.open(doc.fileUrl)` (direct Vercel Blob URL) to `window.open(/api/documents/download/${doc.fileUrl})` (server-side proxy) — visual design unchanged
- Updated `/api/documents/[id]` DELETE handler: replaced `@vercel/blob` `del()` with `deleteFileFromDrive()`, added admin role check alongside existing owner check, wrapped Drive delete in graceful try/catch so DB deletion always proceeds

## Task Commits

Each task was committed atomically:

1. **Task 1: Create download proxy route** - `d5a7e82` (feat)
2. **Task 2: Update DocumentList download action and delete route** - `a85cb52` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `app/api/documents/download/[fileId]/route.ts` - GET streaming proxy: auth check, authorization (owner OR admin), Drive stream via streamFileFromDrive, Response with Content-Disposition/Cache-Control
- `components/dashboard/document-list.tsx` - Download button changed to `/api/documents/download/` proxy pattern; table structure, badges, icons unchanged
- `app/api/documents/[id]/route.ts` - Replaced `@vercel/blob` import with `deleteFileFromDrive`; added `isAdmin` check; Drive delete wrapped in try/catch with graceful fallback

## Decisions Made

- **Streaming over buffering for download**: The proxy returns `new Response(stream as unknown as ReadableStream)` rather than buffering the file into memory. This avoids Vercel's 4.5 MB response body limit for large files (videos, large PDFs). The Node.js ReadableStream from `streamFileFromDrive` is cast via `unknown` to satisfy TypeScript — same pattern established in 09-01.
- **Admin access on both download and delete**: Admins can access and delete any client's documents. This is required because admins upload documents on behalf of clients and need full management access. The `session.user.role === "ADMIN"` check was added to both routes.
- **Graceful Drive delete**: If `deleteFileFromDrive` throws (e.g., file already deleted, Drive API error), the route catches the error, logs it, and continues to delete the DB record. This prevents orphaned DB records when Drive is temporarily unavailable.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no additional external service configuration required beyond what 09-01 documented.

## Next Phase Readiness

- Download proxy and delete route are complete and functional (pending Google Cloud credentials setup from 09-01)
- Plan 09-04 (file upload route — replacing Vercel Blob upload) can proceed independently
- `@vercel/blob` is now removed from `app/api/documents/[id]/route.ts`; the upload route still references it and must be updated in Plan 09-04

---
*Phase: 09-document-storage-migration*
*Completed: 2026-02-20*
