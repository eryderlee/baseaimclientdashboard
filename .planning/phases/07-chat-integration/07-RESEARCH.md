# Phase 7: Chat Integration - Research

**Researched:** 2026-02-16
**Domain:** WhatsApp and Telegram click-to-chat integration
**Confidence:** HIGH

## Summary

WhatsApp and Telegram click-to-chat integration uses standard URL schemes to open native chat applications with pre-filled messages. This is a client-side feature requiring no backend APIs, using simple URL construction with proper encoding.

WhatsApp uses the `wa.me` domain with phone numbers in international format (no special characters), while Telegram uses the `t.me` domain with usernames. Both support pre-filled messages through URL query parameters. The implementation requires URL parameter encoding using JavaScript's `encodeURIComponent()`, admin configuration storage for phone number and username, and proper client context injection into pre-filled messages.

This phase is straightforward with no complex libraries needed. The main considerations are proper URL encoding, phone number format validation, and accessible external link components.

**Primary recommendation:** Use native `encodeURIComponent()` for URL encoding, store admin settings in a new Prisma `Settings` model, and implement accessible external link buttons with proper ARIA attributes and security headers.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Built-in `encodeURIComponent()` | Native JS | URL parameter encoding | Standard JavaScript API, no dependencies needed |
| Next.js Link component | 16.1.6 | External link handling | Already in project, handles prefetching and navigation |
| lucide-react | 0.563.0 | Icons (MessageCircle, Send) | Already in project for UI icons |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | 4.3.6 | Phone number validation schema | Already in project, validate admin settings input |
| Prisma | 5.22.0 | Settings storage | Already in project, for admin config persistence |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Built-in encoding | libphonenumber-js | Only needed if you want to validate/format numbers beyond basic regex; overkill for this simple use case |
| Prisma Settings model | Environment variables | Settings model allows runtime config changes through admin UI vs requiring deployment |
| Standard link/button | react-whatsapp-widget | Third-party widget adds unnecessary complexity for simple click-to-chat |

**Installation:**
No additional packages needed - all required libraries are already in the project.

## Architecture Patterns

### Recommended Project Structure
```
components/
├── client/
│   ├── chat-buttons.tsx          # Client-side chat buttons component
│   └── whatsapp-button.tsx       # Individual WhatsApp button (optional)
│   └── telegram-button.tsx       # Individual Telegram button (optional)
app/
├── admin/
│   └── settings/
│       ├── page.tsx              # Admin settings page UI
│       └── actions.ts            # Server actions for settings CRUD
lib/
└── utils/
    └── chat-links.ts             # URL generation utilities
prisma/
└── schema.prisma                 # Add Settings model
```

### Pattern 1: URL Generation Utility Functions
**What:** Pure functions that generate WhatsApp/Telegram URLs with proper encoding
**When to use:** Whenever you need to construct a chat link with pre-filled message
**Example:**
```typescript
// lib/utils/chat-links.ts
export function generateWhatsAppLink(phoneNumber: string, message: string): string {
  // Remove all non-digit characters except leading +
  const cleanPhone = phoneNumber.replace(/[^\d+]/g, '').replace(/^\+/, '');

  // URL encode the message
  const encodedMessage = encodeURIComponent(message);

  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

export function generateTelegramLink(username: string, message: string): string {
  // Remove @ if present
  const cleanUsername = username.replace(/^@/, '');

  // Telegram doesn't support pre-filled messages via URL for usernames
  // Only bot start parameters support text
  return `https://t.me/${cleanUsername}`;
}

export function createClientMessage(clientName: string, companyName: string): string {
  return `Hello! I'm ${clientName} from ${companyName}. I'd like to discuss my project.`;
}
```

### Pattern 2: Accessible External Link Button Component
**What:** Reusable button component for external chat links with security and accessibility
**When to use:** For all external chat links to ensure consistency
**Example:**
```typescript
// components/client/external-link-button.tsx
'use client';

import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExternalLinkButtonProps {
  href: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function ExternalLinkButton({
  href,
  children,
  icon,
  className
}: ExternalLinkButtonProps) {
  return (
    <Button
      asChild
      className={className}
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${children} (opens in new tab)`}
      >
        {icon}
        {children}
        <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
      </a>
    </Button>
  );
}
```

### Pattern 3: Prisma Settings Model
**What:** Single-row settings table for admin configuration
**When to use:** Store global application settings like WhatsApp number and Telegram username
**Example:**
```typescript
// prisma/schema.prisma
model Settings {
  id                String    @id @default(cuid())
  whatsappNumber    String?   // International format: 1234567890
  telegramUsername  String?   // Without @ prefix
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@map("settings")
}
```

### Pattern 4: Server Actions for Settings CRUD
**What:** Next.js Server Actions for admin to update settings
**When to use:** Admin settings page to save WhatsApp/Telegram configuration
**Example:**
```typescript
// app/admin/settings/actions.ts
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateChatSettings(data: {
  whatsappNumber?: string;
  telegramUsername?: string;
}) {
  // Get or create settings (singleton pattern)
  const settings = await prisma.settings.findFirst();

  if (settings) {
    await prisma.settings.update({
      where: { id: settings.id },
      data: {
        whatsappNumber: data.whatsappNumber,
        telegramUsername: data.telegramUsername,
      },
    });
  } else {
    await prisma.settings.create({
      data: {
        whatsappNumber: data.whatsappNumber,
        telegramUsername: data.telegramUsername,
      },
    });
  }

  revalidatePath('/admin/settings');
  revalidatePath('/client/dashboard');
}

export async function getChatSettings() {
  const settings = await prisma.settings.findFirst();
  return settings;
}
```

### Anti-Patterns to Avoid
- **Using spaces in phone numbers:** WhatsApp requires digits only (no spaces, dashes, parentheses). Clean input before constructing URL.
- **Including + in wa.me URL:** The phone number should not include + symbol even though it's international format.
- **Using encodeURI instead of encodeURIComponent:** encodeURI doesn't encode characters like & and ? which breaks query parameters.
- **Not sanitizing user input in pre-filled messages:** Always use encodeURIComponent on dynamic message content to prevent URL injection.
- **Hard-coding phone numbers:** Store in database so admin can update without code deployment.
- **Missing rel="noopener noreferrer":** Security vulnerability when using target="_blank" allows opened page to access window.opener.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL parameter encoding | Custom string replacement for spaces and special chars | `encodeURIComponent()` | Handles all edge cases including Unicode, emojis, and special characters correctly |
| Phone number formatting | Custom regex to clean phone numbers | Zod schema with `.regex()` validation | Zod already in project, provides validation errors, type-safe |
| External link security | Manual rel attribute management | Standardized component pattern | Easy to forget noopener/noreferrer, component ensures consistency |
| Settings singleton pattern | Custom logic to ensure one settings record | Prisma `findFirst()` + create/update pattern | Well-established pattern, handles race conditions |

**Key insight:** Chat integration is simpler than it appears. Don't overthink it with complex libraries or custom URL builders. The built-in JavaScript APIs and existing project tools handle all requirements.

## Common Pitfalls

### Pitfall 1: Phone Number Format Confusion
**What goes wrong:** WhatsApp link fails to open because phone number includes invalid characters or formatting
**Why it happens:** Users copy-paste phone numbers with spaces, dashes, parentheses: "+1 (555) 123-4567"
**How to avoid:**
- Strip all non-digit characters except leading + during storage
- Remove + before constructing wa.me URL
- Validate with Zod schema: `z.string().regex(/^\d{10,15}$/, 'Phone number must be 10-15 digits')`
**Warning signs:** WhatsApp opens but shows "Phone number shared via url is invalid" error

### Pitfall 2: URL Encoding Special Characters
**What goes wrong:** Pre-filled message gets truncated or corrupted when it contains special characters like & or ?
**Why it happens:** Not using encodeURIComponent, or using encodeURI which doesn't encode query param special chars
**How to avoid:** Always use `encodeURIComponent()` for the text parameter value, never manual replacement
**Warning signs:** Message cuts off at first & character, or ? creates additional query params

### Pitfall 3: Telegram Pre-filled Message Misconception
**What goes wrong:** Expecting Telegram to support pre-filled messages like WhatsApp does
**Why it happens:** Assuming both platforms work the same way
**How to avoid:** Understand that `t.me/username` doesn't support text parameter; only `t.me/botname?start=param` for bots supports parameters
**Warning signs:** Telegram link has ?text= parameter but message doesn't appear

### Pitfall 4: Mobile vs Desktop Behavior Differences
**What goes wrong:** Link works on desktop but not mobile, or vice versa
**Why it happens:**
- Desktop: Opens WhatsApp Web if app not installed, requires phone to be connected
- Mobile: Opens WhatsApp app directly
- Telegram: t.me works universally, tg:// protocol only works if app installed
**How to avoid:** Use t.me (not tg://) for Telegram, accept that wa.me behavior differs by platform
**Warning signs:** User reports "link doesn't work" but testing on different device works fine

### Pitfall 5: Privacy and Client Context in URLs
**What goes wrong:** Including sensitive client data in URL that gets logged in browser history and server logs
**Why it happens:** Adding too much client context to pre-filled message (email, address, account IDs)
**How to avoid:** Only include client name and company name in pre-filled message, nothing sensitive
**Warning signs:** GDPR compliance concerns, users worried about data exposure

### Pitfall 6: Not Handling Missing Settings
**What goes wrong:** Chat buttons render but don't work because admin hasn't configured phone/username yet
**Why it happens:** Not checking if settings exist before rendering buttons
**How to avoid:** Conditionally render buttons only if settings are configured, or show "Contact us" placeholder
**Warning signs:** Empty href attributes, 404 errors, confused users clicking non-functional buttons

### Pitfall 7: Accessibility Issues with External Links
**What goes wrong:** Screen readers don't announce that link opens in new tab/app
**Why it happens:** Missing aria-label or visual indicator for external link
**How to avoid:** Add aria-label with "(opens in new tab)", include visual icon (ExternalLink), use semantic button/link
**Warning signs:** Accessibility audit failures, screen reader users surprised by new window

## Code Examples

Verified patterns from official sources:

### WhatsApp Click-to-Chat URL Format
```typescript
// Source: https://faq.whatsapp.com/5913398998672934
// Official WhatsApp documentation

// Basic format: https://wa.me/phonenumber
// With message: https://wa.me/phonenumber?text=urlencoded-text

// Example implementation
const phoneNumber = "1234567890"; // No spaces, no +, just digits
const message = "Hello! I'm John from Acme Corp.";
const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

// Result: https://wa.me/1234567890?text=Hello!%20I'm%20John%20from%20Acme%20Corp.
```

### Telegram Click-to-Chat URL Format
```typescript
// Source: https://core.telegram.org/api/links
// Official Telegram deep links documentation

// t.me format (recommended): https://t.me/username
// tg:// format (app-only): tg://resolve?domain=username

// Example implementation
const telegramUsername = "baseaim_support"; // Without @ prefix
const telegramUrl = `https://t.me/${telegramUsername}`;

// Result: https://t.me/baseaim_support

// Note: t.me links work in browsers and fall back to Telegram Web if app not installed
// tg:// links only work if Telegram app is installed
```

### encodeURIComponent Usage
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
// MDN official documentation

// encodeURIComponent encodes everything except: A-Z a-z 0-9 - _ . ! ~ * ' ( )

const message = "Hello & welcome! Let's chat?";
const encoded = encodeURIComponent(message);
console.log(encoded);
// Output: "Hello%20%26%20welcome!%20Let's%20chat%3F"

// Common mistake: Using encodeURI (doesn't encode & ? =)
const wrongEncoded = encodeURI(message);
console.log(wrongEncoded);
// Output: "Hello%20&%20welcome!%20Let's%20chat?"
// ^ & and ? are NOT encoded, will break URL parameters
```

### Client-Side Chat Buttons Component
```typescript
// components/client/chat-buttons.tsx
'use client';

import { MessageCircle, Send } from 'lucide-react';
import { ExternalLinkButton } from './external-link-button';
import { generateWhatsAppLink, createClientMessage } from '@/lib/utils/chat-links';

interface ChatButtonsProps {
  whatsappNumber?: string;
  telegramUsername?: string;
  clientName: string;
  companyName: string;
}

export function ChatButtons({
  whatsappNumber,
  telegramUsername,
  clientName,
  companyName,
}: ChatButtonsProps) {
  const message = createClientMessage(clientName, companyName);

  return (
    <div className="flex gap-4">
      {whatsappNumber && (
        <ExternalLinkButton
          href={generateWhatsAppLink(whatsappNumber, message)}
          icon={<MessageCircle className="h-5 w-5" />}
          className="bg-green-600 hover:bg-green-700"
        >
          Chat on WhatsApp
        </ExternalLinkButton>
      )}

      {telegramUsername && (
        <ExternalLinkButton
          href={`https://t.me/${telegramUsername}`}
          icon={<Send className="h-5 w-5" />}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Chat on Telegram
        </ExternalLinkButton>
      )}
    </div>
  );
}
```

### Admin Settings Form with Zod Validation
```typescript
// app/admin/settings/page.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const settingsSchema = z.object({
  whatsappNumber: z
    .string()
    .regex(/^\d{10,15}$/, 'Phone number must be 10-15 digits without spaces or special characters')
    .optional()
    .or(z.literal('')),
  telegramUsername: z
    .string()
    .regex(/^[a-zA-Z0-9_]{5,32}$/, 'Telegram username must be 5-32 characters (letters, numbers, underscores)')
    .optional()
    .or(z.literal('')),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export function SettingsForm({ initialData }: { initialData?: SettingsFormData }) {
  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: initialData,
  });

  const onSubmit = async (data: SettingsFormData) => {
    await updateChatSettings(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| WhatsApp Business API | Simple wa.me links | Always available | wa.me is for simple click-to-chat, Business API is for automated messaging at scale |
| tg:// protocol links | t.me HTTPS links | 2016+ | t.me works in browsers without app, better UX |
| Custom URL encoding | encodeURIComponent() | JavaScript standard | Always use built-in, handles all edge cases |
| Environment variables for config | Database settings table | Modern SaaS pattern | Runtime config changes without deployment |
| Hard-coded chat widgets | Simple external links | Current best practice | No JavaScript needed, works everywhere, better performance |

**Deprecated/outdated:**
- **api.whatsapp.com/send:** Still works but wa.me is shorter and official
- **tg:// protocol for web apps:** Use t.me for better browser compatibility
- **encodeURI for query parameters:** Use encodeURIComponent for individual parameter values

## Open Questions

1. **Should we validate WhatsApp number existence?**
   - What we know: WhatsApp provides no official API to check if number exists without sending message
   - What's unclear: Whether we should pre-validate or just trust admin input
   - Recommendation: Trust admin input, validation would require third-party services which add complexity

2. **Should we support multiple contact methods per client?**
   - What we know: Requirements specify single admin WhatsApp number and Telegram username
   - What's unclear: Whether future phases might need client-specific contact preferences
   - Recommendation: Implement global settings for v1.0, database schema allows easy expansion later

3. **Should we track chat link clicks?**
   - What we know: External links can't track user actions after click
   - What's unclear: Whether analytics on click events (before leaving site) is needed
   - Recommendation: Out of scope for this phase, can add analytics wrapper in future if needed

## Sources

### Primary (HIGH confidence)
- [Official Telegram Deep Links Documentation](https://core.telegram.org/api/links) - Link formats and protocol specifications
- [MDN encodeURIComponent()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent) - URL encoding API reference
- [Next.js Server Actions Configuration](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions) - Server actions patterns

### Secondary (MEDIUM confidence)
- [WhatsApp Click-to-Chat Official Help](https://faq.whatsapp.com/5913398998672934) - WhatsApp official guidance (page structure prevented full fetch but title confirmed)
- [WhatsApp Click-to-Chat for WhatsApp | Dotdigital Help Centre](https://support.dotdigital.com/en/articles/11331301-click-to-chat-for-whatsapp) - Implementation guidance verified across multiple sources
- [How to Create and Integrate WhatsApp Click-to-Chat Link? | GPTBots](https://www.gptbots.ai/blog/whatspp-click-to-chat)
- [How to create WhatsApp Click-to-Chat links | Wati.io Help Center](https://support.wati.io/en/articles/11462980-how-to-create-whatsapp-click-to-chat-links)
- [Understanding Telegram URLs: A Comprehensive Guide | Botcake](https://botcake.io/blog/understanding-telegram-urls-a-comprehensive-guide)
- [Accessible links and buttons with React | Kitty Giraudel](https://kittygiraudel.com/2020/01/17/accessible-links-and-buttons-with-react/) - External link accessibility patterns
- [TypeScript and React: Enforcing Props for Accessibility | Nick Taylor](https://www.nickyt.co/blog/typescript-and-react-enforcing-props-for-accessibility-2h49/)
- [React & Next.js Best Practices in 2026 | FAB Web Studio](https://fabwebstudio.com/blog/react-nextjs-best-practices-2026-performance-scale)
- [GDPR Compliance for Live Chat Services | HelpSquad](https://helpsquad.com/gdpr-compliance/) - Privacy considerations for chat

### Tertiary (LOW confidence)
- [Libphonenumber-js for phone validation](https://github.com/jackocnr/intl-tel-input) - Mentioned if advanced phone validation needed in future
- Various third-party blog posts on WhatsApp/Telegram link generation - Cross-referenced for pattern validation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All tools already in project, no new dependencies needed
- Architecture: HIGH - Standard Next.js patterns with official documentation
- Pitfalls: HIGH - Well-documented common issues with URL encoding and phone formats, verified across multiple sources
- WhatsApp URL format: HIGH - Verified across multiple authoritative sources, consistent pattern
- Telegram URL format: HIGH - Official Telegram documentation fetched and verified
- Privacy considerations: MEDIUM - GDPR guidance from secondary sources, not legal advice

**Research date:** 2026-02-16
**Valid until:** 2026-08-16 (6 months - URL schemes and browser APIs are stable)
