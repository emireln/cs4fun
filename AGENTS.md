# AGENTS.md — cs4fun

Guidance for AI agents working in this repository.

## What this is

**cs4fun** is a Counter-Strike draft-and-simulate SPA: draft lineups from historical rosters, veto maps, run simulated matches, climb leaderboards, play with friends.

Not affiliated with Valve or HLTV.

## Domains

| Surface | URL | Code |
|---------|-----|------|
| Marketing landing | `https://cs4fun.online` | `apps/web` |
| Player docs | `https://cs4fun.online/docs` | `apps/web` (`DocsPage.jsx`, `docsCopy.js`) |
| Game (web) | `https://app.cs4fun.online` | `apps/app` |
| Windows installer | `https://cs4fun.online/download/` | static files on VPS (not in repo) |
| Support | `https://buymeacoffee.com/emireln` | linked from web + app |
| Feedback email | `contact.cs4fun@gmail.com` | landing “Submit a report” mailto |

Landing env:

```env
VITE_APP_URL=https://app.cs4fun.online
VITE_WINDOWS_DOWNLOAD_URL=https://cs4fun.online/download/cs4fun-Setup.exe
```

## Monorepo layout

```text
apps/app/          Game (React + Vite + Electron desktop)
apps/web/          Landing page (React + Vite)
supabase/          Shared SQL schema (run in Supabase SQL editor)
scripts/           Tooling (e.g. expand-rosters.mjs → apps/app/src/data/rosters.json)
package.json       npm workspaces root
AGENTS.md          This file
README.md          Human-facing docs
```

### Workspaces

- `@cs4fun/app` — game
- `@cs4fun/web` — landing

Root scripts:

```bash
npm run dev:app        # game :5173
npm run dev:web        # landing :5174
npm run build          # web then app
npm run electron:dev   # desktop shell + Vite
npm run electron:build # Windows NSIS installer → apps/app/release/
```

## Stack

- React 19, Vite 8, Tailwind CSS v4 (`@tailwindcss/vite`)
- Framer Motion, Lucide
- Supabase JS (optional — guests work via localStorage)
- Electron + electron-builder (Windows NSIS) for desktop

## Design / UX conventions

- Visual language: carbon background, gold accents (`cs-*` tokens in `index.css`), Orbitron + Rajdhani + IBM Plex Mono
- Landing (`apps/web`): brand-first hero, one CTA group (**Play** + **Windows** + **Support**), modes below the fold — keep it minimal; report/feedback lives in the footer (not the hero)
- Player docs at `/docs` (EN + PT in `docsCopy.js`); keep SPA rewrites so deep links work on static hosts
- Prefer existing `btn-gold` / `btn-ghost` / `panel` / `carbon-bg` / `gold-text` patterns
- i18n: EN + PT-BR (`apps/app/src/i18n`, `apps/web/src/copy.js`, `apps/web/src/docsCopy.js`)

## Responsive / mobile (required)

Layouts must fit **any** viewport (phone → desktop → Electron resize). Do not ship desktop-only widths or horizontal page scroll.

### Viewport & shell

- Both `apps/app/index.html` and `apps/web/index.html` use:
  `width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content`
- Prefer `min-h-dvh` / `100dvh` over `min-h-screen` / `100vh` (mobile browser chrome)
- Clip horizontal overflow on the document shell (`overflow-x-clip` / CSS `overflow-x: clip`)
- Respect safe areas: `env(safe-area-inset-*)` on fixed headers, bottom bars, and modals
- Media (`img` / `svg` / `video` / `canvas`): `max-width: 100%` — already in `index.css`
- Electron window may shrink (`minWidth` ~480); UI must remain usable when resized

### No mobile input zoom (keep scale static)

iOS Safari auto-zooms focused fields when computed `font-size` is under **16px**. That causes the “weird zoom while typing” on auth/profile/search.

- Keep the global mobile rule in `apps/app/src/index.css` and `apps/web/src/index.css` (inputs/textareas/selects ≥ 16px below `sm`)
- Do **not** “fix” zoom with `user-scalable=no` / `maximum-scale=1` (hurts accessibility)
- `touch-action: manipulation` on `html` reduces double-tap zoom delay
- Auth / keyboard modals: allow scroll (`overflow-y-auto`) and prefer bottom-aligned on small screens so the keyboard does not shove the layout off-screen

### Layout habits

- Use fluid containers (`max-w-*` + horizontal padding), not fixed pixel page widths
- Stack / wrap controls on narrow screens (`flex-wrap`, `sm:` breakpoints)
- Test auth, profile, friends search, and room code inputs on a phone-width viewport after UI changes

## Game architecture (`apps/app`)

| Area | Path |
|------|------|
| Shell / routing screens | `src/App.jsx` |
| Home modes hub | `src/components/HomeHub.jsx` |
| Mode runners | `src/components/modes/*` |
| Draft / veto / live / results | `src/components/DraftPlay.jsx`, `MapVetoPlay.jsx`, `MatchLive.jsx`, `GameOver.jsx` |
| Friends hub | `src/components/FriendsHub.jsx` + `src/lib/friends.js` |
| Rooms | `src/lib/rooms.js`, `roomsLocal.js` |
| Auth / profile | `src/lib/auth.jsx`, `profile.js` |
| Avatars | `src/data/avatars.js` (emoji presets) + optional `avatarUrl` photo (`src/lib/avatarImage.js`, `ProfileAvatar.jsx`) |
| Simulation engine | `src/engine/simulation.js` |
| Rosters data | `src/data/rosters.json` |
| Sounds | `src/lib/sound.js` |
| Electron main | `electron/main.cjs` |

### Modes

`major`, `duel`, `party`, `daily`, `gauntlet` — see `src/lib/gameModes.js` and mode components.

### Profile avatars

- Preset emoji via `avatarId` / `profiles.avatar_id`
- Optional device photo via `avatarUrl` / `profiles.avatar_url` (compressed client-side data URL; guests: localStorage; signed-in: profiles row — **not** auth JWT metadata)
- `ProfileAvatar` prefers `avatarUrl` when set; emoji grid clears the photo

### Friends

- Add by nickname/tag; invite to duel/party without sharing room codes (room created under the hood)
- H2H stats via `friend_h2h` / `record_friend_match` (cloud) or localStorage
- Guests: local graph + BroadcastChannel

### Env (`apps/app/.env`)

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Never put `service_role` in the client. Landing uses `VITE_APP_URL` (default `https://app.cs4fun.online`) and `VITE_WINDOWS_DOWNLOAD_URL`.

### Desktop (Windows Electron)

- Main: `apps/app/electron/main.cjs`
- Dev: `npm run electron:dev` (Vite on `:5173` + Electron)
- Build installer: `npm run electron:build` → builds in TEMP then copies `cs4fun-Setup-*.exe` to `apps/app/release/` (avoids Windows EPERM under Downloads)
- Icons: `npm run icons -w @cs4fun/app` → `build/icon.ico` (desktop, bg+rounded), `build/tray.*` (transparent), NSIS BMPs (no text)
- Pin exact `electron` version in `apps/app/package.json` (electron-builder rejects ranges)
- `vite.config.js` uses `base: './'` for `file://` asset loading
- External http(s) links open in the system browser
- If builder fails with `EPERM` renaming under `%LOCALAPPDATA%\electron-builder\Cache`, clear that cache and retry

### Where to host the `.exe` and auto-updates (recommended)

**Do not put the installer in Supabase.** Supabase is the backend (Auth, Postgres, Realtime, RLS). Large binaries + update manifests belong on static HTTP next to the marketing site.

**Best fit for this project:** serve releases from the **same VPS** that hosts `cs4fun.online` (nginx/Caddy static dir), under a stable public path:

```text
https://cs4fun.online/download/
  latest.yml                 # electron-updater generic feed
  cs4fun-Setup-1.0.0.exe
  cs4fun-Setup-1.0.0.exe.blockmap
  cs4fun-Setup.exe           # optional stable alias copied/symlinked for the landing CTA
```

Why this over alternatives:

| Option | Use when |
|--------|----------|
| **VPS `/download/` (generic provider)** | Default — you already host the frontend here; full control; works with `electron-updater` |
| **GitHub Releases** | Fine alternative if the repo is public and you want free CDN + `provider: "github"` |
| **Supabase Storage** | Avoid for installers — size/egress, awkward public URLs, not what electron-updater expects |

Landing CTA should point at a **stable** URL (`VITE_WINDOWS_DOWNLOAD_URL`, default `https://cs4fun.online/download/cs4fun-Setup.exe`). After each `electron:build`, upload the versioned artifacts + `latest.yml` (+ blockmap) to that folder, and refresh the stable alias.

Auto-update wiring (when implementing):

1. Add `electron-updater` in the Electron main process
2. In `apps/app/package.json` `build.publish`: `{ "provider": "generic", "url": "https://cs4fun.online/download" }`
3. On app start (packaged only), call `autoUpdater.checkForUpdatesAndNotify()`
4. Ship `latest.yml` from electron-builder alongside the NSIS exe

Keep `app.cs4fun.online` for the web SPA; keep Supabase for API/data only.

## Backend (`supabase/schema.sql` + `supabase/migrations/`)

Schema is applied automatically on push to `main` via GitHub Actions (`supabase db push`).

- Add new changes as **new files** under `supabase/migrations/` (never edit applied migrations).
- `supabase/schema.sql` is a reference / SQL-editor copy — keep it roughly in sync if you still paste manually.
- Re-run / repair only if CI fails; secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`.

Includes profiles (`avatar_id`, `avatar_url`), rooms, leaderboards, history, badges, friendships, invites, H2H RPCs, RLS.

Auth redirect URL for production: `https://app.cs4fun.online`.

### Admin console

- Privilege: rows in `public.app_admins` (RLS on, **no** client policies — promote only via SQL editor)
- Bans: `profiles.banned_at` / `ban_reason` via `admin_ban_user` / `admin_unban_user` RPCs
- Signed-in admins land in a separate AdminShell (no game hub). Banned players see a banned screen.
- Promote an existing Auth user:

```sql
insert into public.app_admins (user_id, note)
select id, 'bootstrap admin'
from auth.users
where lower(email) = lower('YOUR_ADMIN_EMAIL@example.com')
on conflict (user_id) do nothing;
```

## Agent do / don't

**Do**

- Keep changes scoped; match existing patterns and i18n keys in both locales
- Prefer absolute paths when editing; PowerShell: use `;` not `&&`
- After schema changes, tell the user to re-run `supabase/schema.sql`
- Keep mobile/desktop layouts fluid; preserve the no-input-zoom CSS rules
- Only commit / push / force-git when the user asks

**Don't**

- Add purple/cream generic AI landing aesthetics; stay on CS carbon/gold
- Put secrets in the repo
- Write exploits / attack tooling
- Over-engineer shared packages for tiny CSS duplication between web and app
- Disable pinch-zoom via `user-scalable=no` to “fix” mobile zoom
- Ship fixed-width shells that force horizontal scrolling on phones
- Host Windows installers in Supabase Storage by default

## Quick verify

```bash
npm install
npm run build
npm run electron:build   # Windows only; produces NSIS setup .exe
```

Also spot-check on a ~390px-wide viewport: hub, auth modal typing, profile save, friends search — page scale must stay put while focusing inputs.
