/**
 * Simple share copy for WhatsApp / clipboard paste.
 */

const APP_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_URL) ||
  (typeof window !== 'undefined' && window.location?.origin) ||
  'https://app.cs4fun.online'

function isPt(locale) {
  return String(locale || '').toLowerCase().startsWith('pt')
}

function modeLabel(mode, locale) {
  const pt = isPt(locale)
  const map = {
    major: 'Major',
    duel: pt ? '1v1' : '1v1',
    party: 'Party',
    daily: pt ? 'Diário' : 'Daily',
    gauntlet: 'Gauntlet',
  }
  return map[mode] || mode || 'cs4fun'
}

function appOrigin() {
  return String(APP_URL || 'https://app.cs4fun.online').replace(/\/$/, '')
}

export function buildResultShareText({
  mode,
  won,
  score,
  wins,
  losses,
  streak,
  nickname,
  mapPriority,
  locale,
}) {
  const pt = isPt(locale)
  const tag = (nickname || (pt ? 'Jogador' : 'Player')).trim() || (pt ? 'Jogador' : 'Player')
  const result = won ? (pt ? 'Vitória' : 'Win') : pt ? 'Derrota' : 'Loss'

  const lines = [`cs4fun — ${modeLabel(mode, locale)} · ${result}`]

  const bits = []
  if (score != null) bits.push(`${score}`)
  if (wins != null || losses != null) bits.push(pt ? `${wins ?? 0}V-${losses ?? 0}D` : `${wins ?? 0}W-${losses ?? 0}L`)
  if (streak != null && streak !== '') bits.push(pt ? `sequência ${streak}` : `streak ${streak}`)
  if (mapPriority) bits.push(mapPriority)
  if (bits.length) lines.push(bits.join(' · '))

  lines.push(`@${tag}`)
  lines.push(appOrigin())

  return lines.join('\n')
}

/** Deep link to a player profile (`/?p=<id>`). */
export function buildProfileShareUrl({ userId, nickname } = {}) {
  const base = appOrigin()
  if (userId) return `${base}/?p=${encodeURIComponent(userId)}`
  if (nickname) return `${base}/?tag=${encodeURIComponent(String(nickname).trim())}`
  return base
}

/** Share profile as a link only (no stats dump). */
export function buildProfileShareText({ userId, nickname } = {}) {
  return buildProfileShareUrl({ userId, nickname })
}

export async function sharePlainText({ title = 'cs4fun', text, url }) {
  const payload = text || url
  if (!payload) return { ok: false }

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const data = { title }
      if (url && !text) data.url = url
      else data.text = payload
      await navigator.share(data)
      return { ok: true, method: 'native' }
    } catch (err) {
      if (err?.name === 'AbortError') return { ok: false, aborted: true }
    }
  }

  try {
    await navigator.clipboard.writeText(payload)
    return { ok: true, method: 'clipboard' }
  } catch {
    return { ok: false, text: payload }
  }
}

export { APP_URL }
