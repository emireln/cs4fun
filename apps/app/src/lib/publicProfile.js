import { isSupabaseConfigured, supabase } from './supabase'
import { loadProfile } from './profile'
import { sanitizeAvatarUrl } from './avatarImage'
import { sanitizeSteamUrl } from './steam'
import { fetchUserStats, fetchUserBadges, ULTRA_BADGE_ID } from './history'

const LOCAL_DIR = 'cs4fun_local_directory_v1'

function readDir() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_DIR) || '[]')
  } catch {
    return []
  }
}

function isUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(id || ''),
  )
}

function hasUltra(badges) {
  return (badges || []).some((b) => (b.id || b.badge_id) === ULTRA_BADGE_ID)
}

/**
 * Brief public profile for another player (or self).
 * Respects profilePublic — private profiles hide steam/stats/showcase.
 */
export async function fetchPublicProfile(userId, { viewerId } = {}) {
  if (!userId) return null

  if (isSupabaseConfigured && isUuid(userId)) {
    const { data, error } = await supabase.rpc('get_public_profile', { p_id: userId })
    if (!error && data) {
      return {
        id: data.id,
        nickname: data.nickname || 'Player',
        avatarId: data.avatarId || 'crosshair',
        avatarUrl: sanitizeAvatarUrl(data.avatarUrl),
        profilePublic: data.profilePublic !== false,
        private: Boolean(data.private),
        showcaseBadge: data.showcaseBadge || null,
        steamUrl: sanitizeSteamUrl(data.steamUrl).url,
        wins: data.wins,
        games: data.games,
        badgeCount: data.badgeCount,
        ultra: Boolean(data.ultra),
      }
    }
    // Fallback if RPC not migrated yet — never expose steam without privacy check
    const { data: row } = await supabase
      .from('profiles')
      .select('id, nickname, avatar_id, avatar_url, showcase_badge, steam_url, profile_public')
      .eq('id', userId)
      .maybeSingle()
    if (row) {
      const isSelf = viewerId && viewerId === row.id
      const isPublic = row.profile_public !== false
      const canSee = isSelf || isPublic
      let wins = null
      let games = null
      let badgeCount = null
      let ultra = false
      if (canSee) {
        const [stats, badges] = await Promise.all([
          fetchUserStats(userId),
          fetchUserBadges(userId),
        ])
        wins = stats?.wins ?? 0
        games = stats?.games ?? 0
        badgeCount = badges?.length ?? 0
        ultra = hasUltra(badges)
      }
      return {
        id: row.id,
        nickname: row.nickname || 'Player',
        avatarId: row.avatar_id || 'crosshair',
        avatarUrl: sanitizeAvatarUrl(row.avatar_url),
        profilePublic: isPublic,
        private: !canSee,
        showcaseBadge: canSee ? row.showcase_badge : null,
        steamUrl: canSee ? sanitizeSteamUrl(row.steam_url).url : null,
        wins,
        games,
        badgeCount,
        ultra,
      }
    }
  }

  // Local / guest directory
  const self = loadProfile()
  if (self.id === userId) {
    const [stats, badges] = await Promise.all([
      fetchUserStats(userId),
      fetchUserBadges(userId),
    ])
    return {
      id: self.id,
      nickname: self.nickname || 'Guest',
      avatarId: self.avatarId || 'crosshair',
      avatarUrl: sanitizeAvatarUrl(self.avatarUrl),
      profilePublic: self.profilePublic !== false,
      private: false,
      showcaseBadge: self.showcaseBadge || null,
      steamUrl: sanitizeSteamUrl(self.steamUrl).url,
      wins: stats?.wins ?? 0,
      games: stats?.games ?? 0,
      badgeCount: badges?.length ?? 0,
      ultra: hasUltra(badges),
    }
  }

  const known = readDir().find((p) => p.id === userId)
  if (!known) {
    return {
      id: userId,
      nickname: 'Player',
      avatarId: 'crosshair',
      avatarUrl: null,
      profilePublic: true,
      private: false,
      showcaseBadge: null,
      steamUrl: null,
      wins: null,
      games: null,
      badgeCount: null,
      ultra: false,
    }
  }

  const isPublic = known.profilePublic !== false
  const badges = isPublic ? await fetchUserBadges(userId) : []
  return {
    id: known.id,
    nickname: known.nickname || 'Player',
    avatarId: known.avatarId || 'crosshair',
    avatarUrl: sanitizeAvatarUrl(known.avatarUrl),
    profilePublic: isPublic,
    private: !isPublic,
    showcaseBadge: isPublic ? known.showcaseBadge || null : null,
    steamUrl: isPublic ? sanitizeSteamUrl(known.steamUrl).url : null,
    wins: null,
    games: null,
    badgeCount: isPublic ? badges.length : null,
    ultra: isPublic ? hasUltra(badges) : false,
  }
}
