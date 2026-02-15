import { z } from "zod";

/**
 * Validation schema for creating a new client
 * Used by admin when onboarding a new client
 */
export const createClientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  companyName: z.string().min(2, "Company name is required"),
  industry: z.string().optional(),
  website: z.string().url("Enter a valid URL").or(z.literal("")).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

/**
 * Validation schema for updating an existing client
 * No password or email fields (email is immutable, password has separate flow)
 */
export const updateClientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  companyName: z.string().min(2, "Company name is required"),
  industry: z.string().optional(),
  website: z.string().url("Enter a valid URL").or(z.literal("")).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

// Inferred TypeScript types from schemas
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
