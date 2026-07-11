import { isSupabaseConfigured, supabase } from './supabase'
import { makeRoomCode } from './roomsLocal'

// Re-export helpers that don't need network
export { makeRoomCode } from './roomsLocal'

const LOCAL_ROOMS = 'cs4fun_rooms_v1'
const CHANNEL_PREFIX = 'cs4fun_room_'

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
    maxPlayers: mode === 'duel' ? 2 : 6,
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
        const room =
          typeof data.payload === 'object'
            ? { ...data.payload, code: data.code, seed: data.seed, status: data.status, hostId: data.host_id }
            : local
        room.code = data.code
        room.seed = data.seed
        room.status = data.status
        room.hostId = data.host_id
        return { room, global: true }
      }
      return { error: error?.message || 'create_failed' }
    }
  }

  rooms[local.code] = local
  writeRooms(rooms)
  return { room: local, global: false }
}

export async function joinRoom({ code, profile }) {
  const normalized = code.trim().toUpperCase()

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('rooms').select('*').eq('code', normalized).maybeSingle()
    if (!error && data) {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session?.user) {
        return { error: 'auth_required' }
      }

      const { data: joined, error: joinError } = await supabase.rpc('join_room', {
        p_code: normalized,
        p_nickname: profile.nickname || 'Guest',
      })
      if (!joinError && joined) {
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
            nickname: profile.nickname || 'Guest',
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
      nickname: profile.nickname || 'Guest',
      ready: false,
      lineup: null,
      power: 0,
      isHost: false,
    })
    rooms[normalized] = room
    writeRooms(rooms)
    broadcastLocal(normalized, room)
  }
  return { room, global: false }
}

export async function updateRoom(code, updater) {
  const normalized = code.trim().toUpperCase()

  if (isSupabaseConfigured) {
    const { data: sessionData } = await supabase.auth.getSession()
    if (sessionData?.session?.user) {
      const current = await fetchRoom(normalized)
      if (current) {
        const room = typeof updater === 'function' ? updater(current) : updater
        const { data, error } = await supabase.rpc('update_room_payload', {
          p_code: normalized,
          p_payload: room,
          p_status: room.status,
        })
        if (!error && data) {
          return { ...(data.payload || room), code: data.code, seed: data.seed, status: data.status, hostId: data.host_id }
        }
      }
    }
  }

  const rooms = readRooms()
  const current = rooms[normalized]
  if (!current) return null
  const room = typeof updater === 'function' ? updater(current) : updater
  rooms[normalized] = room
  writeRooms(rooms)
  broadcastLocal(normalized, room)
  return room
}

export async function fetchRoom(code) {
  const normalized = code.trim().toUpperCase()
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('rooms').select('*').eq('code', normalized).maybeSingle()
    if (data) {
      return {
        ...(data.payload || {}),
        code: data.code,
        seed: data.seed,
        status: data.status,
        hostId: data.host_id,
        mode: data.mode,
      }
    }
  }
  return readRooms()[normalized] || null
}

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
            onRoom({
              ...(payload.new.payload || {}),
              code: payload.new.code,
              seed: payload.new.seed,
              status: payload.new.status,
              hostId: payload.new.host_id,
              mode: payload.new.mode,
            })
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
    }, 1500)
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
