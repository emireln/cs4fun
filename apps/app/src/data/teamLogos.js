import rosters from './rosters.json'

const GENERIC = new Set([
  'you',
  'opp',
  'enemy',
  'bot',
  'riv',
  'tbd',
  '—',
  '-',
  'home',
  'away',
  'us',
  'them',
])

/** Canonical file slug under /teams/{slug}.png */
const ALIASES = {
  '3dmax': '3dmax',
  '9z': '9z',
  '9z team': '9z',
  astralis: 'ast',
  ast: 'ast',
  betboom: 'bb',
  'betboom team': 'bb',
  bb: 'bb',
  big: 'big',
  c9: 'c9',
  cloud9: 'c9',
  col: 'col',
  complexity: 'col',
  'complexity gaming': 'col',
  dig: 'dig',
  dignitas: 'dig',
  'team dignitas': 'dig',
  ef: 'ef',
  'eternal fire': 'ef',
  ence: 'ence',
  faze: 'faze',
  'faze clan': 'faze',
  flc: 'flc',
  falcons: 'flc',
  'team falcons': 'flc',
  fnc: 'fnc',
  fnatic: 'fnc',
  fur: 'fur',
  furia: 'furia',
  g2: 'g2',
  'g2 esports': 'g2',
  gh: 'gh',
  grayhound: 'gh',
  'grayhound gaming': 'gh',
  gl: 'gl',
  gamerlegion: 'gl',
  'gamer legion': 'gl',
  gmb: 'gmb',
  gambit: 'gmb',
  'gambit esports': 'gmb',
  her: 'her',
  hero: 'hero',
  heroic: 'her',
  imp: 'imp',
  imperial: 'imp',
  'imperial esports': 'imp',
  kinguin: 'kinguin',
  'team kinguin': 'kinguin',
  ldlc: 'ldlc',
  'team ldlc': 'ldlc',
  legacy: 'legacy',
  lg: 'lg',
  luminosity: 'lg',
  'luminosity gaming': 'lg',
  mglz: 'mglz',
  mongolz: 'mglz',
  'the mongolz': 'mglz',
  mibr: 'mibr',
  mouz: 'mouz',
  mousesports: 'mouz',
  navi: 'navi',
  "na'vi": 'navi',
  'natus vincere': 'navi',
  nip: 'nip',
  'ninjas in pyjamas': 'nip',
  north: 'north',
  nv: 'nv',
  envyus: 'nv',
  'team envyus': 'nv',
  envy: 'nv',
  og: 'og',
  optic: 'optic',
  'optic gaming': 'optic',
  out: 'outsiders',
  outsiders: 'outsiders',
  pain: 'pain',
  'pain gaming': 'pain',
  rng: 'rng',
  renegades: 'rng',
  saw: 'saw',
  sk: 'sk',
  'sk gaming': 'sk',
  spirit: 'spirit',
  'team spirit': 'spirit',
  ss: 'ss',
  'space soldiers': 'ss',
  titan: 'titan',
  tl: 'tl',
  liquid: 'tl',
  'team liquid': 'tl',
  ts: 'ts',
  tyl: 'tyl',
  tyloo: 'tyl',
  vit: 'vit',
  vitality: 'vit',
  'team vitality': 'vit',
  vp: 'vp',
  'virtus.pro': 'vp',
  'virtus pro': 'vp',
  wc: 'wc',
  wildcard: 'wc',
  aur: 'aur',
  aurora: 'aur',
  'aurora gaming': 'aur',
  lv: 'lv',
  'lynn vision': 'lv',
  lynnvision: 'lv',
  b8: 'b8',
  fly: 'fly',
  flyquest: 'fly',
  m80: 'm80',
  nem: 'nem',
  nemiga: 'nem',
  ecs: 'ecs',
  ecstatic: 'ecs',
  pua: 'pua',
  'passion ua': 'pua',
  odk: 'odk',
  oddik: 'odk',
  nrg: 'nrg',
  eg: 'eg',
  'evil geniuses': 'eg',
  '100t': '100t',
  '100 thieves': '100t',
  hotu: 'hotu',
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const LOOKUP = new Map()

function remember(key, slug) {
  if (!key || !slug) return
  const k = slugify(key)
  if (!k || LOOKUP.has(k)) return
  LOOKUP.set(k, slug)
}

for (const [key, slug] of Object.entries(ALIASES)) {
  remember(key, slug)
}

for (const roster of rosters) {
  const slug = ALIASES[slugify(roster.shortName)] || slugify(roster.shortName)
  // OUT shortName → outsiders file
  const fileSlug = slug === 'out' ? 'outsiders' : slug
  remember(roster.shortName, fileSlug)
  remember(roster.team, fileSlug)
  remember(slugify(roster.shortName), fileSlug)
  remember(slugify(roster.team), fileSlug)
}

/**
 * Resolve a roster shortName / team name to a /teams/{slug}.png path, or null.
 */
export function resolveTeamLogoSlug(name) {
  if (name == null) return null
  const raw = String(name).trim()
  if (!raw) return null
  const lower = raw.toLowerCase()
  if (GENERIC.has(lower)) return null

  const key = slugify(raw)
  if (!key || GENERIC.has(key)) return null

  if (LOOKUP.has(key)) return LOOKUP.get(key)
  if (ALIASES[key]) return ALIASES[key] === 'out' ? 'outsiders' : ALIASES[key]
  if (ALIASES[lower]) return ALIASES[lower] === 'out' ? 'outsiders' : ALIASES[lower]

  // Direct shortName slug (nip, navi, …)
  return key === 'out' ? 'outsiders' : key
}

export function teamLogoSrc(name, { format = 'webp' } = {}) {
  const slug = resolveTeamLogoSlug(name)
  if (!slug) return null
  const base = import.meta.env.BASE_URL || '/'
  const ext = format === 'png' ? 'png' : 'webp'
  return `${base}teams/${slug}.${ext}`
}

export function teamLogoCandidates(name) {
  const slug = resolveTeamLogoSlug(name)
  if (!slug) return []
  const base = import.meta.env.BASE_URL || '/'
  return [`${base}teams/${slug}.webp`, `${base}teams/${slug}.png`]
}

export function teamInitials(name) {
  const raw = String(name || '').trim()
  if (!raw) return '?'
  if (raw.length <= 4 && !/\s/.test(raw)) return raw.toUpperCase()
  const parts = raw.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase()
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}
