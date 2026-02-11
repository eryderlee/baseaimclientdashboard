# Architecture Patterns: Google Sheets Sync Integration

**Domain:** Client Dashboard with Google Sheets Integration
**Researched:** 2026-02-11
**Confidence:** MEDIUM (Based on established patterns for Google Sheets API v4, Next.js App Router, and Prisma ORM)

## Executive Summary

Google Sheets integration for milestone/progress tracking requires a **unidirectional sync architecture** where Google Sheets acts as the **source of truth** for admin updates, syncing data **into** the PostgreSQL database, which serves dashboard views.

**Key Architecture Decision:** Use **poll-based sync** with **API route endpoints** rather than webhooks, given the small scale (1-5 clients) and the fact that Google Sheets doesn't natively support webhooks without additional infrastructure.

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ADMIN WORKFLOW                            │
│  Admin updates Google Sheet → Changes tracked by timestamp      │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SYNC LAYER (API Routes)                     │
│                                                                   │
│  ┌────────────────┐    ┌─────────────────┐    ┌──────────────┐ │
│  │  Sheets API    │───▶│  Sync Service   │───▶│   Prisma     │ │
│  │  Client        │    │  (Transform)    │    │   Client     │ │
│  └────────────────┘    └─────────────────┘    └──────────────┘ │
│         │                      │                      │          │
│         │                      ▼                      │          │
│         │            ┌─────────────────┐              │          │
│         │            │  Change         │              │          │
│         └───────────▶│  Detection      │──────────────┘          │
│                      │  Logic          │                         │
│                      └─────────────────┘                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA LAYER (PostgreSQL)                       │
│                                                                   │
│  Milestone Table (existing schema):                              │
│  - id, clientId, title, description                              │
│  - status, progress, order                                       │
│  - startDate, dueDate, completedAt                               │
│  - createdAt, updatedAt                                          │
│                                                                   │
│  NEW: SyncLog Table (tracking):                                  │
│  - id, sheetId, lastSyncAt, lastRowHash                          │
│  - syncStatus, errorMessage                                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER (UI)                        │
│                                                                   │
│  Client Dashboard → Reads from Prisma → Shows current state      │
│  Admin Dashboard → Can trigger manual sync if needed             │
└─────────────────────────────────────────────────────────────────┘
```

## Component Boundaries

### 1. Google Sheets (External Source of Truth)

**Responsibility:**
- Store milestone data per client
- Provide admin-friendly interface for updates
- Act as single source of truth for milestone status

**Schema Structure (recommended):**
```
Sheet Name: "Client_[ClientName]" (one sheet per client)

Columns:
A: milestone_id (generated or existing)
B: title
C: description
D: status (NOT_STARTED | IN_PROGRESS | COMPLETED | BLOCKED)
E: progress (0-100)
F: start_date (YYYY-MM-DD)
G: due_date (YYYY-MM-DD)
H: completed_at (YYYY-MM-DD or empty)
I: order (integer for display order)
J: last_updated (timestamp, formula: =NOW() when row changes)
```

**API Access:**
- Google Sheets API v4
- Authentication via Service Account (JSON key file)
- Scopes: `https://www.googleapis.com/auth/spreadsheets.readonly`

### 2. Sheets API Client (Infrastructure Layer)

**Responsibility:**
- Authenticate with Google Sheets API
- Fetch sheet data by range
- Handle rate limiting and errors
- Transform raw sheet data into structured format

**Location:** `/lib/google-sheets/client.ts`

**Key Methods:**
```typescript
class GoogleSheetsClient {
  // Initialize with service account credentials
  constructor(credentials: ServiceAccountCredentials)

  // Fetch all rows from a specific sheet
  async getSheetData(spreadsheetId: string, sheetName: string): Promise<SheetRow[]>

  // Fetch metadata (sheet names, last modified)
  async getSheetMetadata(spreadsheetId: string): Promise<SheetMetadata>

  // Health check
  async testConnection(): Promise<boolean>
}
```

**Dependencies:**
- `googleapis` npm package (official Google API client)
- Service account JSON stored in environment variables or secure storage

**Error Handling:**
- 401/403: Authentication issues (invalid credentials)
- 404: Sheet not found
- 429: Rate limit exceeded (implement exponential backoff)
- Network errors: Retry with backoff

### 3. Sync Service (Business Logic Layer)

**Responsibility:**
- Orchestrate sync process
- Transform sheet data to database schema
- Detect changes (add, update, delete)
- Handle conflicts and validation
- Log sync operations

**Location:** `/lib/sync/milestone-sync-service.ts`

**Key Methods:**
```typescript
class MilestoneSyncService {
  // Main sync operation for a single client
  async syncClientMilestones(
    clientId: string,
    spreadsheetId: string,
    sheetName: string
  ): Promise<SyncResult>

  // Sync all clients (batch operation)
  async syncAllClients(): Promise<SyncResult[]>

  // Detect what changed since last sync
  private detectChanges(
    currentData: Milestone[],
    newData: SheetRow[]
  ): ChangeSet

  // Apply changes to database
  private applyChanges(changes: ChangeSet): Promise<void>

  // Validate sheet data before sync
  private validateSheetData(data: SheetRow[]): ValidationResult
}
```

**Change Detection Strategy:**
- Use `last_updated` timestamp from sheet
- Compare with `updatedAt` in database
- For new rows: Check if `milestone_id` exists in DB
- For deletions: Compare sheet rows with DB rows (if row missing from sheet, mark as deleted or archive)

**Conflict Resolution:**
- Sheet always wins (admin is authoritative)
- Database changes are overwritten during sync
- Optional: Log overwrites for audit trail

### 4. Sync API Routes (Interface Layer)

**Responsibility:**
- Expose sync operations as HTTP endpoints
- Handle authentication/authorization
- Trigger sync operations
- Return sync status and results

**Location:** `/app/api/sync/`

**Endpoints:**

```typescript
// POST /api/sync/milestones
// Trigger sync for specific client or all clients
// Body: { clientId?: string, force?: boolean }
// Auth: Admin only
async function POST(request: Request) {
  // 1. Verify admin role
  // 2. Get client(s) to sync
  // 3. Call MilestoneSyncService
  // 4. Return sync results
}

// GET /api/sync/status
// Get last sync status for all clients
// Auth: Admin only
async function GET() {
  // Return sync log entries
}

// POST /api/sync/test
// Test connection to Google Sheets
// Auth: Admin only
async function POST(request: Request) {
  // Verify credentials and sheet access
}
```

**Security:**
- NextAuth middleware to verify admin role
- Rate limiting (max 1 sync per minute per client)
- CSRF protection (Next.js built-in)

### 5. Database Schema Extensions

**New Table: SyncLog**

```prisma
model SyncLog {
  id            String    @id @default(cuid())
  clientId      String?   // null for global syncs
  spreadsheetId String
  sheetName     String
  syncStatus    SyncStatus // SUCCESS | FAILED | PARTIAL
  lastSyncAt    DateTime
  rowsProcessed Int       @default(0)
  rowsAdded     Int       @default(0)
  rowsUpdated   Int       @default(0)
  rowsDeleted   Int       @default(0)
  errorMessage  String?
  duration      Int?      // milliseconds
  createdAt     DateTime  @default(now())

  client        Client?   @relation(fields: [clientId], references: [id])

  @@map("sync_logs")
  @@index([clientId])
  @@index([syncStatus])
  @@index([lastSyncAt])
}

enum SyncStatus {
  SUCCESS
  FAILED
  PARTIAL
}
```

**Modified Table: Client**

Add field to track Google Sheets configuration:

```prisma
model Client {
  // ... existing fields ...

  spreadsheetId String?   // Google Sheets ID
  sheetName     String?   // Sheet name within spreadsheet
  syncEnabled   Boolean   @default(false)
  lastSyncAt    DateTime?

  syncLogs      SyncLog[]
}
```

**Modified Table: Milestone**

No changes needed. Existing schema supports all required fields.

### 6. Presentation Layer (UI Components)

**Admin Dashboard:**
- Manual sync trigger button
- Sync status display (last sync time, result)
- Sync log viewer (history of syncs)
- Configuration UI (set spreadsheetId per client)

**Client Dashboard:**
- No changes to milestone display
- Reads from database as before
- Optional: Show "last updated" timestamp

**Location:**
- `/app/dashboard/admin/sync/page.tsx` (new admin page)
- `/components/admin/sync-status.tsx` (status widget)
- `/components/admin/sync-trigger.tsx` (trigger button)

## Data Flow Diagrams

### Flow 1: Manual Sync (Admin-Triggered)

```
┌──────────┐
│  Admin   │ Clicks "Sync Now" button
│  User    │
└────┬─────┘
     │
     │ POST /api/sync/milestones
     ▼
┌─────────────────┐
│  API Route      │ 1. Verify admin auth
│  Handler        │ 2. Validate request
└────┬────────────┘
     │
     │ Call syncClientMilestones(clientId)
     ▼
┌─────────────────────────┐
│  MilestoneSyncService   │
│                         │
│  Step 1: Fetch from     │
│          Google Sheets  │──────────┐
│                         │          │
│  Step 2: Fetch from DB  │          │
│                         │          │
│  Step 3: Detect changes │          │
│                         │          │
│  Step 4: Apply changes  │          │
│                         │          │
│  Step 5: Log result     │          │
└────┬────────────────────┘          │
     │                                │
     │                                ▼
     │                         ┌────────────────┐
     │                         │ Google Sheets  │
     │                         │ API v4         │
     │                         └────────────────┘
     │
     │ Update Milestone records
     ▼
┌─────────────────┐
│  PostgreSQL     │
│  Database       │
│                 │
│  - milestones   │
│  - sync_logs    │
└────┬────────────┘
     │
     │ Return sync result
     ▼
┌─────────────────┐
│  Admin UI       │ Display success/error message
└─────────────────┘
```

### Flow 2: Scheduled Sync (Cron Job)

```
┌──────────────────┐
│  Cron Job        │ Every 15 minutes (configurable)
│  (Vercel Cron or │
│   external)      │
└────┬─────────────┘
     │
     │ POST /api/sync/milestones (with cron secret)
     ▼
┌─────────────────┐
│  API Route      │ Verify cron secret
│  Handler        │
└────┬────────────┘
     │
     │ Call syncAllClients()
     ▼
┌─────────────────────────┐
│  MilestoneSyncService   │
│                         │
│  For each client with   │
│  syncEnabled=true:      │
│                         │
│    1. Fetch sheet data  │──────────┐
│    2. Compare with DB   │          │
│    3. Apply updates     │          │
│    4. Log result        │          │
└────┬────────────────────┘          │
     │                                ▼
     │                         ┌────────────────┐
     │                         │ Google Sheets  │
     │                         │ (all client    │
     │                         │  sheets)       │
     │                         └────────────────┘
     │
     ▼
┌─────────────────┐
│  PostgreSQL     │ Batch updates
│  Database       │
└─────────────────┘
```

### Flow 3: Client Views Dashboard

```
┌──────────┐
│  Client  │ Loads dashboard page
│  User    │
└────┬─────┘
     │
     │ GET /dashboard
     ▼
┌─────────────────┐
│  Dashboard      │
│  Page.tsx       │ Server component
└────┬────────────┘
     │
     │ Fetch milestones via Prisma
     ▼
┌─────────────────┐
│  PostgreSQL     │
│  Database       │
│                 │
│  SELECT * FROM  │
│  milestones     │
│  WHERE clientId │
│  ORDER BY order │
└────┬────────────┘
     │
     │ Return milestone data
     ▼
┌─────────────────┐
│  Dashboard UI   │ Display progress, status, dates
│                 │
│  - Milestone    │ (No change from current implementation)
│    list with    │
│    progress     │
│    bars         │
└─────────────────┘
```

## Patterns to Follow

### Pattern 1: Service Account Authentication

**What:** Use Google Service Account for server-to-server authentication

**Why:**
- No OAuth flow needed (no user interaction)
- Credentials stored server-side
- Suitable for backend-only access
- No token expiration issues

**Implementation:**
```typescript
// lib/google-sheets/client.ts
import { google } from 'googleapis';

export class GoogleSheetsClient {
  private sheets: sheets_v4.Sheets;

  constructor() {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    this.sheets = google.sheets({ version: 'v4', auth });
  }

  async getSheetData(spreadsheetId: string, range: string) {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    return response.data.values;
  }
}
```

**Setup Steps:**
1. Create service account in Google Cloud Console
2. Download JSON key file
3. Share Google Sheet with service account email
4. Store credentials in environment variables

### Pattern 2: Idempotent Sync Operations

**What:** Ensure sync can be run multiple times safely

**Why:**
- Handles network failures gracefully
- Can retry failed syncs
- Prevents duplicate data
- Consistent state even with interruptions

**Implementation:**
```typescript
async syncClientMilestones(clientId: string, spreadsheetId: string, sheetName: string) {
  // Use transaction for atomicity
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch sheet data
    const sheetData = await this.sheetsClient.getSheetData(spreadsheetId, sheetName);

    // 2. Fetch existing milestones
    const existingMilestones = await tx.milestone.findMany({
      where: { clientId }
    });

    // 3. Detect changes (compare by milestone_id or unique identifier)
    const changes = this.detectChanges(existingMilestones, sheetData);

    // 4. Apply changes using upsert (idempotent)
    for (const row of changes.toUpsert) {
      await tx.milestone.upsert({
        where: { id: row.id },
        update: row.data,
        create: row.data,
      });
    }

    // 5. Log sync
    await tx.syncLog.create({
      data: {
        clientId,
        spreadsheetId,
        sheetName,
        syncStatus: 'SUCCESS',
        lastSyncAt: new Date(),
        rowsProcessed: sheetData.length,
      }
    });
  });
}
```

### Pattern 3: Change Detection with Timestamps

**What:** Use timestamp comparison to determine what changed

**Why:**
- Efficient (no need to compare all fields)
- Reliable indicator of changes
- Works with manual spreadsheet edits

**Implementation:**
```typescript
private detectChanges(dbMilestones: Milestone[], sheetRows: SheetRow[]) {
  const changes: ChangeSet = {
    toAdd: [],
    toUpdate: [],
    toDelete: [],
  };

  // Create lookup map
  const dbMap = new Map(dbMilestones.map(m => [m.id, m]));
  const sheetMap = new Map(sheetRows.map(r => [r.milestone_id, r]));

  // Find additions and updates
  for (const row of sheetRows) {
    const existing = dbMap.get(row.milestone_id);

    if (!existing) {
      changes.toAdd.push(row);
    } else {
      // Compare last_updated timestamp
      const sheetUpdated = new Date(row.last_updated);
      const dbUpdated = existing.updatedAt;

      if (sheetUpdated > dbUpdated) {
        changes.toUpdate.push({ id: existing.id, data: row });
      }
    }
  }

  // Find deletions (optional, if you want to sync deletions)
  for (const milestone of dbMilestones) {
    if (!sheetMap.has(milestone.id)) {
      changes.toDelete.push(milestone.id);
    }
  }

  return changes;
}
```

### Pattern 4: Error Handling and Retry Logic

**What:** Gracefully handle API failures with exponential backoff

**Why:**
- Google Sheets API has rate limits
- Network issues are transient
- Prevents cascading failures

**Implementation:**
```typescript
async function fetchWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;

      // Check if error is retryable
      if (error.code === 429 || error.code >= 500) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Non-retryable error
      throw error;
    }
  }
}
```

### Pattern 5: Configuration per Client

**What:** Store Google Sheets configuration in Client model

**Why:**
- Each client can have different sheet
- Easy to enable/disable sync per client
- Centralized configuration

**Implementation:**
```typescript
// Store in database
await prisma.client.update({
  where: { id: clientId },
  data: {
    spreadsheetId: 'abc123...',
    sheetName: 'Client_Acme',
    syncEnabled: true,
  }
});

// Use in sync service
async syncAllClients() {
  const clients = await prisma.client.findMany({
    where: { syncEnabled: true },
    select: { id: true, spreadsheetId: true, sheetName: true }
  });

  const results = [];
  for (const client of clients) {
    if (client.spreadsheetId && client.sheetName) {
      const result = await this.syncClientMilestones(
        client.id,
        client.spreadsheetId,
        client.sheetName
      );
      results.push(result);
    }
  }
  return results;
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Real-time Webhooks

**What goes wrong:** Attempting to use webhooks for instant sync

**Why it's bad:**
- Google Sheets doesn't support native webhooks
- Would require Google Apps Script (complex, brittle)
- Overkill for 1-5 clients with infrequent updates
- Adds infrastructure complexity

**Instead:** Use scheduled polling (every 15 minutes or manual trigger)

**When webhooks make sense:** 100+ clients with frequent updates, where polling becomes inefficient

### Anti-Pattern 2: Bidirectional Sync

**What goes wrong:** Allowing clients to update database, then syncing back to sheets

**Why it's bad:**
- Conflict resolution becomes complex
- Risk of data loss or inconsistency
- Admin loses control over source of truth
- Race conditions possible

**Instead:** Unidirectional sync (Sheets → Database only). Clients read-only.

**When bidirectional makes sense:** Collaborative editing between admin and client is a core feature

### Anti-Pattern 3: Syncing on Every Page Load

**What goes wrong:** Triggering sync whenever a client loads dashboard

**Why it's bad:**
- Unnecessary API calls (Google Sheets rate limits)
- Slow page loads (API latency)
- Wastes server resources
- Can hit rate limits quickly

**Instead:** Scheduled background sync, with manual trigger for admins

**When page-load sync makes sense:** If sync is <100ms and data must be absolutely real-time

### Anti-Pattern 4: Storing Credentials in Code

**What goes wrong:** Hardcoding service account JSON in source code

**Why it's bad:**
- Security risk (credentials in git)
- Difficult to rotate keys
- Can't use different credentials per environment

**Instead:** Use environment variables for sensitive data

```typescript
// BAD
const credentials = {
  client_email: "service@project.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\n..."
};

// GOOD
const credentials = {
  client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
  private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
};
```

### Anti-Pattern 5: Syncing Everything Every Time

**What goes wrong:** Deleting and recreating all milestones on each sync

**Why it's bad:**
- Loses referential integrity (if other tables reference milestones)
- Resets timestamps unnecessarily
- Inefficient (updates unchanged data)
- Breaks audit trails

**Instead:** Use upsert operations based on change detection

```typescript
// BAD
await prisma.milestone.deleteMany({ where: { clientId } });
await prisma.milestone.createMany({ data: sheetData });

// GOOD
for (const row of sheetData) {
  await prisma.milestone.upsert({
    where: { id: row.id },
    update: transformSheetRow(row),
    create: transformSheetRow(row),
  });
}
```

## Scalability Considerations

| Concern | At 1-5 Clients | At 50 Clients | At 500+ Clients |
|---------|----------------|---------------|-----------------|
| **Sync Frequency** | Manual + 15-min cron | 10-min cron per client | Queue-based with worker processes |
| **API Rate Limits** | No concern (well within limits) | Monitor usage, implement backoff | Use batch API, quota management, multiple service accounts |
| **Database Performance** | No indexes needed beyond current | Add indexes on clientId, status | Partition sync_logs table, archive old logs |
| **Sync Duration** | <5 seconds total | <2 minutes total | Parallel processing, streaming updates |
| **Error Handling** | Log and alert admin | Automatic retry, degraded mode | Circuit breaker, fallback to cached data |
| **Sheet Structure** | One spreadsheet, multiple sheets | Multiple spreadsheets | Standardized sheet templates, validation layer |

## Build Order Recommendations

Based on component dependencies, suggested build order for implementation:

### Phase 1: Foundation (Week 1)
**Goal:** Set up Google Sheets API access and basic reading

1. **Setup Google Cloud Project**
   - Create service account
   - Download credentials
   - Configure environment variables

2. **Implement GoogleSheetsClient**
   - Basic authentication
   - Read operations
   - Error handling
   - Unit tests

3. **Database Schema Updates**
   - Add SyncLog model
   - Add sync fields to Client model
   - Run migrations

**Deliverable:** Can successfully read from Google Sheets

### Phase 2: Sync Logic (Week 2)
**Goal:** Implement core sync service

4. **Implement MilestoneSyncService**
   - Change detection logic
   - Data transformation (sheet rows → Prisma schema)
   - Upsert operations
   - Transaction handling

5. **Validation Layer**
   - Validate sheet data format
   - Handle missing/malformed data
   - Provide clear error messages

**Deliverable:** Can sync data from Sheets to database programmatically

### Phase 3: API Layer (Week 2-3)
**Goal:** Expose sync operations via API

6. **Implement Sync API Routes**
   - POST /api/sync/milestones (trigger sync)
   - GET /api/sync/status (view logs)
   - POST /api/sync/test (test connection)
   - Authentication middleware

7. **Rate Limiting & Security**
   - Prevent abuse
   - Admin-only access
   - Input validation

**Deliverable:** Admin can trigger sync via API

### Phase 4: UI Integration (Week 3)
**Goal:** Admin can manage sync from dashboard

8. **Admin Sync Dashboard**
   - Sync trigger button
   - Sync status display
   - Sync log viewer
   - Client configuration (set spreadsheetId)

9. **Client Configuration UI**
   - Form to set Google Sheets ID per client
   - Enable/disable sync toggle
   - Test connection button

**Deliverable:** Admin can manage sync via web UI

### Phase 5: Automation (Week 4)
**Goal:** Scheduled automatic syncs

10. **Implement Cron Job**
    - Vercel Cron configuration (vercel.json)
    - Cron secret for authentication
    - Error notifications

11. **Monitoring & Alerting**
    - Log sync failures
    - Email/Slack notifications on errors
    - Dashboard widget showing sync health

**Deliverable:** Automatic background sync every 15 minutes

### Phase 6: Polish (Week 4-5)
**Goal:** Production-ready with edge cases covered

12. **Enhanced Error Handling**
    - Graceful degradation
    - Partial sync recovery
    - Detailed error messages

13. **Documentation**
    - Admin guide (how to set up sheets)
    - Troubleshooting guide
    - API documentation

**Deliverable:** Production-ready sync system

## Dependency Graph

```
Setup Google Cloud
       ↓
GoogleSheetsClient
       ↓
Database Schema Updates
       ↓
MilestoneSyncService ←──── Validation Layer
       ↓
Sync API Routes
       ↓
Admin Sync Dashboard ←──── Client Configuration UI
       ↓
Cron Job Setup
       ↓
Monitoring & Alerting
```

**Critical Path:** Setup Google Cloud → GoogleSheetsClient → Database Schema → MilestoneSyncService → API Routes → Admin UI

**Parallel Tracks:**
- Validation Layer (can be built alongside MilestoneSyncService)
- Client Configuration UI (can be built alongside Admin Sync Dashboard)
- Monitoring (can be added incrementally)

## Technology Stack Additions

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Google API Client | `googleapis` | ^143.0.0 | Official Google APIs Node.js client |
| Authentication | Service Account | N/A | Server-to-server auth |
| Environment Variables | `.env.local` | N/A | Store sensitive credentials |
| Cron Jobs | Vercel Cron | N/A | Scheduled sync triggers |
| (Alternative) Cron | node-cron | ^3.0.3 | Self-hosted cron if not using Vercel |

### Installation

```bash
npm install googleapis
npm install -D @types/google-apps-script
```

### Environment Variables

```env
# Google Sheets API
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Cron authentication
CRON_SECRET=random_secret_string_for_cron_auth
```

## Testing Strategy

### Unit Tests
- GoogleSheetsClient: Mock API responses
- MilestoneSyncService: Test change detection logic
- Validation layer: Test edge cases

### Integration Tests
- End-to-end sync with test spreadsheet
- Database transaction rollback on errors
- API route authentication

### Manual Testing Checklist
- [ ] Create test Google Sheet
- [ ] Share with service account
- [ ] Configure client with sheet ID
- [ ] Trigger manual sync
- [ ] Verify milestones updated in dashboard
- [ ] Test with invalid data (missing columns)
- [ ] Test with empty sheet
- [ ] Test with deleted rows
- [ ] Test cron job authentication
- [ ] Test rate limiting

## Security Considerations

### 1. Credential Storage
- Never commit service account JSON to git
- Use environment variables or secret management (Vercel Secrets)
- Rotate keys periodically (every 90 days)

### 2. API Authentication
- All sync endpoints require admin role
- Use NextAuth session verification
- Cron endpoints use secret token

### 3. Input Validation
- Validate spreadsheet ID format
- Sanitize sheet names (prevent injection)
- Validate milestone data before insert

### 4. Rate Limiting
- Limit sync API to 1 request/minute per client
- Implement exponential backoff for retries
- Monitor quota usage

### 5. Sheet Permissions
- Service account should have "Viewer" role (read-only)
- Do not grant "Editor" access
- Use separate sheet per client (data isolation)

## Monitoring and Observability

### Key Metrics to Track

1. **Sync Success Rate**
   - % of successful syncs
   - Average sync duration
   - Error rate by type

2. **Data Freshness**
   - Time since last successful sync
   - Staleness alerts (>1 hour without sync)

3. **API Usage**
   - Google Sheets API quota consumption
   - Rate limit hit frequency

4. **Database Impact**
   - Rows updated per sync
   - Transaction duration
   - Lock wait times

### Logging Strategy

```typescript
// Structured logging for observability
logger.info('Sync started', {
  clientId,
  spreadsheetId,
  trigger: 'manual' | 'cron',
});

logger.info('Sync completed', {
  clientId,
  duration: 1234, // ms
  rowsProcessed: 10,
  rowsUpdated: 3,
});

logger.error('Sync failed', {
  clientId,
  error: error.message,
  stage: 'fetch' | 'transform' | 'persist',
});
```

### Alert Conditions

- Sync failure for >30 minutes
- Google Sheets API returns 403/404 (access issue)
- Database transaction timeout
- Sync duration >30 seconds (performance degradation)

## Confidence Assessment

| Area | Confidence | Rationale |
|------|------------|-----------|
| Google Sheets API Integration | HIGH | Well-documented, stable API v4; Service Account pattern is standard |
| Next.js API Routes | HIGH | App Router API routes are straightforward; middleware support for auth |
| Prisma Sync Logic | HIGH | Upsert operations and transactions are Prisma strengths |
| Change Detection | MEDIUM | Timestamp-based detection is reliable but assumes Sheet has last_updated column |
| Cron Job Setup | MEDIUM | Vercel Cron is simple; alternative approaches exist for self-hosted |
| Scale to 50+ clients | MEDIUM | Architecture supports scale but may need optimization (batching, queues) |

## Sources and References

**Confidence Level: MEDIUM**

This architecture is based on:
- Google Sheets API v4 documentation patterns (official, HIGH confidence)
- Next.js 13+ App Router API routes (official, HIGH confidence)
- Prisma ORM transaction and upsert patterns (official, HIGH confidence)
- Established patterns for external data sync (community best practices, MEDIUM confidence)

**Verification Needed:**
- Current Google Sheets API rate limits (verify with official documentation)
- Vercel Cron configuration syntax for Next.js 16 (verify with Vercel docs)
- Latest `googleapis` package version and breaking changes (verify on npm)

**Assumptions:**
- Admin updates are infrequent (reasonable for 1-5 clients)
- Poll-based sync is acceptable (no real-time requirement stated)
- Google Sheet structure can be standardized per client

## Open Questions for Phase-Specific Research

1. **Should milestone deletions sync?**
   - If admin removes row from sheet, should milestone be deleted from DB or archived?
   - Recommended: Archive (soft delete) to preserve history

2. **How to handle sheet restructuring?**
   - If admin adds/removes columns, how to handle gracefully?
   - Recommended: Column mapping configuration, validation layer

3. **Should clients see sync status?**
   - "Last updated 10 minutes ago" on dashboard?
   - Recommended: Yes, builds trust in data freshness

4. **How to handle multiple admins editing?**
   - Conflict if two admins update same sheet simultaneously?
   - Recommended: Last-write-wins (Sheet timestamp is source of truth)

5. **Should sync be real-time?**
   - Current approach: Polling every 15 minutes
   - If real-time needed: Explore Google Apps Script + webhooks (adds complexity)

---

**Next Steps:**
- Review architecture with technical lead
- Validate Google Sheets structure with admin team
- Confirm sync frequency requirements (15 min acceptable?)
- Prioritize build phases based on business goals
