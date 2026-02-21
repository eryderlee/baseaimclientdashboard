---
phase: 11-facebook-ads-analytics
plan: 02
subsystem: ui
tags: [facebook-ads, settings, admin, react-hook-form, zod, prisma]

# Dependency graph
requires:
  - phase: 11-01
    provides: facebookAccessToken column on Settings, adAccountId column on Client, fbSettingsSchema exported from lib/schemas/settings

provides:
  - updateFbSettings server action persisting facebookAccessToken to Settings DB row
  - FbSettingsForm component with password-type token input in admin settings page
  - adAccountId field in updateClientSchema with act_\\d+ validation
  - updateClient() extracting and saving adAccountId (null for empty)
  - Facebook Ads Configuration card in ClientForm (edit mode only)
  - Admin settings page rendering both ChatSettingsForm and FbSettingsForm

affects:
  - 11-03 (reads facebookAccessToken from Settings and adAccountId from Client to call FB API)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Same upsert pattern for updateFbSettings as updateChatSettings (findFirst + update/create)
    - Separate form components per settings domain (ChatSettingsForm, FbSettingsForm) in same file
    - Edit-mode-only fields via {mode === 'edit' && ...} conditional in ClientForm

key-files:
  created: []
  modified:
    - app/admin/settings/actions.ts
    - app/admin/settings/chat-settings-form.tsx
    - app/admin/settings/page.tsx
    - lib/schemas/client.ts
    - app/admin/actions.ts
    - components/admin/client-form.tsx
    - app/admin/clients/[clientId]/edit/page.tsx

key-decisions:
  - "FbSettingsForm is a separate component in the same file as ChatSettingsForm — each form submits independently"
  - "settings/page.tsx queries prisma.settings.findFirst() directly for facebookAccessToken — getChatSettings may not select it"
  - "adAccountId stored as null (not empty string) when cleared — consistent with other nullable DB fields"
  - "ClientFormProps.defaultValues typed as Partial<CreateClientInput & UpdateClientInput> — allows adAccountId in edit mode"

patterns-established:
  - "Settings page: multiple independent form sections, each with own submit button"
  - "Edit-only fields: {mode === 'edit' && <Card>...} pattern for fields not applicable on create"

# Metrics
duration: 3min
completed: 2026-02-21
---

# Phase 11 Plan 02: Facebook Ads Admin UI Summary

**Facebook System User token saved via admin settings form and per-client ad account ID field added to client edit page with act_XXXXXXXXX regex validation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-21T11:44:45Z
- **Completed:** 2026-02-21T11:47:36Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Admin settings page now has a "Facebook Ads Integration" card with password-type System User token input
- updateFbSettings server action upserts facebookAccessToken using same pattern as updateChatSettings
- Client edit form shows "Facebook Ads Configuration" card with adAccountId field (edit mode only), validates act_\\d+ format, saves null for empty values

## Task Commits

Each task was committed atomically:

1. **Task 1: Facebook token settings — action, form section, and page update** - `2cc1d9c` (feat)
2. **Task 2: Per-client adAccountId — schema, action, form field, edit page** - `db19903` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `app/admin/settings/actions.ts` - Added updateFbSettings server action; updated import to include fbSettingsSchema
- `app/admin/settings/chat-settings-form.tsx` - Added FbSettingsForm component with password-type facebookAccessToken input
- `app/admin/settings/page.tsx` - Fetches facebookAccessToken via direct prisma query; renders both forms
- `lib/schemas/client.ts` - Added adAccountId to updateClientSchema with /^act_\\d+$/ regex and .or(z.literal(''))
- `app/admin/actions.ts` - Extracts adAccountId from formData; passes adAccountId || null to prisma.client.update
- `components/admin/client-form.tsx` - Added Facebook Ads Configuration card (edit mode only); fixed defaultValues prop type
- `app/admin/clients/[clientId]/edit/page.tsx` - Passes client.adAccountId || undefined as defaultValue

## Decisions Made

- **FbSettingsForm as separate component in same file:** Each form submits independently to its own action, avoiding mixed FormData with unrelated fields.
- **Direct prisma query for facebookAccessToken in page.tsx:** getChatSettings may not select the facebookAccessToken field; direct findFirst with explicit select is safe and explicit.
- **Null storage for empty adAccountId:** Consistent with other optional nullable fields (industry, website, phone). Empty string cleared to null.
- **ClientFormProps.defaultValues typed as `Partial<CreateClientInput & UpdateClientInput>`:** adAccountId only exists in updateClientSchema; widening the prop type to include both union types allows TypeScript to accept adAccountId without casting.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript error: adAccountId not assignable to defaultValues prop**
- **Found during:** Task 2 (edit page defaultValues update)
- **Issue:** ClientFormProps.defaultValues was typed as `Partial<CreateClientInput>` which does not include adAccountId (only in updateClientSchema). TypeScript error TS2353.
- **Fix:** Changed prop type to `Partial<CreateClientInput & UpdateClientInput>` to allow both create and edit fields.
- **Files modified:** components/admin/client-form.tsx
- **Verification:** npx tsc --noEmit passes with zero errors
- **Committed in:** db19903 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug: TypeScript type mismatch)
**Impact on plan:** Fix required for TypeScript compilation. No scope creep.

## Issues Encountered

None beyond the TypeScript prop type mismatch documented above.

## User Setup Required

None - no external service configuration required for this plan. The FB token itself is configured by the admin via the new settings form.

## Next Phase Readiness

- Plan 11-03 (analytics display) can now read facebookAccessToken from Settings and adAccountId from Client
- Both DB columns are populated via these admin UI surfaces
- No blockers for Plan 11-03

---
*Phase: 11-facebook-ads-analytics*
*Completed: 2026-02-21*
