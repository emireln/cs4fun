#!/usr/bin/env bash
# One-time (or re-runnable) VPS bootstrap for cs4fun.
# Usage (as root):
#   CS4FUN_DEPLOY_PUBKEY='ssh-ed25519 AAAA... comment' bash deploy/vps-bootstrap.sh
# Optional:
#   SKIP_CERTBOT=1  — skip Let's Encrypt (use when DNS is not ready)

set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root" >&2
  exit 1
fi

DEPLOY_USER="${DEPLOY_USER:-cs4fun}"
WEB_ROOT="/var/www/cs4fun"
NGINX_SRC="${NGINX_SRC:-}"
PUBKEY="${CS4FUN_DEPLOY_PUBKEY:-}"

echo "==> Stopping / disabling arenapp services (if present)"
for svc in arenapp-backend arenapp-admin arenapp-crm arenapp-backend-staging; do
  systemctl stop "${svc}.service" 2>/dev/null || true
  systemctl disable "${svc}.service" 2>/dev/null || true
done

echo "==> Disabling arenapp nginx sites (keeping files in sites-available)"
mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
for link in /etc/nginx/sites-enabled/*; do
  [[ -e "$link" || -L "$link" ]] || continue
  base="$(basename "$link")"
  case "$base" in
    arenapp*|admin.arenapp*|crm.arenapp*|default) rm -f "$link" ;;
  esac
done

echo "==> Ensuring deploy user: ${DEPLOY_USER}"
if ! id -u "${DEPLOY_USER}" >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash "${DEPLOY_USER}"
fi
install -d -m 700 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh"
AUTH_KEYS="/home/${DEPLOY_USER}/.ssh/authorized_keys"
touch "${AUTH_KEYS}"
chown "${DEPLOY_USER}:${DEPLOY_USER}" "${AUTH_KEYS}"
chmod 600 "${AUTH_KEYS}"

if [[ -n "${PUBKEY}" ]]; then
  if ! grep -qxF "${PUBKEY}" "${AUTH_KEYS}"; then
    echo "${PUBKEY}" >> "${AUTH_KEYS}"
  fi
  echo "Deploy pubkey installed for ${DEPLOY_USER}"
else
  echo "WARN: CS4FUN_DEPLOY_PUBKEY not set — add GitHub Actions pubkey to ${AUTH_KEYS}" >&2
fi

echo "==> Creating web roots under ${WEB_ROOT}"
install -d -m 755 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" \
  "${WEB_ROOT}/web" \
  "${WEB_ROOT}/app" \
  "${WEB_ROOT}/download"

# Placeholder index so nginx can start before first deploy
if [[ ! -f "${WEB_ROOT}/web/index.html" ]]; then
  cat > "${WEB_ROOT}/web/index.html" <<'HTML'
<!doctype html><html><head><meta charset="utf-8"><title>cs4fun</title></head>
<body style="font-family:system-ui;background:#0b0b0b;color:#e8c547;padding:2rem">
<h1>cs4fun</h1><p>Deploy pending…</p></body></html>
HTML
  chown "${DEPLOY_USER}:${DEPLOY_USER}" "${WEB_ROOT}/web/index.html"
fi
if [[ ! -f "${WEB_ROOT}/app/index.html" ]]; then
  cat > "${WEB_ROOT}/app/index.html" <<'HTML'
<!doctype html><html><head><meta charset="utf-8"><title>cs4fun app</title></head>
<body style="font-family:system-ui;background:#0b0b0b;color:#e8c547;padding:2rem">
<h1>cs4fun app</h1><p>Deploy pending…</p></body></html>
HTML
  chown "${DEPLOY_USER}:${DEPLOY_USER}" "${WEB_ROOT}/app/index.html"
fi

echo "==> Installing nginx site"
CONF_DST="/etc/nginx/sites-available/cs4fun.conf"
if [[ -n "${NGINX_SRC}" && -f "${NGINX_SRC}" ]]; then
  cp "${NGINX_SRC}" "${CONF_DST}"
elif [[ -f /tmp/cs4fun.conf ]]; then
  cp /tmp/cs4fun.conf "${CONF_DST}"
else
  echo "ERROR: provide NGINX_SRC=path or place config at /tmp/cs4fun.conf" >&2
  exit 1
fi
ln -sfn "${CONF_DST}" /etc/nginx/sites-enabled/cs4fun.conf

# Allow deploy user to write under web root (already owner)
# Optional: passwordless nginx reload for future use
SUDOERS_FILE="/etc/sudoers.d/cs4fun-deploy"
cat > "${SUDOERS_FILE}" <<EOF
${DEPLOY_USER} ALL=(root) NOPASSWD: /usr/sbin/nginx -t, /bin/systemctl reload nginx
EOF
chmod 440 "${SUDOERS_FILE}"

nginx -t
systemctl reload nginx

if [[ "${SKIP_CERTBOT:-0}" == "1" ]]; then
  echo "==> SKIP_CERTBOT=1 — HTTP only for now"
  echo "Later run:"
  echo "  certbot --nginx -d cs4fun.online -d www.cs4fun.online -d app.cs4fun.online --non-interactive --agree-tos --redirect -m contact.cs4fun@gmail.com"
  exit 0
fi

echo "==> Requesting Let's Encrypt certificates"
if command -v certbot >/dev/null 2>&1; then
  if dig +short cs4fun.online A | grep -q . && dig +short app.cs4fun.online A | grep -q .; then
    certbot --nginx \
      -d cs4fun.online -d www.cs4fun.online -d app.cs4fun.online \
      --non-interactive --agree-tos --redirect \
      -m contact.cs4fun@gmail.com \
      || echo "WARN: certbot failed — check DNS and re-run later" >&2
  else
    echo "WARN: DNS for cs4fun.online / app.cs4fun.online not resolving yet — skip certbot"
    echo "Re-run with DNS ready, or:"
    echo "  certbot --nginx -d cs4fun.online -d www.cs4fun.online -d app.cs4fun.online --non-interactive --agree-tos --redirect -m contact.cs4fun@gmail.com"
  fi
else
  echo "WARN: certbot not installed"
fi

echo "==> Bootstrap complete"
nginx -t
systemctl reload nginx
echo "Roots: ${WEB_ROOT}/{web,app,download}"
echo "Deploy user: ${DEPLOY_USER}"
