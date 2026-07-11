import rosters from '../data/rosters.json'
import {
  ACTIVE_MAP_POOL,
  ROLE_FIT,
  STAGES,
  clamp,
  pick,
} from '../data/constants'
import { translate, translatePick } from '../i18n/translate'

export function getAllRosters() {
  return rosters
}

/** Stable identity for "same legend" across years / rosters. */
export function playerIdentityKey(player) {
  return String(player?.name || '')
    .trim()
    .toLowerCase()
}

/** True if this player (by id or nick) is already on the lineup. */
export function lineupOwnsPlayer(lineup, player) {
  if (!player) return false
  const key = playerIdentityKey(player)
  const id = player.id
  for (const p of Object.values(lineup || {})) {
    if (!p) continue
    if (id && p.id === id) return true
    if (key && playerIdentityKey(p) === key) return true
  }
  return false
}

/** Drop already-rostered legends from a scouted historic five. */
export function filterRosterForLineup(roster, lineup) {
  if (!roster) return roster
  return {
    ...roster,
    players: (roster.players || []).filter((p) => !lineupOwnsPlayer(lineup, p)),
  }
}

export function rollRoster(excludeIds = []) {
  const pool = rosters.filter((r) => !excludeIds.includes(r.id))
  const source = pool.length ? pool : rosters
  return structuredClone(pick(source))
}

/** Roll a roster that still has at least one pickable (not already owned) player. */
export function rollRosterForLineup(lineup, excludeIds = [], attempts = 12) {
  const used = [...excludeIds]
  for (let i = 0; i < attempts; i++) {
    const roster = rollRoster(used)
    const filtered = filterRosterForLineup(roster, lineup)
    if (filtered.players?.length) return filtered
    if (roster?.id) used.push(roster.id)
  }
  return filterRosterForLineup(rollRoster(excludeIds), lineup)
}

export function roleFitMultiplier(slotRole, playerRole) {
  return ROLE_FIT[slotRole]?.[playerRole] ?? 0.45
}

export function computePlayerPower(player, slotRole, mentality, mapName) {
  if (!player) return 0
  const fit = roleFitMultiplier(slotRole, player.role)
  const mapBonus = player.bestMaps?.includes(mapName) ? 0.06 : 0
  const mentKey = slotRole.toLowerCase()
  const mentBonus = mentality?.bonuses?.[mentKey] ?? 0
  return (player.rating || 0) * (0.55 + fit * 0.45) + mapBonus + mentBonus
}

export function computeTeamPower(lineup, mentality, mapName) {
  const slots = Object.entries(lineup || {}).filter(([, player]) => player)
  if (!slots.length) {
    return { avg: 0, powers: {}, chemistry: 0, balance: 0 }
  }

  let total = 0
  const powers = {}

  for (const [slot, player] of slots) {
    const p = computePlayerPower(player, slot, mentality, mapName)
    powers[slot] = p
    total += p
  }

  const avg = total / slots.length
  let chemistry = 0

  const igl = lineup.IGL
  const awper = lineup.AWPer
  if (igl && roleFitMultiplier('IGL', igl.role) >= 0.75) chemistry += 0.04
  if (awper && roleFitMultiplier('AWPer', awper.role) >= 0.75) chemistry += 0.04
  if (lineup.Entry && lineup.Support) chemistry += 0.02
  if (lineup.Lurker && lineup.IGL) chemistry += 0.015

  const ratings = slots.map(([, p]) => p.rating || 0)
  const variance = stdDev(ratings)
  const balance = clamp(0.04 - variance * 0.08, -0.03, 0.04)

  return {
    avg: avg + chemistry + balance,
    powers,
    chemistry,
    balance,
  }
}

function stdDev(values) {
  if (!values.length) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const v = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length
  return Math.sqrt(v)
}

export function buildOpponentFromRoster(roster, label) {
  const rolePriority = ['IGL', 'AWPer', 'Entry', 'Lurker', 'Support']
  const used = new Set()
  const lineup = {}

  const players = roster?.players || []
  for (const slot of rolePriority) {
    const candidates = players
      .filter((p) => !used.has(p.id))
      .map((p) => ({ p, score: roleFitMultiplier(slot, p.role) * (p.rating || 0) }))
      .sort((a, b) => b.score - a.score)
    const best = candidates[0]
    if (!best) continue
    used.add(best.p.id)
    lineup[slot] = { ...best.p, fromTeam: roster.shortName, fromEvent: roster.event }
  }

  return {
    id: `opp-${roster.id}-${label}`,
    name: roster.team,
    shortName: roster.shortName,
    event: roster.event,
    year: roster.year,
    mapPoolBias: roster.mapPoolBias,
    lineup,
    isUser: false,
  }
}

export function generateBracket(userTeam, usedRosterIds = []) {
  const available = rosters.filter((r) => !usedRosterIds.includes(r.id))
  const shuffled = [...available].sort(() => Math.random() - 0.5)
  const opponents = shuffled.slice(0, 7).map((r, i) => buildOpponentFromRoster(r, `b${i}`))

  while (opponents.length < 7) {
    const r = pick(rosters)
    opponents.push(buildOpponentFromRoster(r, `fill${opponents.length}`))
  }

  const all = [userTeam, ...opponents].sort(() => Math.random() - 0.5)
  const userIdx = all.findIndex((t) => t.isUser)
  if (userIdx > 0) {
    ;[all[0], all[userIdx]] = [all[userIdx], all[0]]
  }

  return {
    quarterfinals: [
      { id: 'qf1', stage: 'quarterfinals', home: all[0], away: all[1], result: null },
      { id: 'qf2', stage: 'quarterfinals', home: all[2], away: all[3], result: null },
      { id: 'qf3', stage: 'quarterfinals', home: all[4], away: all[5], result: null },
      { id: 'qf4', stage: 'quarterfinals', home: all[6], away: all[7], result: null },
    ],
    semifinals: [
      { id: 'sf1', stage: 'semifinals', home: null, away: null, result: null },
      { id: 'sf2', stage: 'semifinals', home: null, away: null, result: null },
    ],
    grandfinal: [
      { id: 'gf1', stage: 'grandfinal', home: null, away: null, result: null },
    ],
  }
}

export function chooseEnemyBan(pool, userPriority, enemyBias = []) {
  const enemyPref = enemyBias.filter((m) => pool.includes(m))
  if (pool.includes(userPriority) && enemyPref[0] !== userPriority && Math.random() > 0.35) {
    return userPriority
  }
  const weakForEnemy = pool.filter((m) => !enemyPref.slice(0, 3).includes(m))
  return pick(weakForEnemy.length ? weakForEnemy : pool)
}

export function chooseUserAutoBan(pool, userPriority, enemyBias = []) {
  const enemyPref = enemyBias.filter((m) => pool.includes(m))
  return [...pool].sort((a, b) => {
    const aScore = (enemyPref.indexOf(a) === -1 ? 99 : enemyPref.indexOf(a)) - (a === userPriority ? 50 : 0)
    const bScore = (enemyPref.indexOf(b) === -1 ? 99 : enemyPref.indexOf(b)) - (b === userPriority ? 50 : 0)
    return aScore - bScore
  })[0]
}

export function chooseEnemyPick(remaining, enemyBias = []) {
  const enemyPref = enemyBias.filter((m) => remaining.includes(m))
  return [...remaining].sort((a, b) => {
    const ai = enemyPref.indexOf(a)
    const bi = enemyPref.indexOf(b)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })[0]
}

export function chooseUserPick(remaining, userPriority, enemyBias = []) {
  const enemyPref = enemyBias.filter((m) => remaining.includes(m))
  const userPref = [userPriority, ...enemyPref.filter((m) => m !== userPriority)]
  if (remaining.includes(userPriority)) return userPriority
  return [...remaining].sort((a, b) => userPref.indexOf(a) - userPref.indexOf(b))[0] || remaining[0]
}

export function orderMapSeries(userPick, enemyPick, decider, mentalityId) {
  if (mentalityId === 'aggressive') return [userPick, enemyPick, decider]
  if (mentalityId === 'loose') {
    return Math.random() > 0.5 ? [enemyPick, userPick, decider] : [userPick, enemyPick, decider]
  }
  return [enemyPick, userPick, decider]
}

export function buildVetoResult(bans, picks, mentalityId, { bestOf = 3 } = {}) {
  const userPick = picks.find((p) => p.by === 'user')?.map
  const enemyPick = picks.find((p) => p.by === 'enemy')?.map
  const decider = picks.find((p) => p.by === 'decider')?.map
  if (bestOf === 1) {
    const map = decider || userPick || enemyPick
    return {
      bans,
      picks,
      mapOrder: map ? [map] : [],
      bestOf: 1,
    }
  }
  return {
    bans,
    picks,
    mapOrder: orderMapSeries(userPick, enemyPick, decider, mentalityId),
    bestOf: 3,
  }
}

export function simulateMapVeto(userPriority, enemyBias, mentalityId, { bestOf = 3 } = {}) {
  const pool = [...ACTIVE_MAP_POOL]
  const bans = []
  const picks = []

  if (bestOf === 1) {
    // Ban down to 1 map — that map is the showmatch
    let who = 'enemy'
    while (pool.length > 1) {
      const ban =
        who === 'user'
          ? chooseUserAutoBan(pool, userPriority, enemyBias)
          : chooseEnemyBan(pool, userPriority, enemyBias)
      bans.push({ map: ban, by: who })
      const i = pool.indexOf(ban)
      if (i >= 0) pool.splice(i, 1)
      who = who === 'user' ? 'enemy' : 'user'
    }
    picks.push({ map: pool[0], by: 'decider' })
    return buildVetoResult(bans, picks, mentalityId, { bestOf: 1 })
  }

  const banOrder = ['enemy', 'user', 'enemy', 'user']
  for (const who of banOrder) {
    if (pool.length <= 3) break
    const ban =
      who === 'user'
        ? chooseUserAutoBan(pool, userPriority, enemyBias)
        : chooseEnemyBan(pool, userPriority, enemyBias)
    pool.splice(pool.indexOf(ban), 1)
    bans.push({ map: ban, by: who })
  }

  const remaining = [...pool]
  const userPick = chooseUserPick(remaining, userPriority, enemyBias)
  picks.push({ map: userPick, by: 'user' })
  remaining.splice(remaining.indexOf(userPick), 1)

  const enemyPick = chooseEnemyPick(remaining, enemyBias)
  picks.push({ map: enemyPick, by: 'enemy' })
  remaining.splice(remaining.indexOf(enemyPick), 1)

  const decider = remaining[0] || pick(ACTIVE_MAP_POOL.filter((m) => !picks.find((p) => p.map === m)))
  picks.push({ map: decider, by: 'decider' })

  return buildVetoResult(bans, picks, mentalityId)
}

function formatFlavor(kind, vars = {}, rng = Math.random) {
  return translatePick(`liveLog.flavors.${kind}`, vars, undefined, rng)
}

function tacticalLabel(call) {
  if (!call) return { label: '', description: '' }
  const id = call.id
  if (id) {
    return {
      label: translate(`tactics.${id}.label`) || call.label,
      description: translate(`tactics.${id}.description`) || call.description,
    }
  }
  return { label: call.label || '', description: call.description || '' }
}

function chooseStar(powers, lineup, bias = null, pickFn = pick) {
  const entries = Object.entries(powers || {}).filter(([, p]) => p != null)
  if (!entries.length) {
    const fallback = Object.entries(lineup || {}).find(([, p]) => p)
    return fallback ? { slot: fallback[0], player: fallback[1] } : { slot: null, player: null }
  }
  let weighted = entries
  if (bias) {
    weighted = entries.map(([slot, p]) => [slot, slot === bias ? p * 1.35 : p])
  }
  weighted.sort((a, b) => b[1] - a[1])
  const top = weighted.slice(0, 3)
  const chosen = pickFn(top)
  if (!chosen) {
    const fallback = Object.entries(lineup || {}).find(([, p]) => p)
    return fallback ? { slot: fallback[0], player: fallback[1] } : { slot: null, player: null }
  }
  return { slot: chosen[0], player: lineup[chosen[0]] }
}

function anyPlayer(lineup, pickFn) {
  const players = Object.values(lineup || {}).filter(Boolean)
  return pickFn(players)
}

export function simulateMap(userTeam, enemyTeam, mapName, mentality, tacticalCall, rngFn = null) {
  const rng = typeof rngFn === 'function' ? rngFn : Math.random
  const pickOne = (arr) => {
    if (!arr?.length) return null
    return arr[Math.floor(rng() * arr.length)]
  }

  const userPow = computeTeamPower(userTeam.lineup, mentality, mapName)
  const enemyMentality = { bonuses: {} }
  const enemyPow = computeTeamPower(enemyTeam.lineup, enemyMentality, mapName)

  let userStrength = userPow.avg
  let enemyStrength = enemyPow.avg

  if (tacticalCall) {
    userStrength += (tacticalCall.effects.structure || 0) + (tacticalCall.effects.aggression || 0) * 0.5
  }

  // Map bias for enemy
  if (enemyTeam.mapPoolBias?.includes(mapName)) {
    enemyStrength += 0.03
  }
  if (userTeam.mapPriority === mapName) {
    userStrength += 0.045
  }

  const logs = []
  let userRounds = 0
  let enemyRounds = 0
  let half = 1
  const impact = {}

  const bumpImpact = (player, teamLabel, slot, pts) => {
    if (!player?.name) return
    const key = `${teamLabel}:${player.name}`
    if (!impact[key]) {
      impact[key] = { name: player.name, team: teamLabel, slot: slot || null, score: 0 }
    }
    impact[key].score += pts
  }

  const push = (type, text, meta = {}) => {
    logs.push({ type, text, half, userRounds, enemyRounds, map: mapName, ...meta })
  }

  push('system', translate('liveLog.mapStart', { map: mapName }))
  if (tacticalCall) {
    const tac = tacticalLabel(tacticalCall)
    push('tactical', translate('liveLog.tactical', { label: tac.label, description: tac.description }))
  }

  const playRound = (roundNum, userCT) => {
    const noise = (rng() - 0.5) * 0.35
    const ctBoost = 0.02
    let u = userStrength + (userCT ? ctBoost : 0) + noise
    let e = enemyStrength + (!userCT ? ctBoost : 0) + (rng() - 0.5) * 0.35

    const ecoChance = rng()
    let eco = false
    if (ecoChance < 0.08) {
      eco = true
      if (rng() > 0.55) u += 0.12
      else e += 0.12
    }

    const userWins = u >= e
    if (userWins) userRounds++
    else enemyRounds++

    const winnerLineup = userWins ? userTeam.lineup : enemyTeam.lineup
    const loserLineup = userWins ? enemyTeam.lineup : userTeam.lineup
    const winnerPowers = userWins ? userPow.powers : enemyPow.powers
    const winnerName = userWins ? userTeam.shortName : enemyTeam.shortName
    const loserName = userWins ? enemyTeam.shortName : userTeam.shortName
    const winnerTeamLabel = winnerName
    const score = { r: roundNum, ur: userRounds, er: enemyRounds, winner: winnerName, loser: loserName }

    // ── Beat 1: round / economy ──
    if (roundNum === 1 || roundNum === 13) {
      push(
        'buy',
        translate('liveLog.roundPistol', {
          r: roundNum,
          side: userCT ? 'CT' : 'T',
        }),
      )
    } else if (eco) {
      push('buy', translate('liveLog.roundBuyEco', { r: roundNum, flavor: formatFlavor('buyEco', {}, rng) }))
    } else if (rng() < 0.35) {
      push('buy', translate('liveLog.roundBuyFull', { r: roundNum, flavor: formatFlavor('buyFull', {}, rng) }))
    } else if (rng() < 0.55) {
      push('buy', translate('liveLog.roundBuyForce', { r: roundNum, flavor: formatFlavor('buyForce', {}, rng) }))
    } else {
      push('info', translate('liveLog.roundStart', { r: roundNum, map: mapName }))
    }

    // ── Beat 2: mid-round action (1–2 lines) ──
    const midBeats = 1 + (rng() < 0.55 ? 1 : 0)
    for (let b = 0; b < midBeats; b++) {
      const midRoll = rng()
      const actorTeam = midRoll < 0.5 ? userTeam : enemyTeam
      const actorLineup = actorTeam.lineup
      const actorPowers = midRoll < 0.5 ? userPow.powers : enemyPow.powers
      const star = chooseStar(actorPowers, actorLineup, pickOne(['Entry', 'AWPer', 'Lurker', 'Support', 'IGL']), pickOne)
      const name = star.player?.name || anyPlayer(actorLineup, pickOne)?.name || actorTeam.shortName
      const site = pickOne(['A', 'B', 'mid', 'connector', 'apps', 'banana', 'palace', 'ramp'])

      if (midRoll < 0.14) {
        push('beat', translate('liveLog.beatUtil', { r: roundNum, name, flavor: formatFlavor('util', { site }, rng) }))
      } else if (midRoll < 0.28) {
        push('beat', translate('liveLog.beatPeek', { r: roundNum, name, flavor: formatFlavor('peek', { site }, rng) }))
      } else if (midRoll < 0.4) {
        push('beat', translate('liveLog.beatTrade', { r: roundNum, name, flavor: formatFlavor('trade', {}, rng) }))
      } else if (midRoll < 0.5) {
        push('beat', translate('liveLog.beatInfo', { r: roundNum, name, flavor: formatFlavor('info', { site }, rng) }))
      } else if (midRoll < 0.6) {
        push('beat', translate('liveLog.beatRotate', { r: roundNum, name, flavor: formatFlavor('rotate', { site }, rng) }))
      } else if (midRoll < 0.72) {
        push('beat', translate('liveLog.beatSmoke', { r: roundNum, flavor: formatFlavor('smoke', { site }, rng) }))
      } else if (midRoll < 0.82) {
        push(
          'beat',
          translate('liveLog.beatBomb', {
            r: roundNum,
            flavor: formatFlavor(userCT ? 'bombCt' : 'bombT', { site }, rng),
          }),
        )
      } else {
        push('beat', translate('liveLog.beatFight', { r: roundNum, name, flavor: formatFlavor('fight', { site }, rng) }))
      }
    }

    // Match point callout before the deciding round result lands
    if ((userRounds === 12 && enemyRounds < 12 && userWins) || (enemyRounds === 12 && userRounds < 12 && !userWins)) {
      push('matchpoint', translate('liveLog.matchPoint', { team: winnerName, ur: userRounds, er: enemyRounds }))
    }

    // ── Beat 3: round result ──
    const roll = rng()
    let eventText
    let eventType = 'round'

    if (eco && ((userWins && u > e + 0.05) || (!userWins && e > u + 0.05))) {
      eventType = 'eco'
      eventText = translate('liveLog.roundEco', {
        ...score,
        flavor: formatFlavor('eco', {}, rng),
      })
    } else if (roll < 0.04) {
      eventType = 'ace'
      const star = chooseStar(winnerPowers, winnerLineup, null, pickOne)
      bumpImpact(star.player, winnerTeamLabel, star.slot, 5)
      eventText = translate('liveLog.roundAce', {
        ...score,
        name: star.player?.name || winnerName,
        flavor: formatFlavor('ace', {}, rng),
      })
    } else if (roll < 0.12) {
      eventType = 'clutch'
      const star = chooseStar(winnerPowers, winnerLineup, 'Lurker', pickOne)
      bumpImpact(star.player, winnerTeamLabel, star.slot, 4)
      const n = pickOne([2, 2, 3, 3, 4])
      eventText = translate('liveLog.roundClutch', {
        ...score,
        name: star.player?.name || winnerName,
        flavor: formatFlavor('clutch', { n }, rng),
      })
    } else if (roll < 0.28) {
      eventType = 'multikill'
      const star = chooseStar(winnerPowers, winnerLineup, null, pickOne)
      bumpImpact(star.player, winnerTeamLabel, star.slot, 3)
      const n = pickOne([3, 3, 4])
      eventText = translate('liveLog.roundMulti', {
        ...score,
        name: star.player?.name || winnerName,
        flavor: formatFlavor('multiKill', { n }, rng),
      })
    } else if (roll < 0.42) {
      const star = chooseStar(winnerPowers, winnerLineup, 'AWPer', pickOne)
      bumpImpact(star.player, winnerTeamLabel, star.slot, 2)
      eventText = translate('liveLog.roundAwp', {
        ...score,
        name: star.player?.name || winnerName,
        flavor: formatFlavor('awp', {}, rng),
      })
    } else if (roll < 0.52) {
      eventText = translate('liveLog.roundPlant', {
        ...score,
        flavor: formatFlavor('plant', {}, rng),
      })
    } else if (roll < 0.6) {
      eventText = translate('liveLog.roundDefuse', {
        ...score,
        flavor: formatFlavor('defuse', {}, rng),
      })
    } else if (roll < 0.72) {
      const star = chooseStar(winnerPowers, winnerLineup, userCT ? 'Support' : 'Entry', pickOne)
      bumpImpact(star.player, winnerTeamLabel, star.slot, 1)
      eventText = translate('liveLog.roundAction', {
        ...score,
        name: star.player?.name || winnerName,
        flavor: formatFlavor(userCT ? 'hold' : 'entry', {}, rng),
      })
    } else if (roll < 0.82) {
      const victim = anyPlayer(loserLineup, pickOne)
      eventText = translate('liveLog.roundTime', {
        ...score,
        flavor: formatFlavor('time', { name: victim?.name || loserName }, rng),
      })
    } else {
      eventText = translate('liveLog.roundWin', {
        ...score,
        flavor: formatFlavor('winClose', {}, rng),
      })
    }

    push(eventType, eventText, { userWins })

    // Occasional post-round radio / streak note
    if (rng() < 0.22) {
      const star = chooseStar(winnerPowers, winnerLineup, null, pickOne)
      push(
        'info',
        translate('liveLog.afterRound', {
          r: roundNum,
          name: star.player?.name || winnerName,
          flavor: formatFlavor('after', {}, rng),
        }),
      )
    }
  }

  let userCT = rng() > 0.5
  push('system', translate('liveLog.side', { side: userCT ? 'CT' : 'T' }))
  push('info', translate('liveLog.warmup', { map: mapName, home: userTeam.shortName, away: enemyTeam.shortName }))

  for (let r = 1; r <= 12; r++) playRound(r, userCT)

  push(
    'halftime',
    translate('liveLog.halftime', {
      home: userTeam.shortName,
      away: enemyTeam.shortName,
      ur: userRounds,
      er: enemyRounds,
    }),
  )
  half = 2
  userCT = !userCT
  push('info', translate('liveLog.secondHalf', { side: userCT ? 'CT' : 'T' }))

  for (let r = 13; r <= 24; r++) {
    if (userRounds >= 13 || enemyRounds >= 13) break
    playRound(r, userCT)
  }

  if (userRounds === 12 && enemyRounds === 12) {
    push('system', translate('liveLog.overtime'))
    half = 3
    let ot = 1
    while (Math.abs(userRounds - enemyRounds) < 4 && ot <= 6) {
      userCT = ot <= 3
      playRound(24 + ot, userCT)
      ot++
    }
  }

  while (userRounds < 13 && enemyRounds < 13) {
    if (rng() > 0.5) userRounds++
    else enemyRounds++
  }

  const userWon = userRounds > enemyRounds
  push(
    userWon ? 'mapwin' : 'maploss',
    translate(userWon ? 'liveLog.mapWin' : 'liveLog.mapLoss', {
      map: mapName,
      ur: userRounds,
      er: enemyRounds,
      team: userWon ? userTeam.shortName : enemyTeam.shortName,
    }),
  )

  const ranked = Object.values(impact).sort((a, b) => b.score - a.score)
  const mvp = ranked[0] || null
  if (mvp) {
    push(
      'mvp',
      mvp.slot
        ? translate('liveLog.mvpWithSlot', { name: mvp.name, team: mvp.team, slot: mvp.slot })
        : translate('liveLog.mvp', { name: mvp.name, team: mvp.team }),
      { mvp },
    )
  }

  return {
    map: mapName,
    userRounds,
    enemyRounds,
    userWon,
    logs,
    tacticalCall: tacticalCall?.id ?? null,
    mvp,
  }
}

export function simulateFullSeries(userTeam, enemyTeam, mentality, veto, tacticalCallsByMap = {}, matchSeed = null) {
  let seriesRng = null
  if (matchSeed != null) {
    // lazy import avoided — use inline mulberry from hash
    let t = 0
    for (let i = 0; i < String(matchSeed).length; i++) {
      t = Math.imul(t ^ String(matchSeed).charCodeAt(i), 16777619)
    }
    let state = t >>> 0
    seriesRng = () => {
      state += 0x6d2b79f5
      let r = Math.imul(state ^ (state >>> 15), 1 | state)
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296
    }
  }

  const maps = []
  const allLogs = []
  let userMaps = 0
  let enemyMaps = 0
  const need = (veto?.bestOf === 1 ? 1 : 2)

  allLogs.push({
    type: 'series',
    text: translate('liveLog.seriesStart', { home: userTeam.shortName, away: enemyTeam.shortName }),
  })

  for (const mapName of veto.mapOrder) {
    if (userMaps === need || enemyMaps === need) break
    const call = tacticalCallsByMap[mapName] || null
    const result = simulateMap(userTeam, enemyTeam, mapName, mentality, call, seriesRng)
    maps.push(result)
    allLogs.push(...result.logs)
    if (result.userWon) userMaps++
    else enemyMaps++
    allLogs.push({
      type: 'series',
      text: translate('liveLog.seriesScore', { home: userTeam.shortName, away: enemyTeam.shortName, um: userMaps, em: enemyMaps }),
    })
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

export function simulateCpuSeries(home, away, { bestOf = 3 } = {}) {
  // Fast sim for non-user bracket matches
  const mentality = { bonuses: {} }
  const veto = simulateMapVeto(
    home.mapPoolBias?.[0] || 'Mirage',
    away.mapPoolBias || ACTIVE_MAP_POOL,
    'tactical',
    { bestOf },
  )
  let userMaps = 0
  let enemyMaps = 0
  const maps = []
  const need = bestOf === 1 ? 1 : 2

  for (const mapName of veto.mapOrder) {
    if (userMaps === need || enemyMaps === need) break
    const hp = computeTeamPower(home.lineup, mentality, mapName).avg + Math.random() * 0.15
    const ap = computeTeamPower(away.lineup, mentality, mapName).avg + Math.random() * 0.15
    const homeWon = hp >= ap
    const hr = homeWon ? 13 : 8 + Math.floor(Math.random() * 5)
    const ar = homeWon ? 8 + Math.floor(Math.random() * 5) : 13
    maps.push({ map: mapName, userRounds: hr, enemyRounds: ar, userWon: homeWon })
    if (homeWon) userMaps++
    else enemyMaps++
  }

  return {
    userMaps,
    enemyMaps,
    userWon: userMaps > enemyMaps,
    maps,
    winner: userMaps > enemyMaps ? home : away,
    loser: userMaps > enemyMaps ? away : home,
  }
}

export function advanceBracket(bracket, matchId, seriesResult, winner, loser) {
  const next = structuredClone(bracket)

  const findAndSet = (list) => {
    const m = list.find((x) => x.id === matchId)
    if (m) {
      m.result = {
        ...seriesResult,
        winnerId: winner.id,
        loserId: loser.id,
      }
    }
  }

  findAndSet(next.quarterfinals)
  findAndSet(next.semifinals)
  findAndSet(next.grandfinal)

  // Advance winners
  const qf = next.quarterfinals
  if (qf.every((m) => m.result)) {
    next.semifinals[0].home = qf[0].result.winnerId === qf[0].home.id ? qf[0].home : qf[0].away
    next.semifinals[0].away = qf[1].result.winnerId === qf[1].home.id ? qf[1].home : qf[1].away
    next.semifinals[1].home = qf[2].result.winnerId === qf[2].home.id ? qf[2].home : qf[2].away
    next.semifinals[1].away = qf[3].result.winnerId === qf[3].home.id ? qf[3].home : qf[3].away
  }

  const sf = next.semifinals
  if (sf.every((m) => m.result)) {
    next.grandfinal[0].home = sf[0].result.winnerId === sf[0].home.id ? sf[0].home : sf[0].away
    next.grandfinal[0].away = sf[1].result.winnerId === sf[1].home.id ? sf[1].home : sf[1].away
  }

  return next
}

export function resolveNonUserMatches(bracket, stage, { bestOf = 3 } = {}) {
  let next = structuredClone(bracket)
  const list = next[stage === 'grandfinal' ? 'grandfinal' : stage]

  for (const match of list) {
    if (match.result) continue
    if (!match.home || !match.away) continue
    if (match.home.isUser || match.away.isUser) continue

    const result = simulateCpuSeries(match.home, match.away, { bestOf })
    next = advanceBracket(next, match.id, result, result.winner, result.loser)
  }

  return next
}

export function findUserMatch(bracket) {
  for (const stage of ['quarterfinals', 'semifinals', 'grandfinal']) {
    for (const match of bracket[stage]) {
      if (match.result) continue
      if (!match.home || !match.away) continue
      if (match.home.isUser || match.away.isUser) {
        return { match, stage }
      }
    }
  }
  return null
}

export function getStageLabel(stageId) {
  return STAGES.find((s) => s.id === stageId)?.label || stageId
}

export function emptyLineup() {
  return { IGL: null, AWPer: null, Entry: null, Lurker: null, Support: null }
}

export function lineupComplete(lineup) {
  return Object.values(lineup).every(Boolean)
}

export function lineupFilledCount(lineup) {
  return Object.values(lineup).filter(Boolean).length
}
