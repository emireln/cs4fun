import { isSupabaseConfigured, supabase } from './supabase'
import { utcDayKey } from './leaderboard'
import { buildResultShareText, buildProfileShareText, sharePlainText } from './shareText'

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
  { id: 'box_3', category: 'box_wins', threshold: 3, icon: 'package' },
  { id: 'box_10', category: 'box_wins', threshold: 10, icon: 'gem' },
  { id: 'box_whale', category: 'box_wins', threshold: 25, icon: 'crown' },
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
    perfect_majors: 0,
    almanac_wins: 0,
    max_streak: 0,
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
  if (mode === 'box' && won) stats.box_wins += 1
  if (mode === 'major' && won && wins >= 3 && losses === 0) stats.perfect_majors += 1
  if (won && meta.difficulty === 'almanac') stats.almanac_wins += 1
  if (mode === 'gauntlet') stats.max_streak = Math.max(stats.max_streak, streak)
  writeLocalStats(userId, stats)
  const newBadges = awardLocalBadges(userId, stats)

  return { ok: true, global: false, entry, newBadges }
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
    })
    if (blob) {
      file = new File([blob], 'cs4fun-result.png', { type: 'image/png' })
    }
  } catch {
    /* canvas share optional */
  }

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const shareData = { title: 'cs4fun', text }
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
  const url = buildProfileShareText(payload)
  return sharePlainText({ title: 'cs4fun', text: url, url })
}

/** Download the share card PNG */
export async function downloadShareCard(payload) {
  try {
    const { renderShareCardBlob } = await import('./shareCard')
    const blob = await renderShareCardBlob(payload)
    if (!blob) return { ok: false }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cs4fun-result.png'
    a.click()
    URL.revokeObjectURL(url)
    return { ok: true }
  } catch {
    return { ok: false }
  }
}
