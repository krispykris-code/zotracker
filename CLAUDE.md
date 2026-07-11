# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project Overview

ZoTracker is a collaborative sleep tracking PWA. Users create rooms, invite friends via shared links, and track sleep records with real-time sync via Firebase Firestore.

## Build Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm start        # Start production server
npm run lint     # ESLint
```

After code changes, push to GitHub and Vercel auto-deploys from main branch.
- **Vercel project**: zotracker.vercel.app
- **GitHub repo**: github.com/krispykris-code/zotracker

## Build Gotchas
- **Dropbox lock**: `.next/export` folder lock causes EBUSY errors at build finalization step. TypeScript compilation + static generation still succeed. Retry build, or push if type check passed.
- **Windows shell**: bash is the shell, but npm/node/git commands must be wrapped in `cmd //c "..."` (e.g., `cmd //c "npm run build"`). Project path contains Chinese characters and spaces.

## Manual Deployment Steps
- **Firestore rules**: Content of `firestore.rules` must be manually copy-pasted to Firebase Console at https://console.firebase.google.com/project/zotracker-9f632/firestore/rules → 發布
- **PWA icons**: After editing `public/logo.svg`, run `node scripts/generate-icons.mjs` to regenerate `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`
- **Version bump**: After user-facing changes, bump `APP_VERSION` in `lib/version.ts` AND update `APP_LAST_UPDATED` so existing users see update banner on next open

## Architecture

### Tech Stack
- Next.js 16.2.2 (App Router) + React 19 + TypeScript (strict)
- Tailwind CSS 4 (via `@tailwindcss/postcss`)
- Firebase Firestore (offline persistence enabled)
- Recharts (stats page charts)
- Path alias: `@/*` maps to project root

### Key Files
- `app/page.tsx` — Main tracker: landing page, room join, name input, record list, overlay form, update banner, toast, pull-to-refresh
- `app/stats/page.tsx` — Analytics: trend chart, weekly/monthly averages, person filter
- `app/calendar/page.tsx` — Calendar view: 3-month scrollable grid, color-coded cells, MC indicator
- `lib/firebase.ts` — Firestore init with `persistentLocalCache` for offline support
- `lib/sleep.ts` — Duration calc, formatting, color helpers, smart defaults, person colors
- `lib/calendar.ts` — Month grid generation, sleep bg/text colors, date helpers
- `lib/notifications.ts` — Service worker registration, notification permission, 11pm reminders
- `lib/version.ts` — `APP_VERSION` + `APP_LAST_UPDATED` constants (bump on each user-facing release)
- `lib/types.ts` — `SleepRecord` interface (date, bedtime, wakeTime, person, createdAt, isMc?)
- `public/sw.js` — Service worker: page/asset caching + notification scheduling
- `firestore.rules` — Security rules (no auth, room ID as access control)

### Data Model
```
Firestore: rooms/{roomId}/records/{recordId}
Record ID format: {YYYY-MM-DD}_{personName}
```
One record per person per day. Editing changes the same document; if date changes, old doc is deleted and new one created.

### Key Patterns
- **All pages are `"use client"`** — required for URL params (`window.location.search`), Firestore `onSnapshot`, and localStorage
- **Room-based sharing without auth** — room ID is the access key, stored in localStorage (`zotracker-room`)
- **Room history** — last 5 joined rooms stored in `zotracker-room-history` (JSON array), shown in join overlay for quick access
- **Room deletion** — ⚙️ settings button in header, two-step confirmation, deletes all Firestore records in room via `getDocs` + batch `deleteDoc`
- **Auto-redirect** — on app open, checks localStorage for saved room and redirects; enables PWA to skip landing page
- **localStorage keys**: `zotracker-room`, `zotracker-room-history`, `zotracker-name`, `zotracker-version`, `zotracker-notif-dismissed`, `zotracker-reminder-{date}`
- **sessionStorage keys**: `zotracker-update-complete` (persists across reload for "update complete" toast)
- **Smart form defaults** — 6am-2pm: assumes just woke up (wake=now, bed=8h ago); otherwise: assumes going to bed (bed=now, wake=empty)
- **Sleep duration colors** — green (≥7h), amber (≥6h), red (<6h). Calendar uses `/30` tinted variants for backgrounds.
- **MC (menstrual cycle)** — optional `isMc` boolean on `SleepRecord`, visible to all room members, shown as red dot with white outline (visible on any bg color)
- **Overlay form** — same component for add and edit, slides up from bottom with backdrop
- **Toast messages** — centered fixed overlays for `🔄 更新中...` / `✓ 更新完成！`, z-index 60
- **Pull-to-refresh** — touch events on `<main>` scroll container, triggers at 60px, uses SVG circular arrow icon (permanent DOM, opacity-controlled to avoid iOS Safari flicker)
- **Header buttons** — all icon-only: `📅` calendar, `📊` stats, `🔗` share, `⚙️` settings
- **Update mechanism** — version check on mount: if `localStorage` version differs from `APP_VERSION`, shows banner with auto-update timer (4s). Users can click "立即更新" or ✕ to cancel. Settings modal has manual "檢查更新" button.
- **Service Worker** — network-first for pages, cache-first for static assets (`_next/`, images, fonts)
- **Offline** — Firestore persistent cache handles data; SW caches pages; writes queue and sync on reconnect

### Environment Variables
All prefixed `NEXT_PUBLIC_FIREBASE_*`. See `.env.local.example`. Must also be set in Vercel project settings.

### PWA & Icons
- `app/manifest.ts` — PWA manifest (standalone, theme color #6366f1)
- Icons: `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`
- Generated from `public/logo.svg` via `node scripts/generate-icons.mjs` (uses sharp)

## Layout Constraints (Critical)
- **`<body>` uses `h-dvh`** (not `min-h-full`) — required to constrain viewport height. With `min-h-full`, body grows with content and `main`'s `overflow-y-auto` never activates, pushing bottom-fixed buttons off-screen.
- **`min-h-0` on nested flex columns** — every flex child in the chain `<body>` → outer div → `<main>` must have `min-h-0` to override the default `min-height: auto`, which otherwise expands flex items to their content height and defeats `overflow-y-auto`. Pattern: outer div is `flex flex-1 min-h-0 flex-col`, main is `flex-1 min-h-0 overflow-y-auto`.

## iOS Safari Notes
- **Opacity flicker**: Updating opacity on many elements simultaneously (e.g., per-frame touchmove) causes visual flicker. Use single element with `will-change: opacity` and keep it always in DOM.
- **Pull-to-refresh gating**: Check `scrollContainer.scrollTop === 0` before initiating pull gesture, otherwise it interferes with normal scrolling.

## Collaboration Style
- **Discuss before implementing**: Present design/plan with ASCII mockups first, wait for confirmation before writing code. Never assume user intent — ask clarifying questions.
- **UI labels**: User-facing text is Traditional Chinese, but technical labels (e.g., `Version:`, `Last Updated:` in settings) can be English when user requests.

## UI Language
All user-facing text is **Traditional Chinese (台灣)**. Date format: `M/D（星期）`.
