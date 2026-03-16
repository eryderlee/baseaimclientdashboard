---
plan: 17-03
phase: 17-vps-self-hosting-migration
status: complete
completed: 2026-03-16
---

# Summary: VPS Provisioning, Nginx, SSL, First Deploy

## What Was Built

VPS fully provisioned with Node.js 20.19.4, PM2 6.0.8, Nginx 1.24.0, and Certbot 2.9.0 (all pre-installed). App directory `/var/www/dashboard` and PM2 log directory `/var/log/pm2` created. Nginx configured as reverse proxy with SSL termination for `dashboard.baseaim.co` via Let's Encrypt cert (expires 2026-06-14). GitHub Actions secrets configured with passphrase-free deploy key on port 2222. First deploy succeeded — PM2 started manually, app confirmed live.

## Deliverables

- `/var/www/dashboard/.env.production` with all production env vars including `AUTH_TRUST_HOST=true`
- `/var/www/dashboard/ecosystem.config.js` placed on VPS (single source of truth for PM2)
- Nginx config at `/etc/nginx/sites-available/dashboard.baseaim.co` with SSL, HTTP/2, proxy_buffering off
- Let's Encrypt SSL cert for `dashboard.baseaim.co` with auto-renewal
- PM2 running `baseaim-dashboard` in cluster mode with startup persistence
- GitHub Actions secrets: VPS_HOST, VPS_USER, VPS_SSH_KEY (passphrase-free ed25519), SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT, NEXT_PUBLIC_SENTRY_DSN

## Deviations

- VPS uses port 2222 (not 22) — required adding `port: 2222` to both scp-action and ssh-action in deploy.yml
- Original SSH key was passphrase-protected — generated new passphrase-free `id_ed25519_deploy` key for CI use
- Stripe SDK threw at module load with empty key during CI build — fixed in lib/stripe.ts with placeholder (commit c396e4f)
- All software (Node, PM2, Nginx, Certbot) was pre-installed on VPS — provisioning steps skipped

## Verification

`curl -I https://dashboard.baseaim.co` returns HTTP/2 307 → /dashboard with correct security headers, HSTS, and Next.js cache headers.

## Notes for Future Plans

- PM2 is running and `pm2 save` + `pm2 startup systemd` completed — future CI deploys use `pm2 reload` successfully
- SSH port is 2222 on this VPS — any future SSH/SCP operations must specify port 2222
- Deploy key is at `~/.ssh/id_ed25519_deploy` locally and authorized on VPS
