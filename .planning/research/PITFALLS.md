# Domain Pitfalls: Google Sheets Integration

**Domain:** Client dashboard with Google Sheets as admin backend
**Project:** BaseAim Client Dashboard
**Researched:** 2026-02-11
**Confidence:** MEDIUM (based on training knowledge, not verified with current docs)

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or major production issues.

### Pitfall 1: Treating Sheets as a Real-Time Database

**What goes wrong:** Reading from Sheets API on every page load or user action causes rate limit errors and poor UX.

**Why it happens:**
- Developers assume Sheets API is as fast as database queries
- No caching layer between Sheets and application
- Direct Sheets reads in API routes or components

**Consequences:**
- Rate limit errors (60 requests/minute/user by default)
- 2-5 second page load times instead of <200ms
- Quota exhaustion with just 3-4 concurrent users
- App becomes unusable during quota lockout (60+ seconds)

**Prevention:**
1. **Sync pattern, not query pattern**: Copy Sheets data to PostgreSQL on schedule
2. **Serve from database**: All user requests read from Postgres, never Sheets directly
3. **Sheets as write-only for admins**: Admin updates Sheets → webhook/cron syncs to DB → users see DB data

**Detection:**
- API response times >1s for simple data fetches
- "Rate limit exceeded" errors in logs
- App slowdown during business hours when admins are active

**Phase mapping:** Phase 1 architecture decision - establish sync pattern from start

---

### Pitfall 2: No Schema Validation on Sheets Data

**What goes wrong:** Admins accidentally break the app by editing Sheets structure (renaming columns, deleting rows, changing data formats).

**Why it happens:**
- Sheets look like spreadsheets, admins treat them like spreadsheets
- No UI constraints on what can be edited
- App assumes column names/order never change

**Consequences:**
- App crashes when expected column "Milestone Name" becomes "milestone_name"
- Data loss when admin accidentally deletes header row
- Silent data corruption when "Progress: 75%" becomes "75% done" (parsing fails)
- Production outage requiring developer intervention

**Prevention:**
1. **Protected ranges**: Lock header rows and structure columns in Sheets
2. **Data validation**: Use Sheets built-in validation (dropdowns, number ranges)
3. **Sync-time validation**: Validate structure before importing to DB
4. **Fail gracefully**: If validation fails, alert admin via email, keep serving old data

**Example validation:**
```typescript
// Sync validation
const REQUIRED_COLUMNS = ['client_email', 'milestone_name', 'progress_percent'];
const headers = rows[0];

for (const col of REQUIRED_COLUMNS) {
  if (!headers.includes(col)) {
    await alertAdmin(`Missing required column: ${col}`);
    throw new Error('Schema validation failed');
  }
}
```

**Detection:**
- Sync job failures in logs
- Missing data in dashboard after admin edits
- Type errors during data parsing

**Phase mapping:** Phase 2 sync implementation - validation must be built in from start

---

### Pitfall 3: OAuth Token Expiration Not Handled

**What goes wrong:** Sheets sync stops working silently after 1-7 days when OAuth refresh token expires or is revoked.

**Why it happens:**
- Service account not used (user OAuth used instead)
- Refresh token rotation not implemented
- No monitoring for auth failures

**Consequences:**
- Dashboard shows stale data indefinitely
- No one notices until client complains
- Manual re-authentication required
- Data drift between Sheets and DB grows

**Prevention:**
1. **Use Service Account, not OAuth**: Service accounts don't expire for server-to-server
2. **Share Sheets with service account email**: Share with `project@projectname.iam.gserviceaccount.com`
3. **Monitor auth errors**: Alert on 401/403 responses from Sheets API
4. **Implement refresh flow**: If using OAuth, implement token refresh before expiration

**Service account setup:**
```bash
# Create service account
gcloud iam service-accounts create sheets-sync

# Download key
gcloud iam service-accounts keys create key.json \
  --iam-account sheets-sync@projectname.iam.gserviceaccount.com

# Share Sheet with service account email
# In Sheets UI: Share → sheets-sync@projectname.iam.gserviceaccount.com → Editor
```

**Detection:**
- 401 Unauthorized errors in logs
- Sync job reports success but no data changes
- "last_synced_at" timestamp stops updating

**Phase mapping:** Phase 1 authentication - use service account from the start

---

### Pitfall 4: Race Conditions in Concurrent Syncs

**What goes wrong:** Multiple sync jobs run simultaneously, causing duplicate records, data overwrites, or partial updates.

**Why it happens:**
- Cron job triggers while previous job still running
- No distributed lock mechanism
- Webhook and scheduled sync both fire

**Consequences:**
- Duplicate milestone records in DB
- Partial data updates (some clients synced, others not)
- Database integrity violations
- Inconsistent state between Sheets and DB

**Prevention:**
1. **Distributed lock**: Use database advisory locks or Redis locks
2. **Idempotent sync**: Use UPSERT pattern based on unique keys
3. **Job queue**: Use queue system (BullMQ, Inngest) with concurrency: 1
4. **Sync status tracking**: Track in-progress syncs in DB

**Example lock:**
```typescript
// PostgreSQL advisory lock
const locked = await db.$queryRaw`SELECT pg_try_advisory_lock(12345)`;
if (!locked) {
  console.log('Sync already in progress');
  return;
}

try {
  await syncFromSheets();
} finally {
  await db.$queryRaw`SELECT pg_advisory_unlock(12345)`;
}
```

**Detection:**
- Duplicate records appearing in dashboard
- Unique constraint violations in logs
- Sync duration varies wildly (5s vs 60s)

**Phase mapping:** Phase 2 sync implementation - add locking before deploying cron

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or user friction.

### Pitfall 5: Cell Reference Hell

**What goes wrong:** Using A1 notation (`A1:D10`) instead of named ranges makes code brittle and hard to maintain.

**Why it happens:**
- Easier to start with `range('A1:D10')` than setting up named ranges
- Documentation examples use A1 notation

**Consequences:**
- Code breaks when admin inserts column before data
- Magic numbers scattered throughout codebase (`A1:D${lastRow}`)
- Difficult to understand what data each range represents

**Prevention:**
1. **Named ranges**: Define named ranges in Sheets (e.g., "MilestoneData")
2. **Header-based lookup**: Read headers dynamically and find column by name
3. **Document ranges**: Comment what each range contains

**Example:**
```typescript
// BAD: Brittle A1 notation
const values = await sheets.spreadsheets.values.get({
  spreadsheetId,
  range: 'A2:D100', // What is this? What if column E is added?
});

// GOOD: Named range
const values = await sheets.spreadsheets.values.get({
  spreadsheetId,
  range: 'MilestoneData', // Clear, resilient to column changes
});
```

**Phase mapping:** Phase 2 sync implementation - establish pattern early

---

### Pitfall 6: No Diff Detection on Sync

**What goes wrong:** Every sync does full delete + reinsert instead of updating only changed records.

**Why it happens:**
- Easier to implement: delete all, insert all from Sheets
- No tracking of what changed since last sync

**Consequences:**
- Unnecessary database writes (performance impact at scale)
- Breaks foreign key relationships if IDs change
- Lost audit trail (updated_at timestamps always "now")
- Can't detect what actually changed

**Prevention:**
1. **Calculate diff**: Compare Sheets data to existing DB records
2. **Update only changed**: INSERT new, UPDATE modified, DELETE removed
3. **Preserve IDs**: Use stable external IDs (from Sheets) as primary key
4. **Track sync metadata**: Store hash/checksum of each record

**Example:**
```typescript
// Calculate what changed
const sheetRecords = parseSheetData(values);
const dbRecords = await db.milestone.findMany();

const toInsert = sheetRecords.filter(sr =>
  !dbRecords.find(dr => dr.externalId === sr.externalId)
);
const toUpdate = sheetRecords.filter(sr => {
  const existing = dbRecords.find(dr => dr.externalId === sr.externalId);
  return existing && hasChanged(existing, sr);
});
const toDelete = dbRecords.filter(dr =>
  !sheetRecords.find(sr => sr.externalId === dr.externalId)
);
```

**Phase mapping:** Phase 3 optimization - can defer until MVP proven

---

### Pitfall 7: Ignoring Batch API Capabilities

**What goes wrong:** Making separate API calls for each row/cell instead of batching, wasting quota and slowing sync.

**Why it happens:**
- Simple loop over rows feels natural
- Batch API is more complex to use

**Consequences:**
- 100 rows = 100 API calls instead of 1
- Hits rate limits unnecessarily
- Slow sync times (5-10s instead of <1s)

**Prevention:**
1. **Use batchGet/batchUpdate**: Single call for multiple ranges
2. **Read entire range**: Get all rows in one call, parse in memory
3. **Batch writes**: Collect updates, send in single batchUpdate call

**Example:**
```typescript
// BAD: N API calls
for (const row of rows) {
  await sheets.spreadsheets.values.update({
    range: `A${rowIndex}`,
    values: [[row.status]],
  });
}

// GOOD: 1 API call
await sheets.spreadsheets.values.batchUpdate({
  data: rows.map((row, i) => ({
    range: `A${i + 2}`,
    values: [[row.status]],
  })),
});
```

**Phase mapping:** Phase 2 sync implementation - use from start

---

### Pitfall 8: No Offline Fallback

**What goes wrong:** App is completely broken when Sheets API is down or quota exceeded.

**Why it happens:**
- No consideration for API unavailability
- No cached/stale data served during outages

**Consequences:**
- Dashboard shows errors instead of (slightly stale) data
- Clients can't access portal during Sheets maintenance
- Single point of failure

**Prevention:**
1. **Serve from DB always**: Never block user requests on Sheets availability
2. **Show last sync time**: "Last updated 2 hours ago"
3. **Graceful degradation**: Continue serving DB data if sync fails
4. **Alert on staleness**: Warn if data >24h old

**Phase mapping:** Phase 2 sync implementation - architecture prevents this naturally

---

## Minor Pitfalls

Mistakes that cause annoyance but are easily fixable.

### Pitfall 9: Hardcoded Spreadsheet IDs

**What goes wrong:** Spreadsheet ID is hardcoded in code, difficult to change or test with different sheets.

**Prevention:**
- Store spreadsheet ID in environment variables
- Support multiple sheets (dev, staging, prod)
- Document how to change Sheet being used

**Phase mapping:** Phase 1 setup - use env vars from start

---

### Pitfall 10: No Sync Observability

**What goes wrong:** Can't tell if sync is working without checking database directly.

**Prevention:**
- Log sync start/end/duration
- Store sync status in DB (last_synced_at, sync_status, error_message)
- Admin dashboard showing sync health
- Alert on sync failures (email, Slack)

**Phase mapping:** Phase 2 sync implementation - add logging from start

---

### Pitfall 11: Mixing Data and Configuration in Same Sheet

**What goes wrong:** Milestones (configuration) and progress updates (data) in same sheet makes both harder to manage.

**Prevention:**
- Separate sheets: "Milestone Definitions" vs "Client Progress"
- Or separate tabs in same spreadsheet
- Clear naming convention

**Phase mapping:** Phase 1 data modeling - design sheets structure upfront

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Authentication setup | Using OAuth instead of Service Account | Pitfall #3 - Use service account from start |
| Sync architecture | Direct Sheets queries in API routes | Pitfall #1 - Establish sync-to-DB pattern |
| Sync implementation | No schema validation | Pitfall #2 - Validate structure before import |
| Sync implementation | Missing distributed lock | Pitfall #4 - Add lock before cron deployment |
| Data mapping | A1 notation instead of named ranges | Pitfall #5 - Use named ranges or header lookup |
| Webhook setup | Race conditions with cron | Pitfall #4 - Choose one trigger method or lock both |
| Admin UX | Unprotected sheet structure | Pitfall #2 - Lock headers, add data validation |
| Production deploy | No auth failure monitoring | Pitfall #3 - Add alerting for 401/403 errors |

---

## Google Sheets Specific Gotchas

### API Quota Limits (as of training data)
- **Read requests**: 60 per minute per user
- **Write requests**: 60 per minute per user
- **Service account**: Separate quota from user accounts
- **Quota reset**: 60-second rolling window

**Implication:** Even with 5 clients, if each page load hits Sheets, you'll hit quota with 2-3 concurrent users.

### Eventual Consistency
- Sheets API may return stale data briefly after writes
- Wait 1-2 seconds after write before reading back
- Or use write response for confirmation

### Empty Cells vs Null
- Empty cells returned as empty string `""`, not null
- Can cause type coercion issues: `""` vs `0` vs `null`
- Explicit null handling required in parsing

### Date/Time Formatting
- Sheets stores dates as serial numbers (e.g., 44927 = 2023-01-01)
- Need explicit parsing to convert to JS Date
- Timezone handling is complex (Sheets uses spreadsheet timezone)

### Array Formula Side Effects
- If admin uses array formulas, API returns computed values only
- Can't distinguish between typed data and formula output
- May break if formula changes

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Rate limiting | HIGH | Well-documented limit at 60 req/min/user |
| Service account pattern | HIGH | Standard practice for server-to-server |
| Schema validation | HIGH | Common failure mode in Sheets integrations |
| Batch API benefits | MEDIUM | Based on training, not verified with current docs |
| Quota numbers | MEDIUM | May have changed since training (Jan 2025) |
| Sync patterns | HIGH | Standard database sync architecture |

---

## Sources

**Confidence level: MEDIUM overall**

This research is based on training knowledge (knowledge cutoff January 2025) of common Google Sheets API integration patterns and pitfalls. Critical recommendations (service accounts, sync-to-DB pattern, schema validation, rate limits) are well-established patterns.

**Recommended verification before implementation:**
1. Check current Google Sheets API quota limits (may have changed)
2. Verify service account setup process with official Google Cloud docs
3. Review googleapis npm package documentation for Node.js integration
4. Confirm OAuth token expiration behavior if not using service account

**Could not verify with authoritative sources due to tool access limitations.** Treat specific quota numbers and API behaviors as hypotheses to validate during implementation.

---

## Summary: Top 3 Critical Mistakes to Avoid

1. **Querying Sheets on every request** → Use sync-to-DB pattern
2. **No schema validation** → Lock Sheets structure, validate on sync
3. **OAuth instead of Service Account** → Use service account for server-to-server

**Architecture recommendation:** Sheets as admin UI → scheduled sync (cron every 5-15min) → PostgreSQL as source of truth → Next.js reads from Postgres only.
