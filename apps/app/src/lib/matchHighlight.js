/** Pick best beat from a live match log for share cards / GameOver. */

const PRIORITY = { ace: 3, clutch: 2, eco: 1, multikill: 1 }

/**
 * @param {Array<{ type?: string, text?: string, flavor?: string }>} logs
 * @param {(key: string) => string} t
 * @returns {string|null}
 */
export function pickMatchHighlight(logs, t) {
  if (!Array.isArray(logs) || !logs.length) return null
  let best = null
  let bestScore = 0
  for (const log of logs) {
    const score = PRIORITY[log?.type] || 0
    if (score > bestScore) {
      bestScore = score
      best = log
    }
  }
  if (!best) return null
  const label =
    best.type === 'ace'
      ? t('live.feedAce')
      : best.type === 'clutch'
        ? t('live.feedClutch')
        : best.type === 'eco'
          ? t('live.feedEco')
          : best.type
  const detail = best.flavor || best.text || ''
  return detail ? `${label} · ${detail}` : label
}
