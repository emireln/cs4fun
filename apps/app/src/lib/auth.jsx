import { useEffect, useState, createContext, useContext, useCallback, useMemo, useRef } from 'react'
import { isSupabaseConfigured, supabase } from './supabase'
import { loadProfile, saveProfile, displayName } from './profile'
import { sanitizeAvatarUrl } from './avatarImage'
import { sanitizeSteamUrl } from './steam'
import { fetchMyAccess } from './admin'
import { DEFAULT_SETUP_PRESET, normalizeSetupPresetFields } from './setupPreset'

const AuthContext = createContext(null)

const EMPTY_ACCESS = {
  isAdmin: false,
  banned: false,
  banReason: null,
  sessionsRevokedAt: null,
}

/** Guest local ids are `p_……`; signed-in profiles use auth UUIDs. */
function isAuthUserId(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(id || ''),
  )
}

function jwtIssuedAtMs(accessToken) {
  try {
    const part = String(accessToken || '').split('.')[1]
    if (!part) return 0
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(json)
    return Number(payload?.iat || 0) * 1000
  } catch {
    return 0
  }
}

function isSessionRevoked(access, session) {
  if (!access?.sessionsRevokedAt || !session?.access_token) return false
  const revoked = new Date(access.sessionsRevokedAt).getTime()
  if (!Number.isFinite(revoked) || revoked <= 0) return false
  const issued = jwtIssuedAtMs(session.access_token)
  return issued > 0 && revoked > issued
}

async function resolveLiveSession() {
  if (!isSupabaseConfigured) return null
  const { data } = await supabase.auth.getSession()
  if (data.session?.user) return data.session
  const refreshed = await supabase.auth.refreshSession()
  return refreshed.data.session ?? null
}

function mergeUserProfile(user, local = loadProfile()) {
  const preset = normalizeSetupPresetFields(local)
  return saveProfile({
    ...local,
    ...preset,
    id: user.id,
    nickname:
      user.user_metadata?.nickname ||
      local.nickname ||
      user.email?.split('@')[0] ||
      '',
    email: user.email,
    avatarId: user.user_metadata?.avatarId || local.avatarId || 'cs4fun',
    avatarUrl: sanitizeAvatarUrl(local.avatarUrl),
    showcaseBadge: user.user_metadata?.showcaseBadge ?? local.showcaseBadge ?? null,
    steamUrl: sanitizeSteamUrl(local.steamUrl).url,
    profilePublic: local.profilePublic !== false,
  })
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(() => {
    const p = loadProfile()
    if (!p.avatarId) p.avatarId = 'cs4fun'
    p.avatarUrl = sanitizeAvatarUrl(p.avatarUrl)
    p.steamUrl = sanitizeSteamUrl(p.steamUrl).url
    if (p.profilePublic == null) p.profilePublic = true
    Object.assign(p, normalizeSetupPresetFields(p))
    return p
  })
  const [loading, setLoading] = useState(true)
  const [access, setAccess] = useState(EMPTY_ACCESS)
  const profileRef = useRef(profile)
  const hydrateGen = useRef(0)

  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  const refreshAccess = useCallback(async (user) => {
    if (!user || !isSupabaseConfigured) {
      setAccess(EMPTY_ACCESS)
      return EMPTY_ACCESS
    }
    const next = await fetchMyAccess()
    setAccess(next)
    return next
  }, [])

  const hydrateFromDb = useCallback(async (user) => {
    const gen = ++hydrateGen.current
    let next = mergeUserProfile(user, profileRef.current)
    if (isSupabaseConfigured) {
      const { data } = await supabase
        .from('profiles')
        .select(
          'nickname, avatar_id, avatar_url, showcase_badge, email, steam_url, profile_public, setup_preset_enabled, setup_preset_mode, setup_preset_mentality, setup_preset_map',
        )
        .eq('id', user.id)
        .maybeSingle()
      if (gen !== hydrateGen.current) return
      if (data) {
        next = saveProfile({
          ...next,
          nickname: data.nickname || next.nickname,
          email: data.email || next.email,
          avatarId: data.avatar_id || next.avatarId || 'cs4fun',
          avatarUrl: sanitizeAvatarUrl(data.avatar_url) ?? sanitizeAvatarUrl(next.avatarUrl),
          showcaseBadge: data.showcase_badge ?? next.showcaseBadge ?? null,
          steamUrl: sanitizeSteamUrl(data.steam_url).url,
          profilePublic: data.profile_public !== false,
          ...normalizeSetupPresetFields({
            setupPresetEnabled: data.setup_preset_enabled,
            setupPresetMode: data.setup_preset_mode,
            setupPresetMentality: data.setup_preset_mentality,
            setupPresetMap: data.setup_preset_map,
          }),
        })
      }
    }
    if (gen !== hydrateGen.current) return
    setProfile(next)
    await refreshAccess(user)
  }, [refreshAccess])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return undefined
    }

    let cancelled = false

    const applySession = (next, event = null) => {
      if (cancelled) return

      if (next?.user) {
        setSession(next)
        queueMicrotask(() => {
          if (!cancelled) hydrateFromDb(next.user)
        })
        return
      }

      // Explicit logout / account delete — clear. Boot resolve with null — clear.
      // Other null callbacks (e.g. ambiguous INITIAL_SESSION) must not flip a live
      // signed-in React session to Guest while local profile data is still present.
      if (!event || event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setSession(null)
        queueMicrotask(() => {
          if (!cancelled) setAccess(EMPTY_ACCESS)
        })
      }
    }

    ;(async () => {
      let live = await resolveLiveSession()
      if (cancelled) return

      // Local profile still looks signed-in (UUID + email) but storage session was stale.
      if (!live?.user && isAuthUserId(profileRef.current?.id) && profileRef.current?.email) {
        const again = await supabase.auth.refreshSession()
        live = again.data.session ?? null
      }

      applySession(live)
      if (!cancelled) setLoading(false)
    })()

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      applySession(next, event)
    })

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      resolveLiveSession().then((live) => {
        if (cancelled || !live?.user) return
        setSession((prev) => (prev?.user?.id === live.user.id ? prev : live))
      })
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [hydrateFromDb])

  const updateProfile = useCallback(async (patch) => {
    const prev = profileRef.current
    const avatarUrl =
      patch.avatarUrl !== undefined
        ? sanitizeAvatarUrl(patch.avatarUrl)
        : sanitizeAvatarUrl(prev.avatarUrl)

    if (patch.avatarUrl !== undefined && patch.avatarUrl && !avatarUrl) {
      return { error: 'avatar_invalid' }
    }

    let steamUrl = prev.steamUrl || null
    if (patch.steamUrl !== undefined) {
      const steam = sanitizeSteamUrl(patch.steamUrl)
      if (!steam.ok) return { error: 'steam_invalid' }
      steamUrl = steam.url
    }

    const preset = normalizeSetupPresetFields({
      setupPresetEnabled:
        patch.setupPresetEnabled !== undefined ? patch.setupPresetEnabled : prev.setupPresetEnabled,
      setupPresetMode: patch.setupPresetMode !== undefined ? patch.setupPresetMode : prev.setupPresetMode,
      setupPresetMentality:
        patch.setupPresetMentality !== undefined
          ? patch.setupPresetMentality
          : prev.setupPresetMentality,
      setupPresetMap: patch.setupPresetMap !== undefined ? patch.setupPresetMap : prev.setupPresetMap,
    })

    const next = saveProfile({
      ...prev,
      ...patch,
      ...preset,
      nickname: patch.nickname != null ? String(patch.nickname).slice(0, 16) : prev.nickname,
      avatarUrl,
      steamUrl,
      profilePublic: patch.profilePublic !== undefined ? Boolean(patch.profilePublic) : prev.profilePublic !== false,
    })
    profileRef.current = next
    setProfile(next)

    if (!isSupabaseConfigured) return next

    const liveSession = await resolveLiveSession()

    if (!liveSession?.user) {
      // Do not clear React session on a transient refresh failure — that flipped signed-in
      // users to Guest while their nickname/avatar were still in localStorage.
      return { error: 'not_authenticated', profile: next }
    }

    setSession(liveSession)

    // JWT metadata is optional; preset + profile fields live on `profiles`
    const { error: metaError } = await supabase.auth.updateUser({
      data: {
        nickname: next.nickname,
        avatarId: next.avatarId,
        showcaseBadge: next.showcaseBadge,
      },
    })

    const { error: upsertError } = await supabase.from('profiles').upsert({
      id: liveSession.user.id,
      nickname: next.nickname || 'Player',
      email: liveSession.user.email,
      avatar_id: next.avatarId || 'cs4fun',
      avatar_url: next.avatarUrl || null,
      showcase_badge: next.showcaseBadge || null,
      steam_url: next.steamUrl || null,
      profile_public: next.profilePublic !== false,
      setup_preset_enabled: next.setupPresetEnabled,
      setup_preset_mode: next.setupPresetMode,
      setup_preset_mentality: next.setupPresetMentality,
      setup_preset_map: next.setupPresetMap,
      updated_at: new Date().toISOString(),
    })

    if (upsertError) {
      return { error: upsertError.message || 'save_failed', profile: next }
    }

    // Ignore metadata-only auth glitches if the profiles row saved
    if (metaError && !/auth session missing/i.test(metaError.message || '')) {
      return { error: metaError.message || 'save_failed', profile: next }
    }

    return next
  }, [])

  const updateNickname = useCallback(
    async (nickname) => updateProfile({ nickname }),
    [updateProfile],
  )

  const signUp = useCallback(async ({ email, password, nickname }) => {
    if (!isSupabaseConfigured) return { error: 'no_supabase' }
    const nick = nickname || email.split('@')[0]
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nickname: nick,
          avatarId: 'cs4fun',
          showcaseBadge: null,
        },
      },
    })
    if (error) return { error: error.message }
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        nickname: nick,
        email,
        avatar_id: 'cs4fun',
        showcase_badge: null,
      })
    }
    return { data }
  }, [])

  const signIn = useCallback(async ({ email, password }) => {
    if (!isSupabaseConfigured) return { error: 'no_supabase' }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { data }
  }, [])

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut()
    const guest = saveProfile({
      id: `p_${Math.random().toString(36).slice(2, 10)}`,
      nickname: '',
      avatarId: 'cs4fun',
      avatarUrl: null,
      showcaseBadge: null,
      steamUrl: null,
      profilePublic: true,
      ...DEFAULT_SETUP_PRESET,
      createdAt: Date.now(),
    })
    profileRef.current = guest
    setProfile(guest)
    setSession(null)
    setAccess(EMPTY_ACCESS)
  }, [])

  // Re-check ban / force-signout while signed in (admin actions take effect without reload)
  useEffect(() => {
    if (!isSupabaseConfigured || !session?.user) return undefined
    let cancelled = false

    const tick = async () => {
      const next = await refreshAccess(session.user)
      if (cancelled) return
      // Banned users stay signed-in so BannedScreen can render; force-signout clears the session.
      if (!next.banned && isSessionRevoked(next, session)) {
        await signOut()
      }
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }

    const id = window.setInterval(tick, 45_000)
    document.addEventListener('visibilitychange', onVisible)
    tick()

    return () => {
      cancelled = true
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [session, refreshAccess, signOut])

  const changePassword = useCallback(
    async ({ currentPassword, newPassword }) => {
      if (!isSupabaseConfigured) return { error: 'no_supabase' }
      if (!session?.user?.email) return { error: 'not_authenticated' }
      if (!newPassword || newPassword.length < 6) return { error: 'password_short' }

      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: currentPassword,
      })
      if (reauthError) return { error: 'wrong_password' }

      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) return { error: error.message }
      return { ok: true }
    },
    [session],
  )

  const deleteAccount = useCallback(
    async ({ email, tag }) => {
      if (!isSupabaseConfigured) return { error: 'no_supabase' }
      if (!session?.user) return { error: 'not_authenticated' }

      const mail = String(email || '').trim().toLowerCase()
      const nick = String(tag || '').trim()
      if (mail !== String(session.user.email || '').toLowerCase()) {
        return { error: 'email_mismatch' }
      }
      if (nick.toLowerCase() !== String(profile.nickname || '').trim().toLowerCase()) {
        return { error: 'tag_mismatch' }
      }

      const { error } = await supabase.rpc('delete_own_account')
      if (error) return { error: error.message || 'delete_failed' }

      await signOut()
      return { ok: true }
    },
    [session, profile.nickname, signOut],
  )

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      access,
      isAdmin: Boolean(access.isAdmin),
      isBanned: Boolean(access.banned),
      isAuthed: Boolean(session?.user),
      displayName: displayName(profile),
      updateNickname,
      updateProfile,
      signUp,
      signIn,
      signOut,
      changePassword,
      deleteAccount,
      refreshAccess,
    }),
    [
      session,
      profile,
      loading,
      access,
      updateNickname,
      updateProfile,
      signUp,
      signIn,
      signOut,
      changePassword,
      deleteAccount,
      refreshAccess,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth within AuthProvider')
  return ctx
}
