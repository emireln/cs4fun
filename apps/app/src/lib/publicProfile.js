import { isSupabaseConfigured, supabase } from './supabase'
import { loadProfile } from './profile'
import { sanitizeAvatarUrl } from './avatarImage'
import { sanitizeSteamUrl } from './steam'
import { fetchUserStats, fetchUserBadges, ULTRA_BADGE_ID } from './history'
import { readBoxStats } from './boxBattle'
import { normalizePublicSections } from './publicSections'

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

function mapRpcProfile(data) {
  return {
    id: data.id,
    nickname: data.nickname || 'Player',
    avatarId: data.avatarId || 'crosshair',
    avatarUrl: sanitizeAvatarUrl(data.avatarUrl),
    profilePublic: data.profilePublic !== false,
    publicSections: normalizePublicSections(data.publicSections),
    private: Boolean(data.private),
    showcaseBadge: data.showcaseBadge || null,
    steamUrl: sanitizeSteamUrl(data.steamUrl).url,
    wins: data.wins,
    games: data.games,
    badgeCount: data.badgeCount,
    maxStreak: data.maxStreak ?? null,
    majorWins: data.majorWins ?? null,
    duelWins: data.duelWins ?? null,
    partyWins: data.partyWins ?? null,
    dailyWins: data.dailyWins ?? null,
    boxWins: data.boxWins ?? null,
    bestDrop: data.bestDrop || null,
    careerMajorsWon: data.careerMajorsWon ?? null,
    careerBestSeason: data.careerBestSeason ?? null,
    careerSeasons: data.careerSeasons ?? null,
    ultra: Boolean(data.ultra),
  }
}

/**
 * Brief public profile for another player (or self).
 * Respects profilePublic + publicSections.
 */
export async function fetchPublicProfile(userId, { viewerId } = {}) {
  if (!userId) return null

  if (isSupabaseConfigured && isUuid(userId)) {
    const { data, error } = await supabase.rpc('get_public_profile', { p_id: userId })
    if (!error && data) return mapRpcProfile(data)

    // Fallback if RPC not migrated yet — never expose steam without privacy check
    const { data: row } = await supabase
      .from('profiles')
      .select(
        'id, nickname, avatar_id, avatar_url, showcase_badge, steam_url, profile_public, public_sections',
      )
      .eq('id', userId)
      .maybeSingle()
    if (row) {
      const isSelf = viewerId && viewerId === row.id
      const isPublic = row.profile_public !== false
      const canSee = isSelf || isPublic
      const sections = normalizePublicSections(row.public_sections)
      let stats = null
      let badges = []
      if (canSee) {
        ;[stats, badges] = await Promise.all([fetchUserStats(userId), fetchUserBadges(userId)])
      }
      const show = (key) => canSee && (isSelf || sections[key])
      return {
        id: row.id,
        nickname: row.nickname || 'Player',
        avatarId: row.avatar_id || 'crosshair',
        avatarUrl: sanitizeAvatarUrl(row.avatar_url),
        profilePublic: isPublic,
        publicSections: sections,
        private: !canSee,
        showcaseBadge: show('showcase') ? row.showcase_badge : null,
        steamUrl: show('steam') ? sanitizeSteamUrl(row.steam_url).url : null,
        wins: show('stats') ? stats?.wins ?? 0 : null,
        games: show('stats') ? stats?.games ?? 0 : null,
        badgeCount: show('stats') ? badges?.length ?? 0 : null,
        maxStreak: show('stats') ? stats?.max_streak ?? 0 : null,
        majorWins: show('modes') ? stats?.major_wins ?? 0 : null,
        duelWins: show('modes') ? stats?.duel_wins ?? 0 : null,
        partyWins: show('modes') ? stats?.party_wins ?? 0 : null,
        dailyWins: show('modes') ? stats?.daily_wins ?? 0 : null,
        boxWins: show('box') ? stats?.box_wins ?? 0 : null,
        bestDrop: show('box') ? stats?.best_drop || readBoxStats(userId)?.bestDrop || null : null,
        careerMajorsWon: show('career') ? stats?.career_majors_won ?? 0 : null,
        careerBestSeason: show('career') ? stats?.career_best_season ?? 0 : null,
        careerSeasons: show('career') ? stats?.career_seasons ?? 0 : null,
        ultra: canSee ? hasUltra(badges) : false,
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
      publicSections: normalizePublicSections(self.publicSections),
      private: false,
      showcaseBadge: self.showcaseBadge || null,
      steamUrl: sanitizeSteamUrl(self.steamUrl).url,
      wins: stats?.wins ?? 0,
      games: stats?.games ?? 0,
      badgeCount: badges?.length ?? 0,
      maxStreak: stats?.max_streak ?? 0,
      majorWins: stats?.major_wins ?? 0,
      duelWins: stats?.duel_wins ?? 0,
      partyWins: stats?.party_wins ?? 0,
      dailyWins: stats?.daily_wins ?? 0,
      boxWins: stats?.box_wins ?? 0,
      bestDrop: stats?.best_drop || readBoxStats(userId)?.bestDrop || null,
      careerMajorsWon: stats?.career_majors_won ?? 0,
      careerBestSeason: stats?.career_best_season ?? 0,
      careerSeasons: stats?.career_seasons ?? 0,
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
      publicSections: normalizePublicSections(null),
      private: false,
      showcaseBadge: null,
      steamUrl: null,
      wins: null,
      games: null,
      badgeCount: null,
      maxStreak: null,
      majorWins: null,
      duelWins: null,
      partyWins: null,
      dailyWins: null,
      boxWins: null,
      bestDrop: null,
      careerMajorsWon: null,
      careerBestSeason: null,
      careerSeasons: null,
      ultra: false,
    }
  }

  const isPublic = known.profilePublic !== false
  const sections = normalizePublicSections(known.publicSections)
  const badges = isPublic ? await fetchUserBadges(userId) : []
  return {
    id: known.id,
    nickname: known.nickname || 'Player',
    avatarId: known.avatarId || 'crosshair',
    avatarUrl: sanitizeAvatarUrl(known.avatarUrl),
    profilePublic: isPublic,
    publicSections: sections,
    private: !isPublic,
    showcaseBadge: isPublic && sections.showcase ? known.showcaseBadge || null : null,
    steamUrl: isPublic && sections.steam ? sanitizeSteamUrl(known.steamUrl).url : null,
    wins: null,
    games: null,
    badgeCount: isPublic && sections.stats ? badges.length : null,
    maxStreak: null,
    majorWins: null,
    duelWins: null,
    partyWins: null,
    dailyWins: null,
    boxWins: null,
    bestDrop: isPublic && sections.box ? readBoxStats(userId)?.bestDrop || null : null,
    careerMajorsWon: null,
    careerBestSeason: null,
    careerSeasons: null,
    ultra: isPublic ? hasUltra(badges) : false,
  }
}
