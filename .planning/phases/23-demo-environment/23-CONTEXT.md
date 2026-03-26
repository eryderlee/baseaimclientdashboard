# Phase 23: Demo Environment - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

A single seed command creates a fully realistic demo environment with 5 fake clients, believable metrics, and no visible indicators that the data is not real. The demo admin sees only demo clients; the real admin never sees demo clients.

</domain>

<decisions>
## Implementation Decisions

### Seed command behavior
- Command: `npm run seed:demo` — production-safe, can run on any environment including production
- Idempotency: upsert pattern — finds existing demo records by stable identifier and updates them, never duplicates
- Re-run behavior: updates in place, preserves manual edits to non-seeded fields
- Cleanup: `npm run seed:demo -- --clean` flag removes all demo records (users, clients, milestones, invoices, documents)
- Console output: prints summary of what was created/updated after seeding

### Demo admin credentials
- Email: `khan@baseaim.co`
- Password: Claude's discretion (printed in console after seeding)

### Claude's Discretion
- Client profile industries and narratives (5 clients: 2 in-setup, 3 post-setup with growth milestones)
- Specific FB metric ranges and invoice amounts for realism
- Demo isolation implementation (isDemo flag filtering approach)
- Stable identifier strategy for upserts
- Console output formatting

</decisions>

<specifics>
## Specific Ideas

- 3 post-setup clients must have growth roadmap milestones active (Phase 22 feature)
- 2 in-setup clients at different progress stages (phases 1-2 and 3-4 respectively)
- Demo admin account at khan@baseaim.co must only see the 5 demo clients
- Real admin must never see demo clients in any list or analytics view

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 23-demo-environment*
*Context gathered: 2026-03-27*
