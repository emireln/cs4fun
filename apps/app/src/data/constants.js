export const ROLES = [
  { id: 'IGL', label: 'IGL', short: 'IGL', description: 'In-Game Leader — calls, mid-rounds, utility timing', icon: 'Crown' },
  { id: 'AWPer', label: 'AWPer', short: 'AWP', description: 'Primary sniper — picks, holds, multi-kills', icon: 'Crosshair' },
  { id: 'Entry', label: 'Entry Fragger', short: 'ENT', description: 'First contact — opens sites, trades', icon: 'Zap' },
  { id: 'Lurker', label: 'Lurker', short: 'LRK', description: 'Flank info — timing, clutches, rotations', icon: 'Eye' },
  { id: 'Support', label: 'Support', short: 'SUP', description: 'Utility, flashes, trades, anchoring', icon: 'Shield' },
]

export const MENTALITIES = [
  {
    id: 'aggressive',
    label: 'Aggressive',
    description: 'Force early contact. Higher variance, stronger T-side executes.',
    bonuses: { entry: 0.06, lurker: -0.02, support: -0.01, awper: 0.02 },
  },
  {
    id: 'tactical',
    label: 'Tactical',
    description: 'Default-heavy, utility-first. Rewards IGL + Support chemistry.',
    bonuses: { igl: 0.05, support: 0.04, entry: -0.02, awper: 0.02 },
  },
  {
    id: 'loose',
    label: 'Loose',
    description: 'Individual brilliance. Stars pop off; structure can crack.',
    bonuses: { awper: 0.05, entry: 0.03, lurker: 0.03, igl: -0.04 },
  },
]

export const GAME_MODES = [
  {
    id: 'classic',
    label: 'Classic Mode',
    description: 'HLTV Rating 2.0 visible. Draft with full information.',
  },
  {
    id: 'almanac',
    label: 'Almanac Mode',
    description: 'Ratings hidden. Pure CS history knowledge.',
  },
]

export const MAPS = [
  { id: 'Mirage', code: 'de_mirage', sites: ['A', 'B'], vibe: 'Mid control & connector wars' },
  { id: 'Inferno', code: 'de_inferno', sites: ['A', 'B'], vibe: 'Banana pressure & apartment executes' },
  { id: 'Nuke', code: 'de_nuke', sites: ['Outside', 'Ramp'], vibe: 'Outside control & ramp holds' },
  { id: 'Ancient', code: 'de_ancient', sites: ['A', 'B'], vibe: 'Donut fights & mid aggression' },
  { id: 'Anubis', code: 'de_anubis', sites: ['A', 'B'], vibe: 'Canal control & mid water fights' },
  { id: 'Dust2', code: 'de_dust2', sites: ['A', 'B'], vibe: 'Long AWP duels & B rushes' },
  { id: 'Overpass', code: 'de_overpass', sites: ['A', 'B'], vibe: 'Monster control & short A' },
  { id: 'Cache', code: 'de_cache', sites: ['A', 'B'], vibe: 'Mid doors & highway timing — 2026 return' },
  { id: 'Vertigo', code: 'de_vertigo', sites: ['A', 'B'], vibe: 'Ramp takes & scaffold chaos' },
  { id: 'Train', code: 'de_train', sites: ['A', 'B'], vibe: 'Ivy defaults & pop-dog timing' },
]

export const ACTIVE_MAP_POOL = ['Mirage', 'Inferno', 'Nuke', 'Ancient', 'Anubis', 'Dust2', 'Overpass', 'Cache']

export const TACTICAL_CALLS = [
  {
    id: 'default_mid',
    label: 'Default Mid',
    description: 'Slow info default, mid control, late hit.',
    effects: { structure: 0.05, aggression: -0.02 },
  },
  {
    id: 'a_execute',
    label: 'A Execute',
    description: 'Full utility A hit. Commit to the site.',
    effects: { aggression: 0.06, structure: 0.01 },
  },
  {
    id: 'b_execute',
    label: 'B Execute',
    description: 'Fast B contact with flash support.',
    effects: { aggression: 0.07, structure: -0.01 },
  },
  {
    id: 'split_mid',
    label: 'Mid Split',
    description: 'Split through mid/connector into site.',
    effects: { structure: 0.04, aggression: 0.03 },
  },
  {
    id: 'anti_eco_stack',
    label: 'Anti-Eco Stack',
    description: 'Stack likely site, punish force buys.',
    effects: { structure: 0.06, aggression: -0.03 },
  },
  {
    id: 'aggressive_peek',
    label: 'Aggressive Peeks',
    description: 'CT re-aggression / T contact peeks.',
    effects: { aggression: 0.08, structure: -0.04 },
  },
]

export const ROLE_FIT = {
  IGL: { IGL: 1.0, Support: 0.75, Rifler: 0.55, Lurker: 0.5, Entry: 0.4, AWPer: 0.35 },
  AWPer: { AWPer: 1.0, Rifler: 0.55, Lurker: 0.45, Support: 0.35, Entry: 0.3, IGL: 0.25 },
  Entry: { Entry: 1.0, Rifler: 0.8, Lurker: 0.55, Support: 0.4, AWPer: 0.3, IGL: 0.35 },
  Lurker: { Lurker: 1.0, Rifler: 0.75, Support: 0.55, Entry: 0.5, AWPer: 0.4, IGL: 0.4 },
  Support: { Support: 1.0, Rifler: 0.7, Lurker: 0.55, IGL: 0.6, Entry: 0.4, AWPer: 0.3 },
}

export const STAGES = [
  { id: 'quarterfinals', label: 'Quarterfinals', short: 'QF' },
  { id: 'semifinals', label: 'Semifinals', short: 'SF' },
  { id: 'grandfinal', label: 'Grand Final', short: 'GF' },
]

export const REROLLS_PER_RUN = 3
export const DRAFT_ROUNDS = 5

export const ROUND_FLAVORS = {
  multiKill: [
    'gets a {n}k clearing the site',
    'chains a {n}k through the smoke',
    'finds a {n}k on the retake',
    'opens with a {n}k entry',
  ],
  clutch: [
    'wins a 1v{n} clutch!',
    'holds the bomb in a 1v{n}!',
    'closes a legendary 1v{n}!',
  ],
  eco: [
    'Eco round victory!',
    'Force-buy conversion!',
    'Pistols steal the round!',
  ],
  ace: [
    'ACE! Full wipe!',
    'ACE through the execute!',
  ],
  hold: [
    'anchors the site hold',
    'shuts down the execute',
    'denies the plant with perfect utility',
  ],
  entry: [
    'opens the site with first contact',
    'wins the initial duel',
    'breaks the setup on entry',
  ],
  awp: [
    'picks mid with the AWP',
    'finds a double with the big green',
    'holds the angle for a multi-kill',
  ],
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}
