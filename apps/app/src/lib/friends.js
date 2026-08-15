import { isSupabaseConfigured, supabase } from './supabase'
import { createRoom, joinRoom } from './rooms'

const LOCAL_FRIENDS = 'cs4fun_friends_v1'
const LOCAL_H2H = 'cs4fun_friend_h2h_v1'
const LOCAL_INVITES = 'cs4fun_friend_invites_v1'
const INVITE_CHANNEL = 'cs4fun_friend_invite_'
const GRAPH_CHANNEL = 'cs4fun_friend_graph_'

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback))
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

function pairKey(a, b) {
  return [a, b].sort().join('::')
}

/** Local friend graph keyed by profile id */
function localGraph() {
  return readJson(LOCAL_FRIENDS, { requests: [], friendships: [] })
}

function saveLocalGraph(g) {
  writeJson(LOCAL_FRIENDS, g)
  broadcastGraphPing()
}

/** Same-browser tabs: tell open Friends panels the local graph changed. */
export function broadcastGraphPing() {
  try {
    const ch = new BroadcastChannel(GRAPH_CHANNEL + 'ping')
    ch.postMessage({ type: 'graph' })
    ch.close()
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(`${GRAPH_CHANNEL}ping`, String(Date.now()))
  } catch {
    /* ignore */
  }
}

export function subscribeGraphPings(onPing) {
  const cleanups = []
  try {
    const ch = new BroadcastChannel(GRAPH_CHANNEL + 'ping')
    ch.onmessage = (e) => {
      if (e.data?.type === 'graph') onPing?.()
    }
    cleanups.push(() => ch.close())
  } catch {
    /* ignore */
  }
  const onStorage = (e) => {
    if (e.key === `${GRAPH_CHANNEL}ping` || e.key === LOCAL_FRIENDS) onPing?.()
  }
  window.addEventListener('storage', onStorage)
  cleanups.push(() => window.removeEventListener('storage', onStorage))
  return () => cleanups.forEach((fn) => fn())
}

function localInvites() {
  return readJson(LOCAL_INVITES, [])
}

function saveLocalInvites(list) {
  writeJson(LOCAL_INVITES, list.slice(0, 40))
}

function localH2H() {
  return readJson(LOCAL_H2H, {})
}

function saveLocalH2H(data) {
  writeJson(LOCAL_H2H, data)
}

function broadcastInvite(invite) {
  try {
    const ch = new BroadcastChannel(INVITE_CHANNEL + invite.toId)
    ch.postMessage({ type: 'invite', invite })
    ch.close()
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(`${INVITE_CHANNEL}ping`, String(Date.now()))
  } catch {
    /* ignore */
  }
}

/**
 * Search profiles by nickname (cloud) or return empty for guests.
 */
export async function searchPlayersByTag(tag, { excludeId } = {}) {
  const q = String(tag || '').trim()
  if (q.length < 2) return []

  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('profiles')
      .select('id, nickname, avatar_id, avatar_url')
      .ilike('nickname', `%${q.replace(/[%_]/g, '\\$&')}%`)
      .limit(12)
    return (data || [])
      .filter((p) => p.id !== excludeId)
      .map((p) => ({
        id: p.id,
        nickname: p.nickname,
        avatarId: p.avatar_id || 'crosshair',
        avatarUrl: p.avatar_url || null,
      }))
  }

  // Local: scan known guest profiles from friends graph + invites
  const g = localGraph()
  const known = [
    ...g.friendships.flatMap((f) => [f.a, f.b]),
    ...g.requests.map((r) => ({ id: r.fromId, nickname: r.fromNick })),
    ...g.requests.map((r) => ({ id: r.toId, nickname: r.toNick })),
  ]
  const seen = new Set()
  return known
    .filter((p) => p?.nickname && p.nickname.toLowerCase().includes(q.toLowerCase()) && p.id !== excludeId)
    .filter((p) => {
      if (seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })
    .slice(0, 12)
}

const GUEST_ID_RE = /^p_[a-z0-9]{4,24}$/i

export async function sendFriendRequest({ from, to }) {
  if (!from?.id || !to?.id || from.id === to.id) return { error: 'invalid' }

  if (isSupabaseConfigured) {
    const { data: session } = await supabase.auth.getSession()
    if (session?.session?.user) {
      const { error } = await supabase.from('friendships').insert({
        requester_id: from.id,
        addressee_id: to.id,
        status: 'pending',
      })
      if (error) {
        if (error.code === '23505') return { error: 'exists' }
        return { error: error.message }
      }
      return { ok: true, global: true }
    }
    // Guest with Supabase configured: cloud profiles can't receive local-only
    // requests — ask for an account instead of silently dropping them.
    if (!GUEST_ID_RE.test(String(to.id || ''))) return { error: 'auth_required' }
  }

  const g = localGraph()
  const exists =
    g.friendships.some((f) => pairKey(f.a.id, f.b.id) === pairKey(from.id, to.id)) ||
    g.requests.some(
      (r) =>
        (r.fromId === from.id && r.toId === to.id) ||
        (r.fromId === to.id && r.toId === from.id),
    )
  if (exists) return { error: 'exists' }

  g.requests.push({
    id: `req_${Date.now()}`,
    fromId: from.id,
    fromNick: from.nickname,
    toId: to.id,
    toNick: to.nickname,
    status: 'pending',
    createdAt: Date.now(),
  })
  saveLocalGraph(g)
  return { ok: true, global: false }
}

export async function acceptFriendRequest({ profileId, requestId, requesterId }) {
  if (isSupabaseConfigured) {
    const { data: session } = await supabase.auth.getSession()
    if (session?.session?.user) {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', requestId)
        .eq('addressee_id', profileId)
        .eq('status', 'pending')
      if (error) return { error: error.message }
      return { ok: true, global: true }
    }
  }

  const g = localGraph()
  const req = g.requests.find((r) => r.id === requestId || (r.fromId === requesterId && r.toId === profileId))
  if (!req) return { error: 'not_found' }
  g.requests = g.requests.filter((r) => r.id !== req.id)
  g.friendships.push({
    a: { id: req.fromId, nickname: req.fromNick },
    b: { id: req.toId, nickname: req.toNick },
    since: Date.now(),
  })
  saveLocalGraph(g)
  return { ok: true, global: false }
}

export async function declineFriendRequest({ profileId, requestId, requesterId }) {
  if (isSupabaseConfigured) {
    const { data: session } = await supabase.auth.getSession()
    if (session?.session?.user) {
      await supabase.from('friendships').delete().eq('id', requestId).eq('addressee_id', profileId)
      return { ok: true, global: true }
    }
  }
  const g = localGraph()
  g.requests = g.requests.filter(
    (r) => !(r.id === requestId || (r.fromId === requesterId && r.toId === profileId)),
  )
  saveLocalGraph(g)
  return { ok: true, global: false }
}

export async function removeFriend({ profileId, friendId }) {
  if (isSupabaseConfigured) {
    const { data: session } = await supabase.auth.getSession()
    if (session?.session?.user) {
      await supabase
        .from('friendships')
        .delete()
        .or(
          `and(requester_id.eq.${profileId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${profileId})`,
        )
      return { ok: true, global: true }
    }
  }
  const g = localGraph()
  g.friendships = g.friendships.filter((f) => pairKey(f.a.id, f.b.id) !== pairKey(profileId, friendId))
  saveLocalGraph(g)
  return { ok: true, global: false }
}

export async function listFriends(profileId) {
  if (isSupabaseConfigured) {
    const { data: session } = await supabase.auth.getSession()
    if (session?.session?.user) {
      const { data } = await supabase
        .from('friendships')
        .select('id, requester_id, addressee_id, status, created_at')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${profileId},addressee_id.eq.${profileId}`)

      const ids = (data || []).map((row) =>
        row.requester_id === profileId ? row.addressee_id : row.requester_id,
      )
      if (!ids.length) return []
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_id, avatar_url')
        .in('id', ids)
      return (profiles || []).map((p) => ({
        id: p.id,
        nickname: p.nickname,
        avatarId: p.avatar_id || 'crosshair',
        avatarUrl: p.avatar_url || null,
        friendshipId: data.find(
          (r) => r.requester_id === p.id || r.addressee_id === p.id,
        )?.id,
      }))
    }
  }

  const g = localGraph()
  const dir = readJson('cs4fun_local_directory_v1', [])
  return g.friendships
    .filter((f) => f.a.id === profileId || f.b.id === profileId)
    .map((f) => {
      const other = f.a.id === profileId ? f.b : f.a
      const known = dir.find((p) => p.id === other.id)
      return {
        id: other.id,
        nickname: other.nickname,
        avatarId: known?.avatarId || other.avatarId || 'crosshair',
        avatarUrl: known?.avatarUrl || other.avatarUrl || null,
      }
    })
}

export async function listIncomingRequests(profileId) {
  if (isSupabaseConfigured) {
    const { data: session } = await supabase.auth.getSession()
    if (session?.session?.user) {
      const { data } = await supabase
        .from('friendships')
        .select('id, requester_id, created_at')
        .eq('addressee_id', profileId)
        .eq('status', 'pending')
      const ids = (data || []).map((r) => r.requester_id)
      if (!ids.length) return []
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_id, avatar_url')
        .in('id', ids)
      return (data || []).map((r) => {
        const p = profiles?.find((x) => x.id === r.requester_id)
        return {
          id: r.id,
          fromId: r.requester_id,
          fromNick: p?.nickname || 'Player',
          avatarId: p?.avatar_id || 'crosshair',
          avatarUrl: p?.avatar_url || null,
        }
      })
    }
  }

  const dir = readJson('cs4fun_local_directory_v1', [])
  return localGraph()
    .requests.filter((r) => r.toId === profileId && r.status === 'pending')
    .map((r) => {
      const known = dir.find((p) => p.id === r.fromId)
      return {
        id: r.id,
        fromId: r.fromId,
        fromNick: r.fromNick,
        avatarId: known?.avatarId || 'crosshair',
        avatarUrl: known?.avatarUrl || null,
      }
    })
}

/** Pending friend-request count for badges. */
export async function countIncomingFriendRequests(profileId) {
  if (!profileId) return 0
  const list = await listIncomingRequests(profileId)
  return list.length
}

/** Display helper: 1–99 as digits, 100+ as "+99". */
export function formatBadgeCount(n) {
  const count = Math.max(0, Math.floor(Number(n) || 0))
  if (count <= 0) return null
  if (count > 99) return '+99'
  return String(count)
}

/** Pending requests you sent (waiting on them). */
export async function listOutgoingRequests(profileId) {
  if (isSupabaseConfigured) {
    const { data: session } = await supabase.auth.getSession()
    if (session?.session?.user) {
      const { data } = await supabase
        .from('friendships')
        .select('id, addressee_id, created_at')
        .eq('requester_id', profileId)
        .eq('status', 'pending')
      const ids = (data || []).map((r) => r.addressee_id)
      if (!ids.length) return []
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_id, avatar_url')
        .in('id', ids)
      return (data || []).map((r) => {
        const p = profiles?.find((x) => x.id === r.addressee_id)
        return {
          id: r.id,
          toId: r.addressee_id,
          toNick: p?.nickname || 'Player',
          avatarId: p?.avatar_id || 'crosshair',
          avatarUrl: p?.avatar_url || null,
        }
      })
    }
  }

  const dir = readJson('cs4fun_local_directory_v1', [])
  return localGraph()
    .requests.filter((r) => r.fromId === profileId && r.status === 'pending')
    .map((r) => {
      const known = dir.find((p) => p.id === r.toId)
      return {
        id: r.id,
        toId: r.toId,
        toNick: r.toNick || known?.nickname || 'Player',
        avatarId: known?.avatarId || 'crosshair',
        avatarUrl: known?.avatarUrl || null,
      }
    })
}

/** Cancel a pending request you sent. */
export async function cancelFriendRequest({ profileId, requestId, addresseeId }) {
  if (isSupabaseConfigured) {
    const { data: session } = await supabase.auth.getSession()
    if (session?.session?.user) {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', requestId)
        .eq('requester_id', profileId)
        .eq('status', 'pending')
      if (error) return { error: error.message }
      return { ok: true, global: true }
    }
  }

  const g = localGraph()
  const before = g.requests.length
  g.requests = g.requests.filter(
    (r) =>
      !(
        (r.id === requestId || (r.fromId === profileId && r.toId === addresseeId)) &&
        r.fromId === profileId
      ),
  )
  if (g.requests.length === before) return { error: 'not_found' }
  saveLocalGraph(g)
  return { ok: true, global: false }
}

/** Invite a friend into a new duel/party/box room — no code sharing needed */
export async function inviteFriendToMatch({ from, friend, mode = 'duel' }) {
  const roomMode = mode === 'party' ? 'party' : mode === 'box' ? 'box' : 'duel'
  const created = await createRoom({
    profile: from,
    mode: roomMode,
  })
  if (created.error || !created.room?.code) {
    return { ok: false, error: created.error || 'room_failed' }
  }
  const { room, global } = created

  const invite = {
    id: `inv_${Date.now()}`,
    fromId: from.id,
    fromNick: from.nickname || 'Player',
    fromAvatarId: from.avatarId || null,
    fromAvatarUrl: from.avatarUrl || null,
    toId: friend.id,
    toNick: friend.nickname,
    mode: room.mode,
    roomCode: room.code,
    status: 'pending',
    createdAt: Date.now(),
  }

  if (isSupabaseConfigured) {
    const { data: session } = await supabase.auth.getSession()
    if (session?.session?.user) {
      const { data: row, error } = await supabase
        .from('friend_invites')
        .insert({
          from_id: from.id,
          to_id: friend.id,
          mode: room.mode,
          room_code: room.code,
          status: 'pending',
        })
        .select('id, created_at')
        .maybeSingle()
      if (error) return { ok: false, error: error.message }
      if (row?.id != null) invite.id = row.id
      // Also mirror locally + BroadcastChannel so same-browser tabs update instantly
      const list = localInvites()
      list.unshift(invite)
      saveLocalInvites(list)
      broadcastInvite(invite)
      return { ok: true, room, invite, global: true }
    }
  }

  const list = localInvites()
  list.unshift(invite)
  saveLocalInvites(list)
  broadcastInvite(invite)
  return { ok: true, room, invite, global: Boolean(global) }
}

export async function listIncomingInvites(profileId) {
  if (isSupabaseConfigured) {
    const { data: session } = await supabase.auth.getSession()
    if (session?.session?.user) {
      const { data } = await supabase
        .from('friend_invites')
        .select('id, from_id, mode, room_code, status, created_at')
        .eq('to_id', profileId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10)
      const ids = (data || []).map((i) => i.from_id)
      let profiles = []
      if (ids.length) {
        const res = await supabase
          .from('profiles')
          .select('id, nickname, avatar_id, avatar_url')
          .in('id', ids)
        profiles = res.data || []
      }
      return (data || []).map((i) => {
        const p = profiles.find((x) => x.id === i.from_id)
        return {
          id: i.id,
          fromId: i.from_id,
          fromNick: p?.nickname || 'Friend',
          fromAvatarId: p?.avatar_id || null,
          fromAvatarUrl: p?.avatar_url || null,
          mode: i.mode,
          roomCode: i.room_code,
          status: i.status,
        }
      })
    }
  }

  return localInvites()
    .filter((i) => i.toId === profileId && i.status === 'pending')
    .map((i) => ({
      id: i.id,
      fromId: i.fromId,
      fromNick: i.fromNick,
      fromAvatarId: i.fromAvatarId || null,
      fromAvatarUrl: i.fromAvatarUrl || null,
      mode: i.mode,
      roomCode: i.roomCode,
      status: i.status,
    }))
}

export async function acceptInvite({ profile, invite }) {
  const res = await joinRoom({ code: invite.roomCode, profile })
  if (res.error) return { error: res.error }

  // Mark the invite accepted only after the join succeeded so a failed join
  // (e.g. room_full) leaves the invite pending and retryable.
  if (isSupabaseConfigured) {
    const { data: session } = await supabase.auth.getSession()
    if (session?.session?.user && typeof invite.id === 'number') {
      const { error } = await supabase
        .from('friend_invites')
        .update({ status: 'accepted' })
        .eq('id', invite.id)
        .eq('to_id', profile.id)
        .eq('status', 'pending')
      if (error) return { error: error.message, room: res.room }
    }
  } else {
    const list = localInvites().map((i) =>
      i.id === invite.id ? { ...i, status: 'accepted' } : i,
    )
    saveLocalInvites(list)
  }

  return { ok: true, room: res.room }
}

export async function declineInvite({ profileId, invite }) {
  if (isSupabaseConfigured) {
    const { data: session } = await supabase.auth.getSession()
    if (session?.session?.user && typeof invite.id === 'number') {
      const { error } = await supabase
        .from('friend_invites')
        .update({ status: 'declined' })
        .eq('id', invite.id)
        .eq('to_id', profileId)
        .eq('status', 'pending')
      if (error) return { error: error.message }
      return { ok: true }
    }
  }
  const list = localInvites().map((i) =>
    i.id === invite.id || (i.toId === profileId && i.roomCode === invite.roomCode)
      ? { ...i, status: 'declined' }
      : i,
  )
  saveLocalInvites(list)
  return { ok: true }
}

export function subscribeInvites(profileId, onInvite) {
  const cleanups = []
  if (!profileId) return () => {}

  try {
    const bc = new BroadcastChannel(INVITE_CHANNEL + profileId)
    bc.onmessage = (e) => {
      if (e.data?.invite) onInvite(e.data.invite)
    }
    cleanups.push(() => bc.close())
  } catch {
    /* ignore */
  }

  const onStorage = () => {
    listIncomingInvites(profileId).then((list) => {
      if (list[0]) onInvite(list[0])
    }).catch(() => {})
  }
  window.addEventListener('storage', onStorage)
  cleanups.push(() => window.removeEventListener('storage', onStorage))

  const seenInviteIds = new Set()
  const poll = setInterval(() => {
    listIncomingInvites(profileId)
      .then((list) => {
        for (const invite of list) {
          const key = String(invite.id)
          if (seenInviteIds.has(key)) continue
          seenInviteIds.add(key)
          onInvite(invite)
        }
      })
      .catch(() => {})
  }, 4000)
  cleanups.push(() => clearInterval(poll))

  if (isSupabaseConfigured) {
    // Unique topic per subscriber — reusing `invites:${id}` after subscribe() throws
    // ("cannot add postgres_changes callbacks … after subscribe()") when App + FriendsPanel
    // (or React Strict Mode) both call subscribeInvites.
    const topic = `invites:${profileId}:${Math.random().toString(36).slice(2, 10)}`
    try {
      const channel = supabase.channel(topic)
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_invites',
          filter: `to_id=eq.${profileId}`,
        },
        async (payload) => {
          if (!payload.new) return
          let fromNick = 'Friend'
          let fromAvatarId = null
          let fromAvatarUrl = null
          try {
            const { data: p } = await supabase
              .from('profiles')
              .select('nickname, avatar_id, avatar_url')
              .eq('id', payload.new.from_id)
              .maybeSingle()
            if (p) {
              fromNick = p.nickname || fromNick
              fromAvatarId = p.avatar_id || null
              fromAvatarUrl = p.avatar_url || null
            }
          } catch {
            /* ignore */
          }
          onInvite({
            id: payload.new.id,
            fromId: payload.new.from_id,
            fromNick,
            fromAvatarId,
            fromAvatarUrl,
            mode: payload.new.mode,
            roomCode: payload.new.room_code,
            status: payload.new.status,
          })
        },
      )
      channel.subscribe()
      cleanups.push(() => {
        try {
          supabase.removeChannel(channel)
        } catch {
          /* ignore */
        }
      })
    } catch {
      /* realtime optional — poll/BroadcastChannel still work */
    }
  }

  return () => {
    for (const fn of cleanups) {
      try {
        fn()
      } catch {
        /* ignore */
      }
    }
  }
}

export async function getFriendH2H(profileId, friendId) {
  if (isSupabaseConfigured) {
    const { data: session } = await supabase.auth.getSession()
    if (session?.session?.user) {
      const { data } = await supabase
        .from('friend_h2h')
        .select('matches, wins, losses')
        .eq('user_id', profileId)
        .eq('friend_id', friendId)
        .maybeSingle()
      if (data) return data
    }
  }

  const key = pairKey(profileId, friendId)
  const all = localH2H()
  const row = all[key]
  if (!row) return { matches: 0, wins: 0, losses: 0 }
  // row stores from sorted-a perspective; convert to profileId view
  const [a] = key.split('::')
  if (profileId === a) return { matches: row.matches, wins: row.winsA, losses: row.winsB }
  return { matches: row.matches, wins: row.winsB, losses: row.winsA }
}

export async function recordFriendMatch({ profileId, friendId, won }) {
  if (!profileId || !friendId || profileId === friendId) return

  try {
    const { recordFriendWeekPoint } = await import('./friendWeek')
    recordFriendWeekPoint(profileId, friendId, { won })
    const { addClanWeekPoints } = await import('./clans')
    addClanWeekPoints(profileId, won ? 3 : 1)
    const { emitEngagementEvent } = await import('./challenges')
    emitEngagementEvent(profileId, { type: 'friend_match' })
  } catch {
    /* optional */
  }

  if (isSupabaseConfigured) {
    const { data: session } = await supabase.auth.getSession()
    if (session?.session?.user) {
      await supabase.rpc('record_friend_match', {
        p_friend_id: friendId,
        p_won: Boolean(won),
      })
      return
    }
  }

  const key = pairKey(profileId, friendId)
  const all = localH2H()
  const [a] = key.split('::')
  const row = all[key] || { matches: 0, winsA: 0, winsB: 0 }
  row.matches += 1
  if (won) {
    if (profileId === a) row.winsA += 1
    else row.winsB += 1
  } else if (profileId === a) row.winsB += 1
  else row.winsA += 1
  all[key] = row
  saveLocalH2H(all)
}

/** Register a local guest identity so others on same device/browser can find them by tag */
export function registerLocalPlayer(profile) {
  if (!profile?.id || !profile?.nickname) return
  const g = localGraph()
  // ensure self appears in a lightweight directory
  const dir = readJson('cs4fun_local_directory_v1', [])
  const next = dir.filter((p) => p.id !== profile.id)
  next.unshift({
    id: profile.id,
    nickname: profile.nickname,
    avatarId: profile.avatarId || 'crosshair',
    avatarUrl: profile.avatarUrl || null,
    showcaseBadge: profile.showcaseBadge || null,
    steamUrl: profile.steamUrl || null,
    profilePublic: profile.profilePublic !== false,
  })
  writeJson('cs4fun_local_directory_v1', next.slice(0, 80))
}

export async function searchPlayersByTagLocalAware(tag, { excludeId } = {}) {
  const cloud = await searchPlayersByTag(tag, { excludeId })
  if (cloud.length) return cloud
  const dir = readJson('cs4fun_local_directory_v1', [])
  const q = String(tag || '').trim().toLowerCase()
  return dir
    .filter((p) => p.id !== excludeId && p.nickname?.toLowerCase().includes(q))
    .slice(0, 12)
}
