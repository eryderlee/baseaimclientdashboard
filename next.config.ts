import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // External packages for server components
  // Prevents Next.js from bundling large packages into each serverless function chunk
  // Keeps bundle sizes within Vercel's 250 MB limit
  serverExternalPackages: ['@prisma/client', 'prisma', '@googleapis/drive', 'google-auth-library'],

  // Disable typed routes for faster dev (Next.js 16+)
  typedRoutes: false,

  // Turbopack config (required in Next.js 16 to silence webpack warning)
  turbopack: {
    // Empty config - using Turbopack defaults
  }
};

export default nextConfig;
