import { isSupabaseConfigured, supabase } from './supabase'
import { makeRoomCode } from './roomsLocal'

// Re-export helpers that don't need network
export { makeRoomCode } from './roomsLocal'

const LOCAL_ROOMS = 'cs4fun_rooms_v1'
const CHANNEL_PREFIX = 'cs4fun_room_'
const ACTIVE_GUEST_ID_KEY = 'cs4fun_active_guest_id'

function readActiveGuestId() {
  try {
    return localStorage.getItem(ACTIVE_GUEST_ID_KEY) || null
  } catch {
    return null
  }
}

function writeActiveGuestId(id) {
  try {
    if (id) localStorage.setItem(ACTIVE_GUEST_ID_KEY, String(id))
    else localStorage.removeItem(ACTIVE_GUEST_ID_KEY)
  } catch {
    /* ignore */
  }
}

function isGuestLocalId(id) {
  return /^p_[a-z0-9]{4,24}$/i.test(String(id || ''))
}

function readRooms() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_ROOMS) || '{}')
  } catch {
    return {}
  }
}

function writeRooms(rooms) {
  try {
    localStorage.setItem(LOCAL_ROOMS, JSON.stringify(rooms))
  } catch {
    /* ignore */
  }
}

function emptyRoom(code, host, mode) {
  return {
    code,
    mode,
    hostId: host.id,
    status: 'lobby',
    seed: `${mode}-${code}-${Date.now()}`,
    createdAt: Date.now(),
    players: [
      {
        id: host.id,
        nickname: host.nickname || 'Host',
        ready: false,
        lineup: null,
        power: 0,
        isHost: true,
      },
    ],
    maxPlayers: mode === 'duel' || mode === 'box' ? 2 : 6,
  }
}

function broadcastLocal(code, room) {
  try {
    const ch = new BroadcastChannel(CHANNEL_PREFIX + code)
    ch.postMessage({ type: 'room', room })
    ch.close()
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(`${CHANNEL_PREFIX}${code}_ping`, String(Date.now()))
  } catch {
    /* ignore */
  }
}

export async function createRoom({ profile, mode }) {
  let code = makeRoomCode()
  const rooms = readRooms()
  let guard = 0
  while (rooms[code] && guard < 12) {
    code = makeRoomCode()
    guard += 1
  }
  const local = emptyRoom(code, profile, mode)

  if (isSupabaseConfigured) {
    const { data: sessionData } = await supabase.auth.getSession()
    if (sessionData?.session?.user) {
      const { data, error } = await supabase.rpc('create_room', {
        p_mode: mode,
        p_payload: local,
      })
        if (!error && data) {
          const room = roomFromRow(data, local)
          writeActiveGuestId(null)
          return { room, global: true }
        }
      return { error: error?.message || 'create_failed' }
    }
  }

  rooms[local.code] = local
  writeRooms(rooms)
  if (isGuestLocalId(profile.id)) writeActiveGuestId(profile.id)
  return { room: local, global: false }
}

export async function joinRoom({ code, profile }) {
  const normalized = code.trim().toUpperCase()
  const nick = profile.nickname || 'Guest'
  const guestId = String(profile.id || '')

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('rooms').select('*').eq('code', normalized).maybeSingle()
    if (!error && data) {
      const { data: sessionData } = await supabase.auth.getSession()
      if (sessionData?.session?.user) {
        const { data: joined, error: joinError } = await supabase.rpc('join_room', {
          p_code: normalized,
          p_nickname: nick,
        })
        if (!joinError && joined) {
          writeActiveGuestId(null)
          return {
            room: {
              ...(joined.payload || {}),
              code: joined.code,
              seed: joined.seed,
              status: joined.status,
              hostId: joined.host_id,
              mode: joined.mode,
            },
            global: true,
          }
        }

        // Fallback for older schemas without join_room RPC
        if (joinError && /function .*join_room/i.test(joinError.message || '')) {
          const room = {
            ...(data.payload || {}),
            code: data.code,
            seed: data.seed,
            status: data.status,
            hostId: data.host_id,
            mode: data.mode,
          }
          if (!room.players) room.players = []
          if (room.players.length >= (room.maxPlayers || 6) && !room.players.find((p) => p.id === profile.id)) {
            return { error: 'full' }
          }
          if (!room.players.find((p) => p.id === profile.id)) {
            room.players.push({
              id: profile.id,
              nickname: nick,
              ready: false,
              lineup: null,
              power: 0,
              isHost: false,
            })
            await supabase.rpc('update_room_payload', {
              p_code: normalized,
              p_payload: room,
              p_status: room.status,
            })
          }
          return { room, global: true }
        }

        return { error: joinError?.message || 'join_failed' }
      }

      // Guest (no account): join online room by local guest id
      if (isGuestLocalId(guestId)) {
        const { data: joined, error: guestErr } = await supabase.rpc('join_room_guest', {
          p_code: normalized,
          p_guest_id: guestId,
          p_nickname: nick,
        })
        if (!guestErr && joined) {
          writeActiveGuestId(guestId)
          return {
            room: {
              ...(joined.payload || {}),
              code: joined.code,
              seed: joined.seed,
              status: joined.status,
              hostId: joined.host_id,
              mode: joined.mode,
            },
            global: true,
          }
        }
        // Older DB without guest RPC — fall through to local
        if (guestErr && !/function .*join_room_guest|could not find/i.test(guestErr.message || '')) {
          const msg = String(guestErr.message || '')
          if (/room_full/i.test(msg)) return { error: 'full' }
          if (/room_not_found/i.test(msg)) return { error: 'invalid' }
          if (/invalid_guest/i.test(msg)) return { error: 'invalid' }
        }
      }
    }
  }

  const rooms = readRooms()
  const room = rooms[normalized]
  if (!room) return { error: 'invalid' }
  if (room.players.length >= room.maxPlayers && !room.players.find((p) => p.id === profile.id)) {
    return { error: 'full' }
  }
  if (!room.players.find((p) => p.id === profile.id)) {
    room.players.push({
      id: profile.id,
      nickname: nick,
      ready: false,
      lineup: null,
      power: 0,
      isHost: false,
    })
    rooms[normalized] = room
    writeRooms(rooms)
    broadcastLocal(normalized, room)
  }
  if (isGuestLocalId(profile.id)) writeActiveGuestId(profile.id)
  return { room, global: false }
}

function samePlayerId(a, b) {
  return String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase()
}

/** Normalize a rooms row / RPC result into the client room shape. */
function roomFromRow(data, fallback = null) {
  if (!data && !fallback) return null
  const payload =
    data?.payload && typeof data.payload === 'object' && !Array.isArray(data.payload)
      ? data.payload
      : {}
  const base = fallback && typeof fallback === 'object' ? fallback : {}
  const players = Array.isArray(payload.players)
    ? payload.players
    : Array.isArray(base.players)
      ? base.players
      : []
  return {
    ...base,
    ...payload,
    players,
    code: data?.code || payload.code || base.code,
    seed: data?.seed || payload.seed || base.seed,
    status: data?.status || payload.status || base.status || 'lobby',
    hostId: data?.host_id || data?.hostId || payload.hostId || base.hostId,
    mode: data?.mode || payload.mode || base.mode,
    maxPlayers: payload.maxPlayers || base.maxPlayers,
    updatedAt: data?.updated_at || base.updatedAt || Date.now(),
  }
}

/** Persist only lobby state in payload — strip row mirrors that confuse later merges. */
function toRoomPayload(room) {
  if (!room || typeof room !== 'object') return {}
  const {
    code: _code,
    seed: _seed,
    status: _status,
    hostId: _hostId,
    host_id: _host_id,
    updatedAt: _updatedAt,
    updated_at: _updated_at,
    ...rest
  } = room
  return {
    ...rest,
    mode: room.mode,
    maxPlayers: room.maxPlayers,
    players: Array.isArray(room.players) ? room.players : [],
    createdAt: room.createdAt,
  }
}

export async function updateRoom(code, updater, { guestId = null, base = null } = {}) {
  const normalized = code.trim().toUpperCase()
  const resolvedGuestId = guestId || readActiveGuestId()

  const buildNext = (current) => {
    const src = current || base
    if (!src) return null
    return typeof updater === 'function' ? updater({ ...src, players: src.players || [] }) : updater
  }

  if (isSupabaseConfigured) {
    const { data: sessionData } = await supabase.auth.getSession()
    if (sessionData?.session?.user) {
      const current = (await fetchRoom(normalized)) || base
      if (current) {
        const room = buildNext(current)
        if (room) {
          const { data, error } = await supabase.rpc('update_room_payload', {
            p_code: normalized,
            p_payload: toRoomPayload(room),
            p_status: room.status || current.status || 'lobby',
          })
          if (!error && data) {
            return roomFromRow(data, room)
          }
        }
      }
    } else if (isGuestLocalId(resolvedGuestId)) {
      const current = (await fetchRoom(normalized)) || base
      if (current?.players?.some((p) => samePlayerId(p.id, resolvedGuestId))) {
        const room = buildNext(current)
        if (room) {
          const { data, error } = await supabase.rpc('update_room_guest', {
            p_code: normalized,
            p_guest_id: String(resolvedGuestId),
            p_payload: toRoomPayload(room),
            p_status: room.status || current.status || 'lobby',
          })
          if (!error && data) {
            return roomFromRow(data, room)
          }
        }
      }
    }
  }

  const rooms = readRooms()
  const current = rooms[normalized] || base
  if (!current) return null
  const room = buildNext(current)
  if (!room) return null
  rooms[normalized] = { ...room, code: normalized }
  writeRooms(rooms)
  broadcastLocal(normalized, rooms[normalized])
  return rooms[normalized]
}

export async function fetchRoom(code) {
  const normalized = code.trim().toUpperCase()
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('rooms').select('*').eq('code', normalized).maybeSingle()
    if (data) return roomFromRow(data)
  }
  return readRooms()[normalized] || null
}

export { samePlayerId }

export function subscribeRoom(code, onRoom) {
  const normalized = code.trim().toUpperCase()
  const cleanups = []

  if (isSupabaseConfigured) {
    const topic = `room:${normalized}:${Math.random().toString(36).slice(2, 10)}`
    try {
      const channel = supabase.channel(topic)
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `code=eq.${normalized}` },
        (payload) => {
          if (payload.new) {
            onRoom(roomFromRow(payload.new))
          }
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
      /* realtime optional */
    }

    const poll = setInterval(async () => {
      const room = await fetchRoom(normalized)
      if (room) onRoom(room)
    }, 800)
    cleanups.push(() => clearInterval(poll))
  }

  // Local guest rooms (and same-browser tabs) — keep even when Supabase is configured,
  // because guests without a session still use localStorage rooms.
  let bc
  try {
    bc = new BroadcastChannel(CHANNEL_PREFIX + normalized)
    bc.onmessage = (e) => {
      if (e.data?.room) onRoom(e.data.room)
    }
    cleanups.push(() => bc.close())
  } catch {
    /* ignore */
  }

  const onStorage = (e) => {
    if (e.key === LOCAL_ROOMS || e.key === `${CHANNEL_PREFIX}${normalized}_ping`) {
      const room = readRooms()[normalized]
      if (room) onRoom(room)
    }
  }
  window.addEventListener('storage', onStorage)
  cleanups.push(() => window.removeEventListener('storage', onStorage))

  const localPoll = setInterval(() => {
    const room = readRooms()[normalized]
    if (room) onRoom(room)
  }, 800)
  cleanups.push(() => clearInterval(localPoll))

  return () => cleanups.forEach((fn) => fn())
}
