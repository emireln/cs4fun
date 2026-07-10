import { isSupabaseConfigured, supabase } from './supabase'

const LOCAL_KEY = 'cs4fun_leaderboard_v1'
const TOP_LIMIT = 100

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}')
  } catch {
    return {}
  }
}

function writeLocal(data) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data))
  } catch {
    /* ignore */
  }
}

/**
 * Guest local scores are kept for offline personal use only —
 * they are NEVER shown on the public ranks board.
 */
export function submitScoreLocal({ board, playerId, nickname, score, meta = {} }) {
  const entry = {
    board,
    player_id: playerId,
    nickname: nickname || 'Guest',
    score: Math.round(score),
    meta,
    created_at: new Date().toISOString(),
    guest: true,
  }
  const data = readLocal()
  if (!data[board]) data[board] = []
  const list = data[board].filter(
    (e) => e.player_id !== playerId || (board === 'daily' && e.meta?.dayKey !== meta.dayKey),
  )
  list.push({ ...entry, meta })
  list.sort((a, b) => b.score - a.score)
  data[board] = list.slice(0, TOP_LIMIT)
  writeLocal(data)
  return { ok: true, global: false }
}

/**
 * @deprecated Prefer saveGameResult() which uses secure RPC for cloud writes.
 */
export async function submitScore(args) {
  return submitScoreLocal(args)
}

/** Top 100 authenticated players only (Supabase). Guests never appear. */
export async function fetchLeaderboard(board, { dayKey, limit = TOP_LIMIT } = {}) {
  const cap = Math.min(limit, TOP_LIMIT)

  if (isSupabaseConfigured) {
    let q = supabase
      .from('leaderboard')
      .select('player_id, nickname, score, meta, created_at, day_key')
      .eq('board', board)
      .order('score', { ascending: false })
      .limit(cap)

    if (board === 'daily' && dayKey) q = q.eq('day_key', dayKey)

    const { data, error } = await q
    if (!error && data) {
      return data.map((row) => ({
        player_id: row.player_id,
        nickname: row.nickname,
        score: row.score,
        meta: row.meta || {},
        created_at: row.created_at,
      }))
    }
    return []
  }

  // No cloud → no public ranks (guests excluded)
  return []
}

/**
 * Global rank among all authenticated players on a board (1-based).
 * Returns { rank, total, score, inTop } or null if no entry / guest.
 */
export async function fetchMyRank(board, playerId, { dayKey } = {}) {
  if (!isSupabaseConfigured || !playerId) return null

  let mineQ = supabase
    .from('leaderboard')
    .select('score')
    .eq('board', board)
    .eq('player_id', playerId)

  if (board === 'daily' && dayKey) mineQ = mineQ.eq('day_key', dayKey)

  const { data: mine } = await mineQ.maybeSingle()
  if (!mine) {
    const total = await countBoard(board, dayKey)
    return { rank: null, total, score: null, inTop: false }
  }

  let betterQ = supabase
    .from('leaderboard')
    .select('*', { count: 'exact', head: true })
    .eq('board', board)
    .gt('score', mine.score)

  if (board === 'daily' && dayKey) betterQ = betterQ.eq('day_key', dayKey)

  const { count: better } = await betterQ
  const total = await countBoard(board, dayKey)
  const rank = (better ?? 0) + 1

  return {
    rank,
    total,
    score: mine.score,
    inTop: rank <= TOP_LIMIT,
  }
}

async function countBoard(board, dayKey) {
  let q = supabase
    .from('leaderboard')
    .select('*', { count: 'exact', head: true })
    .eq('board', board)
  if (board === 'daily' && dayKey) q = q.eq('day_key', dayKey)
  const { count } = await q
  return count ?? 0
}

export function utcDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

export function msUntilUtcMidnight() {
  const now = new Date()
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  return next - now
}

export { TOP_LIMIT }
