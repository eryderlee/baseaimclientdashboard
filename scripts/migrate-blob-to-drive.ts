/**
 * One-time migration script: Vercel Blob → Google Drive
 *
 * Phases:
 *   A) Audit — Categorize all documents by storage type
 *   B) Create Drive Folders — For any clients missing driveFolderId
 *   C) Migrate Blob Files — Fetch from Blob URL, upload to Drive, update DB
 *
 * Usage:
 *   npx tsx scripts/migrate-blob-to-drive.ts
 *
 * Requires env vars: DATABASE_URL, GOOGLE_SERVICE_ACCOUNT_EMAIL,
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, GOOGLE_DRIVE_ROOT_FOLDER_ID
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { drive as createDrive, drive_v3 } from '@googleapis/drive'
import { GoogleAuth } from 'google-auth-library'
import { Readable } from 'stream'

// ---------------------------------------------------------------------------
// Prisma
// ---------------------------------------------------------------------------

const prisma = new PrismaClient()

// ---------------------------------------------------------------------------
// Drive client (inline — avoids 'server-only' restriction in lib/google-drive.ts)
// ---------------------------------------------------------------------------

function getDriveClient(): drive_v3.Drive {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!clientEmail || !privateKey) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY must be set in .env'
    )
  }

  const auth = new GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  })

  return createDrive({ version: 'v3', auth })
}

/**
 * Creates a folder in Drive inside the configured root folder.
 * Returns the new folder's Drive ID.
 */
async function createFolderInDrive(
  driveClient: drive_v3.Drive,
  folderName: string
): Promise<string> {
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID

  const response = await driveClient.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: rootFolderId ? [rootFolderId] : [],
    },
    fields: 'id',
  })

  if (!response.data.id) {
    throw new Error(`Drive folder creation failed for "${folderName}": no ID returned`)
  }

  return response.data.id
}

/**
 * Uploads a File object to a Drive folder.
 * Returns the Drive file ID.
 */
async function uploadFileToDrive(
  driveClient: drive_v3.Drive,
  file: File,
  folderId: string
): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())

  const response = await driveClient.files.create({
    requestBody: {
      name: file.name,
      mimeType: file.type,
      parents: [folderId],
    },
    media: {
      mimeType: file.type,
      body: Readable.from(buffer),
    },
    fields: 'id',
  })

  if (!response.data.id) {
    throw new Error(`File upload failed for "${file.name}": no Drive file ID returned`)
  }

  return response.data.id
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function categorizDocument(fileUrl: string): 'blob' | 'local' | 'drive' {
  if (
    fileUrl.includes('vercel-storage.com') ||
    fileUrl.includes('.public.blob.vercel') ||
    fileUrl.includes('blob.vercel')
  ) {
    return 'blob'
  }
  if (fileUrl.startsWith('/uploads/')) {
    return 'local'
  }
  return 'drive'
}

function log(msg: string) {
  console.log(msg)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  log('=== Vercel Blob → Google Drive Migration Script ===\n')

  // -------------------------------------------------------------------------
  // Phase A: Audit
  // -------------------------------------------------------------------------

  log('--- Phase A: Audit ---')

  const allDocuments = await prisma.document.findMany({
    select: { id: true, fileUrl: true, clientId: true, fileName: true, fileType: true },
  })

  let blobDocs: typeof allDocuments = []
  let localDocs: typeof allDocuments = []
  let driveDocs: typeof allDocuments = []

  for (const doc of allDocuments) {
    const category = categorizDocument(doc.fileUrl)
    if (category === 'blob') blobDocs.push(doc)
    else if (category === 'local') localDocs.push(doc)
    else driveDocs.push(doc)
  }

  log(`Total documents : ${allDocuments.length}`)
  log(`  Vercel Blob URLs : ${blobDocs.length}`)
  log(`  Local dev paths  : ${localDocs.length}`)
  log(`  Google Drive IDs : ${driveDocs.length}`)
  log('')

  if (localDocs.length > 0) {
    log('Local dev documents (will be skipped — no production migration needed):')
    for (const doc of localDocs) {
      log(`  ${doc.id} → ${doc.fileUrl}`)
    }
    log('')
  }

  // -------------------------------------------------------------------------
  // Phase B: Create Drive Folders for Existing Clients
  // -------------------------------------------------------------------------

  log('--- Phase B: Create Drive Folders for Clients ---')

  const clientsWithoutFolder = await prisma.client.findMany({
    where: { driveFolderId: null },
    select: { id: true, companyName: true },
  })

  log(`Clients without Drive folder: ${clientsWithoutFolder.length}`)

  let foldersCreated = 0
  let foldersFailed = 0

  if (clientsWithoutFolder.length > 0) {
    let driveClient: drive_v3.Drive

    try {
      driveClient = getDriveClient()
    } catch (err) {
      log(`ERROR: Cannot initialise Drive client — ${(err as Error).message}`)
      log('Skipping folder creation and migration phases.')
      await printSummary(
        clientsWithoutFolder.length,
        0,
        0,
        allDocuments.length,
        0,
        driveDocs.length,
        localDocs.length
      )
      await prisma.$disconnect()
      return
    }

    for (const client of clientsWithoutFolder) {
      const folderName = `${client.companyName} - ${client.id}`
      try {
        const folderId = await createFolderInDrive(driveClient, folderName)
        await prisma.client.update({
          where: { id: client.id },
          data: { driveFolderId: folderId },
        })
        log(`  [OK] ${client.companyName} → folder ${folderId}`)
        foldersCreated++
      } catch (err) {
        log(`  [FAIL] ${client.companyName} — ${(err as Error).message}`)
        foldersFailed++
      }
    }
  }

  log('')

  // -------------------------------------------------------------------------
  // Phase C: Migrate Vercel Blob Files
  // -------------------------------------------------------------------------

  log('--- Phase C: Migrate Vercel Blob Files ---')

  let migrated = 0

  if (blobDocs.length === 0) {
    log('No Vercel Blob documents found — nothing to migrate.')
  } else {
    log(`Migrating ${blobDocs.length} document(s) from Vercel Blob to Google Drive...`)

    let driveClient: drive_v3.Drive

    try {
      driveClient = getDriveClient()
    } catch (err) {
      log(`ERROR: Cannot initialise Drive client — ${(err as Error).message}`)
      log('Skipping migration phase.')
      await printSummary(
        clientsWithoutFolder.length,
        foldersCreated,
        foldersFailed,
        allDocuments.length,
        0,
        driveDocs.length,
        localDocs.length
      )
      await prisma.$disconnect()
      return
    }

    for (const doc of blobDocs) {
      try {
        // Fetch the client's Drive folder ID (may have just been created in Phase B)
        const client = await prisma.client.findUnique({
          where: { id: doc.clientId },
          select: { driveFolderId: true, companyName: true },
        })

        if (!client?.driveFolderId) {
          log(`  [SKIP] ${doc.fileName} — client ${doc.clientId} has no Drive folder`)
          continue
        }

        // Fetch file from Blob URL
        log(`  Fetching ${doc.fileName} from Blob URL...`)
        const response = await fetch(doc.fileUrl)

        if (!response.ok) {
          log(`  [FAIL] ${doc.fileName} — Blob fetch failed: ${response.status} ${response.statusText}`)
          continue
        }

        const contentType = response.headers.get('content-type') || doc.fileType || 'application/octet-stream'
        const file = new File([await response.arrayBuffer()], doc.fileName, { type: contentType })

        // Upload to Drive
        const driveFileId = await uploadFileToDrive(driveClient, file, client.driveFolderId)

        // Update document record with Drive file ID
        await prisma.document.update({
          where: { id: doc.id },
          data: { fileUrl: driveFileId },
        })

        log(`  [OK] ${doc.fileName} → Drive file ${driveFileId}`)
        migrated++
      } catch (err) {
        log(`  [FAIL] ${doc.fileName} — ${(err as Error).message}`)
      }
    }
  }

  log('')

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------

  await printSummary(
    clientsWithoutFolder.length,
    foldersCreated,
    foldersFailed,
    allDocuments.length,
    migrated,
    driveDocs.length,
    localDocs.length
  )

  await prisma.$disconnect()
}

async function printSummary(
  clientsNeedingFolder: number,
  foldersCreated: number,
  foldersFailed: number,
  totalDocs: number,
  migrated: number,
  alreadyOnDrive: number,
  localSkipped: number
) {
  log('=== Migration Summary ===')

  // Re-query to get final client counts
  const totalClients = await prisma.client.count()
  log(`Clients : ${totalClients} total, ${foldersCreated} folders created, ${foldersFailed} failed`)
  log(
    `Documents : ${totalDocs} total, ${migrated} migrated to Drive, ${alreadyOnDrive} already on Drive, ${localSkipped} local dev (skipped)`
  )

  if (foldersFailed > 0 || clientsNeedingFolder - foldersCreated > 0) {
    log('\nWARNING: Some clients still lack a Drive folder. Re-run script after fixing errors.')
  } else {
    log('\nAll clients have Drive folders. Migration complete.')
  }
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
