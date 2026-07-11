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
/** Starting org war chest (USD). Real CS orgs operate well above mid-six figures. */
export const STARTING_BUDGET = 500_000
export const MIN_OPERATING_BUDGET = 80_000
export const WEEKLY_SALARY_DRAIN = true
export const ECONOMY_VERSION = 2

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

/** Buyout / signing fee in USD — stars land in the mid–high six figures. */
export function contractCost(player) {
  const r = Math.max(0.85, Number(player?.rating) || 1)
  return Math.round(55_000 + r * r * 95_000)
}

/** Weekly wage in USD. */
export function weeklySalary(player) {
  return Math.max(2_500, Math.round(contractCost(player) * 0.045))
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
      .filter((c) => c.cost <= budget * 0.28)
      .sort((a, b) => b.score - a.score)

    const pick = candidates[Math.floor(rng() * Math.min(8, candidates.length))] || candidates[0]
    if (pick) {
      used.add(pick.p.id)
      budget -= pick.cost
      lineup[role.id] = { ...pick.p, salary: weeklySalary(pick.p), buyout: pick.cost }
    }
  }
  return { lineup, budget: Math.max(MIN_OPERATING_BUDGET, budget) }
}

export function createNewCareerState({
  orgName,
  shortName,
  orgLogo = null,
  nickname,
  seed,
}) {
  const s = seed || `career-${Date.now()}`
  const { lineup, budget } = createStarterLineup(s)
  const name = String(orgName || `${nickname || 'ORG'}`).trim().slice(0, 32) || 'My Org'
  const tag =
    String(shortName || name)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8) || 'ORG'
  return {
    version: ECONOMY_VERSION,
    orgName: name,
    shortName: tag,
    orgLogo: orgLogo || null,
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

/** Reprice old tiny-economy saves into USD org scale. */
export function migrateCareerState(state) {
  if (!state || typeof state !== 'object') return state
  if ((state.version || 1) >= ECONOMY_VERSION) {
    return {
      ...state,
      shortName:
        state.shortName ||
        String(state.orgName || 'ORG')
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .slice(0, 8) ||
        'ORG',
      orgLogo: state.orgLogo || null,
    }
  }

  const lineup = { ...(state.lineup || {}) }
  for (const role of ROLES) {
    const p = lineup[role.id]
    if (!p) continue
    lineup[role.id] = {
      ...p,
      salary: weeklySalary(p),
      buyout: contractCost(p),
    }
  }

  let budget = Number(state.budget) || 0
  if (budget < 100_000) {
    budget = Math.max(MIN_OPERATING_BUDGET, Math.round(budget * 200))
  }

  return {
    ...state,
    version: ECONOMY_VERSION,
    budget,
    lineup,
    shortName:
      state.shortName ||
      String(state.orgName || 'ORG')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 8) ||
      'ORG',
    orgLogo: state.orgLogo || null,
  }
}

export function updateOrgIdentity(state, { orgName, shortName, orgLogo }) {
  const name =
    orgName != null ? String(orgName).trim().slice(0, 32) || state.orgName : state.orgName
  const tag =
    shortName != null
      ? String(shortName)
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .slice(0, 8) || state.shortName
      : state.shortName
  return {
    ...state,
    orgName: name,
    shortName: tag,
    orgLogo: orgLogo === undefined ? state.orgLogo : orgLogo,
  }
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
    shortName: (state.shortName || state.orgName || 'YOU').slice(0, 8).toUpperCase(),
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
  if (won) budget += 35_000 + state.week * 5_000
  else budget += 12_000
  // Org growth stipend each week
  budget += 8_000 + Math.min(state.season, 8) * 2_000

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
    {
      week: state.week,
      season: state.season,
      won,
      opponentName,
      kind: weekKind(state.week),
      scoreDelta: won ? 90 + state.week * 8 : 25,
      power: teamPowerScore(
        state.lineup,
        effectiveMentalityId(state),
        effectiveMapPriority(state),
      ),
      at: Date.now(),
    },
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
    budget: state.budget + (won ? 250_000 : 45_000),
    phase: PHASE.SEASON_END,
    majorResult: { won, wins, losses },
  }
  next.seasonScore = scoreCareerSeason(next, { majorWon: won })
  return next
}

export function startNextSeason(state) {
  const { lineup } = createStarterLineup(`${state.seed}-s${state.season + 1}`)
  // Carry roster; top up war chest for the new campaign
  const carried = Math.floor(state.budget * 0.65)
  return {
    ...state,
    season: state.season + 1,
    week: 1,
    phase: PHASE.HUB,
    budget: Math.max(350_000, carried + 120_000),
    lineup: lineupComplete(state.lineup) ? state.lineup : lineup,
    camp: null,
    record: { wins: 0, losses: 0 },
    results: [],
    majorResult: null,
    seasonScore: 0,
    mapPriority: state.mapPriority || 'Mirage',
    mentalityId: state.mentalityId || 'tactical',
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

export function marketPool(state, { role = null, query = '', sort = 'rating', limit = 0 } = {}) {
  const owned = new Set(Object.values(state.lineup || {}).filter(Boolean).map((p) => p.id))
  let pool = flatPlayers()
    .filter((p) => !owned.has(p.id))
    .map((p) => ({ ...p, cost: contractCost(p), salary: weeklySalary(p) }))

  if (role) {
    pool = pool.filter((p) => roleFitMultiplier(role, p.role) >= 0.85 || p.role === role)
  }

  const q = String(query || '')
    .trim()
    .toLowerCase()
  if (q) {
    pool = pool.filter((p) => {
      const hay = `${p.name} ${p.realName || ''} ${p.fromTeam || ''} ${p.fromEvent || ''} ${p.role || ''} ${p.year || ''}`
      return hay.toLowerCase().includes(q)
    })
  }

  if (sort === 'cost') pool.sort((a, b) => a.cost - b.cost || b.rating - a.rating)
  else if (sort === 'cost_desc') pool.sort((a, b) => b.cost - a.cost || b.rating - a.rating)
  else if (sort === 'name') pool.sort((a, b) => a.name.localeCompare(b.name))
  else if (sort === 'team') pool.sort((a, b) => String(a.fromTeam).localeCompare(String(b.fromTeam)) || b.rating - a.rating)
  else pool.sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name))

  if (limit > 0) return pool.slice(0, limit)
  return pool
}

export function rosterPower(state) {
  return teamPowerScore(
    state.lineup,
    effectiveMentalityId(state),
    effectiveMapPriority(state),
  )
}

export function nextTierProgress(score) {
  const s = Number(score) || 0
  const current = tierForScore(s)
  const idx = TIERS.findIndex((t) => t.id === current.id)
  const next = TIERS[idx + 1]
  if (!next) {
    return { current, next: null, pct: 1, remaining: 0 }
  }
  const span = Math.max(1, next.min - current.min)
  const pct = Math.min(1, Math.max(0, (s - current.min) / span))
  return { current, next, pct, remaining: Math.max(0, next.min - s) }
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
  // Guests / anon never reach here — server also rejects not_authenticated + banned
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
