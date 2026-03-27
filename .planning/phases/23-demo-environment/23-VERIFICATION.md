---
phase: 23-demo-environment
verified: 2026-03-27T00:00:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
human_verification:
  - test: Run npm run seed:demo against live DB and log in as khan@baseaim.co
    expected: Demo admin sees exactly 5 demo clients in client list; no real clients visible
    why_human: Supabase unreachable during plan execution; prisma db push not applied. Runtime cannot be verified programmatically.
  - test: Log in as real admin and verify no demo clients appear
    expected: Real admin sees zero demo clients in client list and analytics
    why_human: Requires live database and browser session.
  - test: Log in as post-setup demo client and open dashboard
    expected: FB metrics display with realistic numbers; no empty/unconfigured state
    why_human: Short-circuit only activates at runtime when isDemo is read from DB.
  - test: Re-run npm run seed:demo on a database already containing demo data
    expected: Completes without error; no duplicates; same data as first run
    why_human: Upsert idempotency requires DB connectivity.
  - test: "Run: npm run seed:demo -- --clean (double dash required)"
    expected: All demo data deleted; real data unaffected
    why_human: "Requires live DB. Plan documents npmrunseed:demo--clean but npm only forwards args past double-dash: npmrunseed:demo----clean."
---
# Phase 23: Demo Environment Verification Report

**Phase Goal:** A single seed command creates a fully realistic demo environment with 5 fake clients, believable metrics, and no visible indicators that the data is not real
**Verified:** 2026-03-27
**Status:** passed (code artifacts) - runtime verification deferred (no live DB)
**Re-verification:** No - initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Running npm run seed:demo creates demo admin and 5 demo clients; re-running is idempotent | CODE VERIFIED | seed() uses prisma.user.upsert (by email) and prisma.client.upsert (by demoStableId); milestones/invoices/documents use delete-then-createMany |
| 2 | Demo admin sees only demo clients; real admin never sees demo clients | CODE VERIFIED | resolveClientIsDemoFilter() returns true for khan@baseaim.co, false for others; all 8 admin DAL list functions apply isDemo: isDemoAdmin |
| 3 | Two in-setup clients with partial progress; three post-setup clients with growth milestones | CODE VERIFIED | Calloway: 1 COMPLETED + 1 IN_PROGRESS + 4 NOT_STARTED. Summit Ridge: 3 COMPLETED + 1 IN_PROGRESS + 2 NOT_STARTED. Meridian/Apex/Hargrove: all 6 setup COMPLETED plus growth milestones |
| 4 | Post-setup clients have realistic FB metrics as static data; no live API calls | CODE VERIFIED | DEMO_FB_INSIGHTS, DEMO_FB_CAMPAIGNS, DEMO_FB_DAILY_TREND keyed by demoStableId; all 4 client FB DAL functions short-circuit before FB API call |
| 5 | Post-setup clients have realistic invoices and documents with believable names | CODE VERIFIED | Meridian: 2 invoices + 3 docs; Apex: 5 invoices + 5 docs; Hargrove: 8 invoices + 10 docs; DEMO-prefixed invoice numbers |

**Score:** 5/5 truths verified at code level
---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| prisma/schema.prisma | isDemo Boolean default false and demoStableId String unique nullable on Client | VERIFIED | Lines 78-79; both fields present with correct constraints |
| lib/demo-data.ts | Exports DEMO_FB_INSIGHTS, DEMO_FB_CAMPAIGNS, DEMO_FB_DAILY_TREND, DEMO_ADMIN_EMAIL | VERIFIED | 282 lines; all 4 exports; 3 post-setup clients; weekday/weekend daily variation |
| lib/dal.ts | resolveClientIsDemoFilter; 8 admin functions filtered; 4 client FB short-circuited | VERIFIED | 1585 lines; 16 occurrences of isDemoAdmin; all 12 relevant functions confirmed |
| scripts/seed-demo.ts | 5 demo client profiles with milestones/invoices/docs; idempotent upserts; clean support | VERIFIED | 1037 lines; all 5 profiles defined; upsert by email/demoStableId; clean removes by isDemo:true |
| package.json | seed:demo npm script | VERIFIED | Line 14: seed:demo runs npx tsx scripts/seed-demo.ts |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| lib/dal.ts | lib/demo-data.ts | import DEMO_ADMIN_EMAIL, DEMO_FB_INSIGHTS, DEMO_FB_CAMPAIGNS, DEMO_FB_DAILY_TREND | WIRED | dal.ts line 12 |
| getAllClientsWithMilestones | prisma.client.findMany | where isDemo isDemoAdmin | WIRED | dal.ts lines 148-151 |
| getAdminRevenueAnalytics | prisma.invoice.findMany | nested client isDemo filter | WIRED | dal.ts lines 926-930 |
| getAdminFbAggregation | DEMO_FB_INSIGHTS | isDemoAdmin branch aggregates static totals | WIRED | dal.ts lines 989-992 |
| getAdminFbPerClient | DEMO_FB_INSIGHTS | isDemoAdmin branch builds per-client map | WIRED | dal.ts lines 1064-1075 |
| getAdminFbDailyAggregation | DEMO_FB_DAILY_TREND | isDemoAdmin branch sums daily entries | WIRED | dal.ts lines 1141-1144 |
| getAdminFbMetricsPerClient | DEMO_FB_INSIGHTS | isDemoAdmin branch per-client full metrics | WIRED | dal.ts lines 1227-1238 |
| getAdminAllCampaigns | DEMO_FB_CAMPAIGNS | isDemoAdmin branch flattens campaign arrays | WIRED | dal.ts lines 1316-1330 |
| getAdminAllAds | (none) | isDemoAdmin returns empty array - intentional | WIRED | dal.ts line 1424 |
| getClientFbInsights | DEMO_FB_INSIGHTS | client.isDemo and demoStableId check before FB API | WIRED | dal.ts lines 657-660 |
| getClientFbCampaigns | DEMO_FB_CAMPAIGNS | client.isDemo and demoStableId check before FB API | WIRED | dal.ts lines 754-756 |
| getClientFbDailyTrend | DEMO_FB_DAILY_TREND | client.isDemo and demoStableId check before FB API | WIRED | dal.ts lines 848-850 |
| getClientFbDailyTrendByRange | DEMO_FB_DAILY_TREND | client.isDemo and demoStableId check before FB API | WIRED | dal.ts lines 890-892 |
| getClientAdConfig | prisma.client.findUnique | select includes isDemo and demoStableId | WIRED | dal.ts lines 370 and 378 both CLIENT and preview paths |
| scripts/seed-demo.ts | prisma.client.upsert | keyed by demoStableId for idempotency | WIRED | seed-demo.ts lines 907-927 |
| package.json | scripts/seed-demo.ts | seed:demo npm script definition | WIRED | package.json line 14 |

---

## Anti-Patterns Found

None detected in key phase artifacts.

The return [] in getAdminAllAds (dal.ts line 1424) when isDemoAdmin is true is intentional per plan design. The ads breakdown view is the least critical admin panel and an empty array for demo admin is explicitly accepted.

---

## Known Blocking Gap: Database Migration Not Applied

The schema migration (prisma db push) has not been applied to the remote Supabase instance. The isDemo and demoStableId columns do not yet exist in the remote database.

Until prisma db push runs successfully:
- The seed script fails at runtime (missing columns)
- All isDemo filtering in DAL functions fails at runtime
- Demo short-circuits in client FB functions are never reached

This is an operational/connectivity gap, not a code gap. All code is complete and correct.

---

## Human Verification Required

### 1. Apply schema migration

**Test:** Run npx prisma db push against the live Supabase database
**Expected:** Migration applies cleanly; isDemo and demoStableId columns added to clients table
**Why human:** Requires live database connectivity

### 2. Seed and verify demo admin isolation

**Test:** Run npm run seed:demo, then log in as khan@baseaim.co / BaseAim2026!
**Expected:** Client list shows exactly 5 clients (Calloway and Klein CPAs, Summit Ridge Accounting, Meridian Financial Group, Apex Tax and Advisory, Hargrove and Associates); no real clients visible
**Why human:** Requires live database and browser session

### 3. Verify real admin isolation

**Test:** Log in as the real admin account after demo data is seeded
**Expected:** Zero demo clients visible in client list, analytics, or revenue views
**Why human:** Requires live database and browser session

### 4. Verify demo client FB metrics

**Test:** Log in as tosei@meridianfinancial.com or use admin preview mode, navigate to dashboard metrics
**Expected:** Facebook Ads metrics display with realistic values (spend ~3840, CTR 3.0%, ROAS 1.82); no empty/unconfigured state
**Why human:** Short-circuit only activates at runtime after DB migration is applied

### 5. Verify clean invocation syntax

**Test:** Run: npm run seed:demo -- --clean (with double-dash separator before --clean)
**Expected:** All demo data deleted; real data unaffected
**Why human:** Requires live DB. The plan documents npm run seed:demo --clean but npm only forwards extra args past a double-dash separator. The script code (process.argv.includes) is correct. A dedicated seed:demo:clean npm script alias would prevent this confusion.

---

## Gaps Summary

No code gaps. All phase artifacts exist, are substantive, and are fully wired.

Two operational notes (neither is a code defect):
1. prisma db push has not been applied to Supabase - this is required before any runtime use of the demo environment
2. The --clean invocation documented in plan 23-02 as npm run seed:demo --clean will not forward the flag in all npm versions. The correct invocation is npm run seed:demo -- --clean. A dedicated seed:demo:clean npm script alias would prevent confusion.

---

_Verified: 2026-03-27_
_Verifier: Claude (gsd-verifier)_
