# Phase 17: VPS Self-Hosting Migration - Research

**Researched:** 2026-03-16
**Domain:** VPS deployment — Node.js/Next.js 16, PM2, Nginx, Certbot, GitHub Actions
**Confidence:** HIGH (official docs + multiple verified sources)

---

## Summary

Migrating the existing Netlify-hosted Next.js 16 app to a VPS running PM2 + Nginx + SSL requires five coordinated components: (1) Next.js standalone output mode, (2) PM2 process management with cluster mode, (3) Nginx as an SSL-terminating reverse proxy, (4) Certbot/Let's Encrypt for TLS, and (5) GitHub Actions for automated push-to-deploy. All five have well-established, well-documented patterns.

The application's existing integrations (Stripe webhooks, NextAuth v5, Upstash Redis, Sentry) each have VPS-specific considerations that must be addressed. Stripe's `req.text()` raw body approach already works correctly in the App Router and survives the move. NextAuth v5 needs `AUTH_TRUST_HOST=true` behind Nginx. Upstash Redis works unchanged via HTTP (no connection pooling needed). Sentry source-map uploads move to the GitHub Actions build job.

The single most important code change for VPS is adding `output: 'standalone'` to `next.config.ts`. This produces a self-contained `.next/standalone/server.js` that PM2 runs directly, eliminating the need to copy `node_modules` to the server.

**Primary recommendation:** Use `output: 'standalone'` + PM2 cluster mode + `pm2 reload` (not `pm2 restart`) for zero-downtime deploys. Build on the GitHub Actions runner, not on the VPS, and transfer the built artifact via SSH.

---

## Standard Stack

### Core

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| PM2 | latest (5.x) | Node.js process manager | Industry standard for VPS Node.js — automatic restarts, cluster mode, startup scripts |
| Nginx | system pkg (1.18+) | Reverse proxy + SSL termination | Fastest static file serving, HTTP/2, mature SSL handling |
| Certbot | system pkg | Let's Encrypt SSL automation | Official ACME client, auto-renewal via systemd timer |
| appleboy/ssh-action | v1.0.3+ | GitHub Actions SSH executor | Dominant action for VPS SSH deployment (verified multiple sources) |

### Supporting

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| NVM | latest | Node.js version management | Required on VPS — avoids permission issues, controls exact Node version |
| pm2-logrotate | built-in module | Log file rotation | Prevents disk fill from PM2 logs on long-running VPS |
| `next build --standalone` (via `output: 'standalone'`) | N/A (config flag) | Produce self-contained build artifact | Always — reduces deployed artifact from full node_modules to traced deps only |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PM2 cluster | Docker | Docker adds operational complexity; PM2 is simpler for single-app VPS |
| Certbot | Caddy | Caddy auto-SSL is simpler but introduces another web server dependency |
| GitHub Actions SSH | Self-hosted runner | Self-hosted runner adds setup; appleboy/ssh-action is sufficient |

**Installation (on VPS):**
```bash
# Node.js via NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20          # Next.js 16 requires Node 20.9+
nvm alias default 20

# PM2
npm install -g pm2
pm2 install pm2-logrotate

# Nginx + Certbot
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

---

## Architecture Patterns

### Recommended Project Structure

```
/var/www/dashboard/          # App root on VPS
├── .next/
│   └── standalone/          # What PM2 runs
│       ├── server.js        # Entry point for PM2
│       ├── .next/
│       │   └── static/      # Copied here post-build
│       └── public/          # Copied here post-build
├── ecosystem.config.js      # PM2 config (committed to repo)
└── .env.production          # Secrets — NOT in git, managed manually

/etc/nginx/sites-available/
└── dashboard.baseaim.co     # Nginx vhost

/etc/letsencrypt/live/
└── dashboard.baseaim.co/    # TLS certs (managed by Certbot)

.github/workflows/
└── deploy.yml               # GitHub Actions workflow
```

### Pattern 1: `output: 'standalone'` Build Mode

**What:** Next.js traces all imported files and produces `.next/standalone/` — a self-contained directory with a minimal `server.js` and only the `node_modules` actually used. Static files in `public/` and `.next/static/` must be copied manually post-build.

**When to use:** Always for VPS self-hosting. Reduces deployment artifact dramatically.

**Configuration — `next.config.ts`:**
```typescript
// Add output: 'standalone' to existing nextConfig object
const nextConfig: NextConfig = {
  output: 'standalone',
  // ... rest of existing config unchanged
};
```

**Post-build static file copy (required):**
```bash
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
```

**Source:** Official Next.js self-hosting docs — https://nextjs.org/docs/app/api-reference/config/next-config-js/output

### Pattern 2: PM2 Ecosystem Config

**What:** Declarative PM2 configuration committed to the repo. PM2 starts `server.js` directly (not via `npm start`) — required for cluster mode to work.

**ecosystem.config.js:**
```javascript
// Source: verified against PM2 docs + Next.js community guides
module.exports = {
  apps: [
    {
      name: 'baseaim-dashboard',
      script: '.next/standalone/server.js',
      cwd: '/var/www/dashboard',
      instances: 'max',           // Use all CPU cores
      exec_mode: 'cluster',       // Enables zero-downtime reload
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
      max_memory_restart: '500M', // Prevent memory leak runaway
      error_file: '/var/log/pm2/baseaim-error.log',
      out_file: '/var/log/pm2/baseaim-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
```

**Startup persistence (run once on VPS):**
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup systemd    # Follow the output command to enable on reboot
```

**Source:** PM2 docs (pm2.keymetrics.io) + Next.js GitHub Discussion #10675

### Pattern 3: Nginx Reverse Proxy with Streaming Support

**What:** Nginx terminates SSL, forwards to PM2 on port 3000, serves `/_next/static` with immutable cache headers, and disables proxy buffering for Next.js streaming (Suspense).

**`/etc/nginx/sites-available/dashboard.baseaim.co`:**
```nginx
upstream nextjs_app {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name dashboard.baseaim.co;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dashboard.baseaim.co;

    ssl_certificate     /etc/letsencrypt/live/dashboard.baseaim.co/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dashboard.baseaim.co/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # Disable proxy buffering — required for Next.js Suspense streaming
    proxy_buffering off;

    # Security headers already set by Next.js; avoid duplicating HSTS here
    # (next.config.ts sets HSTS via headers())

    # Static assets — immutable, cache forever (Next.js sets Cache-Control)
    location /_next/static/ {
        proxy_pass http://nextjs_app;
        proxy_cache_valid 200 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Main app proxy
    location / {
        proxy_pass         http://nextjs_app;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade         $http_upgrade;
        proxy_set_header   Connection      "upgrade";
        proxy_set_header   Host            $host;
        proxy_set_header   X-Real-IP       $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   X-Forwarded-Host  $host;

        # Stripe webhook body size (default Nginx 1MB is fine; Stripe payloads are small)
        client_max_body_size 10m;
    }
}
```

**Source:** Official Next.js self-hosting docs + Next.js streaming docs

### Pattern 4: GitHub Actions Deploy Workflow

**What:** On push to `main`, the workflow builds the app (with source map upload to Sentry), then SSH-executes a deployment script on the VPS that copies the built artifact and does a zero-downtime PM2 reload.

**Strategy: Build on CI runner, deploy artifact to VPS**
- Do NOT build on the VPS — avoids memory pressure during build, keeps VPS lean
- Transfer `.next/standalone` via `rsync` or `scp` over SSH

**`.github/workflows/deploy.yml`:**
```yaml
name: Deploy to VPS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        env:
          # All env vars needed at build time
          SKIP_ENV_VALIDATION: '1'
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
          SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}
          NEXT_PUBLIC_APP_URL: ${{ secrets.NEXT_PUBLIC_APP_URL }}
        run: npm run build

      # Copy static assets into standalone dir (required for output: standalone)
      - name: Prepare standalone artifact
        run: |
          cp -r public .next/standalone/
          cp -r .next/static .next/standalone/.next/

      - name: Deploy to VPS via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            # NVM must be sourced manually in non-interactive SSH
            export NVM_DIR="$HOME/.nvm"
            [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

            # Sync built artifact from CI runner (via rsync in separate step)
            # OR: pull from repo + rebuild — see note below

            # Zero-downtime reload (not restart)
            cd /var/www/dashboard
            pm2 reload ecosystem.config.js --env production
```

**NOTE:** Two deployment strategies are valid:
1. **Build-on-CI + rsync artifact** — faster, no build memory on VPS. Requires `appleboy/scp-action` to copy `.next/standalone` before the SSH step.
2. **Git pull + build on VPS** — simpler workflow YAML, but uses VPS RAM during build. Fine for small VPS with >=2GB RAM.

Both are documented patterns. Strategy 1 is preferred for production.

**Source:** appleboy/ssh-action docs + verified community guides (ayyaztech.com, servercompass.app)

### Pattern 5: Zero-Downtime Reload

**What:** `pm2 reload` (not `pm2 restart`) performs rolling restarts across cluster instances — one instance at a time. No downtime for users.

```bash
# Zero-downtime — use in deploy script
pm2 reload ecosystem.config.js --env production

# NOT this — causes brief downtime
pm2 restart ecosystem.config.js
```

**Source:** PM2 docs (pm2.keymetrics.io/docs/usage/cluster-mode/)

### Anti-Patterns to Avoid

- **`pm2 restart` in CI deploy:** Causes brief downtime. Use `pm2 reload` with cluster mode instead.
- **Building on the VPS in cluster mode restart:** If the VPS runs out of RAM during `npm run build`, the PM2 process crashes. Build on CI instead.
- **Setting `NEXTAUTH_URL` or `AUTH_URL` without `AUTH_TRUST_HOST`:** Auth.js v5 infers URL from request headers when `AUTH_TRUST_HOST=true`; without it, redirects may fail or go to wrong URL behind Nginx.
- **Forgetting `proxy_buffering off` in Nginx:** Breaks Next.js Suspense streaming (Phases 16-03 introduced streaming — this must work on VPS).
- **Using `npm start` as PM2 script in cluster mode:** Cluster mode requires the direct binary path or `server.js`, not npm scripts. Use `script: '.next/standalone/server.js'`.
- **Skipping `pm2 save` + `pm2 startup`:** App won't survive VPS reboot.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSL certificate management | Custom cert renewal cron | Certbot + systemd timer | Certbot handles ACME, renewal, Nginx reload; edge cases around cert expiry are non-trivial |
| Process restart on crash | Shell watchdog script | PM2 | PM2 handles crash loops, memory limits, log rotation, clustering, and startup |
| Zero-downtime deploy | Blue-green custom script | `pm2 reload` in cluster mode | PM2 cluster reload is battle-tested; custom blue-green adds Nginx config switching complexity |
| SSH deployment | Custom deploy scripts | `appleboy/ssh-action` | Handles key auth, multi-host, timeouts, and error propagation correctly |
| IP extraction for rate limiting | Custom header parsing | Nginx `X-Forwarded-For` header (already implemented in middleware.ts) | Existing code already handles this correctly; Nginx correctly sets the header |

**Key insight:** Every component of this stack (PM2, Nginx, Certbot, appleboy/ssh-action) has handled production edge cases for years. The only novel work is connecting them for this specific application.

---

## Common Pitfalls

### Pitfall 1: Missing Static Files After Standalone Build

**What goes wrong:** App loads but all pages are unstyled; `/_next/static/` returns 404.
**Why it happens:** `output: 'standalone'` produces `.next/standalone/` but intentionally does NOT copy `.next/static/` or `public/` — these are meant to be served by a CDN. When serving locally, they must be copied manually.
**How to avoid:** Add to deploy script: `cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/`
**Warning signs:** App JS loads but CSS/fonts are missing; browser console shows 404 for `/_next/static/*`.

### Pitfall 2: NVM Not Available in SSH Session

**What goes wrong:** `npm: command not found` or `pm2: command not found` in GitHub Actions SSH step.
**Why it happens:** Non-interactive SSH sessions don't load `.bashrc` or `.bash_profile`, so NVM's PATH additions are skipped.
**How to avoid:** Source NVM explicitly at the top of every SSH script block:
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```
**Warning signs:** GitHub Actions step exits with "command not found" immediately.

### Pitfall 3: AUTH_TRUST_HOST Missing Behind Nginx

**What goes wrong:** NextAuth redirect URLs are wrong (e.g., redirect to `http://` instead of `https://`, or wrong domain). OAuth callbacks fail. Session cookies may not set.
**Why it happens:** Auth.js v5 reads host from `X-Forwarded-Host` only when `AUTH_TRUST_HOST=true`. Without it, the app sees the internal proxy address.
**How to avoid:** Set `AUTH_TRUST_HOST=true` in `.env.production` on the VPS. Ensure Nginx passes `proxy_set_header X-Forwarded-Host $host` and `proxy_set_header X-Forwarded-Proto $scheme`.
**Warning signs:** Login works but OAuth callback redirects to wrong URL; session not persisted after login.

### Pitfall 4: Stripe Webhook URL Not Updated

**What goes wrong:** Stripe still sends webhooks to old Netlify URL; webhook signature verification fails on VPS.
**Why it happens:** Stripe Dashboard stores the webhook endpoint URL. Migrating hosting doesn't auto-update Stripe.
**How to avoid:** After DNS cutover, update the Stripe webhook endpoint in Stripe Dashboard to `https://dashboard.baseaim.co/api/webhooks/stripe`. Update `STRIPE_WEBHOOK_SECRET` if generating a new endpoint.
**Warning signs:** Invoices don't update to PAID status after payment; webhook errors in Stripe Dashboard.

### Pitfall 5: Next.js 16 Node.js Version Requirement

**What goes wrong:** PM2 starts but Next.js 16 crashes immediately with unsupported Node.js version error.
**Why it happens:** Next.js 16 requires Node.js 20.9+ minimum. Many VPS base images ship with Node.js 18 or older.
**How to avoid:** Install via NVM (`nvm install 20`); do NOT use `apt install nodejs` which installs ancient versions. Verify: `node --version` must be >= 20.9.
**Warning signs:** `pm2 logs` shows startup crash with Node.js version error.

### Pitfall 6: PM2 cluster mode vs fork mode for Next.js

**What goes wrong:** Using `exec_mode: 'fork'` means `pm2 reload` has no zero-downtime behavior (only one process, no rolling restart possible).
**Why it happens:** Fork mode = single process. Cluster mode = multiple processes that can reload one at a time.
**How to avoid:** Use `exec_mode: 'cluster'` with `instances: 'max'` (or a fixed number like `instances: 2`). Script must point to `server.js` directly, not `npm start`.
**Warning signs:** `pm2 reload` still causes brief downtime; `pm2 list` shows only 1 instance.

### Pitfall 7: `proxy_buffering` Not Disabled Breaks Streaming

**What goes wrong:** Suspense streaming (implemented in Phase 16) shows spinners indefinitely; responses only appear after full page render completes.
**Why it happens:** Nginx buffers the response by default, defeating streaming. Next.js sets `X-Accel-Buffering: no` in headers per the self-hosting docs, but explicit `proxy_buffering off` in Nginx config is more reliable.
**How to avoid:** Add `proxy_buffering off;` to the Nginx server block. This is the official recommendation from Next.js self-hosting docs.
**Warning signs:** Loading states never appear; Suspense boundaries never show skeleton — page loads like a traditional non-streaming page.

### Pitfall 8: Sentry Source Maps in CI

**What goes wrong:** Sentry receives errors but shows minified stack traces (no source maps).
**Why it happens:** `@sentry/nextjs` via `withSentryConfig` uploads source maps during `next build`. This requires `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` to be available at build time — which is now in GitHub Actions, not Netlify.
**How to avoid:** Add all four Sentry env vars as GitHub Actions secrets and expose them in the `Build` step. The `withSentryConfig` in `next.config.ts` already handles upload.
**Warning signs:** Sentry errors show `[minified]` function names with no useful stack traces.

### Pitfall 9: `middleware.ts` Deprecation in Next.js 16

**What goes wrong:** Console deprecation warnings on every request; in a future Next.js minor, middleware.ts may stop working entirely.
**Why it happens:** Next.js 16 renamed `middleware.ts` to `proxy.ts`. The current app still uses `middleware.ts` (which is still functional but deprecated).
**How to avoid:** This phase should rename `middleware.ts` → `proxy.ts` and rename the exported function `auth(...)` wrapper to export as `proxy`. **The existing logic stays identical** — only the filename and export name change.
**Warning signs:** Console shows deprecation warning on every request: "middleware.ts is deprecated, rename to proxy.ts".

---

## Code Examples

### SSL Certificate Issuance (Certbot + Nginx)

```bash
# Source: Official Certbot docs + DigitalOcean tutorial
# Nginx must be running and domain DNS must point to VPS before running

# Issue certificate — Certbot auto-modifies Nginx config
sudo certbot --nginx -d dashboard.baseaim.co

# Verify auto-renewal works
sudo certbot renew --dry-run

# Certbot installs a systemd timer for auto-renewal — verify it's active
sudo systemctl status certbot.timer
```

### Environment Variables on VPS

```bash
# Source: Standard VPS practice — do NOT commit .env.production to git

# Create production env file on VPS
cat > /var/www/dashboard/.env.production << 'EOF'
NODE_ENV=production
DATABASE_URL=postgresql://...
AUTH_SECRET=...
AUTH_TRUST_HOST=true
NEXT_PUBLIC_APP_URL=https://dashboard.baseaim.co
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_REFRESH_TOKEN=...
GOOGLE_DRIVE_ROOT_FOLDER_ID=...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
EOF

chmod 600 /var/www/dashboard/.env.production
```

### PM2 First-Time Start

```bash
# Source: PM2 docs
cd /var/www/dashboard
pm2 start ecosystem.config.js --env production
pm2 save          # Persist process list
pm2 startup       # Generate systemd script (run the output command as sudo)
```

### Nginx Enable Site

```bash
# Source: Standard Nginx pattern
sudo ln -s /etc/nginx/sites-available/dashboard.baseaim.co \
           /etc/nginx/sites-enabled/
sudo nginx -t        # Validate config
sudo systemctl reload nginx
```

### GitHub Actions Secrets Required

```
VPS_HOST          — IP address of the VPS
VPS_USER          — SSH username (e.g. deploy or root)
VPS_SSH_KEY       — Private SSH key (full content including headers)
SENTRY_AUTH_TOKEN — For source map upload during build
SENTRY_ORG        — Sentry organization slug
SENTRY_PROJECT    — Sentry project slug
NEXT_PUBLIC_APP_URL — https://dashboard.baseaim.co
```

---

## Application-Specific Considerations

### NextAuth v5 (Auth.js)

- `AUTH_TRUST_HOST=true` is **required** in `.env.production` when running behind Nginx
- `AUTH_URL` is NOT needed — v5 auto-detects from `X-Forwarded-Host` when `AUTH_TRUST_HOST` is set
- Nginx must forward: `X-Forwarded-Host`, `X-Forwarded-Proto`, `X-Forwarded-For`
- `AUTH_SECRET` is already in use (`AUTH_SECRET` in env.ts maps to this)
- **Source:** authjs.dev/getting-started/deployment (HIGH confidence)

### Stripe Webhooks

- `req.text()` in App Router already handles raw body correctly — no changes needed
- Nginx default `client_max_body_size` (1MB) is fine for Stripe payloads
- **Action required:** Update webhook endpoint URL in Stripe Dashboard after DNS cutover
- **Action required:** Verify `STRIPE_WEBHOOK_SECRET` matches the new endpoint's secret if re-creating the endpoint
- **Source:** App code review (HIGH confidence)

### Upstash Redis (Rate Limiting)

- Works unchanged — Upstash uses HTTP REST API, not raw TCP connection; no VPS firewall ports needed
- `x-forwarded-for` IP extraction in middleware already handles Nginx proxy correctly
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` transfer directly from Netlify env

### Sentry

- Move `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` from Netlify env to GitHub Actions secrets
- `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` go in VPS `.env.production`
- Source maps upload happens automatically in the GitHub Actions `Build` step via `withSentryConfig`
- **Note:** `tunnelRoute` in `withSentryConfig` should be removed if it exists — designed for Sentry SaaS behind Vercel, may cause 405 errors with Nginx

### Google OAuth (Google Drive)

- `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REFRESH_TOKEN`, `GOOGLE_DRIVE_ROOT_FOLDER_ID` transfer directly
- **Action required:** Add `https://dashboard.baseaim.co` to Google OAuth authorized redirect URIs in Google Cloud Console

### CSP Header Consideration

- `next.config.ts` sets `connect-src 'self' https://*.sentry.io`
- VPS self-hosting doesn't change CSP requirements
- Nginx must NOT add its own CSP header (would duplicate Next.js CSP)

### `middleware.ts` → `proxy.ts` Migration

- The app currently uses `middleware.ts` which is deprecated in Next.js 16
- This phase is a natural opportunity to rename the file
- Change: rename `middleware.ts` to `proxy.ts`; rename exported function from default `auth(...)` wrapper
- The NextAuth `auth` wrapper exports a function — this becomes the `proxy` export
- **Risk:** LOW — functionality is identical, only convention changes
- **Source:** Next.js 16 changelog (nextjs.org/blog/next-16, HIGH confidence)

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Build entire app on VPS | Build on CI runner, deploy artifact | 2023+ | VPS doesn't need build RAM; faster deploys |
| `npm start` as PM2 script | `server.js` direct for cluster mode | Always | Cluster mode requires direct entry point |
| `NEXTAUTH_URL` (NextAuth v4) | `AUTH_TRUST_HOST` (Auth.js v5) | v5 release | Simpler config; URL auto-detected from headers |
| `middleware.ts` | `proxy.ts` (Node.js runtime) | Next.js 16 | Clearer naming; edge runtime stays on deprecated middleware.ts |
| `pm2 restart` | `pm2 reload` (cluster mode) | PM2 2.x | True zero-downtime |

**Deprecated/outdated:**
- `NEXTAUTH_URL` env var: Still accepted but unnecessary in Auth.js v5 for standard deployments
- `middleware.ts` filename: Deprecated in Next.js 16, functional but will be removed eventually
- `pm2 restart`: Use `pm2 reload` for zero-downtime

---

## Open Questions

1. **VPS OS and existing software**
   - What we know: VPS exists and is running (mentioned as "existing VPS")
   - What's unclear: Ubuntu version, existing software (Apache? existing Nginx?), RAM/CPU specs, current Node.js version installed
   - Recommendation: Plan should include VPS audit step; assume Ubuntu 22.04 LTS as baseline

2. **DNS migration strategy**
   - What we know: Domain is `dashboard.baseaim.co`; currently pointing to Netlify
   - What's unclear: DNS TTL, whether to run parallel (Netlify + VPS) during cutover
   - Recommendation: Lower DNS TTL to 60s 24h before cutover; keep Netlify active until VPS verified

3. **Build-on-CI vs build-on-VPS strategy**
   - What we know: Both are valid approaches
   - What's unclear: VPS RAM capacity — if < 2GB, building on VPS risks OOM during `next build`
   - Recommendation: Plan for build-on-CI (more robust); provide fallback to build-on-VPS if rsync setup is complex

4. **Google OAuth redirect URIs**
   - What we know: Google Drive uses OAuth; requires authorized redirect URIs in Google Cloud Console
   - What's unclear: Whether `dashboard.baseaim.co` is already added or needs adding
   - Recommendation: Plan should include a verification/update step for Google Cloud Console

5. **Existing Netlify env vars**
   - What we know: All env vars listed in research are needed on VPS
   - What's unclear: Whether there are Netlify-specific env vars (e.g., `NETLIFY_SITE_ID`) that should be removed from VPS `.env.production`
   - Recommendation: Audit Netlify's env var list during migration planning

---

## Sources

### Primary (HIGH confidence)

- Official Next.js self-hosting docs — https://nextjs.org/docs/app/guides/self-hosting
- Official Next.js output standalone docs — https://nextjs.org/docs/app/api-reference/config/next-config-js/output
- Next.js 16 release blog (breaking changes) — https://nextjs.org/blog/next-16
- Auth.js deployment docs — https://authjs.dev/getting-started/deployment
- PM2 cluster mode docs — https://pm2.keymetrics.io/docs/usage/cluster-mode/
- Next.js GitHub Discussion #10675 — PM2 cluster mode support confirmed

### Secondary (MEDIUM confidence)

- servercompass.app deploy guide (2026) — complete PM2/Nginx/SSL workflow with standalone output
- ayyaztech.com CI/CD guide (2025) — verified GitHub Actions workflow pattern
- appleboy/ssh-action GitHub — SSH action for VPS deployment

### Tertiary (LOW confidence)

- Community blog posts on NVM + non-interactive SSH (pattern confirmed by multiple sources but not a single authoritative doc)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All tools are industry standards with official docs
- Architecture patterns: HIGH — Verified against official Next.js self-hosting docs
- Pitfalls: HIGH (application-specific) / MEDIUM (general VPS ops) — Cross-referenced with official docs
- Code examples: HIGH — Derived from official docs and verified guides

**Research date:** 2026-03-16
**Valid until:** 2026-09-16 (stable ecosystem — PM2, Nginx, Certbot are slow-moving; Next.js patterns may shift in major versions)
