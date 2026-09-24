# AGENTS.md — StopDoomscrolling Chrome Extension

## Product

Chrome extension (Manifest V3) that limits TikTok/Instagram doomscrolling. See PRD.md for full spec.

## Tech Stack

- **Language**: TypeScript
- **UI Framework**: Vue 3 (Composition API)
- **Build Tool**: Vite + vite-plugin-web-extension
- **Starter**: vitesse-webext (pre-configured Vue 3, Vite, TypeScript, HMR, Manifest V3)
- **CSS**: Tailwind CSS
- **Icons**: Lucide Vue
- **State Management**: Pinia (Popup & Options UI)
- **Storage**: `chrome.storage.local` (no server)
- **Messaging**: webext-bridge (background ↔ content ↔ popup)
- **Package Manager**: pnpm

## Development Commands

```bash
pnpm install        # Install dependencies
pnpm dev            # Dev with HMR (load extension/ as unpacked in Chrome)
pnpm build          # Production build
pnpm build:firefox  # Firefox build
```

HMR notes:
- **Popup / Options**: instant HMR via Vite dev server at `localhost:3303`
- **Background / Content Scripts**: require manual Chrome extension reload after each change (use Extensions Reloader extension)

Load `extension/` folder as unpacked extension in Chrome during development.

## Architecture

### Extension Components

| Context | Source Entry | Responsibility |
|---|---|---|
| **Service Worker** | `src/background/main.ts` | Timer, alarms, enforcement (tab close), reset logic |
| **Content Script** | `src/contentScripts/index.ts` | Scroll detection, warning banner UI (Shadow DOM) |
| **Popup** | `src/popup/Popup.vue` | Session status, time remaining, override button |
| **Options** | `src/options/Options.vue` | Per-site limits, strict mode toggle |

### Chrome APIs Used

- `chrome.alarms` — accurate persistent 1-second tick in background
- `chrome.tabs` — detect active tab, `chrome.tabs.remove()` to close at limit
- `chrome.storage.local` — all state, no server
- `chrome.notifications` — warning notification before limit

### Directory Structure (vitesse-webext)

```
src/
├── background/
│   └── main.ts            # Service worker entry
├── contentScripts/
│   ├── index.ts           # Entry point — mounts Vue into Shadow DOM
│   └── views/
│       ├── App.vue
│       └── WarningBanner.vue
├── popup/
│   ├── index.html
│   ├── main.ts
│   └── Popup.vue
├── options/
│   ├── index.html
│   ├── main.ts
│   └── Options.vue
├── stores/
│   └── session.ts         # Pinia store synced with chrome.storage.local
├── logic/
│   ├── common-setup.ts    # setupApp(): installs Pinia on all Vue contexts
│   └── storage.ts         # Typed chrome.storage.local helpers
├── composables/
│   └── useSiteTimer.ts
├── manifest.ts            # TypeScript manifest definition (DO NOT edit extension/manifest.json directly)
└── shim.d.ts              # webext-bridge typed message protocol
```

> `extension/manifest.json` is **generated** from `src/manifest.ts` at build/dev time. Never edit it manually.

### Vite Config Files

- `vite.config.mts` — popup, options (multi-page, full HMR)
- `vite.config.background.mts` — service worker (lib/iife mode)
- `vite.config.content.mts` — content script (lib/iife mode, `cssCodeSplit: false`)

## State Schema (`chrome.storage.local`)

```typescript
interface StorageSchema {
  tiktokSessionTime: number        // ms of active time this session
  instagramSessionTime: number
  tiktokOverrideUsed: boolean
  instagramOverrideUsed: boolean
  tiktokLimit: number              // ms; default 30*60*1000, max 120*60*1000
  instagramLimit: number
  strictMode: boolean
  lastResetDate: string            // 'YYYY-MM-DD' local date string
  enabledSites: ('tiktok' | 'instagram')[]
}
```

## Message Types (`shim.d.ts`)

```typescript
declare module 'webext-bridge' {
  export interface ProtocolMap {
    'session-update': { site: 'tiktok' | 'instagram'; delta: number }
    'warning-show': { site: 'tiktok' | 'instagram'; remaining: number }
    'limit-reached': { site: 'tiktok' | 'instagram' }
    'override-activate': { site: 'tiktok' | 'instagram' }
    'state-sync': StorageSchema
  }
}
```

## Critical Product Rules

These are easy to get wrong:

- **Per-site independence**: TikTok and Instagram have separate timers, limits, and overrides. Using TikTok's override does NOT consume Instagram's.
- **Warning timing**: Show warning 5 minutes BEFORE the configured limit (e.g., at 25 min for a 30-min limit), not at the limit.
- **Override rules**: One 15-minute override per site per calendar day. Override state persists across browser restarts.
- **Reset timing**: Compare `lastResetDate` to `new Date().toLocaleDateString()` — it is a calendar day change, NOT a 24-hour rolling window.
- **Strict Mode**: Disables the override entirely. Limit is still enforced.
- **Max custom limit**: 2 hours (120 minutes). Hard ceiling — enforce in settings input.
- **Tab closure**: Use `chrome.tabs.remove(tabId)`. Do NOT just navigate or hide.
- **Multiple tabs**: If multiple TikTok/Instagram tabs are open, track them all and close all when limit is reached.
- **Fallback**: If scroll detection breaks due to DOM changes, fall back to active-time tracking silently.

## Manifest Permissions (minimal)

```json
["tabs", "storage", "alarms", "notifications", "activeTab"]
```

Content script matches: `*://*.tiktok.com/*` and `*://*.instagram.com/*` only (not `<all_urls>`).

## Sites

MVP: TikTok, Instagram. Architecture should allow adding more (YouTube Shorts, Facebook Reels, etc.) by adding entries to `enabledSites` and corresponding content script matches.

## Privacy

Store locally. No server. No unrelated browsing data collected.
