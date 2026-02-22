import "./lib/env";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const cspHeader = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "connect-src 'self' https://*.sentry.io",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  // External packages for server components
  // Prevents Next.js from bundling large packages into each serverless function chunk
  // Keeps bundle sizes within Vercel's 250 MB limit
  serverExternalPackages: [
    "@prisma/client",
    "prisma",
    "@googleapis/drive",
    "google-auth-library",
  ],

  // Disable typed routes for faster dev (Next.js 16+)
  typedRoutes: false,

  // Turbopack config (required in Next.js 16 to silence webpack warning)
  turbopack: {
    // Empty config - using Turbopack defaults
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
});
