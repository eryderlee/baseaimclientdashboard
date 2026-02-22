# Phase 12: User Setup Required

**Generated:** 2026-02-22
**Phase:** 12-production-hardening
**Status:** Incomplete

---

## Sentry - Error Monitoring

### Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [ ] | `SENTRY_DSN` | Sentry Dashboard -> Project Settings -> Client Keys (DSN) | `.env.local` + Vercel |
| [ ] | `NEXT_PUBLIC_SENTRY_DSN` | Same DSN as SENTRY_DSN | `.env.local` + Vercel |
| [ ] | `SENTRY_ORG` | Sentry Dashboard -> Organization Settings -> slug | `.env.local` + Vercel |
| [ ] | `SENTRY_PROJECT` | Sentry Dashboard -> Project Settings -> slug | `.env.local` + Vercel |
| [ ] | `SENTRY_AUTH_TOKEN` | Sentry Dashboard -> Settings -> Auth Tokens -> Create New Token | Vercel only (CI/CD) |

### Account Setup

1. [ ] Create a Sentry account at https://sentry.io if you don't have one
2. [ ] Create a new Next.js project in Sentry
3. [ ] Get DSN from: Project Settings -> Client Keys (DSN)
4. [ ] Get org slug from: Organization Settings -> General -> Organization Slug
5. [ ] Get project slug from: Project Settings -> General -> Name/Slug
6. [ ] Create auth token from: Settings -> Auth Tokens -> Create New Token
   - Required scopes: `org:read`, `project:releases`, `project:write`

### Token Scopes for SENTRY_AUTH_TOKEN

The auth token is used by `withSentryConfig` to upload source maps during CI/CD builds. Required scopes:
- `org:read`
- `project:releases`
- `project:write`

### Local Development Note

For local development, you can leave `SENTRY_DSN` unset — Sentry init gracefully skips if no DSN is provided. Set it only when you want to test Sentry integration locally.

---

## Verification

After adding all Sentry env vars, verify the integration:

```bash
# Verify build succeeds with env vars set (no SKIP_ENV_VALIDATION needed)
npx next build

# To test Sentry is capturing errors in production:
# 1. Deploy to Vercel with all env vars set
# 2. Visit your app and trigger a test error
# 3. Check Sentry dashboard for the captured event
```

---

## Other Required Env Vars (already needed by the app)

These were previously required but now explicitly validated by `lib/env.ts`:

| Status | Variable | Notes |
|--------|----------|-------|
| [check] | `DATABASE_URL` | Validated: must be a valid URL |
| [check] | `AUTH_SECRET` | Validated: must be non-empty |
| [check] | `STRIPE_SECRET_KEY` | Validated: starts with `sk_`, MUST be `sk_live_` in production |
| [check] | `STRIPE_WEBHOOK_SECRET` | Validated: starts with `whsec_` |
| [check] | `RESEND_API_KEY` | Validated: must be non-empty |
| [check] | `GOOGLE_OAUTH_CLIENT_ID` | Validated: must be non-empty |
| [check] | `GOOGLE_OAUTH_CLIENT_SECRET` | Validated: must be non-empty |
| [check] | `GOOGLE_OAUTH_REFRESH_TOKEN` | Validated: must be non-empty |
| [check] | `GOOGLE_DRIVE_ROOT_FOLDER_ID` | Validated: must be non-empty |
| [check] | `UPSTASH_REDIS_REST_URL` | Validated: must be a valid URL (needed for Phase 12-02) |
| [check] | `UPSTASH_REDIS_REST_TOKEN` | Validated: must be non-empty (needed for Phase 12-02) |
| [check] | `NEXT_PUBLIC_APP_URL` | Validated: must be a valid URL |

---

**Once all Sentry items are complete:** Mark status as "Complete" and set the env vars in Vercel.
