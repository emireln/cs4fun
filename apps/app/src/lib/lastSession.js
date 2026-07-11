/** Persist last played mode so the hub can offer Resume. */

const KEY = 'cs4fun_last_session'

export function readLastSession() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data?.mode) return null
    return data
  } catch {
    return null
  }
}

/**
 * @param {{ mode: string, meta?: Record<string, unknown> }} payload
 */
export function writeLastSession({ mode, meta = {} }) {
  if (!mode) return null
  const next = {
    mode: String(mode),
    at: Date.now(),
    meta: meta && typeof meta === 'object' ? meta : {},
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  return next
}
