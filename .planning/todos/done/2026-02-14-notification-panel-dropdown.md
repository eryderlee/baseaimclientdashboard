---
created: 2026-02-14T01:16:13
title: Notification panel for header bell icon
area: ui
files:
  - components/dashboard/dashboard-nav.tsx:95-104
  - app/dashboard/chat/page.tsx:25-29
---

## Problem

The notification bell icon in the dashboard header (top right) currently displays a static badge with "3" but has no click functionality. Users expect to click it to see their notifications.

Currently the icon is just a visual element:
```tsx
<Button variant="ghost" size="icon" className="...">
  <Bell className="h-5 w-5" />
  <Badge>3</Badge>
</Button>
```

Users need to:
- Click the bell to see a list of notifications
- View notification details (type, message, timestamp)
- Mark notifications as read
- Navigate to relevant pages from notifications (e.g., "New message" → chat page)

## Solution

Add a dropdown/popover panel that opens when clicking the notification bell.

**Components needed:**
1. **Notification panel component** - Dropdown content showing list of notifications
2. **Click handler** - Open/close panel on bell icon click
3. **Data fetching** - Fetch real notifications from database (similar to chat page pattern)
4. **Mark as read** - Update notification status when viewed
5. **Badge logic** - Show count of unread notifications, not hardcoded "3"

**Technical approach:**
- Use Radix UI DropdownMenu or Popover for the panel
- Fetch notifications server-side in dashboard layout or client-side in panel
- Database query: `prisma.notification.findMany({ where: { userId, read: false } })`
- Update dashboard-nav.tsx bell button to include dropdown trigger
- Panel shows recent notifications with timestamps, type icons, and actions
- Click notification to mark as read and navigate to relevant page

**Database schema:**
Notification table already exists (used in chat page). Includes:
- userId, type, message, read status, createdAt
- Can be extended with link/url field for navigation

**UI considerations:**
- Max height with scroll for many notifications
- Empty state: "No new notifications"
- Group by date (Today, Yesterday, Earlier)
- Type-specific icons (message, milestone, document, billing, etc.)
