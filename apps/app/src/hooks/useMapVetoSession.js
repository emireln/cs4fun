import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ACTIVE_MAP_POOL } from '../data/constants'
import {
  buildVetoResult,
  chooseEnemyBan,
  chooseEnemyPick,
  chooseUserAutoBan,
  chooseUserPick,
} from '../engine/simulation'

const STEPS_BO3 = [
  { id: 'enemy_ban_1', who: 'enemy', action: 'ban' },
  { id: 'user_ban_1', who: 'user', action: 'ban' },
  { id: 'enemy_ban_2', who: 'enemy', action: 'ban' },
  { id: 'user_ban_2', who: 'user', action: 'ban' },
  { id: 'user_pick', who: 'user', action: 'pick' },
  { id: 'enemy_pick', who: 'enemy', action: 'pick' },
  { id: 'decider', who: 'decider', action: 'decider' },
]

/** Ban until one map remains — that map is the BO1 showmatch (8-map pool → 7 bans). */
const STEPS_BO1 = [
  { id: 'enemy_ban_1', who: 'enemy', action: 'ban' },
  { id: 'user_ban_1', who: 'user', action: 'ban' },
  { id: 'enemy_ban_2', who: 'enemy', action: 'ban' },
  { id: 'user_ban_2', who: 'user', action: 'ban' },
  { id: 'enemy_ban_3', who: 'enemy', action: 'ban' },
  { id: 'user_ban_3', who: 'user', action: 'ban' },
  { id: 'enemy_ban_4', who: 'enemy', action: 'ban' },
  { id: 'decider', who: 'decider', action: 'decider' },
]

function pickRandom(arr) {
  if (!arr?.length) return null
  return arr[Math.floor(Math.random() * arr.length)]
}

export function useMapVetoSession({
  userPriority,
  enemyBias = [],
  mentalityId = 'tactical',
  autoEnemyDelay = 700,
  userTurnSec = 12,
  bestOf = 3,
}) {
  const steps = bestOf === 1 ? STEPS_BO1 : STEPS_BO3
  const [stepIdx, setStepIdx] = useState(0)
  const [pool, setPool] = useState(() => [...ACTIVE_MAP_POOL])
  const [bans, setBans] = useState([])
  const [picks, setPicks] = useState([])
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [result, setResult] = useState(null)
  const [turnTimer, setTurnTimer] = useState(null)
  const timerRef = useRef(null)
  const tickRef = useRef(null)

  const step = steps[stepIdx] || null
  const available = useMemo(() => pool, [pool])

  const clearTimers = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
  }

  const reset = useCallback(() => {
    clearTimers()
    setStepIdx(0)
    setPool([...ACTIVE_MAP_POOL])
    setBans([])
    setPicks([])
    setBusy(false)
    setDone(false)
    setResult(null)
    setTurnTimer(null)
  }, [])

  const finish = useCallback(
    (nextBans, nextPicks) => {
      clearTimers()
      const veto = buildVetoResult(nextBans, nextPicks, mentalityId, { bestOf })
      setResult(veto)
      setDone(true)
      setBusy(false)
      setTurnTimer(null)
    },
    [mentalityId, bestOf],
  )

  const applyAction = useCallback(
    (map, who, action, fromPool, fromBans, fromPicks, fromIdx) => {
      if (!fromPool.includes(map)) return null
      clearTimers()
      const nextPool = fromPool.filter((m) => m !== map)
      let nextBans = fromBans
      let nextPicks = fromPicks
      if (action === 'ban') {
        nextBans = [...fromBans, { map, by: who }]
      } else if (action === 'pick') {
        nextPicks = [...fromPicks, { map, by: who }]
      } else if (action === 'decider') {
        nextPicks = [...fromPicks, { map, by: 'decider' }]
      }
      const nextIdx = fromIdx + 1
      setPool(nextPool)
      setBans(nextBans)
      setPicks(nextPicks)
      setTurnTimer(null)
      if (nextIdx >= steps.length) {
        finish(nextBans, nextPicks)
      } else {
        setStepIdx(nextIdx)
        setBusy(false)
      }
      return { nextPool, nextBans, nextPicks, nextIdx }
    },
    [finish, steps],
  )

  const selectMap = useCallback(
    (map) => {
      if (done || busy || !step || step.who !== 'user') return
      if (!pool.includes(map)) return
      setBusy(true)
      applyAction(map, 'user', step.action, pool, bans, picks, stepIdx)
    },
    [done, busy, step, pool, bans, picks, stepIdx, applyAction],
  )

  // Auto enemy / decider / user timeout
  useEffect(() => {
    if (done || !step) return
    clearTimers()

    if (step.who === 'user') {
      setBusy(false)
      setTurnTimer(userTurnSec)
      tickRef.current = setInterval(() => {
        setTurnTimer((t) => {
          if (t == null) return t
          if (t <= 1) {
            clearInterval(tickRef.current)
            tickRef.current = null
            return 0
          }
          return t - 1
        })
      }, 1000)
      return clearTimers
    }

    setBusy(true)
    setTurnTimer(null)
    timerRef.current = setTimeout(() => {
      let map
      if (step.action === 'ban') {
        map = chooseEnemyBan(pool, userPriority, enemyBias)
      } else if (step.action === 'pick') {
        map = chooseEnemyPick(pool, enemyBias)
      } else {
        map = pool[0]
      }
      applyAction(map, step.who === 'decider' ? 'decider' : 'enemy', step.action, pool, bans, picks, stepIdx)
    }, autoEnemyDelay)

    return clearTimers
  }, [stepIdx, done]) // eslint-disable-line react-hooks/exhaustive-deps

  // Random auto when user turn timer hits 0
  useEffect(() => {
    if (done || turnTimer !== 0 || !step || step.who !== 'user' || busy) return
    setBusy(true)
    let map
    if (step.action === 'ban') {
      // Prefer smart auto-ban, else random
      map = Math.random() > 0.35 ? chooseUserAutoBan(pool, userPriority, enemyBias) : pickRandom(pool)
    } else {
      map = Math.random() > 0.4 ? chooseUserPick(pool, userPriority, enemyBias) : pickRandom(pool)
    }
    if (map) applyAction(map, 'user', step.action, pool, bans, picks, stepIdx)
  }, [turnTimer]) // eslint-disable-line react-hooks/exhaustive-deps

  const prompt =
    !step || done
      ? null
      : step.action === 'ban' && step.who === 'user'
        ? 'ban'
        : step.action === 'pick' && step.who === 'user'
          ? 'pick'
          : step.who === 'enemy'
            ? 'enemy'
            : 'decider'

  return {
    step,
    stepIdx,
    pool: available,
    bans,
    picks,
    busy,
    done,
    result,
    prompt,
    turnTimer,
    userCanAct: step?.who === 'user' && !busy && !done,
    selectMap,
    reset,
  }
}
