/** Friend prop bets — bragging only, no currency. */

const KEY = 'cs4fun_props_v1'

export const PROP_OPTIONS = [
  { id: 'ot', labelKey: 'props.ot' },
  { id: 'blowout', labelKey: 'props.blowout' },
  { id: 'awp_top', labelKey: 'props.awpTop' },
]

export function readProps(roomCode) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}')
    return all[roomCode] || { picks: {} }
  } catch {
    return { picks: {} }
  }
}

export function setPropPick(roomCode, playerId, propId) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}')
    const row = all[roomCode] || { picks: {} }
    row.picks[playerId] = propId
    all[roomCode] = row
    localStorage.setItem(KEY, JSON.stringify(all))
    return row
  } catch {
    return { picks: {} }
  }
}

/** Resolve from series result shape { wentOt, mapDiff, awpRatingBestSide }. */
export function resolveProps(roomCode, result) {
  const row = readProps(roomCode)
  let winnerProp = null
  if (result?.wentOt) winnerProp = 'ot'
  else if ((result?.mapDiff || 0) >= 5) winnerProp = 'blowout'
  else if (result?.awpTop) winnerProp = 'awp_top'
  const winners = Object.entries(row.picks || {})
    .filter(([, p]) => p === winnerProp)
    .map(([id]) => id)
  return { winnerProp, winners }
}
