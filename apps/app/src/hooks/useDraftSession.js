import { useCallback, useEffect, useRef, useState } from 'react'
import { REROLLS_PER_RUN, ROLES } from '../data/constants'
import { emptyLineup, lineupComplete, rollRoster } from '../engine/simulation'

function pickRandom(arr) {
  if (!arr?.length) return null
  return arr[Math.floor(Math.random() * arr.length)]
}

function openSlots(lineup) {
  return ROLES.map((r) => r.id).filter((id) => !lineup[id])
}

/**
 * Shared draft state machine used by all modes.
 * On pick-timer expiry with no choice: randomly picks a player and assigns a random open role.
 */
export function useDraftSession({
  hideRatings = false,
  sharedRolls = null,
  pickTimerSec = 0,
  onAutoPick = null,
} = {}) {
  const [lineup, setLineup] = useState(emptyLineup)
  const [currentRoster, setCurrentRoster] = useState(null)
  const [usedRosterIds, setUsedRosterIds] = useState([])
  const [rerolls, setRerolls] = useState(REROLLS_PER_RUN)
  const [scouting, setScouting] = useState(false)
  const [pendingPlayer, setPendingPlayer] = useState(null)
  const [rollIndex, setRollIndex] = useState(0)
  const [timer, setTimer] = useState(pickTimerSec)
  const timerRef = useRef(null)
  const autoLock = useRef(false)

  const complete = lineupComplete(lineup)
  const usingShared = Array.isArray(sharedRolls) && sharedRolls.length > 0

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const startTimer = useCallback(
    (seconds = pickTimerSec) => {
      clearTimer()
      autoLock.current = false
      if (!seconds) return
      setTimer(seconds)
      timerRef.current = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current)
            timerRef.current = null
            return 0
          }
          return t - 1
        })
      }, 1000)
    },
    [pickTimerSec],
  )

  useEffect(() => () => clearTimer(), [])

  const commitAssign = useCallback((player, slotId, roster) => {
    if (!player || !slotId) return
    setLineup((prev) => {
      if (prev[slotId]) return prev
      return {
        ...prev,
        [slotId]: {
          ...player,
          fromTeam: roster?.shortName,
          fromEvent: roster?.event,
        },
      }
    })
    setPendingPlayer(null)
    setCurrentRoster(null)
    clearTimer()
    setTimer(pickTimerSec)
    autoLock.current = false
  }, [pickTimerSec])

  // Auto-pick + auto-assign when timer hits 0
  useEffect(() => {
    if (!pickTimerSec || timer !== 0 || complete || autoLock.current) return
    if (!currentRoster && !pendingPlayer) return

    autoLock.current = true
    const player = pendingPlayer || pickRandom(currentRoster?.players || [])
    const slots = openSlots(lineup)
    // Prefer natural role if open, else random open slot
    let slot = null
    if (player?.role && slots.includes(player.role)) slot = player.role
    else slot = pickRandom(slots)

    if (player && slot) {
      onAutoPick?.(player, slot)
      commitAssign(player, slot, currentRoster)
    } else {
      autoLock.current = false
    }
  }, [timer, currentRoster, pendingPlayer, complete, pickTimerSec, lineup, onAutoPick, commitAssign])

  // When user selects a player, restart a short assign timer if needed
  useEffect(() => {
    if (!pickTimerSec || !pendingPlayer || complete) return
    if (timer === 0) return
    // keep existing timer running for assign phase
  }, [pendingPlayer, pickTimerSec, complete, timer])

  const scout = async () => {
    if (scouting || complete || currentRoster || pendingPlayer) return
    setScouting(true)
    await new Promise((r) => setTimeout(r, 220))

    if (usingShared) {
      if (rollIndex >= sharedRolls.length) {
        setScouting(false)
        return
      }
      const roster = structuredClone(sharedRolls[rollIndex])
      setCurrentRoster(roster)
      setUsedRosterIds((prev) => [...prev, roster.id])
      setRollIndex((i) => i + 1)
      setScouting(false)
      startTimer()
      return
    }

    const roster = rollRoster(usedRosterIds)
    setCurrentRoster(roster)
    setUsedRosterIds((prev) => [...prev, roster.id])
    setScouting(false)
    startTimer()
  }

  const reroll = async () => {
    if (usingShared) return
    if (rerolls <= 0 || !currentRoster || scouting || pendingPlayer) return
    setScouting(true)
    await new Promise((r) => setTimeout(r, 220))
    const roster = rollRoster(usedRosterIds)
    setCurrentRoster(roster)
    setUsedRosterIds((prev) => [...prev, roster.id])
    setRerolls((r) => r - 1)
    setScouting(false)
    startTimer()
  }

  const selectPlayer = (player) => {
    if (complete) return
    setPendingPlayer(player)
  }

  const assignSlot = (slotId) => {
    if (!pendingPlayer || lineup[slotId]) return
    commitAssign(pendingPlayer, slotId, currentRoster)
  }

  const reset = () => {
    clearTimer()
    autoLock.current = false
    setLineup(emptyLineup())
    setCurrentRoster(null)
    setUsedRosterIds([])
    setRerolls(REROLLS_PER_RUN)
    setScouting(false)
    setPendingPlayer(null)
    setRollIndex(0)
    setTimer(pickTimerSec)
  }

  return {
    lineup,
    setLineup,
    currentRoster,
    usedRosterIds,
    rerolls,
    scouting,
    pendingPlayer,
    complete,
    timer,
    pickTimerSec,
    hideRatings,
    usingShared,
    sharedRemaining: usingShared ? Math.max(0, sharedRolls.length - rollIndex - (currentRoster ? 1 : 0)) : null,
    scout,
    reroll,
    selectPlayer,
    assignSlot,
    reset,
  }
}
