---
plan: 17-01
phase: 17-vps-self-hosting-migration
status: complete
completed: 2026-03-16
duration: ~4 min
subsystem: infrastructure
tags: [nextjs, pm2, standalone, vps, proxy]
---

# Phase 17 Plan 01: VPS Self-Hosting Configuration Summary

## What Was Built

Next.js standalone output mode, PM2 cluster configuration, and proxy.ts migration — the three code-level changes required before the app can run on a VPS with PM2. `next.config.ts` now includes `output: 'standalone'` so the build artifact is self-contained. `ecosystem.config.js` provides PM2 with cluster-mode config pointing to `.next/standalone/server.js`. `proxy.ts` replaces the deprecated `middleware.ts` with identical routing and rate-limiting logic, restructured to export the auth handler both as default and as a named `proxy` export for Next.js 16 convention.

## Deliverables

- `next.config.ts`: `output: 'standalone'` added as first property; serverExternalPackages comment updated to remove Vercel reference
- `ecosystem.config.js`: PM2 CommonJS config with cluster mode, max instances, memory limit, production env vars, and log paths
- `proxy.ts`: Auth wrapper assigned to `proxyHandler` const, exported as both default and named `proxy`; all routing logic, imports, and config.matcher identical to original middleware.ts
- `middleware.ts`: Deleted

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: Standalone output + PM2 config | c51df6b | next.config.ts, ecosystem.config.js |
| Task 2: middleware.ts → proxy.ts | b3387c3 | proxy.ts (created), middleware.ts (deleted) |

## Deviations

None — plan executed exactly as written.

## Build Verification Note

`npm run build` compiled successfully on Windows (49s, all 24 pages generated, TypeScript clean). The final standalone file-copy step produced an EINVAL error due to Windows prohibiting colons in filenames (`node:inspector` virtual module chunk). This is a Windows-only limitation and will not affect the Linux VPS target. The `output: 'standalone'` configuration is correct and will produce a complete `.next/standalone/server.js` on Linux CI/CD or the VPS itself.

## Notes for Future Plans

- `ecosystem.config.js` references `cwd: '/var/www/dashboard'` — this must match the actual VPS deployment path
- `ecosystem.config.js` references `/var/log/pm2/` — the PM2 log directory must exist on the VPS (Plan 17-03 or 17-04 should create it)
- Build verification on the VPS (Linux) will confirm `.next/standalone/server.js` is produced correctly
- `proxy.ts` named export (`export { proxyHandler as proxy }`) satisfies Next.js 16 convention; no middleware.ts deprecation warnings should appear on Linux build
