/**
 * Shared live-match playback timing (speed + pause) + map-by-map series stream.
 */
import { simulateMap } from '../engine/simulation'
import { translate } from '../i18n/translate'

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
    /** Wait `baseMs` at 1x, scaled by speed; respects pause. */
    async delay(baseMs) {
      const target = Math.max(16, baseMs / state.speed)
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/** Base delay between live log lines (1x). Slightly tense / readable. */
export function logDelayMs(index, log) {
  if (index < 2) return 420
  if (log?.type === 'series' || log?.type === 'mapwin' || log?.type === 'maploss' || log?.type === 'mvp') {
    return 900
  }
  if (log?.type === 'halftime' || log?.type === 'tactical') return 700
  if (log?.type === 'ace' || log?.type === 'clutch') return 650
  if (log?.type === 'eco' || log?.type === 'multikill') return 520
  return 280 + Math.random() * 120
}

/**
 * Simulate + stream an MD3 map-by-map so the live UI can track every map,
 * MVP, and allow mid-series tactical call changes via getCalls().
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
}) {
  const mapOrder = veto?.mapOrder || []
  const maps = []
  let userMaps = 0
  let enemyMaps = 0
  const allLogs = []

  const pushLog = async (log, index = 0) => {
    allLogs.push(log)
    onLog?.(log)
    await playback.delay(logDelayMs(index, log))
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
    if (userMaps === 2 || enemyMaps === 2) break
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
    const result = simulateMap(userTeam, enemyTeam, mapName, mentality, call)

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
