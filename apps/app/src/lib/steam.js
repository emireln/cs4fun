/** Steam community profile URL helpers — only steamcommunity.com allowed */

const STEAM_RE = /^https?:\/\/(www\.)?steamcommunity\.com\//i
const MAX_LEN = 200

/**
 * Normalize and validate a Steam profile URL.
 * @param {unknown} value
 * @returns {{ ok: true, url: string | null } | { ok: false, error: 'steam_invalid' }}
 */
export function sanitizeSteamUrl(value) {
  if (value == null || value === '') return { ok: true, url: null }
  if (typeof value !== 'string') return { ok: false, error: 'steam_invalid' }

  let raw = value.trim()
  if (!raw) return { ok: true, url: null }

  // Allow pasting id/custom without scheme
  if (/^(id|profiles)\//i.test(raw)) {
    raw = `https://steamcommunity.com/${raw}`
  } else if (/^steamcommunity\.com\//i.test(raw)) {
    raw = `https://${raw}`
  } else if (/^www\.steamcommunity\.com\//i.test(raw)) {
    raw = `https://${raw}`
  }

  if (raw.length > MAX_LEN) return { ok: false, error: 'steam_invalid' }
  if (!STEAM_RE.test(raw)) return { ok: false, error: 'steam_invalid' }

  try {
    const u = new URL(raw)
    if (!/^https?:$/i.test(u.protocol)) return { ok: false, error: 'steam_invalid' }
    if (!/^(www\.)?steamcommunity\.com$/i.test(u.hostname)) {
      return { ok: false, error: 'steam_invalid' }
    }
    // Force https
    u.protocol = 'https:'
    u.hash = ''
    const cleaned = u.toString().replace(/\/$/, '') || 'https://steamcommunity.com'
    if (cleaned.length > MAX_LEN) return { ok: false, error: 'steam_invalid' }
    return { ok: true, url: cleaned }
  } catch {
    return { ok: false, error: 'steam_invalid' }
  }
}

export function isSteamUrl(value) {
  return sanitizeSteamUrl(value).ok && Boolean(sanitizeSteamUrl(value).url)
}
