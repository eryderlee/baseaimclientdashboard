---
phase: 08-email-infrastructure
plan: 02
subsystem: email-notifications
tags: [password-reset, email-templates, resend, security, phase-9-prep, phase-10-prep]
requires:
  - 08-01: Email infrastructure and welcome email
provides:
  - password-reset-flow: Complete password reset with tokenized links
  - email-templates-invoice: Invoice notification template ready for Phase 10
  - email-templates-payment: Payment confirmation template ready for Phase 10
  - email-templates-document: Document upload template ready for Phase 9
affects:
  - 09-google-drive: Will use sendDocumentUploadedEmail
  - 10-stripe: Will use sendInvoiceCreatedEmail and sendPaymentConfirmationEmail
tech-stack:
  added: []
  patterns:
    - server-actions: requestPasswordReset and resetPassword
    - token-expiry: 60-minute secure reset tokens
    - email-enumeration-prevention: Same response whether email exists or not
    - transaction-optimization: Hash password BEFORE transaction
key-files:
  created:
    - prisma/schema.prisma: PasswordResetToken model
    - emails/password-reset.tsx: Password reset email template
    - emails/invoice-created.tsx: Invoice notification template
    - emails/payment-confirmation.tsx: Payment confirmation template
    - emails/document-uploaded.tsx: Document upload notification template
    - app/actions/auth.ts: Password reset Server Actions
    - app/reset-password/page.tsx: Request reset page
    - app/reset-password/[token]/page.tsx: Set new password page (server)
    - app/reset-password/[token]/reset-password-form.tsx: Password reset form (client)
  modified:
    - lib/email.ts: Added 3 new send functions (invoice, payment, document)
    - app/login/page.tsx: Added "Forgot password?" link
decisions:
  - what: Use crypto.randomUUID() for reset tokens
    why: Cryptographically secure, built-in Node function
    impact: No external dependency for token generation
  - what: 60-minute token expiry
    why: Balance between security and user convenience
    impact: Tokens expire after 1 hour
  - what: Prevent email enumeration
    why: Security best practice - don't reveal which emails exist
    impact: Same success message for all requests
  - what: Delete old tokens on new request
    why: Only one active reset token per email at a time
    impact: Prevents token confusion
  - what: Build all email templates now (Phase 9/10 prep)
    why: Phases 9/10 can just call send functions without building templates
    impact: Faster execution of future phases
  - what: Hash password BEFORE transaction
    why: bcrypt is CPU-intensive, keep transaction fast
    impact: Better database performance
metrics:
  duration: 5.5min
  completed: 2026-02-16
---

# Phase 8 Plan 2: Password Reset and Email Templates Summary

**One-liner:** Complete password reset flow with 60-min tokenized links and ready-to-use email templates for invoice, payment, and document notifications (Phase 9/10 prep)

## What Was Built

### Password Reset Flow (EMAIL-02)
Complete self-service password reset:
- User requests reset from /reset-password page
- Receives email with secure tokenized link
- Clicks link to /reset-password/[token] page
- Sets new password
- Expired/used tokens rejected with clear error

**Security features:**
- Email enumeration prevention (same response for all requests)
- 60-minute token expiry
- One active token per email (old tokens deleted on new request)
- Password hashed BEFORE transaction for performance
- Crypto-secure token generation (crypto.randomUUID())

### Email Templates for Future Phases

**Invoice Created (EMAIL-03 - Phase 10):**
- Template: emails/invoice-created.tsx
- Send function: sendInvoiceCreatedEmail()
- Content: Invoice number, formatted amount, due date, view link
- Triggered: When Stripe creates invoice

**Payment Confirmation (EMAIL-04 - Phase 10):**
- Template: emails/payment-confirmation.tsx
- Send function: sendPaymentConfirmationEmail()
- Content: Invoice number, amount paid, payment date, PAID status badge
- Triggered: When Stripe webhook confirms payment

**Document Uploaded (EMAIL-05 - Phase 9):**
- Template: emails/document-uploaded.tsx
- Send function: sendDocumentUploadedEmail()
- Content: Document name, uploader name, view link
- Triggered: When admin uploads document via Google Drive integration

All templates use shared EmailLayout for consistent BaseAim branding.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Password reset flow — schema, actions, pages, and email | 2db0ea0 | prisma/schema.prisma, emails/password-reset.tsx, app/actions/auth.ts, app/reset-password/* (3 files), lib/email.ts, app/login/page.tsx |
| 2 | Create remaining email templates for future phases | 49a009c | emails/invoice-created.tsx, emails/payment-confirmation.tsx, emails/document-uploaded.tsx, lib/email.ts |

## Technical Implementation

### Database Schema
```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  email     String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@map("password_reset_tokens")
  @@index([email])
  @@index([token])
}
```

### Server Actions Pattern
```typescript
// Request reset (prevents enumeration)
export async function requestPasswordReset(
  prevState: ActionResult,
  formData: FormData
): Promise<ActionResult>

// Reset password (validates token)
export async function resetPassword(
  token: string,
  prevState: ActionResult,
  formData: FormData
): Promise<ActionResult>
```

### Email Send Functions (exported from lib/email.ts)
1. sendWelcomeEmail (from 08-01)
2. sendPasswordResetEmail (new - 08-02)
3. sendInvoiceCreatedEmail (new - ready for Phase 10)
4. sendPaymentConfirmationEmail (new - ready for Phase 10)
5. sendDocumentUploadedEmail (new - ready for Phase 9)

## Decisions Made

### Token Generation
**Decision:** Use crypto.randomUUID() for reset tokens
**Reasoning:** Cryptographically secure, built-in Node function, no external dependency
**Impact:** Simple, secure token generation

### Token Expiry
**Decision:** 60-minute expiration
**Reasoning:** Balance between security (short window) and user convenience (enough time to check email and reset)
**Impact:** Tokens expire after 1 hour, requires new request after expiry

### Email Enumeration Prevention
**Decision:** Return same success message whether email exists or not
**Reasoning:** Security best practice - prevents attackers from discovering which emails are registered
**Impact:** All reset requests return: "If an account exists with that email, a reset link has been sent."

### One Token Per Email
**Decision:** Delete old tokens when new request is made
**Reasoning:** Prevents confusion with multiple active tokens, simpler flow
**Impact:** Only most recent reset link works

### Build Email Templates Now
**Decision:** Create invoice/payment/document templates in Phase 8
**Reasoning:** Phase 9 (Drive) and Phase 10 (Stripe) can simply call send functions without building templates first
**Impact:** Faster execution of future phases, all email infrastructure complete upfront

### Password Hashing Before Transaction
**Decision:** Hash password with bcrypt BEFORE starting database transaction
**Reasoning:** bcrypt is CPU-intensive (deliberately slow), keep transaction fast
**Impact:** Better database performance, shorter lock time

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

### Phase 9 (Google Drive) - READY
Document upload email ready to use:
```typescript
await sendDocumentUploadedEmail({
  clientName: client.user.name,
  email: client.user.email,
  documentName: doc.fileName,
  uploadedBy: 'BaseAim Team',
  viewUrl: `${appUrl}/dashboard/documents/${doc.id}`,
})
```

### Phase 10 (Stripe) - READY
Invoice and payment emails ready to use:
```typescript
// When invoice created
await sendInvoiceCreatedEmail({
  clientName, email, invoiceNumber,
  amount, currency, dueDate, viewUrl
})

// When payment webhook received
await sendPaymentConfirmationEmail({
  clientName, email, invoiceNumber,
  amount, currency, paidDate
})
```

### Outstanding Email Requirements
- EMAIL-06 (weekly digest): Intentionally deferred per 08-RESEARCH.md recommendation
- EMAIL-08 (domain verification): Handled in user_setup (08-01)

## Verification Results

- PasswordResetToken model created in database
- npx prisma db push succeeded
- npx tsc --noEmit passed
- npm run build succeeded
- All files exist as specified
- Login page has "Forgot password?" link to /reset-password
- Full password reset flow: request → email → token page → new password
- All 5 email templates exist with BaseAim branding
- All 5 send functions exported from lib/email.ts

## Impact on Project

### Email Infrastructure - COMPLETE
Phase 8 Email Infrastructure is now complete:
- EMAIL-01 (Resend setup) ✓
- EMAIL-02 (password reset) ✓
- EMAIL-03 (invoice notifications) ✓ ready for Phase 10
- EMAIL-04 (payment confirmations) ✓ ready for Phase 10
- EMAIL-05 (document uploads) ✓ ready for Phase 9
- EMAIL-06 (weekly digest) - deferred
- EMAIL-07 (professional branding) ✓ via EmailLayout
- EMAIL-08 (domain verification) ✓ via user_setup

### Client Self-Service
Clients can now:
- Reset their own passwords without admin intervention
- Receive secure, time-limited reset links via email

### Future Phase Acceleration
Phase 9 and 10 can now:
- Send professionally branded emails immediately
- No need to build email templates during those phases
- Just call the send functions with appropriate data

### Security Improvements
- Password reset available without admin help
- Email enumeration prevented
- Secure token-based reset flow
- Automatic token expiry and cleanup

## Files Modified

**Created (9 files):**
- prisma/schema.prisma (PasswordResetToken model added)
- emails/password-reset.tsx
- emails/invoice-created.tsx
- emails/payment-confirmation.tsx
- emails/document-uploaded.tsx
- app/actions/auth.ts
- app/reset-password/page.tsx
- app/reset-password/[token]/page.tsx
- app/reset-password/[token]/reset-password-form.tsx

**Modified (2 files):**
- lib/email.ts (added 3 new send functions)
- app/login/page.tsx (added "Forgot password?" link)

## Success Criteria Met

- [x] EMAIL-02 (password reset) fully implemented end-to-end
- [x] EMAIL-03, EMAIL-04, EMAIL-05 templates ready for Phases 9/10
- [x] EMAIL-07 (professional branding) satisfied across all templates via shared EmailLayout
- [x] All email requirements addressed except EMAIL-06 (weekly digest - deferred) and EMAIL-08 (domain verification - user_setup in Plan 01)
- [x] Full password reset flow works: /reset-password → email → /reset-password/[token] → new password
- [x] Login page has "Forgot password?" link
- [x] Expired tokens rejected with clear error message
- [x] All 5 email templates exist with professional BaseAim branding
- [x] All 5 send functions exported from lib/email.ts
- [x] npm run build succeeds

---

**Phase 8 Email Infrastructure: COMPLETE**
Ready to proceed with Phase 9 (Google Drive Integration).
