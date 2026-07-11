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
  return map[mode] || mode || 'CS4FUN'
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

  const lines = [`CS4FUN — ${modeLabel(mode, locale)} · ${result}`]

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

/**
 * Share profile text — optional public stats (respects visibility sections).
 */
export function buildProfileShareText({
  userId,
  nickname,
  locale,
  profilePublic = true,
  sections,
  wins,
  games,
  careerMajorsWon,
  careerBestSeason,
  careerSeasons,
  boxWins,
} = {}) {
  const pt = isPt(locale)
  const tag = (nickname || (pt ? 'Jogador' : 'Player')).trim() || (pt ? 'Jogador' : 'Player')
  const url = buildProfileShareUrl({ userId, nickname: tag })
  const lines = [`CS4FUN · @${tag}`]

  if (profilePublic !== false) {
    const sec = sections || {}
    const bits = []
    if (sec.stats !== false) {
      if (wins != null) bits.push(pt ? `${wins}V` : `${wins}W`)
      if (games != null) bits.push(pt ? `${games}J` : `${games}G`)
    }
    if (sec.career !== false) {
      if (careerMajorsWon != null && careerMajorsWon > 0) {
        bits.push(pt ? `${careerMajorsWon} majors carreira` : `${careerMajorsWon} career majors`)
      }
      if (careerBestSeason != null && careerBestSeason > 0) {
        bits.push(pt ? `melhor season ${careerBestSeason}` : `best season ${careerBestSeason}`)
      }
      if (careerSeasons != null && careerSeasons > 0) {
        bits.push(pt ? `${careerSeasons} seasons` : `${careerSeasons} seasons`)
      }
    }
    if (sec.box !== false && boxWins != null && boxWins > 0) {
      bits.push(pt ? `${boxWins} box` : `${boxWins} box`)
    }
    if (bits.length) lines.push(bits.join(' · '))
  }

  lines.push(url)
  return lines.join('\n')
}

export async function sharePlainText({ title = 'CS4FUN', text, url }) {
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
