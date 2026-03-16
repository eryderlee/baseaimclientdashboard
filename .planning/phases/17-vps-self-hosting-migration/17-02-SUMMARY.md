---
plan: 17-02
phase: 17-vps-self-hosting-migration
status: complete
completed: 2026-03-16
duration: ~2 min
---

# Phase 17 Plan 02: GitHub Actions CI/CD Pipeline Summary

## What Was Built

A single-job GitHub Actions workflow that fully automates deployment on every push to main. The build runs on the GitHub Actions runner (ubuntu-latest) rather than the VPS, avoiding RAM pressure on the server. The Next.js standalone artifact is prepared with the required `public/` and `.next/static/` copies, integrity-verified, transferred to the VPS via SCP, then swapped into place and reloaded with zero downtime via `pm2 reload`. Sentry source maps upload automatically during the CI build step. The `ecosystem.config.js` is intentionally not copied — PM2 uses the committed copy at `/var/www/dashboard/ecosystem.config.js` placed during provisioning (Plan 17-03), keeping a single source of truth.

## Deliverables

- `.github/workflows/deploy.yml` — Single-job CI/CD pipeline: build on runner, SCP transfer, SSH swap + PM2 reload
- `.gitignore` verified — `.env*` glob already covers `.env.production`; `ecosystem.config.js` correctly NOT gitignored

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: Create GitHub Actions deploy workflow | bd7635d | `.github/workflows/deploy.yml` |
| Task 2: Verify .gitignore covers deployment artifacts | (no changes needed) | `.gitignore` verified, no modifications |

## Required GitHub Secrets

These must be set in GitHub repo Settings → Secrets → Actions before the workflow can run:

| Secret | Purpose |
|--------|---------|
| `VPS_HOST` | VPS IP address |
| `VPS_USER` | SSH username |
| `VPS_SSH_KEY` | Full private SSH key (PEM) |
| `SENTRY_AUTH_TOKEN` | Sentry source map upload |
| `SENTRY_ORG` | Sentry organization slug |
| `SENTRY_PROJECT` | Sentry project slug |
| `NEXT_PUBLIC_SENTRY_DSN` | Client-side Sentry DSN |

## Deviations

None — plan executed exactly as written.

## Notes for Future Plans

- Plan 17-03 (VPS provisioning) must place `ecosystem.config.js` at `/var/www/dashboard/ecosystem.config.js` before the first deploy can succeed. PM2 reload depends on this file being present.
- The deploy target path is `/var/www/dashboard/_deploy` for the SCP stage, then the SSH step moves the artifact to `/var/www/dashboard/.next/standalone`.
- `next.config` must have `output: 'standalone'` set (should be verified in Plan 17-03 or confirm it exists in current config).
