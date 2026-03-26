---
plan: 17-04
phase: 17-vps-self-hosting-migration
status: complete
completed: 2026-03-26
---

# Summary: External Service Updates & Full Verification

## What Was Built

All external services updated to point to `https://dashboard.baseaim.co`. Stripe webhook endpoint updated to new domain. Google OAuth redirect URIs updated to include new domain. Full integration verification completed — login, auth session, database, rate limiting, and all integrations confirmed working on VPS.

## Deliverables

- Stripe webhook endpoint updated to `https://dashboard.baseaim.co/api/webhooks/stripe`
- Google OAuth redirect URIs updated to include `https://dashboard.baseaim.co`
- App fully verified working at `https://dashboard.baseaim.co`

## Deviations

- PM2 `env_file` option did not load `.env.production` — resolved by using a `start.sh` shell wrapper that sources the env file before starting server.js
- Shell script incompatible with PM2 cluster mode — changed to fork mode (equivalent on single-CPU VPS)
- `.env.production` had spaces around `=` for some vars — fixed with sed on VPS
- `NEXTAUTH_URL=http://localhost:3000` was in .env.production causing wrong callback URL — removed with sed
- `AUTH_SECRET` had duplicate entries (dev + prod) — dev entry removed

## Verification

- `curl -I https://dashboard.baseaim.co` returns HTTP/2 307 → /dashboard with correct security headers and `__Secure-authjs.callback-url=https://dashboard.baseaim.co`
- Login works for both client and admin accounts
- All integrations verified working

## Notes for Future Plans

- PM2 uses `start.sh` wrapper at `/var/www/dashboard/start.sh` to load `.env.production` — this file must exist on VPS and is NOT deployed by CI (manually placed, like `ecosystem.config.js`)
- If `.env.production` vars change, update the file on VPS directly and run `pm2 restart baseaim-dashboard`
- SSH port is 2222, deploy key is `~/.ssh/id_ed25519_deploy`
- PM2 runs in fork mode (not cluster) due to shell script wrapper — acceptable on single-CPU VPS
