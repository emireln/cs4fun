import { isSupabaseConfigured, supabase } from './supabase'
import { utcDayKey } from './leaderboard'
import { allWeeklyComplete, emitEngagementEvent, getWeeklyChallenges } from './challenges'
import { setCosmeticFlag, syncCosmeticUnlocks } from './cosmetics'
import { getDailyStreak } from './dailyStreak'
import { buildResultShareText, buildProfileShareText, buildProfileShareUrl, sharePlainText } from './shareText'

const LOCAL_HISTORY = 'cs4fun_history_v1'
const LOCAL_BADGES = 'cs4fun_badges_v1'
const LOCAL_STATS = 'cs4fun_stats_v1'

/** Ultra badge — awarded when every other badge is owned. Highlights the profile. */
export const ULTRA_BADGE_ID = 'completionist'

/** Client-side badge defs (mirror of DB) for offline / guest awards */
export const BADGE_DEFS = [
  { id: 'first_win', category: 'wins', threshold: 1, icon: 'crosshair' },
  { id: 'wins_5', category: 'wins', threshold: 5, icon: 'target' },
  { id: 'wins_10', category: 'wins', threshold: 10, icon: 'trophy' },
  { id: 'wins_25', category: 'wins', threshold: 25, icon: 'medal' },
  { id: 'wins_50', category: 'wins', threshold: 50, icon: 'crown' },
  { id: 'games_5', category: 'games', threshold: 5, icon: 'gamepad' },
  { id: 'games_25', category: 'games', threshold: 25, icon: 'dices' },
  { id: 'games_100', category: 'games', threshold: 100, icon: 'rocket' },
  { id: 'major_champ', category: 'major_wins', threshold: 1, icon: 'award' },
  { id: 'major_3', category: 'major_wins', threshold: 3, icon: 'gem' },
  { id: 'duel_5', category: 'duel_wins', threshold: 5, icon: 'swords' },
  { id: 'duel_15', category: 'duel_wins', threshold: 15, icon: 'skull' },
  { id: 'gauntlet_3', category: 'max_streak', threshold: 3, icon: 'zap' },
  { id: 'gauntlet_7', category: 'max_streak', threshold: 7, icon: 'flame' },
  { id: 'gauntlet_15', category: 'max_streak', threshold: 15, icon: 'mountain' },
  { id: 'daily_3', category: 'daily_wins', threshold: 3, icon: 'sun' },
  { id: 'party_king', category: 'party_wins', threshold: 5, icon: 'party' },
  { id: 'box_first', category: 'box_wins', threshold: 1, icon: 'package' },
  { id: 'box_3', category: 'box_wins', threshold: 3, icon: 'package' },
  { id: 'box_10', category: 'box_wins', threshold: 10, icon: 'gem' },
  { id: 'box_whale', category: 'box_wins', threshold: 25, icon: 'crown' },
  { id: 'box_gold', category: 'box_gold_hits', threshold: 1, icon: 'sparkles' },
  { id: 'box_gold_3', category: 'box_gold_hits', threshold: 3, icon: 'gem' },
  { id: 'box_covert', category: 'box_covert_hits', threshold: 1, icon: 'flame' },
  { id: 'box_covert_10', category: 'box_covert_hits', threshold: 10, icon: 'skull' },
  { id: 'weekly_complete', category: 'weekly_clears', threshold: 1, icon: 'target' },
  { id: 'streak_7', category: 'daily_streak', threshold: 7, icon: 'flame' },
  { id: 'streak_14', category: 'daily_streak', threshold: 14, icon: 'flame' },
  { id: 'social_5', category: 'friend_week_matches', threshold: 5, icon: 'users' },
  { id: 'box_jackpot', category: 'box_best_value', threshold: 500, icon: 'star' },
  { id: 'box_opener', category: 'box_opens', threshold: 50, icon: 'dices' },
  { id: 'career_first_major', category: 'career_majors_won', threshold: 1, icon: 'trophy' },
  { id: 'career_major_3', category: 'career_majors_won', threshold: 3, icon: 'crown' },
  { id: 'career_season_1', category: 'career_seasons', threshold: 1, icon: 'star' },
  { id: 'career_season_5', category: 'career_seasons', threshold: 5, icon: 'flame' },
  { id: 'career_dynasty', category: 'career_best_season', threshold: 800, icon: 'gem' },
  { id: 'perfect_major', category: 'perfect_majors', threshold: 1, icon: 'star' },
  { id: 'almanac_win', category: 'almanac_wins', threshold: 1, icon: 'book' },
  { id: 'social', category: 'party_games', threshold: 1, icon: 'handshake' },
  { id: ULTRA_BADGE_ID, category: 'meta_all', threshold: 20, icon: 'sparkles' },
]

export const STANDARD_BADGE_DEFS = BADGE_DEFS.filter((d) => d.id !== ULTRA_BADGE_ID)

function emptyStats() {
  return {
    games: 0,
    wins: 0,
    losses: 0,
    major_wins: 0,
    duel_wins: 0,
    daily_wins: 0,
    party_wins: 0,
    party_games: 0,
    box_wins: 0,
    box_gold_hits: 0,
    box_covert_hits: 0,
    box_opens: 0,
    box_best_value: 0,
    best_drop: null,
    career_majors_won: 0,
    career_best_season: 0,
    career_seasons: 0,
    perfect_majors: 0,
    almanac_wins: 0,
    max_streak: 0,
    weekly_clears: 0,
    daily_streak: 0,
    friend_week_matches: 0,
  }
}

function readLocalHistory(playerId) {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_HISTORY) || '{}')
    return all[playerId] || []
  } catch {
    return []
  }
}

function writeLocalHistory(playerId, list) {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_HISTORY) || '{}')
    all[playerId] = list.slice(0, 50)
    localStorage.setItem(LOCAL_HISTORY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

function readLocalStats(playerId) {
  try {
    return { ...emptyStats(), ...JSON.parse(localStorage.getItem(`${LOCAL_STATS}_${playerId}`) || '{}') }
  } catch {
    return emptyStats()
  }
}

function writeLocalStats(playerId, stats) {
  try {
    localStorage.setItem(`${LOCAL_STATS}_${playerId}`, JSON.stringify(stats))
  } catch {
    /* ignore */
  }
}

function readLocalBadges(playerId) {
  try {
    return JSON.parse(localStorage.getItem(`${LOCAL_BADGES}_${playerId}`) || '[]')
  } catch {
    return []
  }
}

function writeLocalBadges(playerId, badges) {
  try {
    localStorage.setItem(`${LOCAL_BADGES}_${playerId}`, JSON.stringify(badges))
  } catch {
    /* ignore */
  }
}

function metricFor(stats, category) {
  if (category === 'box_best_value') return Math.floor(Number(stats.box_best_value) || 0)
  if (category === 'career_best_season') return Math.floor(Number(stats.career_best_season) || 0)
  return stats[category] ?? 0
}

function awardLocalBadges(playerId, stats) {
  const existing = readLocalBadges(playerId)
  const byId = new Map(existing.map((b) => [b.id || b, typeof b === 'object' ? b : { id: b }]))
  const newly = []
  for (const def of STANDARD_BADGE_DEFS) {
    if (byId.has(def.id)) continue
    if (metricFor(stats, def.category) >= def.threshold) {
      newly.push(def.id)
      byId.set(def.id, { id: def.id, earned_at: new Date().toISOString() })
    }
  }
  // Ultra: every standard badge unlocked
  const ownedStandard = STANDARD_BADGE_DEFS.filter((d) => byId.has(d.id)).length
  if (ownedStandard >= STANDARD_BADGE_DEFS.length && !byId.has(ULTRA_BADGE_ID)) {
    newly.push(ULTRA_BADGE_ID)
    byId.set(ULTRA_BADGE_ID, { id: ULTRA_BADGE_ID, earned_at: new Date().toISOString() })
  }
  writeLocalBadges(
    playerId,
    [...byId.values()].map((b) => ({
      id: b.id,
      earned_at: b.earned_at || new Date().toISOString(),
    })),
  )
  return newly
}

/**
 * Secure path: authenticated users call submit_game_result RPC (server clamps + awards).
 * Guests fall back to local-only storage (never hits Supabase tables directly for writes).
 */
export async function saveGameResult({
  userId,
  nickname,
  mode,
  won,
  score,
  wins = 0,
  losses = 0,
  streak = 0,
  lineup = null,
  meta = {},
  board = null,
}) {
  const entry = {
    user_id: userId,
    nickname: nickname || 'Guest',
    mode,
    won: Boolean(won),
    score: Math.round(Math.max(0, Math.min(1_000_000, score || 0))),
    wins,
    losses,
    streak,
    lineup,
    meta,
    created_at: new Date().toISOString(),
  }

  // Authenticated + Supabase → RPC only (no direct table writes)
  if (isSupabaseConfigured) {
    const { data: sessionData } = await supabase.auth.getSession()
    if (sessionData?.session?.user) {
      const { data, error } = await supabase.rpc('submit_game_result', {
        p_mode: mode,
        p_won: Boolean(won),
        p_score: entry.score,
        p_wins: wins,
        p_losses: losses,
        p_streak: streak,
        p_lineup: lineup,
        p_meta: {
          ...meta,
          dayKey: meta.dayKey || (mode === 'daily' ? utcDayKey() : undefined),
        },
        p_board: board || mode,
        p_nickname: nickname || null,
      })

      if (!error && data) {
        trackEngagement(userId || sessionData.session.user.id, { mode, won, streak, meta })
        return {
          ok: true,
          global: true,
          entry,
          newBadges: data.new_badges || [],
        }
      }
      // Authenticated sessions must not fall through to local writes (double-count / split-brain)
      console.warn('[cs4fun] submit_game_result RPC failed', error?.message)
      return { ok: false, global: true, error: error?.message || 'submit_failed', entry }
    }
  }

  // Local guest path — history/stats/badges only (no public ranks)
  const list = readLocalHistory(userId)
  list.unshift({ ...entry, id: `local_${Date.now()}` })
  writeLocalHistory(userId, list)

  const stats = readLocalStats(userId)
  stats.games += 1
  if (won) stats.wins += 1
  else stats.losses += 1
  if (mode === 'major' && won) stats.major_wins += 1
  if (mode === 'duel' && won) stats.duel_wins += 1
  if (mode === 'daily' && won) stats.daily_wins += 1
  if (mode === 'party') {
    stats.party_games += 1
    if (won) stats.party_wins += 1
  }
  if (mode === 'box') {
    const drops = Array.isArray(meta?.drops) ? meta.drops : meta?.bestDrop ? [meta.bestDrop] : []
    const roundGold = Number(meta?.roundGold) || drops.filter((d) => d?.rarity === 'gold').length
    const roundCovert = Number(meta?.roundCovert) || drops.filter((d) => d?.rarity === 'covert').length
    const roundOpens = Number(meta?.roundOpens) || drops.length || 0
    stats.box_opens += roundOpens
    stats.box_gold_hits += roundGold
    stats.box_covert_hits += roundCovert
    if (won) stats.box_wins += 1
    const dropVal = Number(meta?.bestDrop?.value) || 0
    if (dropVal > (stats.box_best_value || 0)) {
      stats.box_best_value = dropVal
      stats.best_drop = meta.bestDrop
    }
  }
  if (mode === 'major' && won && wins >= 3 && losses === 0) stats.perfect_majors += 1
  if (won && meta.difficulty === 'almanac') stats.almanac_wins += 1
  if (mode === 'gauntlet') stats.max_streak = Math.max(stats.max_streak, streak)
  writeLocalStats(userId, stats)
  const newBadges = awardLocalBadges(userId, stats)

  // Engagement: challenges + cosmetics (guests + also fire for auth path below)
  trackEngagement(userId, { mode, won, streak, meta })

  return { ok: true, global: false, entry, newBadges }
}

function trackEngagement(userId, { mode, won, streak, meta }) {
  if (!userId) return
  emitEngagementEvent(userId, { type: 'game_played', mode })
  if (won && mode === 'daily') emitEngagementEvent(userId, { type: 'daily_win' })
  if (won && mode === 'duel') emitEngagementEvent(userId, { type: 'duel_win' })
  if (won && mode === 'box') emitEngagementEvent(userId, { type: 'box_win' })
  if (mode === 'box') {
    const opens = Number(meta?.roundOpens) || (Array.isArray(meta?.drops) ? meta.drops.length : 0)
    if (opens) emitEngagementEvent(userId, { type: 'cases_opened', amount: opens })
    if ((Number(meta?.roundCovert) || 0) > 0 || meta?.bestDrop?.rarity === 'covert' || meta?.bestDrop?.rarity === 'gold') {
      emitEngagementEvent(userId, { type: 'box_covert' })
    }
  }
  if (mode === 'gauntlet' && streak) {
    emitEngagementEvent(userId, { type: 'gauntlet_streak', amount: streak })
    if (streak >= 5) setCosmeticFlag(userId, 'gauntlet5')
  }
  if (mode === 'career' && meta?.event === 'major_final') {
    emitEngagementEvent(userId, { type: 'career_major_final' })
  }
  if (meta?.friendMatch || meta?.friend) emitEngagementEvent(userId, { type: 'friend_match' })

  const stats = readLocalStats(userId)
  const streakInfo = getDailyStreak(userId)
  stats.daily_streak = Math.max(stats.daily_streak || 0, streakInfo.currentStreak || 0)
  if (allWeeklyComplete(getWeeklyChallenges(userId))) {
    stats.weekly_clears = Math.max(stats.weekly_clears || 0, 1)
  }
  if (meta?.friendMatch || meta?.friend) {
    stats.friend_week_matches = (stats.friend_week_matches || 0) + 1
  }
  writeLocalStats(userId, stats)
  awardLocalBadges(userId, stats)
  syncCosmeticUnlocks(userId)
}

export async function fetchGameHistory(userId, { limit = 30 } = {}) {
  if (isSupabaseConfigured) {
    const { data: sessionData } = await supabase.auth.getSession()
    if (sessionData?.session?.user) {
      const { data, error } = await supabase
        .from('game_history')
        .select('*')
        .eq('user_id', sessionData.session.user.id)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (!error && data) return data
    }
  }
  return readLocalHistory(userId).slice(0, limit)
}

export async function fetchUserBadges(userId) {
  if (isSupabaseConfigured) {
    const { data: sessionData } = await supabase.auth.getSession()
    const uid = sessionData?.session?.user?.id || userId
    if (sessionData?.session?.user) {
      const { data, error } = await supabase
        .from('user_badges')
        .select('badge_id, earned_at, badge_defs ( id, category, threshold, icon, sort_order )')
        .eq('user_id', uid)
      if (!error && data) {
        return data.map((row) => ({
          id: row.badge_id,
          earned_at: row.earned_at,
          ...(row.badge_defs || BADGE_DEFS.find((b) => b.id === row.badge_id) || {}),
        }))
      }
    }
  }
  return readLocalBadges(userId).map((b) => {
    const id = b.id || b
    const def = BADGE_DEFS.find((d) => d.id === id) || { id }
    return { ...def, earned_at: b.earned_at }
  })
}

export async function fetchBadgeDefs() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('badge_defs').select('*').order('sort_order')
    if (!error && data?.length) return data
  }
  return BADGE_DEFS
}

export async function fetchUserStats(userId) {
  if (isSupabaseConfigured) {
    const { data: sessionData } = await supabase.auth.getSession()
    if (sessionData?.session?.user) {
      const { data } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', sessionData.session.user.id)
        .maybeSingle()
      if (data) return data
    }
  }
  return readLocalStats(userId)
}

export function buildShareText(payload) {
  return buildResultShareText(payload)
}

export async function shareResult(payload) {
  const text = buildResultShareText(payload)
  let file = null

  try {
    const { renderShareCardBlob } = await import('./shareCard')
    const blob = await renderShareCardBlob({
      mode: payload.mode,
      won: payload.won,
      title: payload.title,
      score: payload.score,
      wins: payload.wins,
      losses: payload.losses,
      streak: payload.streak,
      nickname: payload.nickname,
      mapPriority: payload.mapPriority,
      lineup: payload.lineup,
      locale: payload.locale,
      currency: payload.currency,
      boxDrops: payload.boxDrops,
      myTotal: payload.myTotal,
      oppTotal: payload.oppTotal,
      caseName: payload.caseName,
      highlight: payload.highlight,
      careerTier: payload.careerTier,
      careerOrg: payload.careerOrg,
    })
    if (blob) {
      file = new File([blob], 'cs4fun-result.png', { type: 'image/png' })
    }
  } catch {
    /* canvas share optional */
  }

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const shareData = { title: 'CS4FUN', text }
      if (file && navigator.canShare?.({ files: [file] })) {
        shareData.files = [file]
      }
      await navigator.share(shareData)
      return { ok: true, method: 'native', file }
    } catch (err) {
      if (err?.name === 'AbortError') return { ok: false, aborted: true, file }
      /* fall through */
    }
  }

  try {
    if (file && navigator.clipboard?.write && window.ClipboardItem) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': file,
          'text/plain': new Blob([text], { type: 'text/plain' }),
        }),
      ])
      return { ok: true, method: 'clipboard-image', file }
    }
  } catch {
    /* fall through */
  }

  const plain = await sharePlainText({ text })
  return { ...plain, file, text }
}

export async function shareProfile(payload) {
  const text = buildProfileShareText(payload)
  const url = buildProfileShareUrl(payload)
  // Always stash the deep link so paste works even after a native share sheet
  try {
    await navigator.clipboard.writeText(url)
  } catch {
    /* optional */
  }
  return sharePlainText({ title: 'CS4FUN', text, url })
}

/** One-tap copy of the public profile deep link only. */
export async function copyProfileLink(payload) {
  const url = buildProfileShareUrl(payload)
  if (!url) return { ok: false, url: '' }
  try {
    await navigator.clipboard.writeText(url)
    return { ok: true, url }
  } catch {
    return { ok: false, url }
  }
}

/** Download the share card PNG */
export async function downloadShareCard(payload) {
  try {
    const { renderShareCardBlob, triggerBlobDownload } = await import('./shareCard')
    const blob = await renderShareCardBlob(payload)
    if (!blob || blob.size < 100) return { ok: false }
    const ok = triggerBlobDownload(blob, 'cs4fun-result.png')
    return { ok }
  } catch {
    return { ok: false }
  }
}
