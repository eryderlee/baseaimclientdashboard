# Phase 9: Document Storage Migration - Research

**Researched:** 2026-02-20
**Domain:** Google Drive API v3, googleapis npm, service account auth, file upload/download streaming, Vercel serverless limits
**Confidence:** HIGH (core Drive API patterns verified against official docs; bundle size risks verified against Vercel docs; code patterns cross-referenced from multiple sources)

---

## Summary

Phase 9 replaces Vercel Blob with Google Drive as the document storage backend. The scope is well-bounded: there are exactly two API route files that use Vercel Blob today (`app/api/documents/upload/route.ts` and `app/api/documents/[id]/route.ts`), two UI components (`DocumentList`, `DocumentUpload`), and one client-facing page (`/dashboard/documents`). There is no admin document upload UI yet — that must be built from scratch.

The standard approach is the `googleapis` npm package (or its lighter subpackage `@googleapis/drive`) with a Google Cloud service account. The service account's JSON credentials get stored as environment variables, not a file on disk, which works correctly on Vercel. The key database change is adding a `driveFolderId` field to the `Client` model so each client's Drive folder ID persists.

The most important risks are: (1) the Vercel 4.5 MB request/response body limit — file downloads through a serverless function must use streaming or signed URLs, and uploads of large files must use resumable uploads; (2) the `googleapis` full package is large and may cause bundle bloat — using `@googleapis/drive` (the subpackage) and adding it to `serverExternalPackages` in `next.config.ts` solves this; (3) service account private keys contain literal newlines that JSON.stringify/parse can mangle — the private key env var requires special handling.

**Primary recommendation:** Use `@googleapis/drive` (the subpackage, not the full `googleapis` package), add it to `serverExternalPackages`, store credentials as individual env vars (client_email + private_key), stream downloads directly to the Next.js `Response`, and use resumable uploads for files >5 MB.

---

## Current State Audit

### Vercel Blob Usage (Files to Replace)

| File | What It Does | Replacement Required |
|------|-------------|---------------------|
| `app/api/documents/upload/route.ts` | `put(file.name, file, { access: 'public' })` — uploads to Vercel Blob, returns URL stored in DB | Replace with Drive upload, store Drive file ID |
| `app/api/documents/[id]/route.ts` | `del(document.fileUrl)` — deletes from Vercel Blob on document delete | Replace with Drive `files.delete(fileId)` |
| `components/dashboard/document-list.tsx` | `window.open(doc.fileUrl, "_blank")` — opens Vercel public URL directly | Replace with a download proxy route |

### Database Schema (Current)

```prisma
model Document {
  id          String         @id @default(cuid())
  clientId    String
  title       String
  description String?
  fileUrl     String         // Stores Vercel Blob URL — will store Drive file ID after migration
  fileName    String
  fileSize    Int
  fileType    String
  status      DocumentStatus @default(PENDING)
  uploadedBy  String
  folderId    String?        // Local Folder model FK (NOT Google Drive folder ID)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  client      Client         @relation(...)
  folder      Folder?        @relation(...)
}

model Client {
  // No driveFolderId field exists yet — must be added
  id              String    @id @default(cuid())
  ...
}
```

### Required Schema Changes

Two schema migrations are needed:

1. **Add `driveFolderId` to `Client`**: Stores the Google Drive folder ID created at client onboarding. This enables the admin to upload to a specific client's folder without searching Drive every time.

```prisma
model Client {
  driveFolderId   String?   // Google Drive folder ID for this client's documents
  ...
}
```

2. **Repurpose `fileUrl` in `Document`**: After migration, `fileUrl` will store the Google Drive file ID (not a URL). Consider renaming to `driveFileId` OR keeping `fileUrl` but documenting that it now holds a Drive file ID. Keeping `fileUrl` avoids a breaking rename but makes the semantics misleading. **Recommendation: rename to `driveFileId` via a non-breaking migration** (add new field, copy data, drop old field — or just rename with Prisma).

Alternatively: keep `fileUrl` as a generic "storage reference" field and document that for Google Drive items it holds the Drive file ID. This avoids a schema rename. This is pragmatic for an internal dashboard. Either approach works — the plan should pick one.

### No Existing Admin Document Upload UI

The admin client detail page (`app/admin/clients/[clientId]/page.tsx`) currently only shows milestones. There is no admin document upload section. DRIVE-04 requires building this from scratch, following the same pattern as the client-facing `DocumentUpload` component.

### Email Template Already Ready

`DocumentUploadedEmail` template exists at `emails/document-uploaded.tsx` and `sendDocumentUploadedEmail` is already implemented in `lib/email.ts`. No email work needed in Phase 9.

### `fileUrl` in DocumentList Currently Opens Vercel URL Directly

`window.open(doc.fileUrl, "_blank")` works for Vercel Blob because files are publicly accessible. With Google Drive, files will not be publicly accessible — they live in a service account's Drive. The download button must be changed to call a server-side proxy endpoint that fetches the file from Drive and streams it to the client.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@googleapis/drive` | Latest (~8.x) | Google Drive API v3 client | Official Google subpackage for Drive-only use; lighter than full `googleapis` |
| `google-auth-library` | Latest (~9.x) | Service account JWT auth | `@googleapis/drive` depends on this; provides `GoogleAuth` class |

### Why `@googleapis/drive` Over `googleapis`

The full `googleapis` package bundles clients for ALL Google APIs (Sheets, Gmail, Calendar, etc.). This can cause the Vercel 250 MB serverless function bundle limit to be exceeded. The subpackage `@googleapis/drive` includes only Drive v3. It's maintained by Google and is a drop-in for Drive use cases.

**Installation:**
```bash
npm install @googleapis/drive google-auth-library
```

**Important: Add to `serverExternalPackages` in `next.config.ts`:**
```typescript
const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', 'prisma', '@googleapis/drive', 'google-auth-library'],
  // ...
}
```
This prevents Next.js from bundling these into each serverless function chunk, keeping bundle sizes within Vercel's 250 MB limit.

### Supporting
| Library | Purpose | When to Use |
|---------|---------|-------------|
| `@vercel/blob` (keep temporarily) | Migration script needs to read existing files | Remove after migration completes |

---

## Architecture Patterns

### Recommended Project Structure

```
lib/
├── google-drive.ts          # Google Drive client singleton + helper functions
app/
├── api/
│   ├── documents/
│   │   ├── upload/
│   │   │   └── route.ts     # Replace Vercel Blob with Drive upload
│   │   ├── download/
│   │   │   └── [fileId]/
│   │   │       └── route.ts # New: proxy download from Drive (stream to response)
│   │   └── [id]/
│   │       └── route.ts     # Replace Blob del with Drive files.delete
│   └── admin/
│       └── documents/
│           └── upload/
│               └── route.ts # New: admin upload to specific client's folder
├── dashboard/
│   └── documents/
│       └── page.tsx         # Minimal change: swap fileUrl for Drive download URL
└── admin/
    └── clients/
        └── [clientId]/
            └── page.tsx     # Add document upload section for admin (DRIVE-04)
components/
├── dashboard/
│   ├── document-list.tsx    # Change download action to use proxy route
│   └── document-upload.tsx  # Minimal or no changes needed
└── admin/
    └── client-documents.tsx # New: admin document upload component
scripts/
└── migrate-blob-to-drive.ts # One-time migration script
```

### Pattern 1: Google Drive Client Singleton

Create `lib/google-drive.ts` as the single place where the Drive client is initialized. Follow the same pattern as `lib/prisma.ts` (singleton in development, fresh in production).

```typescript
// lib/google-drive.ts
import 'server-only'
import { google } from '@googleapis/drive'
import { GoogleAuth } from 'google-auth-library'

// Credentials stored as individual env vars to avoid JSON escaping issues
function getGoogleAuth(): GoogleAuth {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!clientEmail || !privateKey) {
    throw new Error('Google service account credentials not configured')
  }

  return new GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
}

export function getDriveClient() {
  const auth = getGoogleAuth()
  return google.drive({ version: 'v3', auth })
}
```

**Why individual env vars, not JSON string**: The service account JSON contains a private key with literal `\n` newline characters. When the entire JSON is stored as a single env var, shell escaping and JSON.parse interactions often corrupt these newlines. Storing `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` as separate vars, and replacing `\\n` with `\n` at runtime, is the reliable pattern for Vercel deployments.

### Pattern 2: Folder Creation at Client Onboarding

Hook into `createClient()` in `app/admin/actions.ts`. After the Prisma transaction succeeds, create the Google Drive folder and store its ID.

```typescript
// In app/admin/actions.ts createClient()
// After the prisma.$transaction succeeds:

const driveClient = getDriveClient()
const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID // Parent folder in Drive

const folder = await driveClient.files.create({
  requestBody: {
    name: `${companyName} - ${client.id}`, // Unique name using client ID
    mimeType: 'application/vnd.google-apps.folder',
    parents: rootFolderId ? [rootFolderId] : undefined,
  },
  fields: 'id,name',
})

// Store folder ID on client record
await prisma.client.update({
  where: { id: client.id },
  data: { driveFolderId: folder.data.id },
})
```

**Folder naming convention**: Use `{companyName} - {clientId}` format. The clientId suffix ensures uniqueness even if two companies have the same name. The clientId is a CUID so it's readable but unique.

**Root folder**: A single root folder in the service account's Drive (or a Shared Drive if using Workspace) serves as the parent for all client folders. Store its ID as `GOOGLE_DRIVE_ROOT_FOLDER_ID` env var. If not set, folders are created in Drive root.

**Important**: The service account DOES NOT belong to your Google Workspace domain. If you want these folders to appear in a human admin's Google Drive, you must share the root folder with the admin's email address via the Drive API permissions (or do it manually via Drive UI initially). Files created by the service account in its own Drive are not automatically visible to humans.

### Pattern 3: File Upload Route

Replace the Vercel Blob upload in `app/api/documents/upload/route.ts`.

```typescript
// Upload pattern - multipart for files <= 5MB, resumable for larger
const drive = getDriveClient()
const folderId = clientRecord.driveFolderId

// For files up to 5MB (most documents, PDFs):
const driveFile = await drive.files.create({
  requestBody: {
    name: file.name,
    mimeType: file.type,
    parents: [folderId],
  },
  media: {
    mimeType: file.type,
    body: Readable.from(Buffer.from(await file.arrayBuffer())),
  },
  fields: 'id,name,size,mimeType,webViewLink',
})

// Store driveFileId (not a URL) in the Document record
// fileUrl field stores the Drive file ID
```

**For files >5MB**: Use resumable upload. The googleapis client handles this transparently when using `media` parameter — the library detects file size and automatically uses resumable upload when appropriate.

### Pattern 4: File Download (Streaming Proxy)

Files in the service account's Drive are NOT publicly accessible. Implement a proxy API route that fetches from Drive and streams to the client browser.

```typescript
// app/api/documents/download/[fileId]/route.ts
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  // 1. Auth check (verify user owns this document)
  // 2. Fetch file metadata (name, mimeType)
  // 3. Stream from Drive to response

  const drive = getDriveClient()
  const { fileId } = await params

  // Get file metadata first
  const meta = await drive.files.get({
    fileId,
    fields: 'name,mimeType,size',
  })

  // Stream the file content
  const driveResponse = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  )

  // Return as a streaming Response
  // Note: Cast needed due to TypeScript inference issues with responseType
  const stream = driveResponse.data as unknown as NodeJS.ReadableStream

  return new Response(stream as unknown as ReadableStream, {
    headers: {
      'Content-Type': meta.data.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${meta.data.name}"`,
    },
  })
}
```

**Vercel 4.5 MB Response Limit**: This is the critical concern. The 4.5 MB limit applies to the **response body** of standard serverless functions. For large files (videos, large PDFs), streaming bypasses this limit since Vercel does not enforce the 4.5 MB limit on streaming responses — it only applies to buffered responses. However, the Vercel documentation is unclear on whether Node.js runtime streaming is fully exempt. **LOW confidence — validate this during implementation.** A safe alternative for large files: generate a short-lived signed download URL from Google Drive and redirect the client to it (Google Drive's `webContentLink` requires the user to be logged in as the file owner, so this doesn't work for service account files). The streaming approach is the correct solution.

### Pattern 5: Admin Document Upload

Build a new admin upload component following the same pattern as `DocumentUpload` but posting to an admin-specific endpoint that accepts a `clientId` parameter.

```typescript
// app/api/admin/documents/upload/route.ts
// Similar to the client upload route but:
// 1. Verifies ADMIN role
// 2. Accepts clientId in form data
// 3. Finds that client's driveFolderId from DB
// 4. Sends document-uploaded email notification after successful upload
```

### Anti-Patterns to Avoid

- **Storing the full service account JSON as a single env var**: Private key newlines get corrupted across shells, CI systems, and Vercel dashboard. Store email and private key separately.
- **Making Drive files public**: Don't use `permissions.create({ role: 'reader', type: 'anyone' })` — defeats the purpose of secure document storage.
- **Loading Drive files into memory for download**: Never do `const buffer = await drive.files.get({ alt: 'media' })` without `responseType: 'stream'` — this loads the entire file into memory, crashes on large files, and triggers the 4.5 MB response limit.
- **Not adding `@googleapis/drive` to `serverExternalPackages`**: Will cause bundle bloat and potential 250 MB limit errors on Vercel.
- **Calling `getDriveClient()` outside server-only files**: Add `import 'server-only'` to `lib/google-drive.ts` to prevent accidental client-side import.
- **Putting folder creation inside the Prisma transaction**: Drive API calls are external HTTP requests — they will not roll back if the transaction fails. Call Drive AFTER the transaction commits, and handle Drive failures gracefully (don't fail client creation if Drive folder creation fails — just log and allow retry).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT signing for service account | Custom JWT implementation | `google-auth-library`'s `GoogleAuth` | RS256 signing, token caching, auto-refresh |
| Resumable upload chunking | Manual chunk splitting | `googleapis` client's `media` parameter | Library auto-detects file size and switches to resumable |
| Rate limit retry logic | Custom exponential backoff | `googleapis` client's built-in retry | Library handles 429/403 with backoff internally |
| Drive file URL construction | Custom URL building | Drive API `webViewLink` / `webContentLink` fields | These fields already exist in the API response |

**Key insight:** The googleapis client library handles authentication token refresh, retry on rate limits, and multipart vs resumable upload selection automatically. The main custom code needed is the streaming download proxy and the folder-per-client organization logic.

---

## Common Pitfalls

### Pitfall 1: Private Key Newline Corruption
**What goes wrong:** `Error: error:09091064:PEM routines:PEM_read_bio:no start line` or similar crypto errors during auth.
**Why it happens:** Service account JSON private keys contain literal `\n` characters. When stored as an env var in Vercel dashboard, these display correctly but get double-escaped when read by process.env. When parsed as a JSON string env var, the escaping is corrupted.
**How to avoid:** Store `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` as a separate env var (not embedded in JSON). In `next.config.ts`, ensure the key is NOT wrapped in quotes. In code, do `privateKey.replace(/\\n/g, '\n')` before using. Verify with `console.log(privateKey.substring(0, 30))` — should start with `-----BEGIN RSA PRIVATE KEY-----`.
**Warning signs:** Auth errors on Vercel but not locally; empty private key variable.

### Pitfall 2: Service Account Files Not Visible to Humans
**What goes wrong:** Files uploaded to Drive appear to upload successfully but are invisible when a human browses Google Drive.
**Why it happens:** Service accounts have their own Drive storage, separate from personal accounts. Files created by the service account live in the service account's Drive, which humans cannot access without being explicitly granted permission.
**How to avoid:** Two options: (a) Share the root folder with the admin's Gmail account via `drive.permissions.create()` when first setting up — this makes the client folders visible to the admin in their Drive UI. Or (b) use a Shared Drive (Google Workspace feature) where files are organizationally owned. Option (a) is simpler for a small operation.
**Warning signs:** Upload succeeds (returns a file ID), but browsing Drive shows nothing.

### Pitfall 3: `googleapis` Bundle Size on Vercel
**What goes wrong:** Vercel deployment fails with "Serverless Function has exceeded the unzipped maximum size of 250 MB."
**Why it happens:** The full `googleapis` package bundles clients for all Google APIs and is very large.
**How to avoid:** Use `@googleapis/drive` subpackage, and add it to `serverExternalPackages` in `next.config.ts`.
**Warning signs:** Deployment builds succeed locally but fail on Vercel; function bundle size warnings in build output.

### Pitfall 4: Vercel 4.5 MB Buffered Response Limit
**What goes wrong:** Large file downloads (videos, large PDFs) fail with `413: FUNCTION_PAYLOAD_TOO_LARGE`.
**Why it happens:** Vercel serverless functions have a 4.5 MB response body limit for buffered (non-streaming) responses.
**How to avoid:** Always use `responseType: 'stream'` when calling `drive.files.get` with `alt: 'media'`. Return a `Response` with a `ReadableStream`. Do not buffer the file in memory.
**Warning signs:** Downloads work for small files (<4.5 MB) but fail for large ones.

### Pitfall 5: Folder Creation Race Condition / Failure During Client Creation
**What goes wrong:** Client creation transaction succeeds but Drive folder creation fails. Client exists in DB with no `driveFolderId`. Uploads then fail because there's no folder to upload to.
**Why it happens:** Drive API call is an external HTTP request after the DB transaction — it's not atomic.
**How to avoid:** (a) Don't fail client creation if Drive folder creation fails — log the error and continue. (b) Add a retry mechanism or "create folder on first upload if missing" fallback in the upload route. (c) Build an admin utility to create missing Drive folders for existing clients (needed for migration anyway).
**Warning signs:** `driveFolderId` is null on some client records.

### Pitfall 6: `driveFolderId` Missing for Existing Clients
**What goes wrong:** After adding `driveFolderId` to the `Client` model and deploying, existing clients have `null` for this field. Uploads fail.
**Why it happens:** Schema migration adds the nullable field — it defaults to null. Existing clients don't get a Drive folder automatically.
**How to avoid:** The Vercel Blob migration script must also create Drive folders for all existing clients and populate `driveFolderId`.
**Warning signs:** Upload route throws "No Drive folder found for client" for existing clients.

### Pitfall 7: TypeScript Inference Issue with `drive.files.get` responseType
**What goes wrong:** TypeScript compiler error: `Property 'data' does not exist on type 'GaxiosResponse<Schema$File>'` when using `responseType: 'stream'`.
**Why it happens:** The `drive.files.get` return type is overloaded based on `responseType` but TypeScript doesn't always infer the stream variant correctly.
**How to avoid:** Use explicit type casting: `const stream = (response as any).data as NodeJS.ReadableStream`. This is a known limitation of the googleapis TypeScript types (GitHub issues #1768, #2052).

---

## Code Examples

### Service Account Auth Setup (Verified Pattern)
```typescript
// lib/google-drive.ts
import 'server-only'
import { drive_v3 } from '@googleapis/drive'
import { google as googleDrive } from '@googleapis/drive'
import { GoogleAuth } from 'google-auth-library'

let driveClient: drive_v3.Drive | null = null

export function getDriveClient(): drive_v3.Drive {
  if (driveClient) return driveClient

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!clientEmail || !privateKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY must be set')
  }

  const auth = new GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  })

  driveClient = googleDrive.drive({ version: 'v3', auth })
  return driveClient
}
```

### Create Client Folder (Verified Pattern)
```typescript
// Source: Google Drive API docs - folders guide
async function createClientDriveFolder(
  companyName: string,
  clientId: string
): Promise<string> {
  const drive = getDriveClient()
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID

  const response = await drive.files.create({
    requestBody: {
      name: `${companyName} - ${clientId}`,
      mimeType: 'application/vnd.google-apps.folder',
      parents: rootFolderId ? [rootFolderId] : [],
    },
    fields: 'id',
  })

  if (!response.data.id) {
    throw new Error('Drive folder creation failed: no ID returned')
  }

  return response.data.id
}
```

### List Files in Folder (Verified Pattern)
```typescript
// Source: Google Drive API docs - search files guide
async function listFilesInFolder(folderId: string) {
  const drive = getDriveClient()

  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id,name,mimeType,size,createdTime,modifiedTime)',
    orderBy: 'createdTime desc',
    pageSize: 100, // Max 1000, drive.files.list ignores > 1000
  })

  return response.data.files || []
}
```

### Upload File to Drive (Verified Pattern)
```typescript
// Source: googleapis sample - drive/upload.js
import { Readable } from 'stream'

async function uploadFileToDrive(
  file: File,
  folderId: string
): Promise<string> {
  const drive = getDriveClient()
  const buffer = Buffer.from(await file.arrayBuffer())

  const response = await drive.files.create({
    requestBody: {
      name: file.name,
      mimeType: file.type,
      parents: [folderId],
    },
    media: {
      mimeType: file.type,
      body: Readable.from(buffer),
    },
    fields: 'id,name,size',
  })

  if (!response.data.id) {
    throw new Error('File upload failed: no ID returned')
  }

  return response.data.id
}
```

### Stream Download from Drive (Verified Pattern)
```typescript
// Source: googleapis sample - drive/download.js (adapted for Next.js Response)
async function streamFileFromDrive(
  driveFileId: string
): Promise<{ stream: NodeJS.ReadableStream; mimeType: string; fileName: string }> {
  const drive = getDriveClient()

  // Get metadata first
  const meta = await drive.files.get({
    fileId: driveFileId,
    fields: 'name,mimeType',
  })

  // Get content as stream
  const response = await drive.files.get(
    { fileId: driveFileId, alt: 'media' },
    { responseType: 'stream' }
  )

  return {
    stream: response.data as unknown as NodeJS.ReadableStream,
    mimeType: meta.data.mimeType || 'application/octet-stream',
    fileName: meta.data.name || driveFileId,
  }
}
```

### Delete File from Drive
```typescript
async function deleteFileFromDrive(driveFileId: string): Promise<void> {
  const drive = getDriveClient()
  await drive.files.delete({ fileId: driveFileId })
}
```

---

## Migration Strategy

### Vercel Blob Audit

**Current state is unknown** — STATE.md notes this explicitly. Before migration, run an audit:

```typescript
// scripts/audit-blob-documents.ts
// Query DB for all documents where fileUrl contains 'vercel-storage.com' or 'blob.vercel'
const blobDocuments = await prisma.document.findMany({
  where: {
    fileUrl: {
      contains: 'vercel-storage.com'
    }
  },
  include: { client: true }
})
// Log count, total size, file types
```

Given that the Vercel Blob token in `.env` is empty (`BLOB_READ_WRITE_TOKEN=""`), the production app may have never actually uploaded to Vercel Blob — the upload route uses a local fallback (`/uploads/${file.name}`) when the token is absent. **This means there may be zero files to migrate from Vercel Blob.** Verify this in the audit before building a complex migration script.

### Migration Script Approach

```typescript
// scripts/migrate-blob-to-drive.ts
// Run once, from local machine with BLOB_READ_WRITE_TOKEN and Google credentials set

async function migrate() {
  // 1. Create Drive folders for all clients missing driveFolderId
  // 2. For each document with a Vercel Blob URL:
  //    a. Fetch file from Vercel Blob URL
  //    b. Upload to client's Drive folder
  //    c. Update document.fileUrl with Drive file ID
  // 3. Log successes and failures
  // 4. Do NOT delete from Blob yet — verify first
}
```

**Run this as a one-off script via `tsx scripts/migrate-blob-to-drive.ts`** — same pattern as `prisma/seed-milestones.ts`. Not a deployment action.

### Migration Order

1. Deploy schema change (add `driveFolderId` to Client, optional rename in Document)
2. Run folder creation for all existing clients (all get `driveFolderId` populated)
3. Run blob-to-drive file migration (update `fileUrl` / `driveFileId` values)
4. Deploy new upload/download routes pointing to Drive
5. Verify, then remove Vercel Blob dependency

---

## Key Technical Decisions

### Decision 1: `@googleapis/drive` vs `googleapis`

**Use `@googleapis/drive`.** The full package is massive and risks hitting Vercel's 250 MB function bundle limit. The subpackage is maintained by Google, has the same API, and only includes Drive v3. Installation: `npm install @googleapis/drive google-auth-library`.

### Decision 2: Credential Storage in Env Vars

**Store credentials as two separate env vars:**
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` — the service account email
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` — the private key (with literal `\n` chars; Vercel handles this correctly in the dashboard)
- `GOOGLE_DRIVE_ROOT_FOLDER_ID` — the ID of the root folder where client folders are created

**Do NOT** store the full JSON as a single env var.

### Decision 3: Files Stay Private (No Public URLs)

Drive files uploaded by the service account are private. Access flows through a server-side proxy (`/api/documents/download/[fileId]`). This is the correct security model for client documents. No `permissions.create({ role: 'reader', type: 'anyone' })`.

### Decision 4: `fileUrl` Column Strategy

The current `fileUrl` column in the `Document` model stores Vercel Blob URLs. Post-migration, it will store Google Drive file IDs. Two options:

- **Option A**: Keep column named `fileUrl` — it's a generic "storage reference" field. Update comment in schema. Simple, no rename migration.
- **Option B**: Rename to `driveFileId` via Prisma migration — semantically accurate, but requires updating all references.

**Recommendation: Option A** for simplicity. The column is internal-only (no public API consumers), and a comment update in the schema is sufficient.

### Decision 5: Folder Creation Timing (Non-Atomic with Client Creation)

Google Drive folder creation is an external API call — it cannot be atomic with the Prisma transaction. Call Drive AFTER the transaction commits. If Drive fails, log the error but do not roll back the client creation. Handle `null` `driveFolderId` gracefully in upload routes (create the folder on demand if missing, similar to a lazy initialization pattern).

### Decision 6: Upload Route Architecture

Keep the upload as a Next.js API Route (`/api/documents/upload`) rather than a Server Action. Reason: Server Actions cannot stream progress feedback and have complex handling for large file uploads via FormData. The existing route pattern already handles FormData uploads — just replace the Vercel Blob call.

### Decision 7: Admin Upload UI

Build a new component `components/admin/client-documents.tsx` following the same pattern as the existing `DocumentUpload` component. It posts to a separate admin endpoint (`/api/admin/documents/upload`) that verifies ADMIN role, accepts `clientId`, and triggers the document-uploaded email.

---

## Vercel Environment Variables Configuration

New env vars required:

```bash
# Google Drive (Phase 9)
GOOGLE_SERVICE_ACCOUNT_EMAIL="drive-service@project-id.iam.gserviceaccount.com"
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GOOGLE_DRIVE_ROOT_FOLDER_ID="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"
```

In Vercel dashboard: each value on its own line, no quotes needed. The private key with `\n` characters is entered literally in the Vercel dashboard textarea — Vercel preserves these correctly.

In local `.env`: same format as above. No `BLOB_READ_WRITE_TOKEN` needed for new code (keep it in env for the migration script).

---

## Google Cloud Setup Prerequisites (Not Code)

The planner should include tasks for these setup steps that must be done before any code is deployed:

1. Create a Google Cloud project (or use existing)
2. Enable the Google Drive API in Google Cloud Console
3. Create a service account with appropriate permissions
4. Generate and download a JSON key file
5. Create a root folder in the service account's Drive (or a Shared Drive if using Workspace)
6. Optionally share the root folder with the admin's Gmail account for visibility
7. Extract email and private key from the JSON key file
8. Add env vars to Vercel dashboard and local `.env`

This setup is prerequisite to all implementation tasks. It should be Plan 09-01 (setup/configuration).

---

## Plan Breakdown Recommendation

### Plan 09-01: Google Cloud Setup + Drive Client + Schema Changes
- Google Cloud project setup, Drive API enablement, service account creation (instructions for human to complete)
- Prisma schema: add `driveFolderId` to Client model (nullable)
- Create `lib/google-drive.ts` with `getDriveClient()` singleton
- Add `@googleapis/drive` and `google-auth-library` to dependencies
- Add to `serverExternalPackages` in `next.config.ts`
- Env var documentation in `.env.example`
- Test Drive connection

### Plan 09-02: Folder Creation on Client Onboarding (DRIVE-05)
- Modify `createClient()` in `app/admin/actions.ts` to call `createClientDriveFolder()` after transaction
- Handle failure gracefully (don't block client creation)
- Create Drive folders for all existing clients (script or admin utility)

### Plan 09-03: File Upload to Drive (DRIVE-03, DRIVE-04)
- Replace Vercel Blob upload in `app/api/documents/upload/route.ts`
- Build new admin upload endpoint `app/api/admin/documents/upload/route.ts`
- Build admin `client-documents.tsx` component
- Wire admin document section into admin client detail page
- Trigger `sendDocumentUploadedEmail` on admin upload

### Plan 09-04: File Download + List from Drive (DRIVE-01, DRIVE-02, DRIVE-06)
- Build download proxy `app/api/documents/download/[fileId]/route.ts`
- Update `DocumentList` component to use download proxy instead of `window.open(doc.fileUrl)`
- Update documents page to optionally fetch from Drive API directly (if listing from Drive rather than DB)
- Ensure UI design remains unchanged (DRIVE-06)

### Plan 09-05: Delete + Migration (DRIVE-07, DRIVE-08)
- Update `app/api/documents/[id]/route.ts` DELETE handler to call `drive.files.delete`
- Audit existing Vercel Blob documents (count, size, file types)
- Write migration script `scripts/migrate-blob-to-drive.ts`
- Run migration in correct order
- Verify and remove Vercel Blob dependency

---

## Open Questions

1. **Is `BLOB_READ_WRITE_TOKEN` actually configured in production?**
   - What we know: It's empty in `.env` — uploads fall back to `/uploads/{filename}` (local dev path, not functional in production)
   - What's unclear: If production Vercel has the real token set, there are real files to migrate. If not, there are zero Blob files to migrate.
   - Recommendation: Check Vercel dashboard environment variables before writing migration script. The audit script (Plan 09-05) addresses this.

2. **Should files be listed from Google Drive directly or from the database?**
   - What we know: The current `DocumentsPage` fetches documents from the Prisma `Document` table. Each document has a `driveFileId` (or `fileUrl`). The database is the source of truth for metadata.
   - What's unclear: Should the app ever query Drive API for the file list, bypassing the DB? Or should DB always be the listing source (with Drive just being the storage)?
   - Recommendation: Keep the DB as the source of truth for listing. Drive API is only called for upload, download, and delete. This is simpler and more consistent with the current architecture.

3. **Streaming download via Next.js Response: does it truly bypass the 4.5 MB limit?**
   - What we know: Vercel docs say "4.5 MB response body limit" and suggest streaming as the workaround for large files. The streaming docs mention Edge runtime explicitly; Node.js runtime streaming behavior is less explicitly documented.
   - What's unclear: Does `return new Response(readableStream)` in a Next.js App Router API route (Node.js runtime) bypass the 4.5 MB limit on Vercel Pro?
   - Recommendation: LOW confidence. Test with a file >5 MB during Plan 09-04. If streaming doesn't bypass the limit, fallback option is to generate a temporary signed URL — but Drive service account files don't support public signed URLs natively, so this would require a different approach (e.g., temporarily setting file permissions for 60 seconds then revoking).

4. **Shared Drive vs Service Account Drive?**
   - What we know: Service account files are not visible to humans by default. Sharing the root folder with an admin Gmail solves the visibility issue.
   - What's unclear: Whether the business uses Google Workspace and has Shared Drives available.
   - Recommendation: Default to service account's My Drive with root folder shared with admin Gmail (simpler). Document Shared Drive as an upgrade path.

---

## Sources

### Primary (HIGH confidence)
- Google Drive API v3 Official Docs (https://developers.google.com/workspace/drive/api/) — upload methods, folder creation, search, download, quotas verified
- Vercel Functions Limits (https://vercel.com/docs/functions/limitations) — 4.5 MB response limit, 250 MB bundle limit, streaming behavior
- Vercel 250 MB Troubleshooting Guide (https://vercel.com/guides/troubleshooting-function-250mb-limit) — bundle size strategies
- googleapis README (https://github.com/googleapis/google-api-nodejs-client) — `@googleapis/drive` subpackage, credential patterns
- googleapis TypeScript issues #1768, #2052 — confirmed TypeScript inference bug for `responseType: 'stream'`

### Secondary (MEDIUM confidence)
- ISD-Soft service account tutorial (https://isd-soft.com/tech_blog/accessing-google-apis-using-service-account-node-js/) — credential pattern from env vars
- googleapis sample drive/download.js — streaming download pattern with `responseType: 'stream'`

### Tertiary (LOW confidence)
- Various WebSearch results about googleapis bundle size — general awareness, not authoritative
- WebSearch results about streaming on Vercel Node.js runtime — streaming bypass of 4.5 MB limit unclear, flagged as open question

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Official Google and Vercel docs confirm `@googleapis/drive` and service account auth patterns
- Architecture: HIGH — Patterns derived from official Google Drive API docs + existing codebase analysis
- Pitfalls: MEDIUM — Private key newline corruption and streaming limits have HIGH confidence from community reports; streaming bypass of 4.5 MB limit is LOW confidence (requires runtime validation)
- Migration strategy: MEDIUM — Migration script pattern is straightforward; actual Blob file count unknown (open question #1 above)

**Research date:** 2026-02-20
**Valid until:** 2026-05-20 (stable APIs — Google Drive v3 and googleapis are mature)
