import catalog from '../data/boxCases.json'
import { mulberry32, hashString } from './seed'
import { formatMoney, getDisplayCurrency } from './currency'

/** Official-ish case odds (weapon cases). Gold = knives/gloves special item. */
export const RARITY_WEIGHTS = {
  milspec: 0.7992,
  restricted: 0.1598,
  classified: 0.032,
  covert: 0.0064,
  gold: 0.0026,
}

export const RARITY_META = {
  milspec: { label: 'Mil-Spec', color: '#4b69ff', rank: 1 },
  restricted: { label: 'Restricted', color: '#8847ff', rank: 2 },
  classified: { label: 'Classified', color: '#d32ce6', rank: 3 },
  covert: { label: 'Covert', color: '#eb4b4b', rank: 4 },
  gold: { label: 'Extraordinary', color: '#e4ae39', rank: 5 },
}

/** Classified+ — pink / red / gold hits get FX + sound */
export function isHighTierDrop(dropOrRarity) {
  const rarity = typeof dropOrRarity === 'string' ? dropOrRarity : dropOrRarity?.rarity
  return rarity === 'classified' || rarity === 'covert' || rarity === 'gold'
}

/** Knives / gloves (Extraordinary special items) */
export function isSpecialItemDrop(dropOrRarity) {
  const rarity = typeof dropOrRarity === 'string' ? dropOrRarity : dropOrRarity?.rarity
  if (rarity === 'gold') return true
  const name = typeof dropOrRarity === 'object' ? String(dropOrRarity?.name || '') : ''
  return /★|knife|gloves|karambit|bayonet|butterfly|talon|skeleton|nomad|paracord|survival|ursus|stiletto|navaja|shadow daggers|huntsman|falchion|bowie|classic knife|gut knife|flip knife|m9/i.test(
    name,
  )
}

export function listCases() {
  return catalog.cases || []
}

export function getCase(caseId) {
  return listCases().find((c) => c.id === caseId) || listCases()[0]
}

/** Format a USD-stored amount using the user's display currency (USD/BRL). */
export function formatUsd(value, currency = getDisplayCurrency()) {
  return formatMoney(value, currency)
}

function pickWeighted(rng, entries) {
  const total = entries.reduce((s, e) => s + e.w, 0)
  let roll = rng() * total
  for (const e of entries) {
    roll -= e.w
    if (roll <= 0) return e.item
  }
  return entries[entries.length - 1]?.item
}

/** Open one case. Deterministic when seed provided. */
export function openCase(caseId, seed = `${Date.now()}`) {
  const crate = getCase(caseId)
  const rng = mulberry32(hashString(String(seed)))
  const byRarity = {}
  for (const item of crate.items) {
    if (!byRarity[item.rarity]) byRarity[item.rarity] = []
    byRarity[item.rarity].push(item)
  }
  const rarityEntries = Object.keys(RARITY_WEIGHTS)
    .filter((r) => byRarity[r]?.length)
    .map((r) => ({ rarity: r, w: RARITY_WEIGHTS[r] }))
  let rarityRoll = rng() * rarityEntries.reduce((s, e) => s + e.w, 0)
  let rarity = rarityEntries[0].rarity
  for (const e of rarityEntries) {
    rarityRoll -= e.w
    if (rarityRoll <= 0) {
      rarity = e.rarity
      break
    }
  }
  const pool = byRarity[rarity]
  const item = pool[Math.floor(rng() * pool.length)]
  // Wear label for flavor
  const wears = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred']
  const wearWeights = [0.07, 0.15, 0.38, 0.2, 0.2]
  const wear = pickWeighted(
    rng,
    wears.map((name, i) => ({ item: name, w: wearWeights[i] })),
  )
  const wearMult = { 'Factory New': 1.35, 'Minimal Wear': 1.15, 'Field-Tested': 1, 'Well-Worn': 0.82, 'Battle-Scarred': 0.65 }[
    wear
  ]
  const value = +((item.value || 1) * wearMult).toFixed(2)
  return {
    id: `${item.id}_${seed}`,
    name: item.name,
    rarity: item.rarity,
    image: item.image,
    wear,
    value,
    caseId: crate.id,
    caseName: crate.name,
  }
}

/**
 * Build a CS2-style horizontal reel strip: many varied case skins,
 * with the predetermined drop locked at `winIndex`.
 */
export function buildCaseReelStrip(caseId, winningDrop, {
  count = 72,
  winIndex = 58,
  seed,
} = {}) {
  const crate = getCase(caseId || winningDrop?.caseId)
  const items = crate?.items?.length ? crate.items : []
  const rng = mulberry32(hashString(String(seed || winningDrop?.id || 'reel')))
  const byRarity = {}
  for (const item of items) {
    if (!byRarity[item.rarity]) byRarity[item.rarity] = []
    byRarity[item.rarity].push(item)
  }
  const rarityOrder = Object.keys(RARITY_WEIGHTS).filter((r) => byRarity[r]?.length)

  const pickDecoy = () => {
    if (!items.length) return winningDrop
    // Bias toward commons so the strip looks like a real case open
    const entries = rarityOrder.map((r) => ({
      rarity: r,
      w: RARITY_WEIGHTS[r] || 0.01,
    }))
    let roll = rng() * entries.reduce((s, e) => s + e.w, 0)
    let rarity = entries[0].rarity
    for (const e of entries) {
      roll -= e.w
      if (roll <= 0) {
        rarity = e.rarity
        break
      }
    }
    const pool = byRarity[rarity] || items
    return pool[Math.floor(rng() * pool.length)]
  }

  const n = Math.max(24, count)
  const winAt = Math.min(n - 4, Math.max(12, winIndex))
  const strip = []
  for (let i = 0; i < n; i++) {
    if (i === winAt) {
      strip.push({
        key: `win-${i}`,
        isWin: true,
        id: winningDrop.id,
        name: winningDrop.name,
        rarity: winningDrop.rarity,
        image: winningDrop.image,
        value: winningDrop.value,
        wear: winningDrop.wear,
      })
      continue
    }
    const item = pickDecoy()
    strip.push({
      key: `d-${i}-${item.id}`,
      isWin: false,
      id: item.id,
      name: item.name,
      rarity: item.rarity,
      image: item.image,
      value: item.value,
    })
  }
  return { strip, winIndex: winAt }
}

export function openBattleRound({ caseId, caseIds, players, battleSeed, roundIndex }) {
  const id = (Array.isArray(caseIds) && caseIds[roundIndex]) || caseId
  return players.map((p) => ({
    playerId: p.id,
    nickname: p.nickname,
    isBot: Boolean(p.isBot),
    caseId: id,
    drop: openCase(id, `${battleSeed}:${p.id}:r${roundIndex}`),
  }))
}

/** Pick `count` case ids (with replacement) from the catalog. */
export function autoPickCases(count = 3, seed = `${Date.now()}`) {
  const all = listCases()
  if (!all.length) return []
  const rng = mulberry32(hashString(String(seed)))
  const n = Math.max(1, Math.min(10, Number(count) || 3))
  return Array.from({ length: n }, () => all[Math.floor(rng() * all.length)].id)
}

export function sumDrops(drops) {
  return drops.reduce((s, d) => s + (d?.value || 0), 0)
}

export function bestDropOf(drops) {
  if (!drops?.length) return null
  return drops.reduce((best, d) => (!best || d.value > best.value ? d : best), null)
}

export function scoreBoxBattle({ won, totalValue, bestDrop, rounds }) {
  const base = Math.round((totalValue || 0) * 10)
  const bestBonus = Math.round((bestDrop?.value || 0) * 5)
  const winBonus = won ? 250 : 0
  const goldBonus = (rounds || []).filter((d) => d.rarity === 'gold').length * 100
  return Math.min(1_000_000, base + bestBonus + winBonus + goldBonus)
}

/* ─── Local stats (best drops, battles) ─── */

const STATS_KEY = 'cs4fun_box_stats_v1'

function emptyBoxStats() {
  return {
    battles: 0,
    wins: 0,
    losses: 0,
    casesOpened: 0,
    totalValue: 0,
    goldHits: 0,
    covertHits: 0,
    bestDrop: null,
    biggestWinMargin: 0,
    favoriteCaseId: null,
    casePlays: {},
    recentDrops: [],
  }
}

export function readBoxStats(playerId) {
  if (!playerId) return emptyBoxStats()
  try {
    const all = JSON.parse(localStorage.getItem(STATS_KEY) || '{}')
    return { ...emptyBoxStats(), ...(all[playerId] || {}) }
  } catch {
    return emptyBoxStats()
  }
}

function writeBoxStats(playerId, stats) {
  try {
    const all = JSON.parse(localStorage.getItem(STATS_KEY) || '{}')
    all[playerId] = stats
    localStorage.setItem(STATS_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

export function recordBoxBattle(playerId, { won, caseId, myDrops, myTotal, oppTotal }) {
  if (!playerId) return readBoxStats(playerId)
  const stats = readBoxStats(playerId)
  stats.battles += 1
  if (won) stats.wins += 1
  else stats.losses += 1
  stats.casesOpened += myDrops.length
  stats.totalValue = +(stats.totalValue + myTotal).toFixed(2)
  stats.goldHits += myDrops.filter((d) => d.rarity === 'gold').length
  stats.covertHits += myDrops.filter((d) => d.rarity === 'covert').length
  stats.casePlays[caseId] = (stats.casePlays[caseId] || 0) + 1
  stats.favoriteCaseId = Object.entries(stats.casePlays).sort((a, b) => b[1] - a[1])[0]?.[0] || caseId
  const margin = Math.abs(myTotal - oppTotal)
  if (won && margin > stats.biggestWinMargin) stats.biggestWinMargin = +margin.toFixed(2)
  const best = bestDropOf(myDrops)
  if (best && (!stats.bestDrop || best.value > stats.bestDrop.value)) {
    stats.bestDrop = {
      name: best.name,
      value: best.value,
      rarity: best.rarity,
      image: best.image,
      wear: best.wear,
      caseName: best.caseName,
      at: Date.now(),
    }
  }
  const sorted = [...myDrops].sort((a, b) => b.value - a.value).slice(0, 3)
  stats.recentDrops = [
    ...sorted.map((d) => ({
      name: d.name,
      value: d.value,
      rarity: d.rarity,
      image: d.image,
      at: Date.now(),
    })),
    ...(stats.recentDrops || []),
  ].slice(0, 12)
  writeBoxStats(playerId, stats)
  return stats
}

export function botNickname(seed) {
  const names = ['s1mpleBOT', 'ZywOoBOT', 'NiKoBOT', 'deviceBOT', 'm0NESYBOT', 'donkBOT', 'ropzBOT']
  return names[hashString(String(seed)) % names.length]
}
