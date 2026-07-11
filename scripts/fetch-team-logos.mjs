/**
 * Download CS team logos from lootmarket/esport-team-logos into apps/app/public/teams.
 * Run: node scripts/fetch-team-logos.mjs
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'apps/app/public/teams')
const RAW = 'https://raw.githubusercontent.com/lootmarket/esport-team-logos/master/csgo'

/** shortName (canonical) → lootmarket folder slug */
const SLUGS = {
  '3DMAX': '3dmax',
  '9z': '9z-team',
  AST: 'astralis',
  BB: 'betboom-team',
  BIG: 'big',
  C9: 'cloud9',
  col: 'complexity',
  dig: 'team-dignitas',
  EF: 'eternal-fire',
  ENCE: 'ence',
  FaZe: 'faze-clan',
  FLC: 'team-falcons',
  FNC: 'fnatic',
  FUR: 'furia',
  FURIA: 'furia',
  G2: 'g2-esports',
  GH: 'grayhound',
  GL: 'gamerlegion',
  GMB: 'gambit-esports',
  HER: 'heroic',
  HERO: 'heroic',
  IMP: 'imperial-esports',
  Kinguin: 'team-kinguin',
  LDLC: 'team-ldlc',
  Legacy: 'legacy',
  LG: 'luminosity-gaming',
  MGLZ: 'the-mongolz',
  MIBR: 'mibr',
  MOUZ: 'mouz',
  NAVI: 'natus-vincere',
  NiP: 'ninjas-in-pyjamas',
  North: 'north',
  nV: 'team-envyus',
  OG: 'og',
  OpTic: 'optic-gaming',
  OUT: 'outsiders',
  paiN: 'pain-gaming',
  RNG: 'renegades',
  SAW: 'saw',
  SK: 'sk-gaming',
  Spirit: 'team-spirit',
  SS: 'space-soldiers',
  Titan: 'titan',
  TL: 'team-liquid',
  TS: 'team-spirit',
  TYL: 'tyloo',
  VIT: 'team-vitality',
  VP: 'virtus-pro',
  WC: 'wildcard',
  AUR: 'aurora',
  LV: 'lynn-vision',
  B8: 'b8',
  FLY: 'flyquest',
  M80: 'm80',
  NEM: 'nemiga',
  ECS: 'ecstatic',
  PUA: 'passion-ua',
  ODK: 'oddik',
  NRG: 'nrg',
  EG: 'evil-geniuses',
  '100T': '100-thieves',
  HOTU: 'hotu',
}

/** alternate slug attempts if primary missing */
const ALT = {
  '9z': ['9z', '9z-esports'],
  BB: ['betboom', 'bet-boom'],
  col: ['complexity-gaming', 'coL'],
  dig: ['dignitas'],
  EF: ['eternalfire'],
  FLC: ['falcons', 'falcons-esports'],
  GH: ['grayhound-gaming'],
  GL: ['gamer-legion'],
  GMB: ['gambit'],
  IMP: ['imperial'],
  Kinguin: ['kinguin'],
  LDLC: ['ldlc'],
  Legacy: ['legacy-esports'],
  LG: ['luminosity'],
  MGLZ: ['mongolz', 'the-mongolz'],
  nV: ['envyus', 'envy'],
  OpTic: ['optic'],
  OUT: ['outsiders-esports'],
  paiN: ['pain'],
  RNG: ['renegades-esports'],
  SAW: ['s-a-w'],
  SS: ['spacesoldiers'],
  Titan: ['titan-esports'],
  TYL: ['tyloo-esports'],
  WC: ['wildcard-gaming', 'wildcard-esports'],
  North: ['north-esports'],
  AUR: ['aurora-gaming', 'aurora-esports'],
  LV: ['lynnvision', 'lynn-vision-gaming'],
  FLY: ['fly-quest'],
  NEM: ['nemiga-gaming'],
  ECS: ['ecstatic-esports'],
  PUA: ['passionua', 'passion-ua-esports'],
  ODK: ['oddik-esports'],
  EG: ['evilgeniuses', 'evil-geniuses-csgo'],
  '100T': ['100thieves', '100-thieves-esports'],
  HOTU: ['hotu-esports'],
}

function fileCandidates(slug) {
  return [
    `${slug}/${slug}-logo.png`,
    `${slug}/${slug}-logo.svg`,
    `${slug}/logo.png`,
    `${slug}/${slug}.png`,
  ]
}

async function tryFetch(path) {
  const url = `${RAW}/${path}`
  const res = await fetch(url, { headers: { 'User-Agent': 'cs4fun-logo-fetch' } })
  if (!res.ok) return null
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 80) return null
  return { buf, ext: path.endsWith('.svg') ? 'svg' : 'png', url }
}

async function resolveSlug(short, primary) {
  const slugs = [primary, ...(ALT[short] || [])].filter(Boolean)
  for (const slug of slugs) {
    for (const path of fileCandidates(slug)) {
      const hit = await tryFetch(path)
      if (hit) return { ...hit, slug, path }
    }
  }
  return null
}

mkdirSync(outDir, { recursive: true })

const results = []
for (const [short, primary] of Object.entries(SLUGS)) {
  let slugKey = short.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  if (slugKey === 'out') slugKey = 'outsiders'
  const destPng = join(outDir, `${slugKey}.png`)
  const destSvg = join(outDir, `${slugKey}.svg`)
  if (existsSync(destPng) || existsSync(destSvg)) {
    results.push({ short, ok: true, skipped: true })
    continue
  }
  process.stdout.write(`fetch ${short}… `)
  const hit = await resolveSlug(short, primary)
  if (!hit) {
    console.log('MISS')
    results.push({ short, ok: false })
    continue
  }
  const dest = hit.ext === 'svg' ? destSvg : destPng
  writeFileSync(dest, hit.buf)
  console.log(`OK (${hit.path}, ${hit.buf.length}b)`)
  results.push({ short, ok: true, path: hit.path, file: dest.replace(root + '\\', '').replace(root + '/', '') })
}

const miss = results.filter((r) => !r.ok)
const ok = results.filter((r) => r.ok)
console.log(`\nDone: ${ok.length} ok, ${miss.length} missing`)
if (miss.length) console.log('Missing:', miss.map((m) => m.short).join(', '))

writeFileSync(
  join(root, 'scripts/_logo-fetch-report.json'),
  JSON.stringify({ ok, miss, at: new Date().toISOString() }, null, 2),
)
