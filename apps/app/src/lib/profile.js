import { DEFAULT_AVATAR_ID } from '../data/avatars'
import { DEFAULT_SETUP_PRESET, normalizeSetupPresetFields } from './setupPreset'

const KEY = 'cs4fun_profile'

export function loadProfile() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const p = JSON.parse(raw)
      if (!p.avatarId) p.avatarId = DEFAULT_AVATAR_ID
      return { ...p, ...normalizeSetupPresetFields(p) }
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
    ...DEFAULT_SETUP_PRESET,
    createdAt: Date.now(),
  }
  saveProfile(profile)
  return profile
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile))
  } catch {
    /* ignore */
  }
  return profile
}

export function displayName(profile) {
  return profile?.nickname?.trim() || 'Guest'
}
