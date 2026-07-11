import { utcWeekKey } from './challenges'

const KEY = 'cs4fun_friend_week_v1'

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

/** Record a point for beating / playing a friend this UTC week. */
export function recordFriendWeekPoint(userId, friendId, { won = false } = {}) {
  if (!userId || !friendId) return
  const week = utcWeekKey()
  const all = readAll()
  const key = `${userId}:${week}`
  const row = all[key] || { week, points: 0, byFriend: {} }
  const pts = won ? 3 : 1
  row.points += pts
  row.byFriend[friendId] = (row.byFriend[friendId] || 0) + pts
  all[key] = row
  writeAll(all)
  return row
}

export function getFriendWeekBoard(userId, friends = []) {
  const week = utcWeekKey()
  const all = readAll()
  const mine = all[`${userId}:${week}`] || { week, points: 0, byFriend: {} }
  const rows = friends.map((f) => ({
    id: f.id,
    nickname: f.nickname,
    points: mine.byFriend?.[f.id] || 0,
  }))
  rows.sort((a, b) => b.points - a.points)
  return { week, total: mine.points, rows }
}
