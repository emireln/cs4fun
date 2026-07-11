# CS4FUN

Addictive Counter-Strike draft arena — play solo or with friends.

| Site | URL | Package |
|------|-----|---------|
| Landing | [cs4fun.online](https://cs4fun.online) | `@cs4fun/web` |
| Docs | [cs4fun.online/docs](https://cs4fun.online/docs) | `@cs4fun/web` |
| Game | [app.cs4fun.online](https://app.cs4fun.online) | `@cs4fun/app` |
| Windows setup | [cs4fun.online/download/cs4fun-Setup.exe](https://cs4fun.online/download/cs4fun-Setup.exe) | static on VPS |

## Repo layout

```text
apps/app   → game (Vite + React)
apps/web   → marketing landing
supabase/  → shared schema
scripts/   → roster tooling
```

## Develop

```bash
npm install
npm run dev:app    # game → http://localhost:5173
npm run dev:web    # landing → http://localhost:5174
```

`npm run dev` starts the game by default.

### Env

- Game: copy [`apps/app/.env.example`](apps/app/.env.example) → `apps/app/.env` (Supabase optional).
- Landing: copy [`apps/web/.env.example`](apps/web/.env.example) → `apps/web/.env` if you need a non-prod Play URL (`VITE_APP_URL`) or Windows download URL (`VITE_WINDOWS_DOWNLOAD_URL`).

## Build

```bash
npm run build        # web + app
npm run build:web
npm run build:app
```

Outputs: `apps/web/dist`, `apps/app/dist`.

## Desktop (Windows)

Build a NSIS setup `.exe` that wraps the game:

```bash
npm run electron:dev     # Vite + Electron window
npm run electron:build   # → apps/app/release/cs4fun-Setup-1.0.0.exe
```

Requires Windows (x64). Icon: `apps/app/build/icon.png`.

The build runs packaging in `%TEMP%` then copies the setup into `apps/app/release/` (avoids Windows file locks under Downloads).

If `electron-builder` hits `EPERM` while unpacking tools under `%LOCALAPPDATA%\electron-builder\Cache`, clear that cache folder and retry (antivirus sometimes locks extracts).

### Hosting the installer & auto-updates

Serve the NSIS artifacts from the **landing VPS** (not Supabase):

```text
https://cs4fun.online/download/
  latest.yml
  cs4fun-Setup-<version>.exe
  cs4fun-Setup-<version>.exe.blockmap
  cs4fun-Setup.exe          # stable alias for the landing CTA
```

Landing buttons use `VITE_WINDOWS_DOWNLOAD_URL` (default `https://cs4fun.online/download/cs4fun-Setup.exe`). For in-app updates later, point electron-builder `publish` at that same generic URL and wire `electron-updater` in the Electron main process. See `AGENTS.md` for the full recommendation.

## Deploy

Production deploys automatically on every push to `main` via GitHub Actions → this VPS (nginx).

| Host | Path on VPS |
|------|-------------|
| `cs4fun.online` (+ `www`) | `/var/www/cs4fun/web` |
| `app.cs4fun.online` | `/var/www/cs4fun/app` |
| `cs4fun.online/download/` | `/var/www/cs4fun/download` (Windows setup) |

Ops details (secrets, DNS, bootstrap): [`deploy/README.md`](deploy/README.md).

In Supabase Auth, add redirect URL `https://app.cs4fun.online` (and local `http://localhost:5173` for dev).

## Player docs

User-facing documentation lives on the landing site at **`/docs`** (EN + PT-BR):

- What CS4FUN is
- Core loop (draft → veto → simulation → score)
- All six modes
- Friends / multiplayer / H2H / Box vault compare
- Account, ranks, sounds, desktop app
- Quick tips

Source: [`apps/web/src/docsCopy.js`](apps/web/src/docsCopy.js) + [`apps/web/src/DocsPage.jsx`](apps/web/src/DocsPage.jsx). SPA fallbacks: `public/_redirects`, `vercel.json`.

## Game modes

| Mode | What it is |
|------|------------|
| **Major Run** | Draft a dream five, win an 8-team MD3 bracket |
| **1v1 Duel** | Shared rolls vs CPU or a friend — BO3 showmatch |
| **Party Race** | Same scouts for the whole room — highest team power wins |
| **Box Battle** | Queue up to 10 real CS cases; highest vault value wins |
| **Daily Challenge** | Global UTC seed, pick timer, worldwide leaderboard |
| **Career** | Signed-in org sim: contracts, camps, Major (replaces Gauntlet) |

## Friends

Add friends by tag and invite them to a duel, party, or Box Battle — no room code required. Code lobby still available. Friend cards compare career best Box drops.

Without Supabase, rooms sync on the same browser/device via `localStorage` + `BroadcastChannel`. With Supabase, rooms, friends, and leaderboards go global.

## i18n

English and Portuguese (PT-BR) on both landing (including `/docs`) and game.

## Security (Supabase)

- Browser only gets the **anon** key (public by design). Never use `service_role` in Vite.
- Writes go through RPCs: `submit_game_result`, `create_room`, `update_room_payload`, `record_friend_match`, etc.
- RLS: leaderboard/history are **not** directly writable from the client.
- Scores are clamped server-side; badges awarded in the database.

Re-run `supabase/schema.sql` after pulling, enable Email auth, then restart the app.

## Stack

React · Vite · Tailwind CSS v4 · Framer Motion · Lucide · Supabase (optional)

Not affiliated with Valve or HLTV.
