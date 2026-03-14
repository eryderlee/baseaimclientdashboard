---
created: 2026-02-14T01:10:25
title: Add floating chat widget
area: ui
files:
  - app/dashboard/chat/page.tsx
  - components/dashboard/chat-interface.tsx
---

## Problem

Users want quick access to chat from any page in the dashboard without navigating to /dashboard/chat. Currently, they must use the navigation menu to access the chat page, which interrupts their workflow.

A floating chat widget (common UX pattern like support chat widgets) would allow users to:
- Open chat from anywhere in the dashboard
- Continue working while chatting (chat overlays the page)
- See unread message indicators at a glance

## Solution

Create a floating chat button positioned at bottom right of viewport with fixed positioning.

**Components needed:**
1. **Floating button** - Fixed position bottom-right (e.g., `bottom-4 right-4`), z-index above content
2. **Popup chat window** - Modal/popover that appears when button clicked
3. **State management** - Open/close state, probably useState in a client component
4. **Integration** - Reuse existing `ChatInterface` component from chat page
5. **Unread badge** (optional) - Show count of unread messages on floating button

**Technical approach:**
- Create `<FloatingChatWidget>` client component
- Add to dashboard layout so it's available on all dashboard pages
- Use Radix UI Popover or Dialog for popup behavior
- Fetch messages using same `getChatData` pattern from chat page
- Consider z-index layering (navbar is z-50, widget should be z-40 or similar)

**Nice-to-haves for later:**
- Minimize/maximize animations
- Notification sound for new messages
- Real-time updates (websockets or polling)
- Persistent open/closed state (localStorage)
