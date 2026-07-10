# Deploy / VPS ops

## Day-to-day

Push to `main` → GitHub Actions builds and deploys:

- Landing → `/var/www/cs4fun/web` (`https://cs4fun.online`)
- Game → `/var/www/cs4fun/app` (`https://app.cs4fun.online`)
- Windows installer → `/var/www/cs4fun/download/cs4fun-Setup.exe`
- Supabase → `supabase db push` (migrations in `supabase/migrations/`)

Installer version auto-bumps on each Deploy (`apps/app/package.json`):
`1.0.0 → 1.0.1 → … → 1.0.9 → 1.1.0 → …` (patch rolls at 10). Commits use `[skip ci]` so they don’t re-trigger the workflow.

Manual run: Actions → **Deploy** → **Run workflow**.

## GitHub secrets (required)

Repo → **Settings → Secrets and variables → Actions**:

| Secret | Example |
|--------|---------|
| `VPS_HOST` | `108.174.149.181` |
| `VPS_PORT` | `22022` |
| `VPS_USER` | `cs4fun` |
| `VPS_SSH_KEY` | OpenSSH private key for the deploy user (entire PEM, including `BEGIN`/`END` lines) |
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | anon/public key |
| `SUPABASE_PROJECT_REF` | Project ref (subdomain of `*.supabase.co`) — already set for this repo |
| `SUPABASE_ACCESS_TOKEN` | [Account → Access Tokens](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_DB_PASSWORD` | Database password (Project Settings → Database) |

`VITE_SUPABASE_*` may be empty strings if you want guest-only builds; prefer real production values.

### Supabase schema automation

On every push to `main`, the **Apply Supabase migrations** job runs `supabase db push` against production.

- Versioned SQL: [`supabase/migrations/`](../supabase/migrations/)
- Reference / SQL-editor copy: [`supabase/schema.sql`](../supabase/schema.sql)
- **Do not edit old migrations.** Add a new file like `supabase/migrations/20260711120000_add_thing.sql` for changes.
- One-time dashboard setup still manual: Email auth + redirect `https://app.cs4fun.online`
- Admin promote SQL stays manual (`insert into app_admins …`)

## DNS (required for HTTPS)

| Type | Name | Value |
|------|------|--------|
| A | `@` | `108.174.149.181` |
| A | `www` | `108.174.149.181` |
| A | `app` | `108.174.149.181` |

## Bootstrap / re-bootstrap VPS

As root on the VPS (from this repo):

```bash
# copy deploy/nginx/cs4fun.conf → /tmp/cs4fun.conf
# copy deploy/vps-bootstrap.sh → /tmp/vps-bootstrap.sh
chmod +x /tmp/vps-bootstrap.sh
CS4FUN_DEPLOY_PUBKEY='ssh-ed25519 AAAA... github-actions-cs4fun-deploy' \
  NGINX_SRC=/tmp/cs4fun.conf \
  bash /tmp/vps-bootstrap.sh
```

If DNS is not ready yet:

```bash
SKIP_CERTBOT=1 ... bash /tmp/vps-bootstrap.sh
```

Then after DNS propagates:

```bash
certbot --nginx -d cs4fun.online -d www.cs4fun.online -d app.cs4fun.online \
  --non-interactive --agree-tos --redirect -m contact.cs4fun@gmail.com
```

## Layout on the VPS

```text
/var/www/cs4fun/web       landing SPA
/var/www/cs4fun/app       game SPA
/var/www/cs4fun/download  Windows setup + versioned exes
/etc/nginx/sites-available/cs4fun.conf
```

Deploy user `cs4fun` can `sudo nginx -t` and `sudo systemctl reload nginx` only.
