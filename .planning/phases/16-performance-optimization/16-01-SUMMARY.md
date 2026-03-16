# 16-01 Summary: Supabase Connection Pooling

## Status: Complete

## What Was Done

**Task 1: Add directUrl to schema.prisma** (commit `2ba3dac`)
- Added `directUrl = env("DIRECT_URL")` to the `datasource db` block in `prisma/schema.prisma`
- `DATABASE_URL` (port 5433) → PgBouncer pooler for runtime queries
- `DIRECT_URL` (port 5432) → direct PostgreSQL for Prisma migrations/introspection
- `npx prisma validate` passed successfully

**$transaction audit — all usages compatible:**
- `app/admin/actions.ts` — interactive transaction (createClient with Drive side-effect): compatible; `pgbouncer=true` disables named prepared statements, Prisma uses single connection for callback
- `app/actions/auth.ts` — batched transaction (password reset token cleanup): compatible
- `app/admin/clients/[clientId]/actions.ts` — batched transaction: compatible

**Task 2: Environment variable configuration (human action)**
- `.env` updated: `DATABASE_URL` appended `&pgbouncer=true&connection_limit=1`, `DIRECT_URL` set to port 5432 direct connection
- Self-hosted Supabase: PgBouncer on port 5433, direct PostgreSQL on port 5432 (confirmed via docker-compose.yml `POSTGRES_PORT=5432`)
- Netlify env vars updated with same values + redeploy triggered and verified

## Artifacts
- `prisma/schema.prisma` — directUrl configured

## Key Decisions
- `connection_limit=1` per serverless function instance prevents connection exhaustion under concurrent load
- `pgbouncer=true` disables Prisma's named prepared statements which are incompatible with PgBouncer transaction mode
- DIRECT_URL not added to `lib/env.ts` — only used by Prisma CLI, not at runtime
