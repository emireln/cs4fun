import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { MENTALITIES, TACTICAL_CALLS } from '../../data/constants'
import { useI18n } from '../../i18n'
import { useDraftSession } from '../../hooks/useDraftSession'
import {
  autoDraftCpu,
  buildUserTeam,
  generateSharedRolls,
  scoreDuel,
  teamPowerScore,
} from '../../lib/gameModes'
import { simulateMapVeto } from '../../engine/simulation'
import { createPlaybackController, streamLiveSeries } from '../../lib/matchPlayback'
import { saveGameResult } from '../../lib/history'
import { recordFriendMatch } from '../../lib/friends'
import { pickMatchHighlight } from '../../lib/matchHighlight'
import { saveLastMatchLog } from '../../lib/lastMatchLog'
import { titleLoadout } from '../../lib/cosmetics'
import { samePlayerId, subscribeRoom, updateRoom } from '../../lib/rooms'
import { initialSoloSetupState, retrySoloSetupState } from '../../lib/setupPreset'
import ModeSetup from '../ModeSetup'
import DraftPlay from '../DraftPlay'
import MapVetoPlay from '../MapVetoPlay'
import MatchLive from '../MatchLive'
import TacticalPausePanel from '../TacticalPausePanel'
import HypeBanner from '../HypeBanner'
import GameOver from '../GameOver'
import TeamLogo from '../TeamLogo'

export default function DuelGame({ profile, room: initialRoom = null, onHome, onStatus, onNeedFriends, onNeedAuth }) {
  const { t } = useI18n()
  // Room writes carry the caller's id explicitly so guest updates never resolve
  // against a stale shared guest key (signed-in users hit the session branch first).
  const roomUpdate = (code, updater, opts = {}) => updateRoom(code, updater, { guestId: profile.id, ...opts })
  const [liveRoom, setLiveRoom] = useState(initialRoom)
  const [boot] = useState(() => {
    if (initialRoom) {
      return {
        step: 'draft',
        cfg: { mode: 'classic', mentality: 'tactical', mapPriority: 'Mirage', vsCpu: false },
      }
    }
    return initialSoloSetupState(profile, { vsCpu: true })
  })
  const [step, setStep] = useState(boot.step)
  const [cfg, setCfg] = useState(boot.cfg)
  const [userTeam, setUserTeam] = useState(null)
  const [enemyTeam, setEnemyTeam] = useState(null)
  const [veto, setVeto] = useState(null)
  const [logs, setLogs] = useState([])
  const [series, setSeries] = useState(null)
  const [hype, setHype] = useState(null)
  const [won, setWon] = useState(false)
  const [submitInfo, setSubmitInfo] = useState(null)
  const [waitingOpp, setWaitingOpp] = useState(false)
  const [oppStatus, setOppStatus] = useState(null)
  const [pickEndsAt, setPickEndsAt] = useState(null)
  const [timerLeft, setTimerLeft] = useState(null)
  const [liveMapName, setLiveMapName] = useState(null)
  const [mapResults, setMapResults] = useState([])
  const [seriesScore, setSeriesScore] = useState({ user: 0, enemy: 0 })
  const [liveMvp, setLiveMvp] = useState(null)
  const [speed, setSpeed] = useState(1)
  const [paused, setPaused] = useState(false)
  const [tacticalOpen, setTacticalOpen] = useState(false)
  const [pendingTacticMap, setPendingTacticMap] = useState(null)
  const [simulating, setSimulating] = useState(false)
  const simStarted = useRef(false)
  const autoLockRef = useRef(false)
  const liveRef = useRef(true)
  const logsRef = useRef([])
  const playbackRef = useRef(createPlaybackController(1))
  const callsRef = useRef({})
  const mapSimulatingRef = useRef(false)
  const mapResultsLenRef = useRef(0)

  useEffect(() => {
    liveRef.current = true
    return () => {
      liveRef.current = false
      playbackRef.current.abort()
    }
  }, [])

  const isFriend = Boolean(liveRoom)
  const isHost = !isFriend || liveRoom?.hostId === profile.id
  const seed = liveRoom?.seed || `duel-cpu-${profile.id}`
  const sharedRolls = useMemo(() => generateSharedRolls(seed, 5), [seed])

  const draft = useDraftSession({
    hideRatings: cfg?.mode === 'almanac',
    sharedRolls,
    pickTimerSec: 30,
  })

  const mentality = MENTALITIES.find((m) => m.id === cfg?.mentality) || MENTALITIES[1]
  const opponent = liveRoom?.players?.find((p) => p.id !== profile.id)

  useEffect(() => {
    if (!liveRoom?.code) return undefined
    return subscribeRoom(liveRoom.code, setLiveRoom)
  }, [liveRoom?.code])

  // Presence: sync draft progress to room
  useEffect(() => {
    if (!isFriend || !liveRoom?.code || step !== 'draft') return undefined
    const filled = Object.values(draft.lineup).filter(Boolean).length
    const phase = draft.complete ? 'locked' : draft.pendingPlayer || draft.currentRoster ? 'picking' : 'scouting'
    const id = setTimeout(() => {
      roomUpdate(liveRoom.code, (r) => ({
        ...r,
        players: r.players.map((p) =>
          p.id === profile.id
            ? {
                ...p,
                draftPhase: phase,
                draftFilled: filled,
                lineup: draft.complete ? draft.lineup : p.lineup,
                power: draft.complete
                  ? teamPowerScore(draft.lineup, cfg.mentality, cfg.mapPriority, {
                      cursedCap: cfg.cursedCap,
                    })
                  : p.power,
              }
            : p,
        ),
      }))
    }, 400)
    return () => clearTimeout(id)
  }, [
    isFriend,
    liveRoom?.code,
    step,
    draft.complete,
    draft.pendingPlayer,
    draft.currentRoster,
    draft.lineup,
    profile.id,
    cfg,
  ])

  // Opponent presence label
  useEffect(() => {
    if (!opponent) {
      setOppStatus(null)
      return
    }
    if (opponent.lineup) setOppStatus('locked')
    else if (opponent.draftPhase) setOppStatus(opponent.draftPhase)
    else setOppStatus('scouting')
  }, [opponent])

  // Shared pick timer for friend duels (host sets deadline once both in draft)
  useEffect(() => {
    if (!isFriend || step !== 'draft' || !liveRoom?.code) return undefined
    if (liveRoom.pickEndsAt) {
      setPickEndsAt(liveRoom.pickEndsAt)
      return undefined
    }
    if (liveRoom.hostId === profile.id && !liveRoom.pickEndsAt) {
      const ends = Date.now() + 90_000
      roomUpdate(liveRoom.code, (r) => ({ ...r, pickEndsAt: ends, status: 'drafting' }))
      setPickEndsAt(ends)
    }
    return undefined
  }, [isFriend, step, liveRoom, profile.id])

  useEffect(() => {
    if (!pickEndsAt || step !== 'draft') {
      setTimerLeft(null)
      autoLockRef.current = false
      return undefined
    }
    const tick = () => {
      const left = Math.max(0, Math.ceil((pickEndsAt - Date.now()) / 1000))
      setTimerLeft(left)
      return left
    }
    if (tick() <= 0) return undefined
    const id = setInterval(() => {
      if (tick() <= 0) clearInterval(id)
    }, 250)
    return () => clearInterval(id)
  }, [pickEndsAt, step])

  // Room draft clock expired → auto-lock remaining slots once
  useEffect(() => {
    if (!isFriend || step !== 'draft' || timerLeft !== 0 || draft.complete) return
    if (autoLockRef.current) return
    autoLockRef.current = true
    const open = ['IGL', 'AWPer', 'Entry', 'Lurker', 'Support'].filter((s) => !draft.lineup[s])
    if (!open.length) return
    const rolls = sharedRolls || []
    const usedIds = new Set(Object.values(draft.lineup).filter(Boolean).map((p) => p.id))
    const next = { ...draft.lineup }
    open.forEach((slot, i) => {
      const roster = rolls[i % Math.max(rolls.length, 1)]
      const pool = (roster?.players || []).filter((p) => !usedIds.has(p.id))
      const player = pool[Math.floor(Math.random() * Math.max(pool.length, 1))] || roster?.players?.[0]
      if (player) {
        usedIds.add(player.id)
        next[slot] = {
          ...player,
          fromTeam: roster.shortName,
          fromEvent: roster.event,
        }
      }
    })
    draft.setLineup(next)
  }, [timerLeft, step, isFriend, draft.complete]) // eslint-disable-line react-hooks/exhaustive-deps

  // When waiting for opponent lineup, proceed once both locked
  useEffect(() => {
    if (!waitingOpp || !liveRoom) return
    const me = liveRoom.players.find((p) => p.id === profile.id)
    const them = liveRoom.players.find((p) => p.id !== profile.id)
    if (me?.lineup && them?.lineup) {
      const enemy = buildUserTeam(them.lineup, {
        mapPriority: them.lineup?.IGL?.bestMaps?.[0] || 'Inferno',
        mentalityId: 'aggressive',
        name: them.nickname || t('common.rival'),
        shortName: (them.nickname || 'RIV').slice(0, 8).toUpperCase(),
      })
      enemy.isUser = false
      enemy.id = them.id
      enemy.mapPoolBias = Object.values(them.lineup).flatMap((p) => p?.bestMaps || [])
      setEnemyTeam(enemy)
      setWaitingOpp(false)

      // Friend duel: host publishes a shared veto + match seed so both see the same live match
      if (isHost && !liveRoom.match?.veto) {
        const sharedVeto = simulateMapVeto(
          me.lineup?.IGL?.bestMaps?.[0] || cfg.mapPriority || 'Mirage',
          enemy.mapPoolBias || [],
          cfg.mentality || 'tactical',
          { bestOf: 1 },
        )
        const matchSeed = `${liveRoom.seed || seed}-live`
        roomUpdate(liveRoom.code, (r) => ({
          ...r,
          status: 'live',
          match: {
            seed: matchSeed,
            veto: sharedVeto,
            callsByMap: Object.fromEntries((sharedVeto.mapOrder || []).map((m) => [m, TACTICAL_CALLS[0]?.id || 'default_mid'])),
            startedAt: Date.now(),
          },
        }))
      }
      setStep('arming')
    }
  }, [waitingOpp, liveRoom, profile.id, isHost]) // eslint-disable-line react-hooks/exhaustive-deps

  // Both clients start the same seeded live match when room.match is ready
  useEffect(() => {
    if (step !== 'arming' || !liveRoom?.match?.veto || !userTeam || !enemyTeam) return
    if (simStarted.current) return
    const finalVeto = liveRoom.match.veto
    const matchSeed = liveRoom.match.seed || `${liveRoom.seed}-live`
    // Hydrate tactical calls from room (by id)
    const byId = Object.fromEntries(TACTICAL_CALLS.map((c) => [c.id, c]))
    const remoteCalls = liveRoom.match.callsByMap || {}
    callsRef.current = Object.fromEntries(
      (finalVeto.mapOrder || []).map((m) => [m, byId[remoteCalls[m]] || TACTICAL_CALLS[0]]),
    )
    startLive(finalVeto, matchSeed)
  }, [step, liveRoom?.match?.seed, liveRoom?.match?.veto, userTeam, enemyTeam]) // eslint-disable-line react-hooks/exhaustive-deps

  // Mirror remote tactical calls during live
  useEffect(() => {
    if (!isFriend || step !== 'live' || !liveRoom?.match?.callsByMap) return
    const byId = Object.fromEntries(TACTICAL_CALLS.map((c) => [c.id, c]))
    const next = { ...callsRef.current }
    let changed = false
    for (const [map, id] of Object.entries(liveRoom.match.callsByMap)) {
      const call = byId[id]
      if (call && next[map]?.id !== call.id) {
        next[map] = call
        changed = true
      }
    }
    if (changed) callsRef.current = next
  }, [isFriend, step, liveRoom?.match?.callsByMap]) // eslint-disable-line react-hooks/exhaustive-deps

  // Rematch signal from room — ignore stale re-fires once we're back in a fresh draft
  useEffect(() => {
    if (!liveRoom || liveRoom.status !== 'rematch') return
    if (step === 'draft' && !liveRoom.match && !liveRoom.playback) return
    playbackRef.current?.abort?.()
    liveRef.current = false
    draft.reset()
    simStarted.current = false
    setSeries(null)
    setLogs([])
    logsRef.current = []
    setVeto(null)
    setEnemyTeam(null)
    setUserTeam(null)
    setWaitingOpp(false)
    setSimulating(false)
    setPaused(false)
    setHype(null)
    setMapResults([])
    setSeriesScore({ user: 0, enemy: 0 })
    setLiveMvp(null)
    setStep('draft')
    liveRef.current = true
    if (liveRoom.hostId === profile.id) {
      roomUpdate(liveRoom.code, (r) => ({
        ...r,
        status: 'drafting',
        match: null,
        playback: null,
        pickEndsAt: Date.now() + 90_000,
        players: r.players.map((p) => ({
          ...p,
          lineup: null,
          power: 0,
          draftPhase: 'scouting',
          draftFilled: 0,
          wantRematch: false,
        })),
      }))
    }
  }, [liveRoom?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    onStatus?.({
      phase: step === 'live' || step === 'results' || step === 'arming' ? 'tournament' : step,
      gameMode: 'duel',
      mode: cfg?.mode,
      mentality,
      mapPriority: cfg?.mapPriority,
      rerolls: 0,
      wins: won && step === 'results' ? 1 : 0,
      losses: !won && step === 'results' ? 1 : 0,
      extra:
        isFriend && timerLeft != null && step === 'draft' ? (
          <span className="rounded border border-cs-warn/40 bg-cs-warn/10 px-2 py-1 text-cs-warn">
            {timerLeft}s
          </span>
        ) : null,
    })
  }, [step, cfg, won, timerLeft, isFriend]) // eslint-disable-line react-hooks/exhaustive-deps

  const startLive = async (finalVeto, matchSeed = null) => {
    if (simStarted.current) return
    simStarted.current = true
    setVeto(finalVeto)
    setStep('live')
    setSimulating(true)
    setLogs([{ type: 'system', text: t('tournament.connecting') }])
    setMapResults([])
    setSeriesScore({ user: 0, enemy: 0 })
    setLiveMvp(null)
    setLiveMapName(finalVeto.mapOrder[0] || null)
    mapResultsLenRef.current = 0
    mapSimulatingRef.current = false
    if (!Object.keys(callsRef.current || {}).length) {
      callsRef.current = Object.fromEntries(
        (finalVeto.mapOrder || []).map((m) => [m, TACTICAL_CALLS[0]]),
      )
    }

    const pb = playbackRef.current
    pb.reset()
    pb.setSpeed(speed)
    setPaused(false)
    setTacticalOpen(false)

    const result = await streamLiveSeries({
      userTeam,
      enemyTeam,
      mentality,
      veto: finalVeto,
      getCalls: () => callsRef.current,
      playback: pb,
      matchSeed: matchSeed || (isFriend ? `${liveRoom?.seed || seed}-live` : null),
      shouldStop: () => !liveRef.current,
      beforeMap: async (mapName) => {
        mapSimulatingRef.current = false
        setLiveMapName(mapName)
        setLiveMvp(null)
        mapSimulatingRef.current = true
      },
      onLog: (log) => {
        if (!liveRef.current) return
        setLogs((prev) => {
          const next = [...prev, log]
          logsRef.current = next
          return next
        })
        if (log.type === 'clutch' || log.type === 'ace' || log.type === 'eco') {
          setHype(log.type)
          setTimeout(() => {
            if (liveRef.current) setHype(null)
          }, 1400)
        }
        if (log.type === 'system' && /OVERTIME/i.test(log.text || '')) {
          setHype('overtime')
          setTimeout(() => {
            if (liveRef.current) setHype(null)
          }, 1400)
        }
        if (log.type === 'mvp' && log.mvp) setLiveMvp(log.mvp)
      },
      onMapStart: ({ mapName, seriesScore: sc }) => {
        setLiveMapName(mapName)
        setSeriesScore(sc)
      },
      onMapEnd: ({ result: mapRes, maps, seriesScore: sc }) => {
        mapResultsLenRef.current = maps.length
        mapSimulatingRef.current = false
        setMapResults(maps)
        setSeriesScore(sc)
        if (mapRes.mvp) setLiveMvp(mapRes.mvp)
      },
    })

    if (!result || !liveRef.current) return
    result.veto = finalVeto
    setSeries(result)
    setMapResults(result.maps)
    setSeriesScore({ user: result.userMaps, enemy: result.enemyMaps })
    setWon(result.userWon)
    setSimulating(false)
    setPaused(false)
    const score = scoreDuel(result.userWon, result)
    const finalScore = result.userWon ? 1000 + score : Math.max(100, 800 - score)
    const res = await saveGameResult({
      userId: profile.id,
      nickname: profile.nickname,
      mode: 'duel',
      won: result.userWon,
      score: finalScore,
      wins: result.userWon ? 1 : 0,
      losses: result.userWon ? 0 : 1,
      lineup: draft.lineup,
      meta: { maps: `${result.userMaps}-${result.enemyMaps}`, friend: isFriend, friendMatch: isFriend },
      board: 'duel',
    })
    setSubmitInfo(res)
    if (isFriend && opponent?.id) {
      await recordFriendMatch({
        profileId: profile.id,
        friendId: opponent.id,
        won: result.userWon,
      })
    }
    if (liveRoom?.code) {
      roomUpdate(liveRoom.code, (r) => ({ ...r, status: 'finished' }))
    }
    saveLastMatchLog({
      mode: 'duel',
      logs: logsRef.current,
      won: result.userWon,
      homeName: userTeam?.shortName,
      awayName: enemyTeam?.shortName,
      mapOrder: finalVeto?.mapOrder || [],
      mapResults: result.maps,
    })
    setStep('results')
  }

  const openTacticalPause = () => {
    if (!simulating || !veto?.mapOrder?.length) return
    playbackRef.current.setPaused(true)
    setPaused(true)
    const idx = mapSimulatingRef.current ? mapResultsLenRef.current + 1 : mapResultsLenRef.current
    const target = veto.mapOrder[idx]
    if (!target) {
      setTacticalOpen(false)
      return
    }
    setPendingTacticMap(target)
    setTacticalOpen(true)
    if (isFriend && liveRoom?.code) {
      roomUpdate(liveRoom.code, (r) => ({
        ...r,
        playback: {
          ...(r.playback || {}),
          speed: r.playback?.speed || speed,
          tactical: { active: true, mapName: target, by: profile.id },
        },
      }))
    }
  }

  const clearTacticalRoom = () => {
    if (!isFriend || !liveRoom?.code) return
    roomUpdate(liveRoom.code, (r) => ({
      ...r,
      playback: {
        ...(r.playback || {}),
        speed: r.playback?.speed || speed,
        tactical: null,
      },
    }))
  }

  const applyLiveTactic = (call) => {
    const map = pendingTacticMap || liveMapName
    if (!map) return
    callsRef.current = { ...callsRef.current, [map]: call }
    setLogs((prev) => [
      ...prev,
      {
        type: 'tactical',
        text: t('duel.tacticalLog', { map, label: call.label }),
        map,
      },
    ])
    setTacticalOpen(false)
    setPendingTacticMap(null)
    playbackRef.current.setPaused(false)
    setPaused(false)
    clearTacticalRoom()
    if (isFriend && liveRoom?.code) {
      roomUpdate(liveRoom.code, (r) => ({
        ...r,
        match: {
          ...(r.match || {}),
          callsByMap: {
            ...(r.match?.callsByMap || {}),
            [map]: call.id,
          },
        },
      }))
    }
  }

  const cancelTacticalPause = () => {
    setTacticalOpen(false)
    setPendingTacticMap(null)
    playbackRef.current.setPaused(false)
    setPaused(false)
    clearTacticalRoom()
  }

  const changeSpeed = (n) => {
    if (isFriend && !isHost) return
    setSpeed(n)
    playbackRef.current.setSpeed(n)
    if (isFriend && liveRoom?.code && isHost) {
      roomUpdate(liveRoom.code, (r) => ({
        ...r,
        playback: { ...(r.playback || {}), speed: n, tactical: r.playback?.tactical || null },
      }))
    }
  }

  // Mirror host speed + tactical pause for friend duels
  useEffect(() => {
    if (!isFriend || !liveRoom?.playback) return
    const remoteSpeed = Number(liveRoom.playback.speed) || 1
    if (remoteSpeed !== speed) {
      setSpeed(remoteSpeed)
      playbackRef.current.setSpeed(remoteSpeed)
    }
    const tac = liveRoom.playback.tactical
    if (tac?.active) {
      if (!tacticalOpen) {
        playbackRef.current.setPaused(true)
        setPaused(true)
        setPendingTacticMap(tac.mapName || null)
        setTacticalOpen(true)
      }
      return
    }
    if (tacticalOpen && tac == null && liveRoom.playback.tactical === null) {
      setTacticalOpen(false)
      setPendingTacticMap(null)
      playbackRef.current.setPaused(false)
      setPaused(false)
    }
  }, [isFriend, liveRoom?.playback]) // eslint-disable-line react-hooks/exhaustive-deps

  if (step === 'setup') {
    return (
      <ModeSetup
        title={t('modes.duel.title')}
        subtitle={t('modes.duel.blurb')}
        showPlayWithOption
        soloLabel={t('duel.vsCpu')}
        friendsLabel={t('duel.vsFriend')}
        ctaLabel={t('setup.start')}
        onStart={(c) => {
          if (!c.vsCpu) {
            onNeedFriends?.('duel')
            return
          }
          setCfg(c)
          draft.reset()
          setStep('draft')
        }}
      />
    )
  }

  if (step === 'draft') {
    const oppLabel =
      oppStatus === 'locked'
        ? t('duel.oppLocked')
        : oppStatus === 'picking'
          ? t('duel.oppPicking')
          : oppStatus
            ? t('duel.oppScouting')
            : null

    return (
      <DraftPlay
        draft={draft}
        hideReroll
        launchLabel={waitingOpp ? t('draft.waitingFriends') : t('draft.launchDuel')}
        launchDisabled={waitingOpp}
        banner={
          <div className="mb-4 space-y-2">
            <div className="rounded border border-cs-info/30 bg-cs-info/10 px-4 py-2 text-sm text-cs-info">
              {t('party.sharedRolls')}
              {isFriend && opponent && (
                <span className="ml-2 text-cs-gold">
                  vs {opponent.nickname}
                  {oppLabel ? ` · ${oppLabel}` : ''}
                </span>
              )}
            </div>
            {isFriend && timerLeft != null && (
              <div
                className={`rounded border px-4 py-2 text-center font-mono text-sm ${
                  timerLeft <= 15
                    ? 'border-cs-loss/40 bg-cs-loss/10 text-cs-loss animate-pulse'
                    : 'border-cs-warn/40 bg-cs-warn/10 text-cs-warn'
                }`}
              >
                {t('duel.roomTimer')}: {timerLeft}s
              </div>
            )}
            {waitingOpp && (
              <div className="rounded border border-cs-gold/30 bg-cs-gold/10 px-4 py-2 text-center text-sm text-cs-gold">
                {t('draft.waitingFriends')}
              </div>
            )}
          </div>
        }
        onLaunch={async () => {
          const team = buildUserTeam(draft.lineup, {
            mapPriority: cfg.mapPriority,
            mentalityId: cfg.mentality,
            shortName: profile.nickname?.slice(0, 8)?.toUpperCase() || 'YOU',
          })
          setUserTeam(team)

          if (isFriend && liveRoom?.code) {
            await roomUpdate(liveRoom.code, (r) => ({
              ...r,
              status: 'reveal',
              players: r.players.map((p) =>
                p.id === profile.id
                  ? {
                      ...p,
                      lineup: draft.lineup,
                      power: teamPowerScore(draft.lineup, cfg.mentality, cfg.mapPriority, {
                      cursedCap: cfg.cursedCap,
                    }),
                      draftPhase: 'locked',
                      draftFilled: 5,
                    }
                  : p,
              ),
            }))
            setWaitingOpp(true)
            return
          }

          const cpuLineup = autoDraftCpu(sharedRolls, cfg.mentality)
          const cpu = buildUserTeam(cpuLineup, {
            mapPriority: sharedRolls[0]?.mapPoolBias?.[0] || 'Inferno',
            mentalityId: 'aggressive',
            name: t('common.cpuTeam'),
            shortName: 'BOT',
          })
          cpu.isUser = false
          cpu.id = 'cpu-duel'
          cpu.mapPoolBias = sharedRolls[0]?.mapPoolBias || cpu.mapPoolBias
          setEnemyTeam(cpu)
          setStep('veto')
        }}
      />
    )
  }

  if (step === 'arming') {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
        <motion.div
          className="mb-4 h-12 w-12 rounded-full border-2 border-cs-gold/40 border-t-cs-gold"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
        />
        <h2 className="font-display text-2xl font-bold gold-text">{t('duel.syncing')}</h2>
        <p className="mt-2 text-sm text-cs-muted">{t('duel.syncingHint')}</p>
        {liveRoom?.match?.veto?.mapOrder?.[0] && (
          <p className="mt-4 font-display text-sm text-cs-gold">
            {t('duel.mapsLocked', { map: liveRoom.match.veto.mapOrder[0] })}
          </p>
        )}
      </div>
    )
  }

  if (step === 'veto' && userTeam && enemyTeam) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h2 className="mb-2 text-center font-display text-2xl font-bold">{t('duel.showmatch')}</h2>
        <p className="mb-6 flex flex-wrap items-center justify-center gap-2 text-center text-sm text-cs-muted">
          <span className="inline-flex items-center gap-1.5">
            <TeamLogo name={userTeam.shortName} size="sm" decorative />
            {userTeam.shortName}
          </span>
          <span>vs</span>
          <span className="inline-flex items-center gap-1.5">
            <TeamLogo name={enemyTeam.shortName} size="sm" decorative />
            {enemyTeam.shortName}
          </span>
          <span>· {t('duel.bo1Tag')}</span>
        </p>
        <MapVetoPlay
          userPriority={userTeam.mapPriority}
          enemyBias={enemyTeam.mapPoolBias || []}
          mentalityId={mentality.id}
          enemyName={enemyTeam.shortName}
          bestOf={1}
          onComplete={startLive}
        />
      </div>
    )
  }

  if (step === 'live') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        <HypeBanner event={hype} />
        {tacticalOpen && (
          <TacticalPausePanel
            mapName={pendingTacticMap || liveMapName}
            onSelect={applyLiveTactic}
            onCancel={cancelTacticalPause}
          />
        )}
        <MatchLive
          logs={logs}
          title={t('duel.showmatch')}
          homeName={userTeam?.shortName || profile.nickname?.slice(0, 8)?.toUpperCase() || 'YOU'}
          awayName={enemyTeam?.shortName || 'BOT'}
          mapName={liveMapName}
          mapOrder={veto?.mapOrder || []}
          mapResults={mapResults}
          seriesScore={seriesScore}
          mvp={liveMvp}
          speed={speed}
          onSpeedChange={changeSpeed}
          speedLocked={isFriend && !isHost}
          paused={paused}
          onTacticalPause={openTacticalPause}
          canTacticalPause={simulating && !tacticalOpen}
          playing={simulating}
        />
      </div>
    )
  }

  return (
    <GameOver
      title={won ? t('results.duelWin') : t('results.duelLoss')}
      won={won}
      wins={won ? 1 : 0}
      losses={won ? 0 : 1}
      score={series && !series.pending ? scoreDuel(won, series) : undefined}
      lineup={draft.lineup}
      mentality={mentality}
      mapPriority={cfg?.mapPriority}
      submitInfo={submitInfo}
      sharePayload={{
        mode: 'duel',
        nickname: profile.nickname,
        highlight: pickMatchHighlight(logsRef.current, t) || titleLoadout(profile.id, t),
      }}
      highlight={pickMatchHighlight(logsRef.current, t) || titleLoadout(profile.id, t)}
      onHome={onHome}
      onNeedAuth={onNeedAuth}
      onRetry={() => {
        draft.reset()
        simStarted.current = false
        playbackRef.current.abort()
        setSeries(null)
        setLogs([])
        setVeto(null)
        setEnemyTeam(null)
        setUserTeam(null)
        setWaitingOpp(false)
        setMapResults([])
        setLiveMvp(null)
        if (isFriend) {
          setStep('draft')
          return
        }
        const next = retrySoloSetupState(profile, { vsCpu: true })
        setCfg(next.cfg)
        setStep(next.step)
      }}
      onRematch={
        isFriend && liveRoom?.code
          ? () => {
              if (samePlayerId(liveRoom.hostId, profile.id)) {
                roomUpdate(liveRoom.code, (r) => ({
                  ...r,
                  status: 'rematch',
                  seed: `${r.mode}-${r.code}-${Date.now()}`,
                  players: (r.players || []).map((p) => ({ ...p, wantRematch: false })),
                }))
              } else {
                // Guests send intent; only the host flips status — prevents double-fire
                roomUpdate(liveRoom.code, (r) => ({
                  ...r,
                  players: (r.players || []).map((p) =>
                    samePlayerId(p.id, profile.id) ? { ...p, wantRematch: true } : p,
                  ),
                }))
              }
            }
          : null
      }
      extra={
        series && !series.pending ? (
          <p className="mt-2 font-mono text-cs-text">
            {series.userMaps} – {series.enemyMaps}
          </p>
        ) : null
      }
    />
  )
}
