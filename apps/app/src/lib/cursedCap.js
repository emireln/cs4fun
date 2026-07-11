/** Soft rating cap mode — overage applies a power penalty. */

export const CURSED_CAP_DEFAULT = 5.4

export function lineupRatingSum(lineup) {
  if (!lineup || typeof lineup !== 'object') return 0
  return Object.values(lineup).reduce((s, p) => s + (Number(p?.rating) || 0), 0)
}

export function cursedCapPenalty(lineup, cap = CURSED_CAP_DEFAULT) {
  const sum = lineupRatingSum(lineup)
  if (sum <= cap) return { sum, over: 0, scale: 1 }
  const over = sum - cap
  const scale = Math.max(0.82, 1 - over * 0.12)
  return { sum, over, scale }
}

export function applyCursedCapPower(power, lineup, enabled, cap = CURSED_CAP_DEFAULT) {
  if (!enabled) return power
  const { scale } = cursedCapPenalty(lineup, cap)
  return power * scale
}
