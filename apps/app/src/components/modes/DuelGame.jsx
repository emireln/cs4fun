import { useEffect, useMemo, useRef, useState } from 'react'
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
import { createPlaybackController, streamLiveSeries } from '../../lib/matchPlayback'
import { saveGameResult } from '../../lib/history'
import { recordFriendMatch } from '../../lib/friends'
import { subscribeRoom, updateRoom } from '../../lib/rooms'
import ModeSetup from '../ModeSetup'
import DraftPlay from '../DraftPlay'
import MapVetoPlay from '../MapVetoPlay'
import MatchLive from '../MatchLive'
import TacticalPausePanel from '../TacticalPausePanel'
import HypeBanner from '../HypeBanner'
import GameOver from '../GameOver'

export default function DuelGame({ profile, room: initialRoom = null, onHome, onStatus, onNeedFriends }) {
  const { t } = useI18n()
  const [liveRoom, setLiveRoom] = useState(initialRoom)
  const [step, setStep] = useState(initialRoom ? 'draft' : 'setup')
  const [cfg, setCfg] = useState(
    initialRoom
      ? { mode: 'classic', mentality: 'tactical', mapPriority: 'Mirage', vsCpu: false }
      : null,
  )
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
      updateRoom(liveRoom.code, (r) => ({
        ...r,
        players: r.players.map((p) =>
          p.id === profile.id
            ? {
                ...p,
                draftPhase: phase,
                draftFilled: filled,
                lineup: draft.complete ? draft.lineup : p.lineup,
                power: draft.complete
                  ? teamPowerScore(draft.lineup, cfg.mentality, cfg.mapPriority)
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
      updateRoom(liveRoom.code, (r) => ({ ...r, pickEndsAt: ends, status: 'drafting' }))
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
        name: them.nickname || 'Rival',
        shortName: (them.nickname || 'RIV').slice(0, 8).toUpperCase(),
      })
      enemy.isUser = false
      enemy.id = them.id
      enemy.mapPoolBias = Object.values(them.lineup).flatMap((p) => p?.bestMaps || [])
      setEnemyTeam(enemy)
      setWaitingOpp(false)
      setStep('veto')
    }
  }, [waitingOpp, liveRoom, profile.id])

  // Rematch signal from room
  useEffect(() => {
    if (!liveRoom || liveRoom.status !== 'rematch') return
    if (step === 'results' || step === 'draft') {
      draft.reset()
      simStarted.current = false
      setSeries(null)
      setLogs([])
      setVeto(null)
      setEnemyTeam(null)
      setUserTeam(null)
      setWaitingOpp(false)
      setStep('draft')
      if (liveRoom.hostId === profile.id) {
        updateRoom(liveRoom.code, (r) => ({
          ...r,
          status: 'drafting',
          pickEndsAt: Date.now() + 90_000,
          players: r.players.map((p) => ({
            ...p,
            lineup: null,
            power: 0,
            draftPhase: 'scouting',
            draftFilled: 0,
            ready: false,
          })),
        }))
      }
    }
  }, [liveRoom?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    onStatus?.({
      phase: step === 'live' || step === 'results' ? 'tournament' : step,
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

  const startLive = async (finalVeto) => {
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
    callsRef.current = Object.fromEntries(
      (finalVeto.mapOrder || []).map((m) => [m, TACTICAL_CALLS[0]]),
    )

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
      shouldStop: () => !liveRef.current,
      beforeMap: async (mapName) => {
        mapSimulatingRef.current = false
        setLiveMapName(mapName)
        setLiveMvp(null)
        mapSimulatingRef.current = true
      },
      onLog: (log) => {
        if (!liveRef.current) return
        setLogs((prev) => [...prev, log])
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
      meta: { maps: `${result.userMaps}-${result.enemyMaps}`, friend: isFriend },
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
      updateRoom(liveRoom.code, (r) => ({ ...r, status: 'finished' }))
    }
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
      updateRoom(liveRoom.code, (r) => ({
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
    updateRoom(liveRoom.code, (r) => ({
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
      { type: 'tactical', text: `Tactical timeout — new call on ${map}: ${call.label}`, map },
    ])
    setTacticalOpen(false)
    setPendingTacticMap(null)
    playbackRef.current.setPaused(false)
    setPaused(false)
    clearTacticalRoom()
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
      updateRoom(liveRoom.code, (r) => ({
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
            await updateRoom(liveRoom.code, (r) => ({
              ...r,
              status: 'reveal',
              players: r.players.map((p) =>
                p.id === profile.id
                  ? {
                      ...p,
                      lineup: draft.lineup,
                      power: teamPowerScore(draft.lineup, cfg.mentality, cfg.mapPriority),
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
            name: 'CPU Legends',
            shortName: 'CPU',
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

  if (step === 'veto' && userTeam && enemyTeam) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h2 className="mb-2 text-center font-display text-2xl font-bold">{t('duel.showmatch')}</h2>
        <p className="mb-6 text-center text-sm text-cs-muted">
          {userTeam.shortName} vs {enemyTeam.shortName} · {t('duel.bo1Tag')}
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
          awayName={enemyTeam?.shortName || 'CPU'}
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
      sharePayload={{ mode: 'duel', nickname: profile.nickname }}
      onHome={onHome}
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
        setStep(isFriend ? 'draft' : 'setup')
      }}
      onRematch={
        isFriend && liveRoom?.code
          ? () => {
              updateRoom(liveRoom.code, (r) => ({
                ...r,
                status: 'rematch',
                seed: `${r.mode}-${r.code}-${Date.now()}`,
              }))
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
