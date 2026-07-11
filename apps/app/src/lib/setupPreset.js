import { ACTIVE_MAP_POOL, GAME_MODES, MENTALITIES } from '../data/constants'

const MODE_IDS = new Set(GAME_MODES.map((m) => m.id))
const MENTALITY_IDS = new Set(MENTALITIES.map((m) => m.id))
const MAP_IDS = new Set(ACTIVE_MAP_POOL)

export const DEFAULT_SETUP_PRESET = {
  setupPresetEnabled: false,
  setupPresetMode: 'classic',
  setupPresetMentality: 'tactical',
  setupPresetMap: 'Mirage',
}

export function normalizeSetupPresetFields(raw = {}) {
  const mode = MODE_IDS.has(raw.setupPresetMode) ? raw.setupPresetMode : 'classic'
  const mentality = MENTALITY_IDS.has(raw.setupPresetMentality)
    ? raw.setupPresetMentality
    : 'tactical'
  const map = MAP_IDS.has(raw.setupPresetMap) ? raw.setupPresetMap : 'Mirage'
  return {
    setupPresetEnabled: Boolean(raw.setupPresetEnabled),
    setupPresetMode: mode,
    setupPresetMentality: mentality,
    setupPresetMap: map,
  }
}

/**
 * Solo setup cfg from profile preset, or null when setup screen should show.
 * Friends rooms / vsCpu:false paths should not call this.
 */
export function resolveSoloSetupCfg(profile, { lockedMode = null, vsCpu = true } = {}) {
  const fields = normalizeSetupPresetFields(profile || {})
  if (!fields.setupPresetEnabled) return null
  return {
    mode: lockedMode || fields.setupPresetMode,
    mentality: fields.setupPresetMentality,
    mapPriority: fields.setupPresetMap,
    vsCpu,
  }
}

/** Initial step/cfg for solo mode runners (no friend room). */
export function initialSoloSetupState(profile, opts = {}) {
  const cfg = resolveSoloSetupCfg(profile, opts)
  if (!cfg) return { step: 'setup', cfg: null }
  return { step: 'draft', cfg }
}

/** Retry: keep preset skip, or return to setup when disabled. */
export function retrySoloSetupState(profile, opts = {}) {
  return initialSoloSetupState(profile, opts)
}
