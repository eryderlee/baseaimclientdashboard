---
created: 2026-02-22T00:00
title: Expand Facebook Ads analytics with detailed breakdowns
area: ui
files:
  - app/dashboard/analytics/page.tsx
  - components/dashboard/fb-ads-metrics.tsx
  - lib/facebook-ads.ts
  - lib/dal.ts
---

## Problem

Current Phase 11 analytics page shows only 6 account-level metrics (spend, impressions, clicks, CTR, CPC, CPM). Client wants much more detailed analytics and reports — the token has full access to richer data but it's not being surfaced.

## Solution

Extend the analytics page with:
- **Campaign breakdown** — performance table per campaign (not just account totals)
- **Demographics** — age/gender/region breakdowns (who's seeing/clicking)
- **Placement breakdown** — Facebook vs Instagram vs Messenger vs Audience Network
- **Creative performance** — individual ad performance table
- **Trend charts** — spend/clicks/impressions over time as line graphs (recharts already in project)
- **Branded PDF reports** — BaseAim logo, client name, formatted for sharing with stakeholders

Facebook Marketing API supports all of these via the same `/insights` endpoint with different `breakdowns` and `fields` params. Token already has `ads_read` + `read_insights` scopes.

Consider as its own phase (e.g. Phase 11.1 or folded into Phase 13 UI Polish).
