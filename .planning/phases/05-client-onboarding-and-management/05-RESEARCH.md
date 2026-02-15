# Phase 5: Client Onboarding & Management - Research

**Researched:** 2026-02-15
**Domain:** Admin CRUD operations, form validation, user creation, database transactions
**Confidence:** HIGH

## Summary

This phase implements admin functionality for onboarding new clients to the BaseAim dashboard. The research focused on best practices for form validation with React Hook Form + Zod, secure user creation with bcryptjs, Prisma transaction patterns for atomically creating related User/Client records, and admin UI patterns for CRUD operations.

The standard approach uses Next.js Server Actions for form submission with progressive enhancement, Zod schemas for type-safe validation on both client and server, Prisma interactive transactions to ensure User + Client + Milestones are created atomically, and the existing shadcn/ui component library for consistent UI patterns. Form validation should use React Hook Form with zodResolver for client-side validation, with server-side revalidation in the Server Action.

The codebase already has strong foundations: NextAuth v5 for authentication with role-based access, Prisma schema with User/Client models and proper relationships, a standardized milestone template in `seed-milestones.ts` with 6 milestones, and shadcn/ui components including Dialog, Input, Label, and Button. The Input component already includes aria-invalid styling for accessibility.

**Primary recommendation:** Use Prisma interactive transactions (`$transaction`) to create User + Client + initial milestones atomically, validate with Zod on both client and server, and provide real-time feedback with inline validation and toast notifications (add Sonner).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-hook-form | 7.x | Form state management | Industry standard, excellent performance, minimal re-renders |
| zod | 4.3.6 | Schema validation | Already in project, type-safe validation for both runtime and TypeScript |
| @hookform/resolvers | Latest | Bridge RHF + Zod | Official integration package for React Hook Form |
| bcryptjs | 3.0.3 | Password hashing | Already in project, secure adaptive hashing |
| next/cache | Built-in | Revalidation after mutations | Next.js native cache management |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | Latest | Toast notifications | User feedback after form submission success/error |
| lucide-react | 0.563.0 | Icons | Already in project for UI consistency |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-hook-form | Formik | Formik has larger bundle size, more re-renders |
| zod | yup | Yup lacks TypeScript-first design, weaker type inference |
| sonner | react-hot-toast | Sonner has better Next.js SSR support, cleaner API |

**Installation:**
```bash
npm install react-hook-form @hookform/resolvers sonner
```

## Architecture Patterns

### Recommended Project Structure
```
app/
├── admin/
│   ├── clients/
│   │   ├── page.tsx              # Client management list
│   │   ├── new/
│   │   │   └── page.tsx          # Client creation page
│   │   └── [clientId]/
│   │       ├── page.tsx          # Client detail/edit
│   │       └── edit/
│   │           └── page.tsx      # Edit client info
│   └── actions.ts                # Admin server actions
components/
├── admin/
│   ├── client-form.tsx           # Reusable client form component
│   └── client-table.tsx          # Client list table
lib/
├── schemas/
│   └── client.ts                 # Zod schemas for client/user validation
└── utils/
    └── password.ts               # Password generation utilities
```

### Pattern 1: Server Action with Zod Validation
**What:** Server Actions with client and server-side validation using the same Zod schema
**When to use:** All admin form submissions (create/update/delete operations)
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/getting-started/updating-data
// lib/schemas/client.ts
import { z } from 'zod'

export const createClientSchema = z.object({
  // User fields
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),

  // Client fields
  companyName: z.string().min(2, "Company name required"),
  industry: z.string().optional(),
  website: z.string().url("Enter a valid URL").optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
})

export type CreateClientInput = z.infer<typeof createClientSchema>

// app/admin/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClientSchema } from '@/lib/schemas/client'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { seedStandardMilestones } from '@/prisma/seed-milestones'

export async function createClient(formData: FormData) {
  // Server-side validation (ALWAYS validate on server)
  const validatedFields = createClientSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    companyName: formData.get('companyName'),
    industry: formData.get('industry'),
    website: formData.get('website'),
    phone: formData.get('phone'),
    address: formData.get('address'),
  })

  if (!validatedFields.success) {
    return {
      error: 'Validation failed',
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const { name, email, password, companyName, industry, website, phone, address } = validatedFields.data

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    return { error: 'User with this email already exists' }
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10)

  try {
    // Use interactive transaction to create User + Client + Milestones atomically
    await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: 'CLIENT',
        },
      })

      // Create client profile
      const client = await tx.client.create({
        data: {
          userId: user.id,
          companyName,
          industry,
          website,
          phone,
          address,
          isActive: true,
        },
      })

      // Create standard milestones
      await Promise.all(
        STANDARD_MILESTONES.map((milestone) =>
          tx.milestone.create({
            data: {
              clientId: client.id,
              ...milestone,
            },
          })
        )
      )
    })

    revalidatePath('/admin')
    redirect('/admin')
  } catch (error) {
    return { error: 'Failed to create client. Please try again.' }
  }
}
```

### Pattern 2: React Hook Form with Zod Client Validation
**What:** Client-side form with real-time validation and accessibility
**When to use:** All admin forms for immediate user feedback
**Example:**
```typescript
// Source: https://ui.shadcn.com/docs/forms/react-hook-form
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClientSchema, type CreateClientInput } from '@/lib/schemas/client'
import { createClient } from '@/app/admin/actions'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export function ClientForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateClientInput>({
    resolver: zodResolver(createClientSchema),
    mode: 'onBlur', // Validate on blur, not on every keystroke
  })

  const onSubmit = async (data: CreateClientInput) => {
    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value || '')
    })

    const result = await createClient(formData)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Client created successfully')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Contact Name</Label>
        <Input
          id="name"
          {...register('name')}
          aria-invalid={!!errors.name}
        />
        {errors.name && (
          <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          aria-invalid={!!errors.email}
        />
        {errors.email && (
          <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
        )}
      </div>

      {/* More fields... */}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Client'}
      </Button>
    </form>
  )
}
```

### Pattern 3: Prisma Interactive Transaction for Atomic Operations
**What:** Use Prisma `$transaction` to ensure User + Client + Milestones are created together or rolled back
**When to use:** Creating related records that must exist together
**Example:**
```typescript
// Source: https://www.prisma.io/docs/orm/prisma-client/queries/transactions
await prisma.$transaction(async (tx) => {
  // All operations succeed or all fail together
  const user = await tx.user.create({ data: userData })
  const client = await tx.client.create({ data: { userId: user.id, ...clientData } })

  // Seed standard milestones
  await Promise.all(
    STANDARD_MILESTONES.map((milestone) =>
      tx.milestone.create({
        data: { clientId: client.id, ...milestone },
      })
    )
  )
}, {
  maxWait: 5000, // Wait max 5s to acquire transaction
  timeout: 10000, // Max 10s execution time
})
```

### Pattern 4: Dialog-Based Forms
**What:** Use shadcn Dialog component for modal forms (edit, deactivate)
**When to use:** Quick actions that don't need a full page
**Example:**
```typescript
// Existing pattern from codebase
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Client</DialogTitle>
    </DialogHeader>
    <ClientForm clientId={clientId} onSuccess={() => setIsOpen(false)} />
  </DialogContent>
</Dialog>
```

### Anti-Patterns to Avoid
- **Creating User without Client in transaction:** Always use transaction to ensure atomicity
- **Client-only validation:** Always revalidate on server, client can be bypassed
- **Generic error messages:** Provide specific, actionable error messages
- **Not checking for existing users:** Always verify email uniqueness before creation
- **Forgetting to seed milestones:** New clients must get standard 6-milestone template
- **Not revalidating cache:** Call `revalidatePath` after mutations to update UI
- **Throwing errors in Server Actions:** Return error objects instead for better UX

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation | Custom validation functions | Zod schemas | Type-safe, reusable, handles edge cases |
| Password hashing | Custom crypto | bcryptjs (already in project) | Adaptive hashing, salt handling, security-audited |
| Form state management | useState for each field | React Hook Form | Performance, validation integration, less code |
| Toast notifications | Custom notification system | Sonner | Accessibility, animations, queue management |
| Password generation | Random string builder | Secure password generator library | Entropy, character requirements, security |
| Email validation | Regex patterns | Zod's `.email()` | RFC-compliant, handles edge cases |
| Phone formatting | Custom formatters | Optional: react-phone-number-input | International formats, validation |
| Unique constraint errors | Custom error parsing | Prisma error codes (P2002) | Reliable, database-agnostic |

**Key insight:** Form validation and state management are deceptively complex. React Hook Form + Zod handles validation timing (onBlur vs onChange vs onSubmit), error message display, field-level vs form-level errors, async validation, and TypeScript integration. Hand-rolling this leads to bugs and poor UX.

## Common Pitfalls

### Pitfall 1: Not Using Transactions for Related Records
**What goes wrong:** User is created but Client creation fails, leaving orphaned User record
**Why it happens:** Developers create records sequentially without transaction wrapper
**How to avoid:** Always use Prisma `$transaction` when creating User + Client + Milestones
**Warning signs:** Orphaned User records in database without Client profiles

### Pitfall 2: Validating Only on Client
**What goes wrong:** Malicious users bypass client validation, submitting invalid data
**Why it happens:** Trust in client-side validation without server-side revalidation
**How to avoid:** Use same Zod schema on both client (RHF resolver) and server (safeParse)
**Warning signs:** Invalid data in database, security vulnerabilities

### Pitfall 3: Weak Password Hashing
**What goes wrong:** User passwords are cracked if database is compromised
**Why it happens:** Using low salt rounds (< 10) or outdated algorithms
**How to avoid:** Use bcrypt with 10+ rounds (project uses bcryptjs already)
**Warning signs:** Slow login times (too many rounds) or fast password cracking (too few)

### Pitfall 4: Not Handling Unique Constraint Violations
**What goes wrong:** Generic "Database error" shown when email already exists
**Why it happens:** Not catching Prisma P2002 error code for unique constraint violations
**How to avoid:** Check for existing user before creation, or catch P2002 and show friendly message
**Warning signs:** User confusion about why signup failed

### Pitfall 5: Forgetting to Revalidate Cache
**What goes wrong:** Admin creates client but it doesn't appear in list
**Why it happens:** Next.js cache not invalidated after mutation
**How to avoid:** Call `revalidatePath('/admin')` in Server Action after successful creation
**Warning signs:** Users refreshing page to see changes

### Pitfall 6: NextAuth Session Not Updated After User Creation
**What goes wrong:** New user can't log in immediately after creation
**Why it happens:** Assuming session updates automatically when user is created
**How to avoid:** User creation doesn't require session update (they log in separately). Admin session is independent.
**Warning signs:** "User not found" errors on login attempts

### Pitfall 7: Poor Form Validation UX
**What goes wrong:** Validation errors shown before user finishes typing, or after every keystroke
**Why it happens:** Using `mode: 'onChange'` in React Hook Form
**How to avoid:** Use `mode: 'onBlur'` for best UX (validate after field loses focus)
**Warning signs:** User complaints about "annoying" validation

### Pitfall 8: Long-Running Transactions
**What goes wrong:** Database deadlocks and performance degradation
**Why it happens:** Putting slow operations (password hashing, API calls) inside transaction
**How to avoid:** Hash password BEFORE transaction, keep transaction fast (< 2 seconds)
**Warning signs:** Transaction timeout errors, database lock contention

## Code Examples

Verified patterns from official sources:

### Creating User with Nested Client
```typescript
// Source: https://www.prisma.io/docs/orm/prisma-client/queries/transactions
// GOOD: Uses interactive transaction
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
      role: 'CLIENT',
    },
  })

  const client = await tx.client.create({
    data: {
      userId: user.id,
      companyName,
      industry,
      website,
      phone,
      address,
    },
  })

  // Seed milestones
  await Promise.all(
    STANDARD_MILESTONES.map((milestone) =>
      tx.milestone.create({
        data: {
          clientId: client.id,
          title: milestone.title,
          description: milestone.description,
          order: milestone.order,
          status: milestone.status,
          progress: milestone.progress,
        },
      })
    )
  )
})
```

### Server Action with Error Handling
```typescript
// Source: https://nextjs.org/docs/app/getting-started/updating-data
'use server'

export async function updateClient(clientId: string, formData: FormData) {
  // Validate input
  const validatedFields = updateClientSchema.safeParse({
    companyName: formData.get('companyName'),
    industry: formData.get('industry'),
    // ... other fields
  })

  if (!validatedFields.success) {
    return {
      error: 'Validation failed',
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  try {
    await prisma.client.update({
      where: { id: clientId },
      data: validatedFields.data,
    })

    revalidatePath('/admin')
    revalidatePath(`/admin/clients/${clientId}`)

    return { success: true }
  } catch (error) {
    return { error: 'Failed to update client' }
  }
}
```

### Deactivate/Reactivate Client
```typescript
// Source: Prisma documentation
'use server'

export async function toggleClientStatus(clientId: string, isActive: boolean) {
  try {
    await prisma.client.update({
      where: { id: clientId },
      data: { isActive },
    })

    revalidatePath('/admin')
    return { success: true }
  } catch (error) {
    return { error: 'Failed to update client status' }
  }
}
```

### Password Generation Utility
```typescript
// lib/utils/password.ts
export function generateSecurePassword(length: number = 12): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*'
  const allChars = lowercase + uppercase + numbers + symbols

  // Ensure at least one of each type
  let password = [
    lowercase[Math.floor(Math.random() * lowercase.length)],
    uppercase[Math.floor(Math.random() * uppercase.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ].join('')

  // Fill remaining with random chars
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }

  // Shuffle
  return password.split('').sort(() => Math.random() - 0.5).join('')
}
```

### Toast Integration
```typescript
// Source: https://ui.shadcn.com/docs/components/sonner
// app/layout.tsx (add Toaster)
import { Toaster } from 'sonner'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  )
}

// Usage in client component
import { toast } from 'sonner'

const result = await createClient(formData)

if (result?.error) {
  toast.error(result.error)
} else {
  toast.success('Client created successfully')
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Formik | React Hook Form | 2020-2021 | Smaller bundle, better performance |
| yup | Zod | 2021-2022 | TypeScript-first, better type inference |
| API Routes for mutations | Server Actions | 2023-2024 | Progressive enhancement, simpler code |
| JWT sessions | NextAuth v5 database sessions | 2024 | Better security, easier to invalidate |
| Manual toast components | Sonner | 2023-2024 | Better DX, accessibility built-in |

**Deprecated/outdated:**
- **Formik + yup:** Replaced by React Hook Form + Zod for better TypeScript support
- **Custom API routes for CRUD:** Server Actions are now the standard for mutations
- **react-hot-toast:** Sonner has better Next.js integration and smaller bundle

## Open Questions

Things that couldn't be fully resolved:

1. **Password Generation vs Manual Entry**
   - What we know: Can auto-generate secure passwords for initial login
   - What's unclear: Should admin manually enter password or should we auto-generate and email it?
   - Recommendation: Auto-generate and display it once on success screen (admin shares with client via secure channel). Add optional "Send welcome email" feature in later phase.

2. **Email Verification Requirement**
   - What we know: Users are created by admin, not self-signup
   - What's unclear: Should new client accounts require email verification?
   - Recommendation: No email verification needed for Phase 5 (admin-created accounts are trusted). Add optional email verification in future phase if needed.

3. **Audit Trail for Admin Actions**
   - What we know: Activity table exists in schema
   - What's unclear: Should we log all admin CRUD operations?
   - Recommendation: YES - log client creation, updates, deactivation to Activity table for compliance and debugging.

4. **Client Limits**
   - What we know: No limit specified in requirements
   - What's unclear: Is there a max client count or tier system?
   - Recommendation: No limit for Phase 5. Add pagination if client list grows beyond 50.

## Sources

### Primary (HIGH confidence)
- [Next.js Server Actions Documentation](https://nextjs.org/docs/app/getting-started/updating-data) - Updated 2026-02-11
- [Prisma Transactions Documentation](https://www.prisma.io/docs/orm/prisma-client/queries/transactions) - Official Prisma docs
- [shadcn/ui React Hook Form Guide](https://ui.shadcn.com/docs/forms/react-hook-form) - Official shadcn integration
- [Sonner Documentation](https://www.shadcn.io/ui/sonner) - Official Sonner docs
- Existing codebase: `prisma/schema.prisma`, `prisma/seed-milestones.ts`, `lib/auth.ts`, `app/admin/page.tsx`

### Secondary (MEDIUM confidence)
- [React Hook Form with Zod and Server Actions](https://medium.com/@ctrlaltmonique/how-to-use-react-hook-form-zod-with-next-js-server-actions-437aaca3d72d) - Community pattern guide
- [Handling Forms in Next.js with React Hook Form, Zod, and Server Actions](https://medium.com/@techwithtwin/handling-forms-in-next-js-with-react-hook-form-zod-and-server-actions-e148d4dc6dc1) - Community guide
- [bcrypt Password Hashing Best Practices](https://www.freecodecamp.org/news/how-to-hash-passwords-with-bcrypt-in-nodejs/) - Security guide
- [Form Validation UX Best Practices 2026](https://www.designstudiouiux.com/blog/form-ux-design-best-practices/) - UX patterns
- [Accessible Form Validation](https://www.smashingmagazine.com/2023/02/guide-accessible-form-validation/) - Accessibility guide

### Tertiary (LOW confidence)
- [Client Onboarding Software Trends 2026](https://www.manyrequests.com/blog/agency-client-onboarding-software) - Industry trends (not technical)
- [NextAuth v5 Session Management](https://clerk.com/articles/nextjs-session-management-solving-nextauth-persistence-issues) - Pitfall identification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified with Context7 or official docs, already in package.json or established standards
- Architecture: HIGH - Patterns verified with official Next.js, Prisma, and React Hook Form documentation
- Pitfalls: MEDIUM/HIGH - Based on official documentation and community experience, some from codebase analysis

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (30 days - relatively stable stack, Next.js 16.1.6 is current)
