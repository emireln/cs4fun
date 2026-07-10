import rosters from '../data/rosters.json'

/** Mulberry32 seeded PRNG */
export function mulberry32(seed) {
  let t = seed >>> 0
  return function rand() {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function seededShuffle(arr, rand) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function generateSharedRolls(seedStr, count = 5) {
  const rand = mulberry32(hashString(seedStr))
  const shuffled = seededShuffle(rosters, rand)
  return shuffled.slice(0, count).map((r) => structuredClone(r))
}

export function utcDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

export function dailySeed() {
  return `daily-${utcDayKey()}`
}
