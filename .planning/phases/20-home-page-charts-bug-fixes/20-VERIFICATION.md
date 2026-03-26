---
phase: 20-home-page-charts-bug-fixes
verified: 2026-03-26T00:00:00Z
status: human_needed
score: 5/5 must-haves verified
human_verification:
  - test: Home page chart renders spend bars
    expected: An Ad Performance section is visible on the home page with a bar chart showing daily ad spend data (requires a client with adAccountId configured and facebookAccessToken set)
    why_human: Cannot invoke Facebook API during static verification; requires a configured client session
  - test: Leads chart hidden when leadsChartEnabled is false
    expected: For a client with leadsChartEnabled=false, no leads line or legend appears in the chart, only spend bars
    why_human: Requires live session and database state to verify conditional rendering path
  - test: Combined chart with legend when leadsChartEnabled is true
    expected: Enabling leadsChartEnabled via the admin edit form causes the home page chart to show both spend bars and leads line with a recharts Legend
    why_human: Requires toggling the admin switch, verifying schema db push succeeded, and reloading the home page
  - test: Date range buttons trigger a server re-render and fresh API data
    expected: Clicking 7D/30D/All on the home page changes the URL to ?range=7d/30d/all, the Suspense skeleton briefly appears, and the chart updates with data scoped to that date range
    why_human: Cannot observe Suspense streaming or cache key changes programmatically; must be verified in browser
  - test: Analytics page campaign metrics re-fetch on date range change
    expected: On the analytics page, clicking 7D/30D/All in FbAdsMetrics updates URL and metric cards show data for the new range. Note the Spend and Leads Trend chart on analytics page will not change (pre-existing limitation outside phase 20 scope)
    why_human: Requires live FB data and browser interaction to confirm metric card update
  - test: db push for leadsChartEnabled schema field
    expected: Run npx prisma db push when Supabase is reachable to persist leadsChartEnabled Boolean column in production database
    why_human: Schema change was deferred in 20-01 due to Supabase unreachability; must be confirmed when DB is accessible
---

# Phase 20: Home Page Charts + Bug Fixes Verification Report

**Phase Goal:** Client home page displays spend and leads charts with a working date range selector that actually fetches fresh data
**Verified:** 2026-03-26
**Status:** human_needed (all automated checks pass; 6 items require human/environment verification)
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Client home page shows a daily ad spend chart for the active date range | VERIFIED | SpendLeadsSection in app/dashboard/page.tsx calls getClientFbDailyTrendByRange(datePreset) and passes result to FbTrendChart which always renders the Bar for spend |
| 2 | Client home page shows a leads chart when admin has enabled it | VERIFIED | SpendLeadsSection reads clientAdConfig?.leadsChartEnabled ?? false and passes it as leadsEnabled prop; FbTrendChart conditionally renders leads Line, right YAxis, and Legend when leadsEnabled=true |
| 3 | A combined chart with a legend is visible when multiple metrics are active | VERIFIED | FbTrendChart uses ComposedChart with Bar (spend) + Line (leads) + Legend when leadsEnabled=true; leadsEnabled=false hides all three |
| 4 | Changing the date range on the home page fetches new data from the Facebook Ads API | VERIFIED | DateRangeSelector uses Link href navigation; page reads searchParams.range; getClientFbDailyTrendByRange cache key includes datePreset so each range hits a distinct cache bucket and triggers a real FB API call on miss |
| 5 | Changing the date range on the campaign performance section fetches fresh data | VERIFIED (scoped) | FbAdsMetrics on analytics page uses handleRangeChange to URL ?range=; FbAdsSection passes datePreset to getClientFbInsights/Campaigns/PlatformBreakdown. Note: trend chart on analytics page calls getClientFbDailyTrend() without range - pre-existing gap outside phase 20 scope |

**Score:** 5/5 truths verified structurally

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| app/dashboard/page.tsx | searchParams-driven page with SpendLeadsSection, DateRangeSelector, Suspense | VERIFIED | 120 lines; SpendLeadsSection async function defined; two Suspense boundaries; searchParams Promise pattern |
| components/dashboard/date-range-selector.tsx | Client component with useSearchParams | VERIFIED | 34 lines; use client directive; useSearchParams present; Link-based navigation with active state |
| components/dashboard/fb-trend-chart.tsx | leadsEnabled optional prop | VERIFIED | 124 lines; leadsEnabled?: boolean in interface; default true; conditional renders for YAxis, Legend, Line |
| components/dashboard/dashboard-overview.tsx | No AnalyticsOverview import or usage | VERIFIED | 409 lines; zero matches for AnalyticsOverview; no fbDailyData or isFbConfigured props |
| lib/dal.ts getClientFbDailyTrendByRange | New DAL function accepting DatePreset | VERIFIED | Function at line 790; accepts datePreset with default last_30d; unstable_cache with parameterized key |
| prisma/schema.prisma | leadsChartEnabled Boolean field on Client | VERIFIED | Line 70: leadsChartEnabled Boolean @default(false) |
| lib/dal.ts getClientAdConfig | Returns leadsChartEnabled in both branches | VERIFIED | Lines 299 and 307: leadsChartEnabled: true in both ADMIN-preview and CLIENT select branches |
| components/admin/client-form.tsx | Switch toggle for leadsChartEnabled | VERIFIED | Imports Switch; renders with Show Leads Chart label; watch/setValue pattern; special boolean serialization |
| components/ui/switch.tsx | shadcn Switch component | VERIFIED | File exists (created via npx shadcn@latest add switch in 20-01) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| app/dashboard/page.tsx | lib/dal.ts | SpendLeadsSection calls getClientFbDailyTrendByRange(datePreset) | WIRED | Direct import and call at line 21 of page.tsx |
| app/dashboard/page.tsx | components/dashboard/fb-trend-chart.tsx | SpendLeadsSection passes buildTrendData result as data and leadsEnabled prop | WIRED | FbTrendChart data and leadsEnabled at line 31 |
| app/dashboard/page.tsx | searchParams | URL param ?range= drives dateRange which drives datePreset in SpendLeadsSection | WIRED | searchParams resolved at line 48; rangToDatePreset converts at line 19 |
| app/dashboard/page.tsx | components/dashboard/date-range-selector.tsx | DateRangeSelector wrapped in its own Suspense outside SpendLeadsSection | WIRED | Suspense+DateRangeSelector at lines 110-112; separate Suspense boundary |
| components/dashboard/date-range-selector.tsx | URL | useSearchParams reads active range; Link href updates URL | WIRED | Both confirmed in 34-line file |
| lib/dal.ts getClientFbDailyTrendByRange | Facebook API | calls fetchFacebookDailyInsights with adAccountId, token, datePreset | WIRED | Line 809; wrapped in unstable_cache with datePreset-parameterized key |
| components/admin/client-form.tsx | server action | Switch value serialized as String, extracted in app/admin/actions.ts | WIRED | Special serialization case confirmed in client-form.tsx line 53 |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| CHART-01: Daily ad spend chart on home page | SATISFIED | SpendLeadsSection renders FbTrendChart with spend Bar |
| CHART-02: Leads chart conditional on flag | SATISFIED | leadsEnabled prop gates leads Line and YAxis |
| CHART-03: Combined chart with legend | SATISFIED | ComposedChart + Legend when leadsEnabled=true |
| CHART-05: Home page date range fetches fresh data | SATISFIED | searchParams drives datePreset drives parameterized cache key |
| CHART-06: AnalyticsOverview removed, replaced by SpendLeadsSection | SATISFIED | No AnalyticsOverview in dashboard-overview.tsx; SpendLeadsSection in page.tsx |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| components/dashboard/dashboard-overview.tsx | 73-74 | Dead code: const analytics = { totalAdSpend: 0 } and const isFbConfigured = false | Info | Remnants from AnalyticsOverview removal; Media Budget stat card always shows dash. Non-blocking. |
| components/dashboard/analytics-overview.tsx | whole file | File exists but is imported nowhere in app/ or components/ | Info | Orphaned file; no functional impact. Can be deleted in future cleanup. |

No blockers or warnings found.

### Human Verification Required

#### 1. Home page chart renders spend bars

**Test:** Log in as a client with adAccountId configured and facebookAccessToken set. Navigate to the dashboard home page.
**Expected:** An "Ad Performance" section appears below the main DashboardOverview content, with a bar chart showing daily ad spend data for the default 30-day range.
**Why human:** Requires a live Facebook API response; cannot be triggered statically.

#### 2. Leads chart hidden when leadsChartEnabled is false

**Test:** Ensure leadsChartEnabled is false for a test client (default for new clients). View the home page chart.
**Expected:** Only spend bars appear. No leads line, no right Y-axis, no legend.
**Why human:** Requires live session and database state.

#### 3. Combined chart with legend when leadsChartEnabled is true

**Test:** In admin, navigate to a client edit page, enable the "Show Leads Chart on Home Page" Switch, save, then view that client home page (or use admin preview).
**Expected:** Chart shows both blue spend bars and a green leads line with a recharts Legend at the bottom.
**Why human:** Requires admin UI interaction and database write.

#### 4. Date range buttons trigger fresh data

**Test:** On the home page, click 7D, then 30D, then All.
**Expected:** Each click changes the URL (?range=7d, ?range=30d, ?range=all), the Suspense skeleton briefly appears, and the chart updates with data appropriate to the date range. Different ranges should show different chart shapes.
**Why human:** Suspense streaming and cache miss behavior cannot be verified statically.

#### 5. Analytics page campaign metrics re-fetch on range change

**Test:** On the analytics page, click 7D in the FbAdsMetrics section.
**Expected:** URL changes to ?range=7d and metric cards update to 7-day totals. Note: the "Spend & Leads Trend" chart on the analytics page will NOT change on range click - it calls getClientFbDailyTrend() without a date range parameter. This is a pre-existing limitation outside phase 20 scope.
**Why human:** Requires live FB data to confirm metric values change.

#### 6. Database migration for leadsChartEnabled

**Test:** Run npx prisma db push when the Supabase database is reachable.
**Expected:** leadsChartEnabled Boolean @default(false) column exists in the Client table in production. All existing clients default to false.
**Why human:** The db push was deferred in 20-01 due to database unreachability. TypeScript compiles cleanly against the generated Prisma client but the live database schema has not been confirmed.

### Gaps Summary

No structural gaps. All artifacts exist, are substantive, and are correctly wired. The phase goal is structurally achieved. Two items remain before full sign-off:

1. Run npx prisma db push to apply the leadsChartEnabled column to production (deferred from 20-01 due to Supabase being unreachable)
2. Human verification of live browser behavior for all chart behaviors

The one pre-existing limitation (analytics page trend chart not using datePreset) is outside phase 20 scope as confirmed by the plan success criteria covering CHART-01/02/03/05/06 only.

---

_Verified: 2026-03-26_
_Verifier: Claude (gsd-verifier)_
