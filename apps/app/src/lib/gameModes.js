import { MENTALITIES } from '../data/constants'
import {
  buildOpponentFromRoster,
  computeTeamPower,
  emptyLineup,
  getAllRosters,
  lineupComplete,
  roleFitMultiplier,
  simulateFullSeries,
  simulateMapVeto,
} from '../engine/simulation'
import { generateSharedRolls, mulberry32, hashString } from './seed'

export function teamPowerScore(lineup, mentalityId = 'tactical', mapPriority = 'Mirage') {
  const mentality = MENTALITIES.find((m) => m.id === mentalityId) || MENTALITIES[1]
  return computeTeamPower(lineup, mentality, mapPriority).avg
}

export function buildUserTeam(lineup, { mapPriority, mentalityId, name = 'Dream Five', shortName = 'YOU' }) {
  return {
    id: 'user-dream-five',
    name,
    shortName,
    event: 'cs4fun',
    year: new Date().getFullYear(),
    mapPriority,
    mapPoolBias: [mapPriority, ...Object.values(lineup).flatMap((p) => p?.bestMaps || [])],
    lineup,
    mentalityId,
    isUser: true,
  }
}

export function autoDraftCpu(rolls, mentalityId = 'tactical') {
  const lineup = emptyLineup()
  const slots = ['IGL', 'AWPer', 'Entry', 'Lurker', 'Support']
  const usedPlayers = new Set()

  rolls.forEach((roster, idx) => {
    const slot = slots[idx]
    const candidates = roster.players
      .filter((p) => !usedPlayers.has(p.id))
      .map((p) => ({
        p,
        score: roleFitMultiplier(slot, p.role) * p.rating,
      }))
      .sort((a, b) => b.score - a.score)
    const best = candidates[0]?.p
    if (best) {
      usedPlayers.add(best.id)
      lineup[slot] = {
        ...best,
        fromTeam: roster.shortName,
        fromEvent: roster.event,
      }
    }
  })

  return lineup
}

export function resolveSeriesVeto(userTeam, enemyTeam, mentality, vetoOverride = null, { bestOf = 3 } = {}) {
  return (
    vetoOverride ||
    simulateMapVeto(
      userTeam.mapPriority || 'Mirage',
      enemyTeam.mapPoolBias || [],
      mentality?.id || 'tactical',
      { bestOf },
    )
  )
}

export function runDuelSeries(userTeam, enemyTeam, mentality, vetoOverride = null, tacticalCallsByMap = {}) {
  const veto = resolveSeriesVeto(userTeam, enemyTeam, mentality, vetoOverride, { bestOf: 1 })
  return simulateFullSeries(userTeam, enemyTeam, mentality, veto, tacticalCallsByMap)
}

/** Funny cursed modifiers that stack with wave difficulty. */
const GAUNTLET_CHAOS = [
  { id: 'jetlag', en: 'Jet-lagged AWPer', pt: 'AWPer com jet lag', scale: 1.04 },
  { id: 'energy', en: '3rd energy drink', pt: '3º energético', scale: 1.06 },
  { id: 'coach', en: 'Coach on voice', pt: 'Coach no voice', scale: 1.08 },
  { id: 'bootcamp', en: 'Bootcamp leftovers', pt: 'Restos do bootcamp', scale: 1.1 },
  { id: 'major', en: 'Major or bust', pt: 'Major ou nada', scale: 1.12 },
  { id: 'cursed', en: 'Cursed USB stick', pt: 'Pen drive amaldiçoado', scale: 1.15 },
  { id: 'goat', en: 'They found the GOAT', pt: 'Acharam o GOAT', scale: 1.18 },
]

export function gauntletChaosForWave(wave, seedStr) {
  const rand = mulberry32(hashString(`${seedStr}-chaos-${wave}`))
  const base = GAUNTLET_CHAOS[Math.min(wave - 1, GAUNTLET_CHAOS.length - 1)]
  // Occasionally swap for a random curse so waves feel different
  const pickIdx = Math.floor(rand() * Math.min(wave, GAUNTLET_CHAOS.length))
  const chaos = GAUNTLET_CHAOS[pickIdx] || base
  return {
    ...chaos,
    label: chaos.en,
    waveScale: 1 + Math.min(wave, 12) * 0.035,
  }
}

export function buildGauntletOpponent(wave, seedStr) {
  const rand = mulberry32(hashString(`${seedStr}-wave-${wave}`))
  const rosters = getAllRosters()
  const roster = rosters[Math.floor(rand() * rosters.length)]
  const opp = buildOpponentFromRoster(roster, `g${wave}`)
  const chaos = gauntletChaosForWave(wave, seedStr)

  const scale = chaos.waveScale * chaos.scale
  for (const slot of Object.keys(opp.lineup)) {
    opp.lineup[slot] = {
      ...opp.lineup[slot],
      rating: Math.round(opp.lineup[slot].rating * scale * 100) / 100,
    }
  }
  opp.name = `${roster.team} · Wave ${wave}`
  opp.shortName = `${roster.shortName}`
  opp.wave = wave
  opp.chaos = chaos
  return opp
}

export function scoreMajorRun({ wins, losses, lineup, mentalityId, mapPriority }) {
  const power = teamPowerScore(lineup, mentalityId, mapPriority)
  return Math.round(wins * 120 - losses * 40 + power * 40 + (wins === 3 ? 100 : 0))
}

export function scoreDaily({ wins, losses, lineup, mentalityId, mapPriority }) {
  return scoreMajorRun({ wins, losses, lineup, mentalityId, mapPriority })
}

export function scoreGauntlet(streak, lineup, mentalityId, mapPriority) {
  const power = teamPowerScore(lineup, mentalityId, mapPriority)
  return Math.round(streak * 85 + power * 25)
}

export function scoreDuel(won, series) {
  const mapDiff = (series?.userMaps || 0) - (series?.enemyMaps || 0)
  return Math.round((won ? 100 : 20) + mapDiff * 15 + (series?.maps?.length || 0) * 5)
}

export { generateSharedRolls, dailySeed } from './seed'
export { lineupComplete, emptyLineup } from '../engine/simulation'


