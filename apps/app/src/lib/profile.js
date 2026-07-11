import { DEFAULT_AVATAR_ID } from '../data/avatars'
import { DEFAULT_SETUP_PRESET, normalizeSetupPresetFields } from './setupPreset'
import { DEFAULT_PUBLIC_SECTIONS, normalizePublicSections } from './publicSections'

const KEY = 'cs4fun_profile'

const GUEST_PREFIXES = [
  'Ace',
  'Clutch',
  'Flash',
  'Smoke',
  'Entry',
  'Lurk',
  'Nade',
  'Eco',
  'Spray',
  'Peek',
  'Trade',
  'Rush',
  'Hold',
  'Bait',
  'Frag',
  'Aim',
]

/** Short random tag for guests so lobby join works without an account. */
export function randomGuestTag() {
  const prefix = GUEST_PREFIXES[Math.floor(Math.random() * GUEST_PREFIXES.length)]
  const suffix = Math.random().toString(36).slice(2, 6)
  return `${prefix}${suffix}`.slice(0, 16)
}

/** Persist a guest tag when nickname is empty. Returns the (possibly updated) profile. */
export function ensureGuestNickname(profile) {
  if (!profile) return profile
  if (String(profile.nickname || '').trim()) return profile
  return saveProfile({ ...profile, nickname: randomGuestTag() })
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const p = JSON.parse(raw)
      if (!p.avatarId) p.avatarId = DEFAULT_AVATAR_ID
      const loaded = {
        ...p,
        ...normalizeSetupPresetFields(p),
        publicSections: normalizePublicSections(p.publicSections),
      }
      return ensureGuestNickname(loaded)
    }
  } catch {
    /* ignore */
  }
  const id = `p_${Math.random().toString(36).slice(2, 10)}`
  const profile = {
    id,
    nickname: randomGuestTag(),
    avatarId: DEFAULT_AVATAR_ID,
    avatarUrl: null,
    showcaseBadge: null,
    steamUrl: null,
    profilePublic: true,
    publicSections: { ...DEFAULT_PUBLIC_SECTIONS },
    ...DEFAULT_SETUP_PRESET,
    createdAt: Date.now(),
  }
  saveProfile(profile)
  return profile
}

export function saveProfile(profile) {
  const next = {
    ...profile,
    publicSections: normalizePublicSections(profile?.publicSections),
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  return next
}

export function displayName(profile) {
  return profile?.nickname?.trim() || 'Player'
}
