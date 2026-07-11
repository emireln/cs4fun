import { getDailyStreak } from './dailyStreak'
import { allWeeklyComplete, getWeeklyChallenges } from './challenges'

const KEY = 'cs4fun_cosmetics_v1'

/** Catalog of unlockable cosmetics (titles, frames, rings). */
export const COSMETIC_DEFS = [
  { id: 'title_rookie', kind: 'title', unlock: 'default', labelKey: 'cosmetics.titleRookie' },
  { id: 'title_streak3', kind: 'title', unlock: 'streak:3', labelKey: 'cosmetics.titleStreak3' },
  { id: 'title_streak7', kind: 'title', unlock: 'streak:7', labelKey: 'cosmetics.titleStreak7' },
  { id: 'title_streak14', kind: 'title', unlock: 'streak:14', labelKey: 'cosmetics.titleStreak14' },
  { id: 'title_weekly', kind: 'title', unlock: 'weekly_complete', labelKey: 'cosmetics.titleWeekly' },
  { id: 'title_gauntlet', kind: 'title', unlock: 'gauntlet:5', labelKey: 'cosmetics.titleGauntlet' },
  { id: 'title_whale', kind: 'title', unlock: 'box_whale', labelKey: 'cosmetics.titleWhale' },
  { id: 'frame_gold', kind: 'frame', unlock: 'streak:7', labelKey: 'cosmetics.frameGold' },
  { id: 'frame_fire', kind: 'frame', unlock: 'streak:14', labelKey: 'cosmetics.frameFire' },
  { id: 'frame_weekly', kind: 'frame', unlock: 'weekly_complete', labelKey: 'cosmetics.frameWeekly' },
  { id: 'ring_ember', kind: 'ring', unlock: 'streak:3', labelKey: 'cosmetics.ringEmber' },
  { id: 'ring_case', kind: 'ring', unlock: 'case_week_win', labelKey: 'cosmetics.ringCase' },
]

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}')
  } catch {
    return {}
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    /* ignore */
  }
}

function emptyCosmetics() {
  return {
    owned: ['title_rookie'],
    equippedTitle: 'title_rookie',
    equippedFrame: null,
    equippedRing: null,
    flags: {},
  }
}

export function getCosmetics(profileId = 'guest') {
  const all = readAll()
  if (!all[profileId]) {
    all[profileId] = emptyCosmetics()
    writeAll(all)
  }
  return all[profileId]
}

export function unlockCosmetic(profileId, cosmeticId) {
  const all = readAll()
  const state = all[profileId] || emptyCosmetics()
  if (!state.owned.includes(cosmeticId)) {
    state.owned = [...state.owned, cosmeticId]
  }
  all[profileId] = state
  writeAll(all)
  return state
}

export function equipCosmetic(profileId, cosmeticId) {
  const def = COSMETIC_DEFS.find((c) => c.id === cosmeticId)
  if (!def) return getCosmetics(profileId)
  const all = readAll()
  const state = all[profileId] || emptyCosmetics()
  if (!state.owned.includes(cosmeticId) && def.unlock !== 'default') {
    return state
  }
  if (def.kind === 'title') state.equippedTitle = cosmeticId
  if (def.kind === 'frame') state.equippedFrame = cosmeticId
  if (def.kind === 'ring') state.equippedRing = cosmeticId
  all[profileId] = state
  writeAll(all)
  return state
}

export function equippedTitleLabel(profileId, t) {
  const cos = getCosmetics(profileId)
  const def = COSMETIC_DEFS.find((c) => c.id === cos.equippedTitle)
  if (!def) return null
  return t(def.labelKey)
}

/** Up to two strings: equipped title + streak day badge (e.g. "Week Warrior · 12d"). */
export function titleLoadout(profileId, t) {
  const parts = []
  const title = equippedTitleLabel(profileId, t)
  if (title) parts.push(title)
  const streak = getDailyStreak(profileId || 'guest')
  if (streak.currentStreak >= 3) parts.push(`${streak.currentStreak}d`)
  return parts.slice(0, 2).join(' · ') || null
}

/** Recompute unlocks from streak / challenges / flags. */
export function syncCosmeticUnlocks(profileId) {
  const id = profileId || 'guest'
  const streak = getDailyStreak(id)
  const challenges = getWeeklyChallenges(id)
  let state = getCosmetics(id)

  const grant = (cid) => {
    state = unlockCosmetic(id, cid)
  }

  if (streak.currentStreak >= 3) grant('title_streak3')
  if (streak.currentStreak >= 3) grant('ring_ember')
  if (streak.currentStreak >= 7) {
    grant('title_streak7')
    grant('frame_gold')
  }
  if (streak.currentStreak >= 14) {
    grant('title_streak14')
    grant('frame_fire')
  }
  if (allWeeklyComplete(challenges)) {
    grant('title_weekly')
    grant('frame_weekly')
  }
  if (state.flags?.gauntlet5) grant('title_gauntlet')
  if (state.flags?.boxWhale) grant('title_whale')
  if (state.flags?.caseWeekWin) grant('ring_case')

  return getCosmetics(id)
}

export function setCosmeticFlag(profileId, flag, value = true) {
  const all = readAll()
  const state = all[profileId] || emptyCosmetics()
  state.flags = { ...state.flags, [flag]: value }
  all[profileId] = state
  writeAll(all)
  return syncCosmeticUnlocks(profileId)
}

export function nextStreakUnlock(profileId) {
  const streak = getDailyStreak(profileId).currentStreak || 0
  const milestones = [
    { day: 3, ids: ['title_streak3', 'ring_ember'] },
    { day: 7, ids: ['title_streak7', 'frame_gold'] },
    { day: 14, ids: ['title_streak14', 'frame_fire'] },
  ]
  return milestones.find((m) => streak < m.day) || null
}
