/**
 * Smoke test: two guest players exercise all modes + local friends/rooms.
 * Run from repo root: node scripts/smoke-guests.mjs
 */

import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_SRC = path.join(__dirname, '../apps/app/src')

// ─── Browser shims ─────────────────────────────────────────
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(String(k), String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
  key: (i) => [...store.keys()][i] ?? null,
  get length() {
    return store.size
  },
}

globalThis.window = globalThis
globalThis.location = { origin: 'https://app.cs4fun.online', href: 'https://app.cs4fun.online' }
try {
  Object.defineProperty(globalThis, 'navigator', {
    value: { language: 'en-US', clipboard: undefined, share: undefined },
    configurable: true,
  })
} catch {
  /* navigator may already exist */
}

class FakeBroadcastChannel {
  constructor(name) {
    this.name = name
    this.onmessage = null
    FakeBroadcastChannel._channels.push(this)
  }
  postMessage(data) {
    for (const ch of FakeBroadcastChannel._channels) {
      if (ch !== this && ch.name === this.name && typeof ch.onmessage === 'function') {
        ch.onmessage({ data })
      }
    }
  }
  close() {
    FakeBroadcastChannel._channels = FakeBroadcastChannel._channels.filter((c) => c !== this)
  }
}
FakeBroadcastChannel._channels = []
globalThis.BroadcastChannel = FakeBroadcastChannel

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

function ok(label) {
  console.log(`  ✓ ${label}`)
}

function section(title) {
  console.log(`\n▸ ${title}`)
}

async function load(rel) {
  const full = path.join(APP_SRC, rel)
  return import(pathToFileURL(full).href)
}

const failures = []

async function run() {
  console.log('cs4fun smoke — two guests, all modes\n')

  const { MENTALITIES } = await load('data/constants.js')
  const {
    generateSharedRolls,
    autoDraftCpu,
    buildUserTeam,
    runDuelSeries,
    buildGauntletOpponent,
    scoreMajorRun,
    scoreDaily,
    scoreGauntlet,
    scoreDuel,
    teamPowerScore,
    lineupComplete,
    dailySeed,
  } = await load('lib/gameModes.js')
  const {
    generateBracket,
    findUserMatch,
    resolveNonUserMatches,
    advanceBracket,
    simulateMapVeto,
    simulateFullSeries,
    getAllRosters,
  } = await load('engine/simulation.js')
  const { createRoom, joinRoom, updateRoom, fetchRoom } = await load('lib/rooms.js')
  const {
    sendFriendRequest,
    acceptFriendRequest,
    listFriends,
    listIncomingRequests,
    inviteFriendToMatch,
    recordFriendMatch,
    getFriendH2H,
    registerLocalPlayer,
  } = await load('lib/friends.js')
  const { saveGameResult, buildShareText, shareProfile } = await load('lib/history.js')
  const { sanitizeSteamUrl } = await load('lib/steam.js')
  const { sanitizeAvatarUrl } = await load('lib/avatarImage.js')
  const { buildResultShareText, buildProfileShareText } = await load('lib/shareText.js')
  const { fetchPublicProfile } = await load('lib/publicProfile.js')

  const mentality = MENTALITIES.find((m) => m.id === 'tactical') || MENTALITIES[1]
  const mapPriority = 'Mirage'

  const guestA = {
    id: 'p_smoke_a',
    nickname: 'SmokeA',
    avatarId: 'crosshair',
    avatarUrl: null,
    showcaseBadge: null,
    steamUrl: null,
    profilePublic: true,
  }
  const guestB = {
    id: 'p_smoke_b',
    nickname: 'SmokeB',
    avatarId: 'flame',
    avatarUrl: null,
    showcaseBadge: null,
    steamUrl: 'https://steamcommunity.com/id/smokeb',
    profilePublic: true,
  }

  // ── Rosters / draft ──────────────────────────────────────
  section('Data & draft')
  const rosters = getAllRosters()
  assert(rosters.length >= 8, `expected rosters, got ${rosters.length}`)
  ok(`${rosters.length} rosters loaded`)

  const rolls = generateSharedRolls('smoke-seed-1', 5)
  assert(rolls.length === 5, 'shared rolls length')
  const lineupA = autoDraftCpu(rolls, 'tactical')
  const lineupB = autoDraftCpu(rolls, 'aggressive')
  assert(lineupComplete(lineupA), 'guest A lineup complete')
  assert(lineupComplete(lineupB), 'guest B lineup complete')
  ok('shared rolls + auto-draft for A/B')

  const teamA = buildUserTeam(lineupA, {
    mapPriority,
    mentalityId: 'tactical',
    name: guestA.nickname,
    shortName: 'SMA',
  })
  const teamB = buildUserTeam(lineupB, {
    mapPriority,
    mentalityId: 'aggressive',
    name: guestB.nickname,
    shortName: 'SMB',
  })
  teamB.isUser = false

  // ── Duel (2 guests) ──────────────────────────────────────
  section('Duel (2 guests)')
  const veto = simulateMapVeto(mapPriority, teamB.mapPoolBias || [], mentality.id)
  assert(veto?.mapOrder?.length >= 1, 'veto mapOrder')
  const duel = runDuelSeries(teamA, teamB, mentality, veto)
  assert(typeof duel.userWon === 'boolean', 'duel userWon')
  assert(Array.isArray(duel.logs) && duel.logs.length > 0, 'duel logs')
  assert(duel.userMaps + duel.enemyMaps >= 2, 'duel maps played')
  const duelScore = scoreDuel(duel.userWon, duel)
  assert(Number.isFinite(duelScore), 'duel score')
  ok(`duel ${duel.userMaps}-${duel.enemyMaps} · score ${duelScore}`)

  const duelSaveA = await saveGameResult({
    userId: guestA.id,
    nickname: guestA.nickname,
    mode: 'duel',
    won: duel.userWon,
    score: 1000 + duelScore,
    wins: duel.userWon ? 1 : 0,
    losses: duel.userWon ? 0 : 1,
    lineup: lineupA,
    meta: { friend: true },
    board: 'duel',
  })
  assert(duelSaveA.ok, 'save duel A')
  ok('guest A duel result saved locally')

  // ── Party race (2 guests, same rolls) ────────────────────
  section('Party race (2 guests)')
  const powerA = teamPowerScore(lineupA, 'tactical', mapPriority)
  const powerB = teamPowerScore(lineupB, 'aggressive', mapPriority)
  assert(Number.isFinite(powerA) && Number.isFinite(powerB), 'party powers')
  const partyWinner = powerA >= powerB ? guestA : guestB
  ok(`powers A=${powerA.toFixed(2)} B=${powerB.toFixed(2)} · winner ${partyWinner.nickname}`)

  await saveGameResult({
    userId: guestA.id,
    nickname: guestA.nickname,
    mode: 'party',
    won: partyWinner.id === guestA.id,
    score: Math.round(powerA * 100),
    wins: partyWinner.id === guestA.id ? 1 : 0,
    losses: partyWinner.id === guestA.id ? 0 : 1,
    lineup: lineupA,
    board: 'party',
  })
  await saveGameResult({
    userId: guestB.id,
    nickname: guestB.nickname,
    mode: 'party',
    won: partyWinner.id === guestB.id,
    score: Math.round(powerB * 100),
    wins: partyWinner.id === guestB.id ? 1 : 0,
    losses: partyWinner.id === guestB.id ? 0 : 1,
    lineup: lineupB,
    board: 'party',
  })
  ok('party results saved for both guests')

  // ── Major bracket ────────────────────────────────────────
  section('Major')
  const bracket = generateBracket(teamA, [])
  assert(bracket?.quarterfinals?.length === 4, 'bracket quarterfinals')
  assert(Array.isArray(bracket?.semifinals), 'bracket semifinals')
  assert(Array.isArray(bracket?.grandfinal) || bracket?.grandfinal, 'bracket grandfinal')
  let stage = 'quarterfinals'
  let wins = 0
  let losses = 0
  let majorWon = false

  for (let round = 0; round < 4; round++) {
    resolveNonUserMatches(bracket, stage)
    const found = findUserMatch(bracket)
    if (!found) break
    const userMatch = found.match
    stage = found.stage || stage
    const enemy = userMatch.home.id === teamA.id ? userMatch.away : userMatch.home
    assert(enemy?.id, 'major enemy present')
    const series = simulateFullSeries(teamA, enemy, mentality, simulateMapVeto(mapPriority, enemy.mapPoolBias || [], mentality.id), {})
    const winner = series.userWon ? teamA : enemy
    const loser = series.userWon ? enemy : teamA
    if (series.userWon) wins += 1
    else losses += 1
    advanceBracket(bracket, userMatch.id, series, winner, loser)
    if (winner.id === teamA.id && stage === 'grandfinal') {
      majorWon = true
      break
    }
    const next = findUserMatch(bracket)
    if (!next) {
      majorWon = wins >= 3 || wins > losses
      break
    }
    stage = next.stage || stage
  }

  const majorScore = scoreMajorRun({
    wins,
    losses,
    lineup: lineupA,
    mentalityId: 'tactical',
    mapPriority,
  })
  assert(Number.isFinite(majorScore), 'major score')
  await saveGameResult({
    userId: guestA.id,
    nickname: guestA.nickname,
    mode: 'major',
    won: majorWon || wins > losses,
    score: majorScore,
    wins,
    losses,
    lineup: lineupA,
    board: 'major',
  })
  ok(`major ${wins}W-${losses}L · score ${majorScore}`)

  // ── Daily ────────────────────────────────────────────────
  section('Daily')
  const seed = dailySeed()
  const dailyRolls = generateSharedRolls(seed, 5)
  const dailyLineup = autoDraftCpu(dailyRolls, 'tactical')
  assert(lineupComplete(dailyLineup), 'daily lineup')
  const dailyTeam = buildUserTeam(dailyLineup, { mapPriority, mentalityId: 'tactical' })
  const dailyBracket = generateBracket(dailyTeam, [])
  resolveNonUserMatches(dailyBracket, 'quarterfinals')
  const dailyMatch = findUserMatch(dailyBracket)
  assert(dailyMatch?.match, 'daily user match')
  const dailyEnemy =
    dailyMatch.match.home.id === dailyTeam.id ? dailyMatch.match.away : dailyMatch.match.home
  assert(dailyEnemy?.id, 'daily enemy')
  const dailySeries = simulateFullSeries(
    dailyTeam,
    dailyEnemy,
    mentality,
    simulateMapVeto(mapPriority, dailyEnemy.mapPoolBias || [], mentality.id),
    {},
  )
  const dailyScore = scoreDaily({
    wins: dailySeries.userWon ? 1 : 0,
    losses: dailySeries.userWon ? 0 : 1,
    lineup: dailyLineup,
    mentalityId: 'tactical',
    mapPriority,
  })
  await saveGameResult({
    userId: guestB.id,
    nickname: guestB.nickname,
    mode: 'daily',
    won: dailySeries.userWon,
    score: dailyScore,
    wins: dailySeries.userWon ? 1 : 0,
    losses: dailySeries.userWon ? 0 : 1,
    lineup: dailyLineup,
    meta: { dayKey: seed },
    board: 'daily',
  })
  ok(`daily seed ${seed} · ${dailySeries.userWon ? 'W' : 'L'} · ${dailyScore}`)

  // ── Gauntlet ─────────────────────────────────────────────
  section('Gauntlet')
  let streak = 0
  for (let wave = 1; wave <= 5; wave++) {
    const opp = buildGauntletOpponent(wave, 'smoke-gauntlet')
    assert(lineupComplete(opp.lineup), `gauntlet wave ${wave} lineup`)
    const series = runDuelSeries(teamA, opp, mentality)
    if (!series.userWon) break
    streak += 1
  }
  const gScore = scoreGauntlet(streak, lineupA, 'tactical', mapPriority)
  await saveGameResult({
    userId: guestA.id,
    nickname: guestA.nickname,
    mode: 'gauntlet',
    won: streak > 0,
    score: gScore,
    streak,
    lineup: lineupA,
    board: 'gauntlet',
  })
  ok(`gauntlet streak ${streak} · score ${gScore}`)

  // ── Local rooms (2 guests) ───────────────────────────────
  section('Local rooms')
  // Force guest path: supabase not configured in Node without env
  const created = await createRoom({ profile: guestA, mode: 'duel' })
  assert(created.room?.code, 'create room code')
  assert(created.global === false, 'guest room is local')
  ok(`A created room ${created.room.code}`)

  const joined = await joinRoom({ code: created.room.code, profile: guestB })
  assert(!joined.error, `join error: ${joined.error}`)
  assert(joined.room.players.length === 2, `expected 2 players, got ${joined.room.players.length}`)
  ok('B joined A room')

  const updated = await updateRoom(created.room.code, (r) => ({
    ...r,
    status: 'drafting',
    players: r.players.map((p) =>
      p.id === guestA.id ? { ...p, ready: true, lineup: lineupA } : { ...p, ready: true, lineup: lineupB },
    ),
  }))
  assert(updated?.status === 'drafting', 'room drafting')
  const fetched = await fetchRoom(created.room.code)
  assert(fetched.players.every((p) => p.lineup), 'both lineups locked in room')
  ok('room draft lock sync')

  const partyRoom = await createRoom({ profile: guestA, mode: 'party' })
  const partyJoin = await joinRoom({ code: partyRoom.room.code, profile: guestB })
  assert(partyJoin.room.players.length === 2, 'party room 2 players')
  ok(`party room ${partyRoom.room.code}`)

  // ── Friends (local) ──────────────────────────────────────
  section('Friends (local guests)')
  registerLocalPlayer(guestA)
  registerLocalPlayer(guestB)

  const req = await sendFriendRequest({
    from: { id: guestA.id, nickname: guestA.nickname },
    to: { id: guestB.id, nickname: guestB.nickname },
  })
  assert(req.ok, `friend request: ${req.error}`)
  const incoming = await listIncomingRequests(guestB.id)
  assert(incoming.length >= 1, 'B has incoming request')
  const accept = await acceptFriendRequest({
    profileId: guestB.id,
    requestId: incoming[0].id,
    requesterId: guestA.id,
  })
  assert(accept.ok, `accept: ${accept.error}`)
  const friendsA = await listFriends(guestA.id)
  const friendsB = await listFriends(guestB.id)
  assert(friendsA.some((f) => f.id === guestB.id), 'A lists B')
  assert(friendsB.some((f) => f.id === guestA.id), 'B lists A')
  ok('friendship established')

  await recordFriendMatch({
    profileId: guestA.id,
    friendId: guestB.id,
    won: true,
  })
  const h2h = await getFriendH2H(guestA.id, guestB.id)
  assert(h2h.matches >= 1 && h2h.wins >= 1, 'H2H recorded')
  ok(`H2H ${h2h.wins}W-${h2h.losses}L`)

  const invite = await inviteFriendToMatch({
    from: guestA,
    friend: guestB,
    mode: 'duel',
  })
  assert(invite.ok || invite.room || invite.invite, `invite: ${JSON.stringify(invite)}`)
  ok('friend duel invite created')

  // ── Profile / share / steam ──────────────────────────────
  section('Profile, Steam, share text')
  const steamOk = sanitizeSteamUrl('https://steamcommunity.com/id/foo')
  assert(steamOk.ok && steamOk.url, 'valid steam')
  const steamBad = sanitizeSteamUrl('https://evil.com/phish')
  assert(!steamBad.ok, 'reject non-steam URL')
  ok('steam URL validation')

  assert(sanitizeAvatarUrl('not-an-image') === null, 'reject bad avatar')
  assert(sanitizeAvatarUrl(null) === null, 'null avatar')
  ok('avatar sanitize')

  const shareResult = buildResultShareText({
    mode: 'duel',
    won: true,
    score: 1100,
    wins: 1,
    losses: 0,
    nickname: guestA.nickname,
    locale: 'en',
  })
  assert(shareResult.includes('cs4fun'), 'share has brand')
  assert(shareResult.includes('@SmokeA'), 'share has tag')
  assert(shareResult.includes('\n'), 'share is multiline')
  ok('result share text')

  const shareProf = buildProfileShareText({
    userId: guestB.id,
    nickname: guestB.nickname,
  })
  assert(shareProf.includes('?p='), 'profile share is a link')
  assert(shareProf.includes(guestB.id), 'profile share has id')
  assert(!shareProf.includes('steamcommunity.com'), 'profile share is link-only')
  ok('profile share text')

  // Public profile peek (local directory)
  store.set(
    'cs4fun_profile',
    JSON.stringify({ ...guestA, createdAt: Date.now() }),
  )
  const peek = await fetchPublicProfile(guestB.id, { viewerId: guestA.id })
  assert(peek?.nickname === 'SmokeB' || peek?.id === guestB.id, 'peek B')
  ok('public profile peek')

  const privateShare = buildProfileShareText({
    userId: guestA.id,
    nickname: guestA.nickname,
  })
  assert(privateShare.includes('?p='), 'profile share stays a link')
  assert(!privateShare.includes('99W'), 'profile share has no stats dump')
  ok('private profile share redacts details')

  // Empty lineup safety
  section('Edge cases')
  const emptyPow = teamPowerScore({}, 'tactical', 'Mirage')
  assert(emptyPow === 0 || Number.isFinite(emptyPow), 'empty lineup power safe')
  ok('empty lineup does not crash')

  const thinRoster = { id: 'thin', team: 'Thin', shortName: 'THN', event: 'x', year: 2020, players: [], mapPoolBias: [] }
  const { buildOpponentFromRoster } = await load('engine/simulation.js')
  const thinOpp = buildOpponentFromRoster(thinRoster, 'x')
  assert(thinOpp, 'thin roster opponent returns')
  ok('incomplete roster opponent safe')

  console.log('\n════════════════════════════════')
  console.log('Smoke passed — all modes OK')
  console.log('════════════════════════════════\n')
}

run().catch((err) => {
  console.error('\n✗ SMOKE FAILED\n')
  console.error(err)
  process.exit(1)
})
