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

export function resolveSeriesVeto(userTeam, enemyTeam, mentality, vetoOverride = null) {
  return (
    vetoOverride ||
    simulateMapVeto(
      userTeam.mapPriority || 'Mirage',
      enemyTeam.mapPoolBias || [],
      mentality?.id || 'tactical',
    )
  )
}

export function runDuelSeries(userTeam, enemyTeam, mentality, vetoOverride = null, tacticalCallsByMap = {}) {
  const veto = resolveSeriesVeto(userTeam, enemyTeam, mentality, vetoOverride)
  return simulateFullSeries(userTeam, enemyTeam, mentality, veto, tacticalCallsByMap)
}

export function buildGauntletOpponent(wave, seedStr) {
  const rand = mulberry32(hashString(`${seedStr}-wave-${wave}`))
  const rosters = getAllRosters()
  const roster = rosters[Math.floor(rand() * rosters.length)]
  const opp = buildOpponentFromRoster(roster, `g${wave}`)

  // Scale difficulty with wave
  const scale = 1 + Math.min(wave, 12) * 0.035
  for (const slot of Object.keys(opp.lineup)) {
    opp.lineup[slot] = {
      ...opp.lineup[slot],
      rating: Math.round(opp.lineup[slot].rating * scale * 100) / 100,
    }
  }
  opp.name = `${roster.team} · Wave ${wave}`
  opp.shortName = `${roster.shortName}`
  opp.wave = wave
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


