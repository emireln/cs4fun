import { utcDayKey } from './leaderboard'

const KEY = (id) => `cs4fun_daily_streak_${id || 'guest'}`

function empty() {
  return {
    lastDayKey: null,
    currentStreak: 0,
    bestStreak: 0,
    playedToday: false,
    wonToday: false,
  }
}

export function getDailyStreak(profileId) {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY(profileId)) || '{}')
    const data = { ...empty(), ...raw }
    const today = utcDayKey()
    if (data.lastDayKey && data.lastDayKey !== today) {
      data.playedToday = false
      data.wonToday = false
      // streak breaks if they skipped a day (not yesterday)
      const yesterday = prevUtcDayKey(today)
      if (data.lastDayKey !== yesterday && data.lastDayKey !== today) {
        data.currentStreak = 0
      }
    }
    return data
  } catch {
    return empty()
  }
}

function prevUtcDayKey(dayKey) {
  const [y, m, d] = dayKey.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() - 1)
  return dt.toISOString().slice(0, 10)
}

export function recordDailyPlay(profileId, { won = false, dayKey = utcDayKey() } = {}) {
  const prev = getDailyStreak(profileId)
  const yesterday = prevUtcDayKey(dayKey)

  let currentStreak = prev.currentStreak
  if (prev.playedToday && prev.lastDayKey === dayKey) {
    // already played today — keep streak, update win flag
  } else if (prev.lastDayKey === yesterday) {
    currentStreak = (prev.currentStreak || 0) + 1
  } else if (prev.lastDayKey === dayKey) {
    currentStreak = prev.currentStreak || 1
  } else {
    currentStreak = 1
  }

  const next = {
    lastDayKey: dayKey,
    currentStreak,
    bestStreak: Math.max(prev.bestStreak || 0, currentStreak),
    playedToday: true,
    wonToday: Boolean(won || (prev.wonToday && prev.lastDayKey === dayKey)),
  }

  try {
    localStorage.setItem(KEY(profileId), JSON.stringify(next))
  } catch {
    /* ignore */
  }
  return next
}
