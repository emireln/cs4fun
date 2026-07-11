import { hashString, mulberry32 } from './seed'
import { utcDayKey } from './leaderboard'

const CHALLENGE_KEY = 'cs4fun_challenges_v1'

/** ISO-like UTC week key: 2026-W28 */
export function utcWeekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

/** Soft season blocks of ~6 weeks: 2026-S3 */
export function utcSeasonKey(d = new Date()) {
  const week = utcWeekKey(d)
  const [, w] = week.split('-W')
  const n = Number(w) || 1
  const season = Math.max(1, Math.ceil(n / 6))
  return `${week.slice(0, 4)}-S${season}`
}

const POOL = [
  { id: 'play_3', tier: 'easy', target: 3, event: 'game_played', labelKey: 'challenges.play3' },
  { id: 'open_5', tier: 'easy', target: 5, event: 'cases_opened', labelKey: 'challenges.open5' },
  { id: 'win_daily', tier: 'medium', target: 1, event: 'daily_win', labelKey: 'challenges.winDaily' },
  { id: 'win_duel', tier: 'medium', target: 1, event: 'duel_win', labelKey: 'challenges.winDuel' },
  { id: 'win_box', tier: 'medium', target: 1, event: 'box_win', labelKey: 'challenges.winBox' },
  { id: 'gauntlet_5', tier: 'spicy', target: 5, event: 'gauntlet_streak', labelKey: 'challenges.gauntlet5' },
  { id: 'box_covert', tier: 'spicy', target: 1, event: 'box_covert', labelKey: 'challenges.boxCovert' },
  { id: 'career_major', tier: 'spicy', target: 1, event: 'career_major_final', labelKey: 'challenges.careerMajor' },
  { id: 'friend_2', tier: 'medium', target: 2, event: 'friend_match', labelKey: 'challenges.friend2' },
]

function pickWeeklyTrio(weekKey) {
  const rng = mulberry32(hashString(`challenges:${weekKey}`))
  const byTier = {
    easy: POOL.filter((c) => c.tier === 'easy'),
    medium: POOL.filter((c) => c.tier === 'medium'),
    spicy: POOL.filter((c) => c.tier === 'spicy'),
  }
  const pick = (arr) => arr[Math.floor(rng() * arr.length)]
  return [pick(byTier.easy), pick(byTier.medium), pick(byTier.spicy)].filter(Boolean)
}

function emptyState(weekKey) {
  return {
    weekKey,
    dayKey: utcDayKey(),
    dailyQuest: null,
    challenges: pickWeeklyTrio(weekKey).map((c) => ({
      ...c,
      progress: 0,
      completedAt: null,
    })),
  }
}

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(CHALLENGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(CHALLENGE_KEY, JSON.stringify(data))
  } catch {
    /* ignore */
  }
}

function dailyQuestForDay(dayKey) {
  const rng = mulberry32(hashString(`dailyq:${dayKey}`))
  const pool = POOL.filter((c) => c.tier !== 'spicy')
  const c = pool[Math.floor(rng() * pool.length)]
  return { ...c, id: `daily_${c.id}`, progress: 0, completedAt: null, kind: 'daily' }
}

export function getWeeklyChallenges(profileId = 'guest') {
  const weekKey = utcWeekKey()
  const dayKey = utcDayKey()
  const all = readAll()
  let state = all[profileId]
  if (!state || state.weekKey !== weekKey) {
    state = emptyState(weekKey)
  }
  if (!state.dailyQuest || state.dayKey !== dayKey) {
    state = { ...state, dayKey, dailyQuest: dailyQuestForDay(dayKey) }
  }
  all[profileId] = state
  writeAll(all)
  return state
}

function applyEventToChallenge(ch, event) {
  if (ch.completedAt) return ch
  let add = 0
  if (ch.event === event.type) {
    add = Number(event.amount) || 1
  }
  if (ch.event === 'gauntlet_streak' && event.type === 'gauntlet_streak') {
    const next = Math.max(ch.progress, Number(event.amount) || 0)
    const done = next >= ch.target
    return { ...ch, progress: next, completedAt: done ? Date.now() : null }
  }
  if (!add) return ch
  const progress = Math.min(ch.target, ch.progress + add)
  return {
    ...ch,
    progress,
    completedAt: progress >= ch.target ? Date.now() : null,
  }
}

/**
 * Record an engagement event for challenges.
 * @param {string} profileId
 * @param {{ type: string, amount?: number, mode?: string, won?: boolean, meta?: object }} event
 */
export function emitEngagementEvent(profileId, event) {
  if (!event?.type) return getWeeklyChallenges(profileId)
  const id = profileId || 'guest'
  const state = getWeeklyChallenges(id)
  const challenges = state.challenges.map((c) => applyEventToChallenge(c, event))
  const dailyQuest = state.dailyQuest
    ? applyEventToChallenge(state.dailyQuest, event)
    : null
  const next = { ...state, challenges, dailyQuest }
  const all = readAll()
  all[id] = next
  writeAll(all)

  // Side-effect cosmetics / badges handled by callers via return
  try {
    window.dispatchEvent(new CustomEvent('cs4fun:engagement', { detail: { profileId: id, event } }))
  } catch {
    /* ignore */
  }
  return next
}

export function weeklyCompletedCount(state) {
  return (state?.challenges || []).filter((c) => c.completedAt).length
}

export function allWeeklyComplete(state) {
  const list = state?.challenges || []
  return list.length > 0 && list.every((c) => c.completedAt)
}
