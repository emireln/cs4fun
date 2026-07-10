import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, Crosshair, Swords } from 'lucide-react'
import { TACTICAL_CALLS } from '../data/constants'
import {
  findUserMatch,
  getStageLabel,
  resolveNonUserMatches,
  advanceBracket,
} from '../engine/simulation'
import { createPlaybackController, streamLiveSeries } from '../lib/matchPlayback'
import { useI18n } from '../i18n'
import MapVetoPlay from './MapVetoPlay'
import MatchLive from './MatchLive'
import TacticalPausePanel from './TacticalPausePanel'
import LineupRadar from './LineupRadar'
import HypeBanner from './HypeBanner'

const MATCH_PHASES = ['preview', 'veto', 'tactics', 'live', 'result']

export default function TournamentView({
  userTeam,
  mentality,
  bracket,
  setBracket,
  wins,
  setWins,
  losses,
  setLosses,
  setStage,
  onChampion,
  onEliminated,
  hideRatings,
}) {
  const { t } = useI18n()
  const [matchPhase, setMatchPhase] = useState('preview')
  const [veto, setVeto] = useState(null)
  const [tacticalCalls, setTacticalCalls] = useState({})
  const [currentMapIdx, setCurrentMapIdx] = useState(0)
  const [liveLogs, setLiveLogs] = useState([])
  const [seriesResult, setSeriesResult] = useState(null)
  const [simulating, setSimulating] = useState(false)
  const [hype, setHype] = useState(null)
  const [tacticTimer, setTacticTimer] = useState(15)
  const [pendingSeriesCalls, setPendingSeriesCalls] = useState(null)
  const [liveMapName, setLiveMapName] = useState(null)
  const [mapResults, setMapResults] = useState([])
  const [seriesScore, setSeriesScore] = useState({ user: 0, enemy: 0 })
  const [liveMvp, setLiveMvp] = useState(null)
  const [speed, setSpeed] = useState(1)
  const [paused, setPaused] = useState(false)
  const [tacticalOpen, setTacticalOpen] = useState(false)
  const [pendingTacticMap, setPendingTacticMap] = useState(null)
  const autoTacticRef = useRef(false)
  const playbackRef = useRef(createPlaybackController(1))
  const callsRef = useRef({})
  const liveRef = useRef(true)
  const mapSimulatingRef = useRef(false)
  const mapResultsLenRef = useRef(0)

  useEffect(() => {
    liveRef.current = true
    return () => {
      liveRef.current = false
      playbackRef.current.abort()
    }
  }, [])

  useEffect(() => {
    setBracket((prev) => {
      let next = resolveNonUserMatches(prev, 'quarterfinals')
      next = resolveNonUserMatches(next, 'semifinals')
      next = resolveNonUserMatches(next, 'grandfinal')
      return next
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const userMatchInfo = useMemo(() => findUserMatch(bracket), [bracket])

  useEffect(() => {
    if (!userMatchInfo) {
      const gf = bracket.grandfinal[0]
      if (gf?.result) {
        const winnerIsUser =
          (gf.home?.isUser && gf.result.winnerId === gf.home.id) ||
          (gf.away?.isUser && gf.result.winnerId === gf.away.id)
        if (winnerIsUser) onChampion(gf.result)
        else onEliminated(gf.result)
      }
      return
    }
    playbackRef.current.abort()
    setStage(userMatchInfo.stage)
    setMatchPhase('preview')
    setVeto(null)
    setTacticalCalls({})
    setCurrentMapIdx(0)
    setLiveLogs([])
    setSeriesResult(null)
    setTacticTimer(15)
    setLiveMapName(null)
    setMapResults([])
    setSeriesScore({ user: 0, enemy: 0 })
    setLiveMvp(null)
    setTacticalOpen(false)
    setPaused(false)
  }, [userMatchInfo?.match?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Random tactical call when timer expires
  useEffect(() => {
    if (matchPhase !== 'tactics' || !veto) return undefined
    autoTacticRef.current = false
    setTacticTimer(15)
    const id = setInterval(() => {
      setTacticTimer((n) => {
        if (n <= 1) {
          clearInterval(id)
          return 0
        }
        return n - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [matchPhase, currentMapIdx, veto?.mapOrder?.[currentMapIdx]]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-pick random tactic on timeout
  useEffect(() => {
    if (matchPhase !== 'tactics' || tacticTimer !== 0 || !veto || !userMatchInfo) return
    if (autoTacticRef.current) return
    autoTacticRef.current = true
    const call = TACTICAL_CALLS[Math.floor(Math.random() * TACTICAL_CALLS.length)]
    const mapName = veto.mapOrder[currentMapIdx]
    const next = { ...tacticalCalls, [mapName]: call }
    setTacticalCalls(next)
    if (currentMapIdx < 2) {
      setCurrentMapIdx((i) => i + 1)
    } else {
      setPendingSeriesCalls(next)
    }
  }, [tacticTimer, matchPhase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Start series when auto-tactic fills the last map
  useEffect(() => {
    if (!pendingSeriesCalls || !userMatchInfo || !veto) return
    const calls = pendingSeriesCalls
    setPendingSeriesCalls(null)
    runSeries(calls)
  }, [pendingSeriesCalls]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!userMatchInfo) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-cs-muted">
        {t('tournament.resolving')}
      </div>
    )
  }

  const { match, stage } = userMatchInfo
  const enemy = match.home.isUser ? match.away : match.home

  const goTactics = (v) => {
    setVeto(v)
    setCurrentMapIdx(0)
    setMatchPhase('tactics')
  }

  const selectTactic = (call) => {
    if (!veto) return
    const mapName = veto.mapOrder[currentMapIdx]
    const next = { ...tacticalCalls, [mapName]: call }
    setTacticalCalls(next)
    autoTacticRef.current = false

    if (currentMapIdx < 2) {
      setCurrentMapIdx((i) => i + 1)
    } else {
      runSeries(next)
    }
  }

  const skipRemainingTactics = () => {
    const next = { ...tacticalCalls }
    for (let i = currentMapIdx; i < veto.mapOrder.length; i++) {
      if (!next[veto.mapOrder[i]]) {
        next[veto.mapOrder[i]] = TACTICAL_CALLS[0]
      }
    }
    setTacticalCalls(next)
    runSeries(next)
  }

  const openTacticalPause = () => {
    if (!simulating || !veto?.mapOrder?.length) return
    const pb = playbackRef.current
    pb.setPaused(true)
    setPaused(true)
    // Mid-map: current map is already rolling — retarget the next map.
    // Between maps: retarget the upcoming map (same as liveMapName).
    const idx = mapSimulatingRef.current ? mapResultsLenRef.current + 1 : mapResultsLenRef.current
    const target = veto.mapOrder[idx]
    if (!target) {
      // Last map already live — pause only (call locked in).
      setTacticalOpen(false)
      setPendingTacticMap(null)
      return
    }
    setPendingTacticMap(target)
    setTacticalOpen(true)
  }

  const applyLiveTactic = (call) => {
    const map = pendingTacticMap || liveMapName
    if (!map) return
    const next = { ...callsRef.current, [map]: call }
    callsRef.current = next
    setTacticalCalls(next)
    setLiveLogs((prev) => [
      ...prev,
      {
        type: 'tactical',
        text: `Tactical timeout — new call on ${map}: ${call.label}`,
        map,
      },
    ])
    setTacticalOpen(false)
    setPendingTacticMap(null)
    playbackRef.current.setPaused(false)
    setPaused(false)
  }

  const cancelTacticalPause = () => {
    setTacticalOpen(false)
    setPendingTacticMap(null)
    playbackRef.current.setPaused(false)
    setPaused(false)
  }

  const runSeries = async (calls) => {
    const pb = playbackRef.current
    pb.reset()
    pb.setSpeed(speed)
    callsRef.current = { ...calls }
    setTacticalCalls(calls)
    setMatchPhase('live')
    setSimulating(true)
    setLiveLogs([{ type: 'system', text: t('tournament.connecting') }])
    setMapResults([])
    setSeriesScore({ user: 0, enemy: 0 })
    setLiveMvp(null)
    setLiveMapName(veto.mapOrder[0] || null)
    setSeriesResult(null)
    setTacticalOpen(false)
    setPaused(false)
    mapResultsLenRef.current = 0
    mapSimulatingRef.current = false

    const result = await streamLiveSeries({
      userTeam,
      enemyTeam: enemy,
      mentality,
      veto,
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
        setLiveLogs((prev) => [...prev, log])
        if (log.type === 'clutch' || log.type === 'ace' || log.type === 'eco') {
          setHype(log.type)
          setTimeout(() => setHype(null), 1300)
        }
        if (log.type === 'mvp' && log.mvp) {
          setLiveMvp(log.mvp)
        }
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
    setSeriesResult(result)
    setMapResults(result.maps)
    setSeriesScore({ user: result.userMaps, enemy: result.enemyMaps })
    const lastMvp = [...result.maps].reverse().find((m) => m.mvp)?.mvp
    if (lastMvp) setLiveMvp(lastMvp)
    setSimulating(false)
    setMatchPhase('result')
    setPaused(false)
  }

  const continueAfterMatch = () => {
    const userWon = seriesResult.userWon
    const winner = userWon ? userTeam : enemy
    const loser = userWon ? enemy : userTeam

    if (userWon) setWins((w) => w + 1)
    else setLosses((l) => l + 1)

    if (!userWon) {
      onEliminated(seriesResult)
      return
    }

    if (stage === 'grandfinal') {
      setBracket((prev) => advanceBracket(prev, match.id, seriesResult, winner, loser))
      onChampion(seriesResult)
      return
    }

    setBracket((prev) => {
      let next = advanceBracket(prev, match.id, seriesResult, winner, loser)
      next = resolveNonUserMatches(next, 'quarterfinals')
      next = resolveNonUserMatches(next, 'semifinals')
      next = resolveNonUserMatches(next, 'grandfinal')
      return next
    })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <HypeBanner event={hype} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-display text-xs tracking-[0.25em] text-cs-gold uppercase">
            {getStageLabel(stage)}
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
            {userTeam.shortName}{' '}
            <span className="text-cs-muted">vs</span>{' '}
            <span className="text-cs-loss">{enemy.shortName}</span>
          </h1>
          <p className="text-sm text-cs-muted">
            {enemy.name} · {enemy.event} ({enemy.year})
          </p>
        </div>
        <PhaseSteps phase={matchPhase} t={t} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          <LineupRadar lineup={userTeam.lineup} hideRatings={hideRatings} title={t('draft.radar')} />
          <BracketMini bracket={bracket} userId={userTeam.id} t={t} />
        </div>

        <div className="space-y-4 lg:col-span-3">
          <AnimatePresence mode="wait">
            {matchPhase === 'preview' && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="panel rounded-lg p-6 text-center"
              >
                <Swords className="mx-auto mb-3 h-10 w-10 text-cs-gold" />
                <h2 className="font-display text-xl font-bold">{t('tournament.md3Ready')}</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-cs-muted">
                  {t('tournament.md3Hint', { map: userTeam.mapPriority, enemy: enemy.shortName })}
                </p>
                <button
                  type="button"
                  className="btn-gold mt-6 min-h-[48px] rounded px-8 py-3 text-sm uppercase tracking-wider"
                  onClick={() => setMatchPhase('veto')}
                >
                  {t('tournament.beginVeto')}
                </button>
              </motion.div>
            )}

            {matchPhase === 'veto' && (
              <motion.div
                key="veto"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <MapVetoPlay
                  key={match.id}
                  userPriority={userTeam.mapPriority}
                  enemyBias={enemy.mapPoolBias || []}
                  mentalityId={mentality.id}
                  enemyName={enemy.shortName}
                  onComplete={goTactics}
                />
              </motion.div>
            )}

            {matchPhase === 'tactics' && veto && (
              <motion.div
                key="tactics"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="panel rounded-lg p-5"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Crosshair className="h-4 w-4 text-cs-gold" />
                    <h3 className="font-display text-xs font-bold tracking-[0.2em] text-cs-gold uppercase">
                      {t('tournament.tactical', { map: veto.mapOrder[currentMapIdx] })}
                    </h3>
                  </div>
                  <span
                    className={`font-mono text-sm ${
                      tacticTimer <= 5 ? 'animate-pulse text-cs-loss' : 'text-cs-warn'
                    }`}
                  >
                    {tacticTimer}s
                  </span>
                </div>
                <p className="mb-4 text-sm text-cs-muted">{t('tournament.tacticalHint')}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {TACTICAL_CALLS.map((call) => (
                    <button
                      key={call.id}
                      type="button"
                      onClick={() => selectTactic(call)}
                      className="min-h-[52px] rounded border border-cs-border bg-cs-bg/40 px-3 py-3 text-left transition hover:border-cs-gold/50 hover:bg-cs-gold/5 active:scale-[0.99]"
                    >
                      <div className="text-sm font-bold text-cs-text">
                        {t(`tactics.${call.id}.label`) !== `tactics.${call.id}.label`
                          ? t(`tactics.${call.id}.label`)
                          : call.label}
                      </div>
                      <div className="mt-1 text-xs text-cs-muted">
                        {t(`tactics.${call.id}.description`) !== `tactics.${call.id}.description`
                          ? t(`tactics.${call.id}.description`)
                          : call.description}
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn-ghost mt-4 rounded px-4 py-2 text-sm"
                  onClick={skipRemainingTactics}
                >
                  {t('tournament.autoDefault')}
                </button>
              </motion.div>
            )}

            {(matchPhase === 'live' || matchPhase === 'result') && (
              <motion.div
                key="live"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {tacticalOpen && (
                  <TacticalPausePanel
                    mapName={pendingTacticMap || liveMapName}
                    onSelect={applyLiveTactic}
                    onCancel={cancelTacticalPause}
                  />
                )}
                <MatchLive
                  logs={liveLogs}
                  title={`${userTeam.shortName} vs ${enemy.shortName}`}
                  homeName={userTeam.shortName}
                  awayName={enemy.shortName}
                  mapName={liveMapName}
                  mapOrder={veto?.mapOrder || []}
                  mapResults={mapResults}
                  seriesScore={seriesScore}
                  mvp={liveMvp}
                  speed={speed}
                  onSpeedChange={(n) => {
                    setSpeed(n)
                    playbackRef.current.setSpeed(n)
                  }}
                  paused={paused}
                  onTogglePause={() => {
                    const next = playbackRef.current.togglePause()
                    setPaused(next)
                  }}
                  onTacticalPause={openTacticalPause}
                  canTacticalPause={simulating && !tacticalOpen}
                  playing={simulating}
                />

                {matchPhase === 'result' && seriesResult && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`panel rounded-lg p-5 text-center ${
                      seriesResult.userWon ? 'border-cs-win/40' : 'border-cs-loss/40'
                    }`}
                  >
                    <div
                      className={`font-display text-2xl font-bold ${
                        seriesResult.userWon ? 'text-cs-win' : 'text-cs-loss'
                      }`}
                    >
                      {seriesResult.userWon ? t('tournament.seriesWin') : t('tournament.seriesLoss')}
                    </div>
                    <div className="mt-2 font-mono text-xl text-cs-text">
                      {seriesResult.userMaps} – {seriesResult.enemyMaps}
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-cs-muted">
                      {seriesResult.maps.map((m) => (
                        <div key={m.map}>
                          {m.map}: {m.userRounds}-{m.enemyRounds}{' '}
                          {m.userWon ? (
                            <span className="text-cs-win">W</span>
                          ) : (
                            <span className="text-cs-loss">L</span>
                          )}
                          {m.mvp ? (
                            <span className="ml-2 text-cs-gold">
                              · {t('live.mvp')} {m.mvp.name}
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="btn-gold mt-5 inline-flex min-h-[48px] items-center gap-2 rounded px-6 py-3 text-sm uppercase tracking-wider"
                      onClick={continueAfterMatch}
                      disabled={simulating}
                    >
                      {t('tournament.continue')} <ChevronRight className="h-4 w-4" />
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function PhaseSteps({ phase, t }) {
  const steps = MATCH_PHASES.filter((p) => p !== 'result')
  const labels = {
    preview: t('tournament.preview'),
    veto: t('tournament.veto'),
    tactics: t('tournament.tactics'),
    live: t('tournament.live'),
  }
  const idx = MATCH_PHASES.indexOf(phase)

  return (
    <div className="flex flex-wrap gap-1.5">
      {steps.map((s, i) => (
        <span
          key={s}
          className={`rounded border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${
            i <= idx
              ? 'border-cs-gold/40 bg-cs-gold/10 text-cs-gold'
              : 'border-cs-border text-cs-muted'
          }`}
        >
          {labels[s]}
        </span>
      ))}
    </div>
  )
}

function BracketMini({ bracket, userId, t }) {
  const renderMatch = (m) => {
    if (!m.home && !m.away) return <div className="text-xs text-cs-muted">{t('tournament.tbd')}</div>
    const homeWin = m.result && m.result.winnerId === m.home?.id
    const awayWin = m.result && m.result.winnerId === m.away?.id
    return (
      <div className="rounded border border-cs-border bg-cs-bg/50 px-2 py-1.5 text-xs">
        <div
          className={`flex justify-between ${m.home?.id === userId ? 'text-cs-gold' : ''} ${
            homeWin ? 'font-bold' : ''
          }`}
        >
          <span>{m.home?.shortName || '—'}</span>
          {m.result && <span>{homeWin ? 'W' : 'L'}</span>}
        </div>
        <div
          className={`flex justify-between ${m.away?.id === userId ? 'text-cs-gold' : ''} ${
            awayWin ? 'font-bold' : ''
          }`}
        >
          <span>{m.away?.shortName || '—'}</span>
          {m.result && <span>{awayWin ? 'W' : 'L'}</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="panel rounded-lg p-4">
      <h3 className="mb-3 font-display text-[10px] font-bold tracking-[0.2em] text-cs-gold uppercase">
        {t('tournament.bracket')}
      </h3>
      <div className="space-y-3">
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wider text-cs-muted">{t('tournament.qf')}</div>
          <div className="grid grid-cols-2 gap-1.5">
            {bracket.quarterfinals.map((m) => (
              <div key={m.id}>{renderMatch(m)}</div>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wider text-cs-muted">{t('tournament.sf')}</div>
          <div className="grid grid-cols-2 gap-1.5">
            {bracket.semifinals.map((m) => (
              <div key={m.id}>{renderMatch(m)}</div>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wider text-cs-muted">{t('tournament.gf')}</div>
          {renderMatch(bracket.grandfinal[0])}
        </div>
      </div>
    </div>
  )
}
