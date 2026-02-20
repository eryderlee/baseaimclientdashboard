---
phase: 09-document-storage-migration
plan: 01
subsystem: infra
tags: [google-drive, googleapis, service-account, prisma, next-config, server-only]

# Dependency graph
requires:
  - phase: 08-email-infrastructure
    provides: lib/email.ts server-only module pattern (imported by reference)
provides:
  - lib/google-drive.ts with 6 exported Drive helper functions
  - Client.driveFolderId field in Prisma schema and database
  - @googleapis/drive and google-auth-library in serverExternalPackages
affects:
  - 09-02 (folder creation at client onboarding - uses createClientDriveFolder)
  - 09-03 (file upload - uses uploadFileToDrive and getDriveClient)
  - 09-04 (file download - uses streamFileFromDrive and listFilesInFolder)
  - 09-05 (file delete and migration - uses deleteFileFromDrive)

# Tech tracking
tech-stack:
  added:
    - "@googleapis/drive@20.1.0"
    - "google-auth-library@10.5.0"
  patterns:
    - "Server-only Drive client singleton (module-scope caching, same as lib/prisma.ts)"
    - "Individual env vars for service account (GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) — avoids newline corruption"
    - "privateKey.replace(/\\\\n/g, '\\n') for Vercel env var newline restoration"
    - "serverExternalPackages for large googleapis packages to prevent 250 MB bundle limit"

key-files:
  created:
    - "lib/google-drive.ts"
  modified:
    - "next.config.ts"
    - "prisma/schema.prisma"
    - "package.json"
    - "package-lock.json"

key-decisions:
  - "Use @googleapis/drive subpackage (not full googleapis) — avoids Vercel 250 MB bundle limit"
  - "Store credentials as two env vars (email + private key) not full JSON — prevents newline corruption"
  - "Singleton Drive client in module scope — same pattern as lib/prisma.ts"
  - "responseType: 'stream' with cast to unknown as NodeJS.ReadableStream — known googleapis TypeScript inference bug"
  - "driveFolderId nullable (String?) on Client — existing clients start with null, populated lazily or via migration"
  - "Use drive named export from @googleapis/drive (not google.drive) — @googleapis/* subpackages export drive directly"

patterns-established:
  - "Pattern: import { drive } from '@googleapis/drive' (not google as googleDrive — google export does not exist in subpackage)"
  - "Pattern: let client: Type | undefined for singleton (not null) to avoid TypeScript assignment narrowing errors"

# Metrics
duration: 6min
completed: 2026-02-20
---

# Phase 9 Plan 01: Google Drive Foundation Summary

**@googleapis/drive singleton with 6 helper functions (create folder, upload, stream, delete, list), driveFolderId on Client model, and serverExternalPackages config for Vercel bundle safety**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-20T09:30:50Z
- **Completed:** 2026-02-20T09:36:38Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Installed @googleapis/drive@20.1.0 and google-auth-library@10.5.0
- Created lib/google-drive.ts with server-only singleton and all 6 required helper functions
- Added driveFolderId String? field to Client model and applied to database via prisma db push
- Configured next.config.ts serverExternalPackages to prevent googleapis bundle bloat on Vercel

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and update Next.js config** - `dd23e61` (chore)
2. **Task 2: Create Drive client singleton and helper functions + update Prisma schema** - `db86ab8` (feat)

**Plan metadata:** (docs commit - see below)

## Files Created/Modified

- `lib/google-drive.ts` - Drive client singleton, getDriveClient(), createClientDriveFolder(), uploadFileToDrive(), streamFileFromDrive(), deleteFileFromDrive(), listFilesInFolder()
- `prisma/schema.prisma` - Added driveFolderId String? to Client model
- `next.config.ts` - Added @googleapis/drive and google-auth-library to serverExternalPackages
- `package.json` - Added @googleapis/drive@20.1.0 and google-auth-library@10.5.0
- `package-lock.json` - Lockfile updated with 57 new packages

## Decisions Made

- **@googleapis/drive vs googleapis**: Used the Drive-only subpackage. The full googleapis package bundles all Google API clients and can exceed Vercel's 250 MB serverless function bundle limit.
- **Credential storage**: Two separate env vars (GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) instead of a full JSON string. Prevents private key newline corruption across shells, CI, and Vercel dashboard.
- **Singleton pattern**: `let driveClient: drive_v3.Drive | undefined` at module scope. Reuses the authenticated client across requests in the same module instance. Same approach as lib/prisma.ts.
- **import { drive } not google.drive**: The @googleapis/drive subpackage exports `drive` directly. The `google` namespace export does not exist in subpackages (only in the full googleapis package). Fixed this TypeScript error during Task 2 execution.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed incorrect import pattern for @googleapis/drive**

- **Found during:** Task 2 (Create Drive client singleton)
- **Issue:** Research code examples used `import { google as googleDrive } from '@googleapis/drive'` and `googleDrive.drive({ version: 'v3', auth })`. The `google` named export does not exist in the @googleapis/drive subpackage — it only exists in the full googleapis package. TypeScript error: `Module '@googleapis/drive' has no exported member 'google'`.
- **Fix:** Changed to `import { drive as createDrive } from '@googleapis/drive'` and `createDrive({ version: 'v3', auth })`. Verified by inspecting actual package exports with `node -e "console.log(Object.keys(require('@googleapis/drive')))"`.
- **Files modified:** lib/google-drive.ts
- **Verification:** `npx tsc --noEmit --skipLibCheck` passes with no errors.
- **Committed in:** db86ab8 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed singleton type from null to undefined**

- **Found during:** Task 2 (Create Drive client singleton), same TypeScript pass
- **Issue:** `let driveClient: drive_v3.Drive | null = null` caused TypeScript error: `Type 'Drive | null' is not assignable to type 'Drive'` when returning `driveClient` after the null check. TypeScript's control flow narrowing doesn't narrow past `| null` in singleton patterns.
- **Fix:** Changed to `let driveClient: drive_v3.Drive | undefined` — TypeScript correctly narrows `undefined` away after the `if (driveClient) return driveClient` guard.
- **Files modified:** lib/google-drive.ts
- **Verification:** `npx tsc --noEmit --skipLibCheck` passes.
- **Committed in:** db86ab8 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - Bug)
**Impact on plan:** Both fixes were TypeScript compilation errors in the new file — mandatory to resolve before other plans can import and use lib/google-drive.ts. No scope creep.

## Issues Encountered

- `npx prisma generate` returned EPERM on Windows because the Next.js dev server had the Prisma client DLL file locked. This is a known Windows file lock limitation. The `prisma db push` command (which calls generate internally) succeeded in applying the schema to the database before the rename failed — the database schema is in sync. The DLL will be regenerated on next `npm run dev` restart. This is a development environment artifact and does not affect production deployments (Vercel generates its own Prisma client during build).

## User Setup Required

**External services require manual configuration before Phase 9 Plans 02-05 can be tested.**

Before testing Google Drive functionality, complete the following:

1. **Create Google Cloud project** (or use existing): Google Cloud Console -> New Project
2. **Enable Google Drive API**: APIs & Services -> Library -> Google Drive API -> Enable
3. **Create service account**: IAM & Admin -> Service Accounts -> Create Service Account
4. **Generate JSON key**: Service Accounts -> [account] -> Keys -> Add Key -> JSON
5. **Create root Drive folder**: Create a folder in Drive (or the service account's Drive), copy the folder ID from the URL
6. **Share root folder with admin Gmail** (optional, for human visibility): Right-click folder -> Share -> Add your Gmail as Editor
7. **Add env vars** to `.env` and Vercel dashboard:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` = `client_email` field from JSON key
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` = `private_key` field from JSON key
   - `GOOGLE_DRIVE_ROOT_FOLDER_ID` = folder ID from the URL of the root folder

## Next Phase Readiness

- Foundation complete. Plans 02-05 can now import from lib/google-drive.ts
- Plan 02 (folder creation at client onboarding) depends on `createClientDriveFolder` and `Client.driveFolderId` — both ready
- Plan 03 (file upload) depends on `uploadFileToDrive` and `Client.driveFolderId` — both ready
- Plan 04 (file download/list) depends on `streamFileFromDrive` and `listFilesInFolder` — both ready
- Plan 05 (delete + migration) depends on `deleteFileFromDrive` — ready
- No blockers for code work. Google Cloud setup is the only prerequisite for end-to-end testing.

---
*Phase: 09-document-storage-migration*
*Completed: 2026-02-20*
