import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // External packages for server components
  serverExternalPackages: ['@prisma/client', 'prisma'],

  // Disable typed routes for faster dev (Next.js 16+)
  typedRoutes: false,

  // Turbopack config (required in Next.js 16 to silence webpack warning)
  turbopack: {
    // Empty config - using Turbopack defaults
  }
};

export default nextConfig;
