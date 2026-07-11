import { ROLES, MENTALITIES, MAPS } from '../data/constants'
import {
  buildOpponentFromRoster,
  emptyLineup,
  generateBracket,
  getAllRosters,
  lineupComplete,
  roleFitMultiplier,
} from '../engine/simulation'
import { buildUserTeam, teamPowerScore } from './gameModes'
import { hashString, mulberry32 } from './seed'
import { isSupabaseConfigured, supabase } from './supabase'

export const CAREER_WEEKS = 8
export const STARTING_BUDGET = 2500
export const WEEKLY_SALARY_DRAIN = true

export const PHASE = {
  SETUP: 'setup',
  HUB: 'hub',
  MARKET: 'market',
  CAMP: 'camp',
  MATCH: 'match',
  MAJOR: 'major',
  SEASON_END: 'season_end',
}

export const TIERS = [
  { id: 'academy', min: 0, labelKey: 'career.tierAcademy' },
  { id: 'contender', min: 250, labelKey: 'career.tierContender' },
  { id: 'elite', min: 500, labelKey: 'career.tierElite' },
  { id: 'dynasty', min: 800, labelKey: 'career.tierDynasty' },
]

export function tierForScore(score) {
  let t = TIERS[0]
  for (const row of TIERS) {
    if (score >= row.min) t = row
  }
  return t
}

export function contractCost(player) {
  const r = Number(player?.rating) || 1
  return Math.round(80 + r * r * 28)
}

export function weeklySalary(player) {
  return Math.max(8, Math.round(contractCost(player) * 0.06))
}

function flatPlayers() {
  const seen = new Set()
  const out = []
  for (const roster of getAllRosters()) {
    for (const p of roster.players || []) {
      if (seen.has(p.id)) continue
      seen.add(p.id)
      out.push({
        ...p,
        fromTeam: roster.shortName,
        fromEvent: roster.event,
        year: roster.year,
      })
    }
  }
  return out
}

export function allCareerPlayers() {
  return flatPlayers()
}

/** Starter pack: best available for each role under budget. */
export function createStarterLineup(seed = 'career-start') {
  const rng = mulberry32(hashString(String(seed)))
  const pool = flatPlayers()
  const lineup = emptyLineup()
  let budget = STARTING_BUDGET
  const used = new Set()

  for (const role of ROLES) {
    const candidates = pool
      .filter((p) => !used.has(p.id))
      .map((p) => ({
        p,
        score: roleFitMultiplier(role.id, p.role) * p.rating + rng() * 0.15,
        cost: contractCost(p),
      }))
      .filter((c) => c.cost <= budget * 0.45)
      .sort((a, b) => b.score - a.score)

    const pick = candidates[Math.floor(rng() * Math.min(6, candidates.length))] || candidates[0]
    if (pick) {
      used.add(pick.p.id)
      budget -= pick.cost
      lineup[role.id] = { ...pick.p, salary: weeklySalary(pick.p), buyout: pick.cost }
    }
  }
  return { lineup, budget: Math.max(120, budget) }
}

export function totalWeeklySalary(lineup) {
  return Object.values(lineup || {})
    .filter(Boolean)
    .reduce((s, p) => s + (Number(p.salary) || weeklySalary(p)), 0)
}

export function weekKind(week) {
  if (week === 4) return 'camp'
  if (week === 8) return 'qualifier'
  if (week > 8) return 'major'
  return 'league'
}

export function createNewCareerState({ orgName, nickname, seed }) {
  const s = seed || `career-${Date.now()}`
  const { lineup, budget } = createStarterLineup(s)
  return {
    version: 1,
    orgName: orgName || `${nickname || 'ORG'} FC`,
    season: 1,
    week: 1,
    phase: PHASE.HUB,
    budget,
    lineup,
    camp: null,
    record: { wins: 0, losses: 0 },
    results: [],
    majorsWonCareer: 0,
    seasonScore: 0,
    seed: s,
    mentalityId: 'tactical',
    mapPriority: 'Mirage',
  }
}

export function applyCamp(state, { type, value }) {
  return {
    ...state,
    camp: {
      type,
      value,
      weeksLeft: 2,
    },
    week: Math.max(state.week, 5),
    phase: PHASE.HUB,
  }
}

export function effectiveMentalityId(state) {
  if (state.camp?.type === 'mentality' && state.camp.weeksLeft > 0) {
    return state.camp.value || state.mentalityId
  }
  return state.mentalityId || 'tactical'
}

export function effectiveMapPriority(state) {
  if (state.camp?.type === 'map' && state.camp.weeksLeft > 0) {
    return state.camp.value || state.mapPriority
  }
  return state.mapPriority || 'Mirage'
}

export function buildCareerUserTeam(state) {
  return buildUserTeam(state.lineup, {
    mapPriority: effectiveMapPriority(state),
    mentalityId: effectiveMentalityId(state),
    name: state.orgName || 'Career Org',
    shortName: (state.orgName || 'YOU').slice(0, 8).toUpperCase(),
  })
}

export function buildWeekOpponent(state) {
  const rng = mulberry32(hashString(`${state.seed}-s${state.season}-w${state.week}`))
  const rosters = getAllRosters()
  const roster = rosters[Math.floor(rng() * rosters.length)]
  const opp = buildOpponentFromRoster(roster, `cw${state.week}`)
  const scale = 0.92 + Math.min(state.week, 8) * 0.02 + (state.season - 1) * 0.015
  for (const slot of Object.keys(opp.lineup || {})) {
    opp.lineup[slot] = {
      ...opp.lineup[slot],
      rating: Math.round(opp.lineup[slot].rating * scale * 100) / 100,
    }
  }
  opp.name = `${roster.team}`
  opp.shortName = roster.shortName
  return opp
}

export function scoreCareerSeason(state, { majorWon = false } = {}) {
  const power = teamPowerScore(
    state.lineup,
    effectiveMentalityId(state),
    effectiveMapPriority(state),
  )
  const { wins, losses } = state.record || { wins: 0, losses: 0 }
  return Math.round(
    wins * 55 -
      losses * 18 +
      power * 35 +
      (majorWon ? 220 : 0) +
      (state.majorsWonCareer || 0) * 40 +
      state.season * 15,
  )
}

export function afterMatchResult(state, { won, opponentName }) {
  const salary = totalWeeklySalary(state.lineup)
  let budget = state.budget - (WEEKLY_SALARY_DRAIN ? salary : 0)
  if (won) budget += 90 + state.week * 8
  else budget += 25

  const camp =
    state.camp && state.camp.weeksLeft > 0
      ? { ...state.camp, weeksLeft: state.camp.weeksLeft - 1 }
      : state.camp?.weeksLeft === 0
        ? null
        : state.camp

  const record = {
    wins: (state.record?.wins || 0) + (won ? 1 : 0),
    losses: (state.record?.losses || 0) + (won ? 0 : 1),
  }
  const results = [
    ...(state.results || []),
    { week: state.week, won, opponentName, kind: weekKind(state.week) },
  ]

  let week = state.week + 1
  let phase = PHASE.HUB
  if (week === 4) phase = PHASE.CAMP
  else if (week > CAREER_WEEKS) phase = PHASE.MAJOR

  return {
    ...state,
    budget: Math.max(0, budget),
    camp: camp && camp.weeksLeft === 0 ? null : camp,
    record,
    results,
    week,
    phase,
    seasonScore: scoreCareerSeason({ ...state, record }, { majorWon: false }),
  }
}

export function afterMajorResult(state, { won, wins, losses }) {
  const majorsWonCareer = (state.majorsWonCareer || 0) + (won ? 1 : 0)
  const next = {
    ...state,
    record: {
      wins: (state.record?.wins || 0) + (wins || 0),
      losses: (state.record?.losses || 0) + (losses || 0),
    },
    majorsWonCareer,
    budget: state.budget + (won ? 400 : 120),
    phase: PHASE.SEASON_END,
    majorResult: { won, wins, losses },
  }
  next.seasonScore = scoreCareerSeason(next, { majorWon: won })
  return next
}

export function startNextSeason(state) {
  const { lineup, budget: starterBudget } = createStarterLineup(`${state.seed}-s${state.season + 1}`)
  // Carry roster; top up budget partially
  return {
    ...state,
    season: state.season + 1,
    week: 1,
    phase: PHASE.HUB,
    budget: Math.max(400, Math.floor(state.budget * 0.55) + 350),
    lineup: lineupComplete(state.lineup) ? state.lineup : lineup,
    camp: null,
    record: { wins: 0, losses: 0 },
    results: [],
    majorResult: null,
    seasonScore: 0,
    mapPriority: state.mapPriority || 'Mirage',
    mentalityId: state.mentalityId || 'tactical',
    // keep majorsWonCareer
  }
}

export function releasePlayer(state, slotId) {
  const player = state.lineup?.[slotId]
  if (!player) return state
  const refund = Math.round((player.buyout || contractCost(player)) * 0.35)
  const lineup = { ...state.lineup, [slotId]: null }
  return {
    ...state,
    lineup,
    budget: state.budget + refund,
  }
}

export function signPlayer(state, slotId, player) {
  if (!player || state.lineup?.[slotId]) return { ok: false, error: 'slot_taken' }
  const cost = contractCost(player)
  if (state.budget < cost) return { ok: false, error: 'broke' }
  const owned = new Set(Object.values(state.lineup || {}).filter(Boolean).map((p) => p.id))
  if (owned.has(player.id)) return { ok: false, error: 'owned' }
  const lineup = {
    ...state.lineup,
    [slotId]: {
      ...player,
      salary: weeklySalary(player),
      buyout: cost,
    },
  }
  return {
    ok: true,
    state: {
      ...state,
      lineup,
      budget: state.budget - cost,
    },
  }
}

export function marketPool(state, { role = null, limit = 24 } = {}) {
  const owned = new Set(Object.values(state.lineup || {}).filter(Boolean).map((p) => p.id))
  const rng = mulberry32(hashString(`${state.seed}-market-s${state.season}-w${state.week}`))
  let pool = flatPlayers().filter((p) => !owned.has(p.id))
  if (role) pool = pool.filter((p) => roleFitMultiplier(role, p.role) >= 0.85 || p.role === role)
  // Shuffle deterministically
  pool = [...pool].sort((a, b) => hashString(a.id + state.seed) - hashString(b.id + state.seed))
  const slice = pool.slice(0, Math.min(limit * 2, pool.length))
  // Prefer mid-tier variety
  return slice
    .sort((a, b) => Math.abs(a.rating - 1.1) - Math.abs(b.rating - 1.1) + (rng() - 0.5) * 0.2)
    .slice(0, limit)
    .map((p) => ({ ...p, cost: contractCost(p), salary: weeklySalary(p) }))
}

export function buildCareerMajorBracket(state) {
  const team = buildCareerUserTeam(state)
  const used = Object.values(state.lineup || {})
    .filter(Boolean)
    .map((p) => p.fromTeam)
    .filter(Boolean)
  return generateBracket(team, used)
}

export async function loadCareerSave() {
  if (!isSupabaseConfigured) return { ok: false, error: 'no_supabase' }
  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData?.session?.user) return { ok: false, error: 'not_authenticated' }
  const { data, error } = await supabase.rpc('get_career_save')
  if (error) return { ok: false, error: error.message }
  if (!data?.exists || !data?.state || Object.keys(data.state).length === 0) {
    return { ok: true, exists: false, state: null, seasonScore: 0, majorsWon: 0 }
  }
  return {
    ok: true,
    exists: true,
    state: data.state,
    seasonScore: data.season_score || 0,
    majorsWon: data.majors_won || 0,
  }
}

export async function saveCareerSave(state) {
  if (!isSupabaseConfigured) return { ok: false, error: 'no_supabase' }
  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData?.session?.user) return { ok: false, error: 'not_authenticated' }
  const score = state.seasonScore || scoreCareerSeason(state, { majorWon: Boolean(state.majorResult?.won) })
  const { data, error } = await supabase.rpc('upsert_career_save', {
    p_state: state,
    p_season_score: score,
    p_majors_won: state.majorsWonCareer || 0,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true, ...data }
}

export { MENTALITIES, MAPS, lineupComplete, emptyLineup }
