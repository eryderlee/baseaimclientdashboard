import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    // Database
    DATABASE_URL: z.string().url(),

    // Auth
    AUTH_SECRET: z.string().min(1),

    // Stripe — validate it's a live key in production
    STRIPE_SECRET_KEY: z
      .string()
      .startsWith("sk_")
      .refine(
        (key) =>
          process.env.NODE_ENV !== "production" || key.startsWith("sk_live_"),
        { message: "Production requires a live Stripe key (sk_live_...)" }
      ),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),

    // Email
    RESEND_API_KEY: z.string().min(1),
    RESEND_FROM_EMAIL: z.string().email().optional(),

    // Google Drive
    GOOGLE_OAUTH_CLIENT_ID: z.string().min(1),
    GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1),
    GOOGLE_OAUTH_REFRESH_TOKEN: z.string().min(1),
    GOOGLE_DRIVE_ROOT_FOLDER_ID: z.string().min(1),

    // Upstash Redis (rate limiting)
    UPSTASH_REDIS_REST_URL: z.string().url(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

    // Sentry (optional — only set in production)
    SENTRY_DSN: z.string().url().optional(),
    SENTRY_ORG: z.string().optional(),
    SENTRY_PROJECT: z.string().optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),
  },

  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  },

  runtimeEnv: {
    // Database
    DATABASE_URL: process.env.DATABASE_URL,

    // Auth
    AUTH_SECRET: process.env.AUTH_SECRET,

    // Stripe
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,

    // Email
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,

    // Google Drive
    GOOGLE_OAUTH_CLIENT_ID: process.env.GOOGLE_OAUTH_CLIENT_ID,
    GOOGLE_OAUTH_CLIENT_SECRET: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    GOOGLE_OAUTH_REFRESH_TOKEN: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
    GOOGLE_DRIVE_ROOT_FOLDER_ID: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID,

    // Upstash Redis
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,

    // Sentry
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_ORG: process.env.SENTRY_ORG,
    SENTRY_PROJECT: process.env.SENTRY_PROJECT,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,

    // Client-side
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  },

  // Allow skipping validation in CI or local dev without all vars
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
