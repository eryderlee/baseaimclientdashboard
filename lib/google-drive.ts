import 'server-only'
import { drive_v3, drive as createDrive } from '@googleapis/drive'
import { GoogleAuth } from 'google-auth-library'
import { Readable } from 'stream'

// Singleton Drive client instance (cached in module scope for development)
let driveClient: drive_v3.Drive | undefined

/**
 * Returns a singleton Google Drive v3 client authenticated with a service account.
 *
 * Credentials are read from individual env vars to avoid private key newline
 * corruption that occurs when storing the full JSON as a single env var.
 *
 * Apply GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n') to restore
 * literal newlines that shells/Vercel may double-escape.
 */
export function getDriveClient(): drive_v3.Drive {
  if (driveClient) return driveClient

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!clientEmail || !privateKey) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY must be set'
    )
  }

  const auth = new GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  })

  driveClient = createDrive({ version: 'v3', auth })
  return driveClient
}

/**
 * Creates a Google Drive folder for a client inside the root folder.
 *
 * Folder name format: "{companyName} - {clientId}"
 * The clientId (CUID) suffix ensures uniqueness even if two companies share a name.
 *
 * @param companyName - The client's company name
 * @param clientId - The client's database ID (CUID)
 * @returns The Google Drive folder ID (store as Client.driveFolderId)
 * @throws If Drive API returns no folder ID
 */
export async function createClientDriveFolder(
  companyName: string,
  clientId: string
): Promise<string> {
  const driveInstance = getDriveClient()
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID

  const response = await driveInstance.files.create({
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

/**
 * Uploads a File to a Google Drive folder.
 *
 * Converts the File to a Buffer and streams it via the Drive API.
 * The googleapis client auto-selects resumable upload for large files (>5 MB).
 *
 * @param file - The File object to upload (from FormData or similar)
 * @param folderId - The Google Drive folder ID to upload into
 * @returns Object with the Drive file id, name, and size
 * @throws If Drive API returns no file ID
 */
export async function uploadFileToDrive(
  file: File,
  folderId: string
): Promise<{ id: string; name: string; size: number }> {
  const driveInstance = getDriveClient()
  const buffer = Buffer.from(await file.arrayBuffer())

  const response = await driveInstance.files.create({
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
    throw new Error('File upload failed: no Drive file ID returned')
  }

  return {
    id: response.data.id,
    name: response.data.name || file.name,
    size: Number(response.data.size ?? file.size),
  }
}

/**
 * Streams a file from Google Drive to the caller.
 *
 * Gets file metadata first (name, mimeType) then fetches the content as a
 * Node.js ReadableStream. Use this to proxy downloads through a Next.js API
 * route so private Drive files are never exposed directly to clients.
 *
 * NOTE: Cast via `unknown` is intentional — TypeScript's googleapis types do
 * not correctly infer the stream variant of drive.files.get (issues #1768, #2052).
 *
 * @param driveFileId - The Google Drive file ID
 * @returns Object with the readable stream, mimeType, and fileName
 */
export async function streamFileFromDrive(driveFileId: string): Promise<{
  stream: NodeJS.ReadableStream
  mimeType: string
  fileName: string
}> {
  const driveInstance = getDriveClient()

  // Fetch file metadata first
  const meta = await driveInstance.files.get({
    fileId: driveFileId,
    fields: 'name,mimeType',
  })

  // Fetch file content as a stream (responseType: 'stream' required to avoid
  // buffering the entire file into memory and hitting the 4.5 MB response limit)
  const response = await driveInstance.files.get(
    { fileId: driveFileId, alt: 'media' },
    { responseType: 'stream' }
  )

  return {
    stream: response.data as unknown as NodeJS.ReadableStream,
    mimeType: meta.data.mimeType || 'application/octet-stream',
    fileName: meta.data.name || driveFileId,
  }
}

/**
 * Permanently deletes a file from Google Drive.
 *
 * Call this when a Document record is deleted so the corresponding Drive
 * file does not accumulate as orphaned storage.
 *
 * @param driveFileId - The Google Drive file ID to delete
 */
export async function deleteFileFromDrive(driveFileId: string): Promise<void> {
  const driveInstance = getDriveClient()
  await driveInstance.files.delete({ fileId: driveFileId })
}

/**
 * Lists files in a Google Drive folder (non-trashed, newest first).
 *
 * Returns up to 100 files with basic metadata. The database remains the
 * source of truth for listing — this helper is for auditing/debugging or
 * cases where the DB is out of sync with Drive.
 *
 * @param folderId - The Google Drive folder ID to list files from
 * @returns Array of Drive file metadata objects
 */
export async function listFilesInFolder(folderId: string): Promise<drive_v3.Schema$File[]> {
  const driveInstance = getDriveClient()

  const response = await driveInstance.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id,name,mimeType,size,createdTime,modifiedTime)',
    orderBy: 'createdTime desc',
    pageSize: 100,
  })

  return response.data.files || []
}
