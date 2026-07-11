import { DEFAULT_AVATAR_ID } from '../data/avatars'
import { DEFAULT_SETUP_PRESET, normalizeSetupPresetFields } from './setupPreset'
import { DEFAULT_PUBLIC_SECTIONS, normalizePublicSections } from './publicSections'

const KEY = 'cs4fun_profile'

export function loadProfile() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const p = JSON.parse(raw)
      if (!p.avatarId) p.avatarId = DEFAULT_AVATAR_ID
      return {
        ...p,
        ...normalizeSetupPresetFields(p),
        publicSections: normalizePublicSections(p.publicSections),
      }
    }
  } catch {
    /* ignore */
  }
  const id = `p_${Math.random().toString(36).slice(2, 10)}`
  const profile = {
    id,
    nickname: '',
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
