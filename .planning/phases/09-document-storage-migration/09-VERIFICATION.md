---
phase: 09-document-storage-migration
verified: 2026-02-20T12:30:00Z
status: human_needed
score: 8/8 must-haves verified (automated)
human_verification:
  - test: Upload a document from client dashboard and verify it appears in Google Drive
    expected: File visible in Google Drive under client folder with PENDING status
    why_human: Requires live GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN env vars
  - test: Download a document from the client dashboard
    expected: Browser downloads the file; file intact; Content-Disposition header triggers save dialog
    why_human: Streaming proxy through Google Drive API requires live credentials to verify
  - test: Admin uploads a document via client detail page
    expected: File in client Drive folder with APPROVED status; client receives email notification
    why_human: Requires live Drive credentials and Resend API key; email delivery is external
  - test: Create a new client and check Google Drive for new folder
    expected: New folder named companyName - clientId appears in root Drive folder
    why_human: Fire-and-forget async; no synchronous feedback; requires Drive account access
  - test: Confirm env var names match code - OAuth2 not service account
    expected: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN are set
    why_human: SUMMARY docs service account creds but code uses OAuth2; deployment risk requires manual confirmation
---

# Phase 9: Document Storage Migration Verification Report

**Phase Goal:** Google Drive replaces Vercel Blob for document storage with proper folder organization
**Verified:** 2026-02-20T12:30:00Z
**Status:** human_needed
**Re-verification:** No - initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Client can view list of documents in their Google Drive folder | VERIFIED | app/dashboard/documents/page.tsx fetches docs via Prisma; document-list.tsx renders table with name/size/status/date |
| 2 | Client can download documents from dashboard | VERIFIED | document-list.tsx uses window.open via /api/documents/download/ proxy; route streams from Drive via streamFileFromDrive with Content-Disposition |
| 3 | Client can upload new documents to their Google Drive folder | VERIFIED | document-upload.tsx POSTs to /api/documents/upload; route calls uploadFileToDrive(file, clientProfile.driveFolderId); stores Drive file ID in fileUrl column |
| 4 | Admin can upload documents to any client Google Drive folder | VERIFIED | components/admin/client-documents.tsx POSTs to /api/admin/documents/upload with clientId; route verifies ADMIN role, lazy folder init, calls uploadFileToDrive |
| 5 | Google Drive folders created automatically at client onboarding | VERIFIED | app/admin/actions.ts: createClientDriveFolder fire-and-forget .then(prisma.client.update).catch() after transaction commits |
| 6 | Document UI maintains existing design - Drive is backend-only replacement | VERIFIED | document-list.tsx table structure, Badge variants, icons unchanged; only download URL changed to /api/documents/download/ proxy |
| 7 | All existing Vercel Blob documents migrated to Google Drive | VERIFIED - zero migration needed | migrate-blob-to-drive.ts exists; SUMMARY confirms zero Blob docs existed; @vercel/blob absent from package.json and source |
| 8 | Client receives email notification when admin uploads document | VERIFIED | admin upload route calls sendDocumentUploadedEmail fire-and-forget; lib/email.ts exports function; emails/document-uploaded.tsx template is 105 lines |

**Score:** 8/8 truths verified by code inspection

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| lib/google-drive.ts | Drive client singleton + 6 helper functions | VERIFIED | 190 lines; exports getDriveClient, createClientDriveFolder, uploadFileToDrive, streamFileFromDrive, deleteFileFromDrive, listFilesInFolder |
| app/api/documents/upload/route.ts | Client upload to Google Drive | VERIFIED | 94 lines; imports uploadFileToDrive; reads driveFolderId; returns 400 if folder missing |
| app/api/admin/documents/upload/route.ts | Admin upload with lazy folder init and email | VERIFIED | 114 lines; ADMIN role check; lazy createClientDriveFolder if null; sendDocumentUploadedEmail fire-and-forget |
| app/api/documents/download/[fileId]/route.ts | Streaming download proxy | VERIFIED | 60 lines; owner OR admin auth; streamFileFromDrive; Readable.toWeb streaming response with Content-Disposition |
| app/api/documents/[id]/route.ts | Drive delete with no Vercel Blob | VERIFIED | 74 lines; imports deleteFileFromDrive (no @vercel/blob); graceful try/catch; DB delete always proceeds |
| components/dashboard/document-list.tsx | Client document list with download proxy | VERIFIED | 124 lines; download button uses /api/documents/download/ proxy; no direct Blob URLs |
| components/admin/client-documents.tsx | Admin document upload UI and list | VERIFIED | 249 lines; drag-and-drop; per-file progress; status badges; POSTs to admin endpoint |
| app/admin/clients/[clientId]/page.tsx | Admin client page with document section | VERIFIED | Imports ClientDocuments; fetches documents via Prisma; passes clientId and serializedDocuments |
| prisma/schema.prisma | driveFolderId String? on Client model | VERIFIED | Line 66: driveFolderId String? with Google Drive folder ID comment |
| next.config.ts | serverExternalPackages with googleapis | VERIFIED | serverExternalPackages includes @googleapis/drive and google-auth-library |
| package.json | No @vercel/blob dependency | VERIFIED | @vercel/blob absent from all deps; @googleapis/drive at ^20.1.0 and google-auth-library at ^10.5.0 present |
| lib/email.ts | sendDocumentUploadedEmail function | VERIFIED | Lines 204-221; imports and renders DocumentUploadedEmail template via sendEmail |
| emails/document-uploaded.tsx | Document uploaded email template | VERIFIED | 105 lines; greeting, document name box, CTA button, uses EmailLayout |
| scripts/migrate-blob-to-drive.ts | Migration script | VERIFIED | 349 lines; three-phase audit/folder-creation/migration; inline Drive client bypasses server-only restriction |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| document-upload.tsx | /api/documents/upload | fetch POST | WIRED | fetch to /api/documents/upload with FormData |
| /api/documents/upload | lib/google-drive.ts | uploadFileToDrive | WIRED | Import and call: uploadFileToDrive(file, clientProfile.driveFolderId) |
| client-documents.tsx | /api/admin/documents/upload | fetch POST | WIRED | fetch to /api/admin/documents/upload with clientId and file |
| /api/admin/documents/upload | lib/google-drive.ts | uploadFileToDrive and createClientDriveFolder | WIRED | Lazy init and upload both called in same route |
| /api/admin/documents/upload | lib/email.ts | sendDocumentUploadedEmail | WIRED | Imported and called fire-and-forget with .catch() |
| document-list.tsx | /api/documents/download/[fileId] | window.open | WIRED | window.open with /api/documents/download/ concatenated with doc.fileUrl |
| /api/documents/download/[fileId] | lib/google-drive.ts | streamFileFromDrive | WIRED | Import and call: streamFileFromDrive(fileId) |
| /api/documents/[id] DELETE | lib/google-drive.ts | deleteFileFromDrive | WIRED | Import and call: deleteFileFromDrive(document.fileUrl) in try/catch |
| app/admin/actions.ts createClient | lib/google-drive.ts | createClientDriveFolder | WIRED | Import plus fire-and-forget .then().catch() after transaction |
| app/admin/clients/[clientId]/page.tsx | components/admin/client-documents.tsx | component render | WIRED | ClientDocuments imported and rendered with clientId and documents props |

---

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| DRIVE-01 (Drive client/foundation) | SATISFIED | lib/google-drive.ts singleton with OAuth2 auth and all 6 helper functions |
| DRIVE-02 (Document list for clients) | SATISFIED | DocumentList renders DB documents; download uses /api/documents/download/ proxy |
| DRIVE-03 (Client upload to Drive) | SATISFIED | /api/documents/upload calls uploadFileToDrive and stores Drive file ID |
| DRIVE-04 (Admin upload to Drive) | SATISFIED | /api/admin/documents/upload with lazy folder init; ClientDocuments admin UI |
| DRIVE-05 (Folder creation at onboarding) | SATISFIED | createClient() calls createClientDriveFolder post-transaction fire-and-forget |
| DRIVE-06 (Download proxy) | SATISFIED | /api/documents/download/[fileId] streaming proxy with owner and admin auth |
| DRIVE-07 (All clients have Drive folders) | SATISFIED | Migration script ran; all 7 clients provisioned; lazy init handles edge cases |
| DRIVE-08 (Email on admin upload) | SATISFIED | sendDocumentUploadedEmail called in admin upload route |

---

### Anti-Patterns Found

No TODO, FIXME, placeholder, stub, or empty-handler patterns found in any of the 7 key files scanned.

---

### Notable Finding: Credential Type Divergence

**SUMMARY documentation (09-01-SUMMARY.md) states:** Service account credentials used -- GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.

**Actual code (lib/google-drive.ts) uses:** OAuth2 with refresh token -- GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN.

The migration script (scripts/migrate-blob-to-drive.ts) also uses OAuth2 credentials consistently. A scripts/get-oauth-token.ts helper exists confirming this OAuth2 approach was intentional. The SUMMARY was not updated to reflect the credential change from service account to OAuth2 during implementation.

**Risk:** If production environment was configured following the SUMMARY documentation, the wrong env var names may be set. Missing OAuth2 vars will cause every Drive operation to throw at runtime. Human verification of env var names is required before launch.

---

### Human Verification Required

All 8 automated code checks pass. The following 5 items need human testing or confirmation:

#### 1. Client Document Upload

**Test:** Log in as a client, navigate to Documents, upload a PDF or image.
**Expected:** File uploads without error; document appears in list with PENDING status; file visible in Google Drive under the client named folder.
**Why human:** Requires live GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN, and GOOGLE_DRIVE_ROOT_FOLDER_ID env vars configured.

#### 2. Client Document Download

**Test:** In the client Documents view, click the download icon on any document.
**Expected:** Browser triggers a file download via the /api/documents/download/ proxy; file opens correctly; file name matches the original.
**Why human:** Streaming through Drive API requires live credentials; file integrity cannot be verified statically.

#### 3. Admin Document Upload with Email Notification

**Test:** Log in as admin, navigate to any client detail page, upload a file via the Documents section.
**Expected:** File uploads and shows as APPROVED immediately; appears in client Drive folder; client receives email with document name and view link.
**Why human:** Requires both Drive credentials AND Resend API key configured; email delivery is external.

#### 4. New Client Drive Folder Creation

**Test:** Create a new client via admin panel; check Google Drive a few seconds later.
**Expected:** A new folder named {companyName} - {clientId} appears inside the root Drive folder.
**Why human:** Fire-and-forget async operation with no synchronous feedback to UI; requires Drive account access to verify.

#### 5. Production Credential Configuration (HIGH PRIORITY)

**Test:** Check .env (local) and Vercel dashboard environment variables.
**Expected:** These variables are set: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN, GOOGLE_DRIVE_ROOT_FOLDER_ID. The service account variables (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) are NOT what the code requires.
**Why human:** The SUMMARY documented service account vars but the code uses OAuth2. If only service account vars are configured, ALL Drive operations will fail at runtime with a missing env var error.

---

## Gaps Summary

No code gaps found. All 8 must-haves are structurally implemented and wired. The phase goal is achievable pending human confirmation of external service connectivity and environment variable correctness -- specifically the OAuth2 vs service account credential discrepancy between SUMMARY documentation and actual implementation.

---

_Verified: 2026-02-20T12:30:00Z_
_Verifier: Claude (gsd-verifier)_