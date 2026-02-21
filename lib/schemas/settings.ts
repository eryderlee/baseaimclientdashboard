import { z } from "zod";

/**
 * Validation schema for chat settings configuration
 * Used by admin to configure WhatsApp and Telegram contact details
 */
export const chatSettingsSchema = z.object({
  whatsappNumber: z
    .string()
    .regex(/^\d{10,15}$/, 'Phone number must be 10-15 digits')
    .optional()
    .or(z.literal('')),
  telegramUsername: z
    .string()
    .regex(/^[a-zA-Z0-9_]{5,32}$/, 'Username must be 5-32 characters (letters, numbers, underscores)')
    .optional()
    .or(z.literal('')),
});

// Inferred TypeScript type from schema
export type ChatSettingsData = z.infer<typeof chatSettingsSchema>;

/**
 * Validation schema for Facebook Ads settings
 * Used by admin to configure the Meta Business Manager System User token
 */
export const fbSettingsSchema = z.object({
  facebookAccessToken: z
    .string()
    .min(10, 'Access token is too short to be valid')
    .optional()
    .or(z.literal('')),
})

export type FbSettingsData = z.infer<typeof fbSettingsSchema>
