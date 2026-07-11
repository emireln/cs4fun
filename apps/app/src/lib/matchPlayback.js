/**
 * Shared live-match playback timing (speed + pause) + map-by-map series stream.
 */
import { simulateMap } from '../engine/simulation'
import { translate } from '../i18n/translate'
import { hashString, mulberry32 } from './seed'

export function createPlaybackController(initialSpeed = 1) {
  const state = {
    speed: initialSpeed,
    paused: false,
    aborted: false,
  }

  return {
    get speed() {
      return state.speed
    },
    setSpeed(n) {
      state.speed = Math.max(1, Math.min(3, Number(n) || 1))
    },
    get paused() {
      return state.paused
    },
    setPaused(v) {
      state.paused = Boolean(v)
    },
    togglePause() {
      state.paused = !state.paused
      return state.paused
    },
    abort() {
      state.aborted = true
      state.paused = false
    },
    reset() {
      state.aborted = false
      state.paused = false
    },
    get aborted() {
      return state.aborted
    },
    /**
     * Wait `baseMs` at 1x. 2x/3x are gentler than a hard divide so
     * faster speeds stay readable (not a blur).
     */
    async delay(baseMs) {
      const factor = SPEED_FACTOR[state.speed] || state.speed
      const target = Math.max(24, baseMs / factor)
      const start = performance.now()
      while (performance.now() - start < target) {
        if (state.aborted) return
        while (state.paused && !state.aborted) {
          await sleep(40)
        }
        if (state.aborted) return
        await sleep(Math.min(40, target - (performance.now() - start)))
      }
    },
  }
}

/** Effective speed multipliers — 2x ≈ 1.55×, 3x ≈ 2.15× wall-clock. */
const SPEED_FACTOR = { 1: 1, 2: 1.55, 3: 2.15 }

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/** Base delay between live log lines (1x). Slow enough to read the feed. */
export function logDelayMs(index, log, rng = Math.random) {
  const r = typeof rng === 'function' ? rng : Math.random
  if (index < 2) return 900
  if (log?.type === 'series' || log?.type === 'mapwin' || log?.type === 'maploss' || log?.type === 'mvp') {
    return 1600 + r() * 200
  }
  if (log?.type === 'halftime' || log?.type === 'tactical' || log?.type === 'matchpoint') {
    return 1200 + r() * 150
  }
  if (log?.type === 'ace' || log?.type === 'clutch') return 1100 + r() * 120
  if (log?.type === 'eco' || log?.type === 'multikill') return 950 + r() * 100
  if (log?.type === 'beat' || log?.type === 'buy' || log?.type === 'info') return 620 + r() * 180
  if (log?.type === 'system') return 800 + r() * 120
  return 780 + r() * 220
}

/**
 * Simulate + stream an MD3 map-by-map so the live UI can track every map,
 * MVP, and allow mid-series tactical call changes via getCalls().
 * Pass matchSeed for deterministic multiplayer (both clients see the same match).
 */
export async function streamLiveSeries({
  userTeam,
  enemyTeam,
  mentality,
  veto,
  getCalls,
  playback,
  onLog,
  onMapStart,
  onMapEnd,
  beforeMap,
  shouldStop,
  matchSeed = null,
}) {
  const mapOrder = veto?.mapOrder || []
  const maps = []
  let userMaps = 0
  let enemyMaps = 0
  const allLogs = []

  let delayRng = Math.random
  let mapRng = null
  if (matchSeed != null) {
    const base = hashString(String(matchSeed))
    delayRng = mulberry32(base ^ 0xabc123)
    mapRng = mulberry32(base ^ 0x55aa55)
  }

  const pushLog = async (log, index = 0) => {
    allLogs.push(log)
    onLog?.(log)
    await playback.delay(logDelayMs(index, log, delayRng))
  }

  const stopped = () => playback.aborted || shouldStop?.()

  await pushLog(
    {
      type: 'series',
      text: translate('liveLog.seriesStart', {
        home: userTeam.shortName,
        away: enemyTeam.shortName,
      }),
    },
    0,
  )
  if (stopped()) return null

  for (let i = 0; i < mapOrder.length; i++) {
    const need = veto?.bestOf === 1 ? 1 : 2
    if (userMaps === need || enemyMaps === need) break
    if (stopped()) return null

    const mapName = mapOrder[i]
    await beforeMap?.(mapName, i, { userMaps, enemyMaps, maps })
    if (stopped()) return null

    onMapStart?.({
      mapName,
      index: i,
      seriesScore: { user: userMaps, enemy: enemyMaps },
    })

    const calls = getCalls?.() || {}
    const call = calls[mapName] || null
    // Per-map deterministic child rng so mid-series call changes stay aligned
    let thisMapRng = mapRng
    if (matchSeed != null) {
      thisMapRng = mulberry32(hashString(`${matchSeed}:${mapName}:${i}`))
    }
    const result = simulateMap(userTeam, enemyTeam, mapName, mentality, call, thisMapRng)

    for (let j = 0; j < result.logs.length; j++) {
      if (stopped()) return null
      await pushLog(result.logs[j], j)
      if (stopped()) return null
    }

    maps.push(result)
    if (result.userWon) userMaps++
    else enemyMaps++

    onMapEnd?.({
      result,
      maps: [...maps],
      seriesScore: { user: userMaps, enemy: enemyMaps },
    })

    await pushLog(
      {
        type: 'series',
        text: translate('liveLog.seriesScore', {
          home: userTeam.shortName,
          away: enemyTeam.shortName,
          um: userMaps,
          em: enemyMaps,
        }),
      },
      0,
    )
    if (stopped()) return null
  }

  return {
    userMaps,
    enemyMaps,
    userWon: userMaps > enemyMaps,
    maps,
    logs: allLogs,
    veto,
  }
}
