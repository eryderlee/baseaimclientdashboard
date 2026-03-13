---
phase: 15
plan: 01
name: "Add postinstall prisma generate"
subsystem: deployment
status: complete
tags: [prisma, vercel, deployment, postinstall]

dependency-graph:
  requires: []
  provides: ["postinstall script for Vercel Prisma Client binary generation"]
  affects: ["15-02", "15-03", "15-04"]

tech-stack:
  added: []
  patterns: ["postinstall npm lifecycle hook for Prisma binary regeneration on deploy"]

key-files:
  created: []
  modified:
    - package.json

decisions:
  - "postinstall: prisma generate ensures Vercel regenerates the Prisma Client binary for the correct Linux platform on every deploy, preventing PrismaClientInitializationError from stale cached binaries"

metrics:
  duration: "1 min"
  completed: "2026-03-13"
---

# Phase 15 Plan 01: Add postinstall prisma generate Summary

**One-liner:** Added `"postinstall": "prisma generate"` to package.json scripts so Vercel rebuilds Prisma Client for the correct platform on every deploy.

## What Was Done

Added a single line to the `scripts` section of `package.json`:

```json
"postinstall": "prisma generate"
```

This runs automatically after `npm install` during Vercel's build process, ensuring a fresh Prisma Client binary is compiled for the Linux/glibc target environment rather than relying on a cached binary compiled for a different platform.

## Why This Matters

Without this script, Vercel's dependency cache can serve a Prisma Client binary compiled for the wrong OS/architecture, causing `PrismaClientInitializationError` at runtime. The `postinstall` hook forces regeneration on every deploy regardless of cache state.

## Verification Results

1. `node -e "const p = require('./package.json'); console.log(p.scripts.postinstall)"` → `prisma generate`
2. `git log --oneline -1` → `b5f1291 fix: add postinstall prisma generate for Vercel deployment`
3. `git status` → branch up to date with origin/main, clean working tree

## Commit

- **Hash:** b5f1291
- **Message:** `fix: add postinstall prisma generate for Vercel deployment`
- **Pushed to:** main branch (origin)

## Deviations from Plan

None - plan executed exactly as written.
