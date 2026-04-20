# Survey → Dashboard Integration Design

**Date:** 2026-04-21
**Status:** Approved

---

## Overview

When a prospect completes the intake survey on the survey website, their data is sent directly to this dashboard instead of Google Sheets. The dashboard automatically creates their account, stores all intake data, seeds their onboarding milestones, and emails them a magic link to access their workspace — all in one step.

---

## 1. Data Flow

```
Survey backend
    │
    │  POST /api/webhooks/survey
    │  Header: x-api-key: <shared secret>
    │  Body: full survey payload (JSON)
    ▼
Dashboard API
    ├── Validates API key (401 if wrong)
    ├── Checks email not already registered (409 if duplicate)
    ├── Creates User + Client + ClientIntake (single DB transaction)
    ├── Creates 2 onboarding milestones
    ├── Generates magic link token → sends welcome email via Resend
    └── Returns { success: true, clientId }

Client receives welcome email
    └── Clicks magic link → logged in → lands on /dashboard
```

---

## 2. Database Schema

### New table: `ClientIntake`

One-to-one with `Client`. Stores all survey-specific intake data as a snapshot.

| Column | Type | Notes |
|--------|------|-------|
| id | String | CUID primary key |
| clientId | String | Unique FK → Client |
| decisionMaker | String | "just_me" \| "partner" \| "spouse" \| "other: ..." |
| state | String | "NSW" \| "VIC" \| "QLD" etc. |
| servicesOffered | Json | Array of service strings |
| hasRunPaidAds | Boolean | |
| hasSocialPage | Boolean | |
| targetServices | Json | Array, up to 3 services |
| idealClients | Json | Array of client type strings |
| excludedClientTypes | String? | Optional free text |
| monthlyCapacity | String | "1-3" \| "4-6" \| "7-10" \| "10+" |
| goals90Day | Json | Array of goal strings |
| currentSituation | Json | Array of situation strings |
| mainConcern | String? | Optional |
| kickoffCallBooked | Boolean | Default false |
| kickoffCallDate | DateTime? | Optional — include if available |
| createdAt | DateTime | |

### Changes to existing `Client` table

None. The `Client` table is unchanged — all survey-specific fields including `state` live in `ClientIntake`.

### New standard milestones (all clients)

The following 2 milestones are created for **every** new client — whether created via survey or manually by admin:

| Order | Title | Initial Status |
|-------|-------|----------------|
| 1 | Complete intake | COMPLETED (survey) / NOT_STARTED (manual) |
| 2 | Kickoff call | IN_PROGRESS (survey) / NOT_STARTED (manual) |

The rest of the milestone flow continues as normal from the dashboard.

---

## 3. API Endpoint

### `POST /api/webhooks/survey`

**Auth:** `x-api-key` header must match `SURVEY_API_KEY` environment variable.

**Responses:**
- `200` — success
- `401` — invalid or missing API key
- `409` — email already registered
- `500` — server error

**Request payload:**

```json
{
  "name": "Jane Smith",
  "email": "jane@smithaccounting.com.au",
  "phone": "0412 345 678",
  "decisionMaker": "just_me",

  "companyName": "Smith Accounting",
  "website": "smithaccounting.com.au",
  "state": "NSW",
  "servicesOffered": ["Individual tax returns", "Bookkeeping"],
  "hasRunPaidAds": false,
  "hasSocialPage": true,

  "targetServices": ["Bookkeeping", "Individual tax returns"],
  "idealClients": ["Sole traders & contractors", "Small businesses ($0-$500K revenue)"],
  "excludedClientTypes": "crypto, adult industry",
  "monthlyCapacity": "4-6",

  "goals90Day": ["Consistent, predictable new client flow"],
  "currentSituation": ["Lead flow is inconsistent and unpredictable"],
  "mainConcern": "Spending money on ads that don't work",

  "kickoffCallBooked": true,
  "kickoffCallDate": "2026-05-01T10:00:00Z"
}
```

**Optional fields:** `excludedClientTypes`, `mainConcern`, `kickoffCallDate`

**Success response:**

```json
{ "success": true, "clientId": "cuid..." }
```

**On success, the dashboard will:**
1. Create a `User` record (role: CLIENT, randomised internal password — client never uses this)
2. Create a `Client` record (companyName, phone, website, onboardingStep: 0)
3. Create a `ClientIntake` record with all survey fields
4. Create 2 milestones: Complete intake (COMPLETED) + Kickoff call (IN_PROGRESS)
5. Generate a magic link token (72-hour expiry)
6. Send a welcome email to the client with their magic link

---

## 4. Magic Link Flow

1. Dashboard generates a secure random token, stores it in `PasswordResetToken` table with 72-hour expiry
2. Sends welcome email via Resend with link: `https://yourdomain.com/auth/magic-link?token=<token>`
3. Client clicks link → dashboard validates token → signs them in → redirects to `/dashboard` → token deleted (one-use)

**If the token is expired:**
Client lands on an expired-link page with two options:
- **"Send me a new link"** → generates and emails a fresh magic link
- **"Set a password instead"** → sends a password-set email; after setting, they can log in with email + password anytime

---

## 5. New Environment Variable

Add to dashboard `.env`:

```
SURVEY_API_KEY=your-secret-key-here
```

Generate with: `openssl rand -hex 32`

---

## 6. Instructions for Survey Website Developer

> The section below is ready to copy-paste and hand to the developer of the survey website.

---

### Integration Instructions — Survey to Dashboard

When a user completes the intake survey and reaches the completion screen, your backend should replace the current Google Sheets API call with a single POST request to the dashboard.

#### Endpoint

```
POST https://yourdomain.com/api/webhooks/survey
```

#### Authentication

Include the following header on every request:

```
x-api-key: <value we will provide>
```

Requests without this header, or with the wrong key, will receive `401 Unauthorized`.

#### When to fire

Fire the request on the **completion screen** — after the Cal.com booking step. If a booking date is available from Cal.com, include it in the payload. If not, omit `kickoffCallDate` and set `kickoffCallBooked: false`.

#### Request format

`Content-Type: application/json`

```json
{
  "name": "Jane Smith",
  "email": "jane@smithaccounting.com.au",
  "phone": "0412 345 678",
  "decisionMaker": "just_me",

  "companyName": "Smith Accounting",
  "website": "smithaccounting.com.au",
  "state": "NSW",
  "servicesOffered": ["Individual tax returns", "Bookkeeping"],
  "hasRunPaidAds": false,
  "hasSocialPage": true,

  "targetServices": ["Bookkeeping", "Individual tax returns"],
  "idealClients": ["Sole traders & contractors", "Small businesses ($0-$500K revenue)"],
  "excludedClientTypes": "crypto, adult industry",
  "monthlyCapacity": "4-6",

  "goals90Day": ["Consistent, predictable new client flow"],
  "currentSituation": ["Lead flow is inconsistent and unpredictable"],
  "mainConcern": "Spending money on ads that don't work",

  "kickoffCallBooked": true,
  "kickoffCallDate": "2026-05-01T10:00:00Z"
}
```

#### Field reference

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| name | string | yes | Full name from Step 1 |
| email | string | yes | Email from Step 2 |
| phone | string | yes | Phone from Step 3 |
| decisionMaker | string | yes | One of: `"just_me"`, `"partner"`, `"spouse"`, `"other: <free text>"` |
| companyName | string | yes | Firm name from Step 5 |
| website | string | yes | Firm website from Step 6 |
| state | string | yes | State from Step 7 (e.g. `"NSW"`, `"VIC"`) |
| servicesOffered | string[] | yes | Selected values from Step 8 |
| hasRunPaidAds | boolean | yes | Step 9 answer |
| hasSocialPage | boolean | yes | Step 10 answer |
| targetServices | string[] | yes | Up to 3 values from Step 11 |
| idealClients | string[] | yes | Selected values from Step 12 |
| excludedClientTypes | string | no | Free text from Step 13 — omit if blank |
| monthlyCapacity | string | yes | One of: `"1-3"`, `"4-6"`, `"7-10"`, `"10+"` |
| goals90Day | string[] | yes | Selected values from Step 15 |
| currentSituation | string[] | yes | Selected values from Step 16 |
| mainConcern | string | no | Selected value from Step 17 — omit if not answered |
| kickoffCallBooked | boolean | yes | Whether booking was completed |
| kickoffCallDate | string (ISO 8601) | no | Include if Cal.com returns a date, e.g. `"2026-05-01T10:00:00Z"` |

#### Responses

| Status | Meaning | Action |
|--------|---------|--------|
| 200 | Success | Client account created, magic link sent. Show completion screen. |
| 401 | Bad API key | Check the key — do not retry without fixing |
| 409 | Email already registered | Show message: "Looks like you already have an account. Check your email for a login link." |
| 500 | Server error | Log the error, optionally retry once after a short delay |

#### After a successful response

The dashboard handles everything from here — account creation, welcome email, magic link. You do not need to redirect the user or do anything else. Show your completion screen as normal.

---

*End of developer instructions.*
