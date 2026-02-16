# Dashboard Style & Component Specification

This is the authoritative reference for how the Baseaim dashboard is currently styled. Copy/paste snippets hinge on the helpers defined in `app/globals.css`, so keep that file open when auditing other routes.

---

## 1. Global Foundations

### 1.1 Typography
| Layer | Font | CSS Hook | Notes |
| --- | --- | --- | --- |
| Body / Paragraphs | **Inter** | `--font-inter` (default) | Applied globally via `body` in `globals.css`. |
| Headings | **Montserrat** | `.font-heading` | Used for hero titles, section headers, card titles. |
| Accent Displays | **DM Serif Display** | `.font-display` | Used for gradient-accent copy (e.g., hero highlight). |
| UI Accents | **Poppins** | `.font-alt` | Uppercase labels, chip text. |
| Supporting Text | **Work Sans** | `.font-work` | Secondary copy (e.g., roadmap stats). |
| Metrics / Code | **JetBrains Mono** | `--font-jetbrains-mono` | KPIs or future code blocks. |

All fonts are loaded in `app/layout.tsx` with `next/font` and added to `body` via `className={`${inter.variable} ...`}`.

### 1.2 Color Tokens (Light Mode)
Defined in `:root` inside `app/globals.css`.

| Token | Value | Used For |
| --- | --- | --- |
| `--primary` | `#2563eb` | Main CTA, gradient stops. |
| `--secondary` | `rgba(59,130,246,0.08)` | Ghost button backgrounds. |
| `--accent` | `rgba(34,211,238,0.12)` | Subtle highlights. |
| `--destructive` | `#e11d48` | Error badges, destructive actions. |
| `--muted` | `#e1f5fe` | Light backgrounds. |
| `--ring` | `rgba(59,130,246,0.35)` | Focus style. |
| `--glass-bg` | `rgba(255,255,255,0.9)` | Base for `.glass-card`. |
| `--glass-border` | `rgba(255,255,255,0.6)` | Border for glass surfaces. |
| `--glass-shadow` | `0 30px 80px rgba(15,23,42,0.12)` | Soft depth for glass components. |
| `--chip-bg` | `rgba(37,99,235,0.08)` | Base for `.chip-pill`. |
| `--chip-border` | `rgba(37,99,235,0.25)` | Outline for `.chip-pill`. |
| Gradient tokens | `--gradient-blue-start`, `--gradient-cyan-start`, etc. | Wave animations + hero overlays. |

Dark-theme overrides live under `.dark { ... }`.

### 1.3 Helper Classes
- `.glass-card`: glass background, border, shadow, blur. Applied to every card that needs the airy Baseaim look (dashboard hero tiles, stats, etc.).
- `.chip-pill`: uppercase pill for labels like “Engagement Snapshot”.
- `.gradient-border`: gradient ring wrapper for pills/labels.
- `.hero-highlight`: gradient text effect for display-type copy.

### 1.4 Animated Background
- `components/GradientBG.tsx` renders `.moving-gradient-hero` with 5 wave layers + overlay.
- Keyframes: `wave-drift-1/2/3`, `overlay-pulse`.
- Inserted under hero sections to match the design system spec (Section 9 of the style guide).

---

## 2. Navigation Bar

### 2.1 Layout & Background
```
<nav className="sticky top-0 z-50 border-b border-white/70 bg-white/80 shadow-[0_10px_60px_rgba(37,99,235,0.15)] backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-900/80">
  <div className="flex h-20 w-full items-center justify-between px-4 lg:px-8">
...
```

### 2.2 Branding & Buttons
- Left brand: `<img src="/BASEAIM BLACK.png" width={52} className="h-12 w-auto object-contain drop-shadow-[0_12px_30px_rgba(15,23,42,0.25)]" />`.
- Nav pills: `rounded-full px-3.5 py-1.5`, active state `bg-gradient-to-r from-primary to-cyan-400 text-white shadow-md`.
- Notification button: ghost variant `border border-white/70 bg-white/70`.
- CTA: `bg-gradient-to-r from-primary via-sky-400 to-cyan-400 px-5 py-2 rounded-full text-white`.
- Avatar uses `Avatar + AvatarFallback` with neutral colors.

### 2.3 Dropdown
- Standard dropdown shows user name, email, role badge (uses `.Badge variant="secondary"`), settings link, and log-out entry with `LogOut` icon colored red.

---

## 3. Hero / Engagement Snapshot

### 3.1 Structure
```
<section className="relative overflow-hidden rounded-[32px] border border-white/60 bg-white/90 px-6 py-10 shadow-[0_35px_140px_rgba(37,99,235,0.2)] dark:border-slate-800/70 dark:bg-slate-900/80">
  <GradientBG />
  <div className="relative z-10 flex flex-col gap-10 lg:flex-row">
    ...
```

### 3.2 Workflow Highlight Cards
- Data shown: Recent Milestone, Next Milestone, Media Budget.
- Per-card class: `relative overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br from-white via-white/90 to-slate-50 p-4 shadow-[0_25px_80px_rgba(15,23,42,0.18)] ring-1 ring-white/70 dark:border-slate-800/60 ...`.
- Each card includes `absolute inset-0 rounded-2xl bg-gradient-to-br {item.accent} opacity-80`.
- Text uses `.font-heading` or default Inter; labels use `.text-xs uppercase tracking-wide`.

### 3.3 KPI Cards
- Similar class with heavier shadow: `shadow-[0_28px_90px_rgba(15,23,42,0.2)]`.
- Two gradient overlays (left and right) for a cross-light effect.
- Values rendered as `text-3xl font-heading`.
- Captions (e.g., “Booked calls logged in Baseaim”) in `text-xs text-slate-500`.

### 3.4 Buttons
- Primary CTA: `className="rounded-full border-0 bg-gradient-to-r from-primary via-sky-400 to-cyan-400 px-6 py-2 font-semibold text-white shadow-lg shadow-sky-200 hover:opacity-90"`.
- Secondary CTA: `className="rounded-full border border-white/70 bg-white/70 px-6 py-2 text-slate-700 shadow-sm shadow-sky-100 hover:bg-white/90 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"`.

---

## 4. Analytics Section

### 4.1 AnalyticsOverview Tabs
- Wrapper: `<Tabs className="..." value={activeTab}>`.
- Tab list: `className="mb-6 grid w-full grid-cols-2 gap-3 rounded-full border border-white/60 bg-white/70 p-1 text-slate-600 shadow-inner shadow-sky-100 dark:border-slate-800 dark:bg-slate-900/70 sm:grid-cols-4"`.
- Tab trigger: `rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-wide data-[state=active]:bg-gradient-to-r from-primary via-sky-400 to-cyan-400 data-[state=active]:text-white`.

### 4.2 Metric Cards
- Use `glass-card` base. Each card displays: total, ad spend, conversion rate, CPC/CPA. Icons colored (Eye `#2563eb`, MousePointer `#0ea5e9`, etc.).
- Chart card: `rounded-3xl border border-white/70 bg-white/90 shadow-md shadow-sky-100 dark:border-slate-800 dark:bg-slate-900/70`.
- Tooltip: custom style with white background, subtle border, and radius matching `--radius`.

### 4.3 Stat Cards Adjacent to Chart
See table below for copy and icons. Each card uses `glass-card rounded-2xl` styling with gradient icon backgrounds and `Button variant="link"` CTA.

| Card | Icon | Primary Value | CTA |
| --- | --- | --- | --- |
| Client Assets | `FileText` | `stats.totalDocuments` | Link `/dashboard/documents` |
| Unread Messages | `MessageSquare` | `stats.unreadMessages` | Link `/dashboard/chat` |
| Client Acquisition System | `TrendingUp` | `${overallProgress}%` + progress bar | Link `#milestones` |
| Pending Media Budget | `CreditCard` | `$${pendingPayments}` | Link `/dashboard/billing` |

---

## 5. Lower Sections (Roadmap, Activity, Documents, Notifications)

### 5.1 Roadmap
- Card: `glass-card rounded-3xl border border-white/60 shadow-xl shadow-sky-100`.
- Secondary summary badges use `.chip-pill` plus context (e.g., “Milestone Completion”).
- Each milestone entry: `rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm` with `Progress` bar, status badge (`chip-pill` variant).

### 5.2 Recent Activity
- Items styled with `flex ... border border-white/70 bg-white/70 p-3 shadow-sm`.
- Avatars use fallback initials; ghost button on the right uses `hover:text-primary`.

### 5.3 Documents & Notifications
- Documents: `rounded-2xl border border-white/70 bg-white/80 p-4` with gradient icon container (`border border-white/70 bg-white/90 p-3`).
- Status badges: gradient-coded (emerald for APPROVED, amber for PENDING).
- Notifications: simple glass cards with `text-slate-800` headings, body text, timestamp.

---

## 6. Progress Tab (Standalone Route)

### 6.1 Page Setup
- `app/dashboard/progress/page.tsx` is a client component (`"use client"`).
- Uses `MilestoneChecklist`, `MilestoneItem`, `MilestoneNotes`, `MilestoneStatusBadge`.
- Demo data is defined with `Milestone` + `MilestoneStatus` enums; convert to real data later.

### 6.2 Checklist Styling
- Overall progress card uses `Progress` component with `className="h-4"`.
- Empty state shows `Calendar` icon with muted colors.
- Individual milestone entries highlight the active item via `isActive` (adds `ring-2 ring-primary` etc.).

---

## 7. Buttons & CTA Styles (Quick Reference)

| Context | Class / Notes |
| --- | --- |
| Primary CTA | `bg-gradient-to-r from-primary via-sky-400 to-cyan-400 text-white rounded-full shadow-lg` |
| Secondary Ghost | `border border-white/70 bg-white/70 text-slate-700 hover:bg-white/90` |
| Nav CTA | Same as primary CTA but `px-5 py-2`. |
| Icon Button | `variant="ghost" size="icon"`, class enhancements for borders/shadows. |
| Link Button | `variant="link" className="px-0 text-sm font-semibold text-primary"` used in stat cards. |

---

## 8. Assets & Utilities
- `components/GradientBG.tsx` (animated hero background).
- Public assets: `BASEAIM BLACK.png` (nav logo), `web-app-manifest-512x512.png` (app icon), `favicon-black.ico`.
- `lib/milestone-utils.ts`: exposes `calculateOverallProgress`, `getActiveMilestone`, `formatWeekLevel`, `getStatusConfig`.

---

## 9. Known Follow-Ups
1. ESLint warnings exist in untouched files (`app/dashboard/analytics/page.tsx`, billing, etc.).
2. Progress tab uses mock data—replace with live data from backend once available.
3. Ensure any new pages reuse `.glass-card` / `.chip-pill` rather than inventing new styles.

---

## 10. File Reference
- **Foundations**: `app/layout.tsx`, `app/globals.css`.
- **Hero & Core Dashboard**: `components/dashboard/dashboard-overview.tsx`, `components/GradientBG.tsx`.
- **Nav**: `components/dashboard/dashboard-nav.tsx`.
- **Analytics**: `components/dashboard/analytics-overview.tsx`.
- **Progress Flow**: `app/dashboard/progress/page.tsx`, `components/dashboard/milestone-*`, `lib/milestone-utils.ts`, `lib/types/milestone.ts`.

Keep this doc updated whenever a new UI surface is introduced or when brand tokens change. This ensures design consistency across upcoming features (admin flows, milestone editing, etc.).
