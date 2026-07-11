import { useEffect, useRef, useState } from 'react'
import { MENTALITIES, TACTICAL_CALLS } from '../../data/constants'
import { useI18n } from '../../i18n'
import { useDraftSession } from '../../hooks/useDraftSession'
import {
  buildGauntletOpponent,
  buildUserTeam,
  resolveSeriesVeto,
  scoreGauntlet,
} from '../../lib/gameModes'
import { createPlaybackController, streamLiveSeries } from '../../lib/matchPlayback'
import { saveGameResult } from '../../lib/history'
import ModeSetup from '../ModeSetup'
import DraftPlay from '../DraftPlay'
import MatchLive from '../MatchLive'
import TacticalPausePanel from '../TacticalPausePanel'
import HypeBanner from '../HypeBanner'
import GameOver from '../GameOver'
import { pick } from '../../data/constants'

export default function GauntletGame({ profile, onHome, onStatus }) {
  const { t, locale } = useI18n()
  const [step, setStep] = useState('setup')
  const [cfg, setCfg] = useState(null)
  const [userTeam, setUserTeam] = useState(null)
  const [wave, setWave] = useState(1)
  const [streak, setStreak] = useState(0)
  const [logs, setLogs] = useState([])
  const [hype, setHype] = useState(null)
  const [enemy, setEnemy] = useState(null)
  const [submitInfo, setSubmitInfo] = useState(null)
  const [finalScore, setFinalScore] = useState(0)
  const [veto, setVeto] = useState(null)
  const [liveMapName, setLiveMapName] = useState(null)
  const [mapResults, setMapResults] = useState([])
  const [seriesScore, setSeriesScore] = useState({ user: 0, enemy: 0 })
  const [liveMvp, setLiveMvp] = useState(null)
  const [speed, setSpeed] = useState(1)
  const [paused, setPaused] = useState(false)
  const [tacticalOpen, setTacticalOpen] = useState(false)
  const [pendingTacticMap, setPendingTacticMap] = useState(null)
  const [simulating, setSimulating] = useState(false)

  const liveRef = useRef(true)
  const playbackRef = useRef(createPlaybackController(1))
  const callsRef = useRef({})
  const mapSimulatingRef = useRef(false)
  const mapResultsLenRef = useRef(0)

  const waveStartedRef = useRef(false)

  const draft = useDraftSession({
    hideRatings: cfg?.mode === 'almanac',
    pickTimerSec: 32,
  })

  const mentality = MENTALITIES.find((m) => m.id === cfg?.mentality) || MENTALITIES[1]
  const seed = `gauntlet-${profile.id}-${cfg?.mapPriority || 'Mirage'}`

  useEffect(() => {
    liveRef.current = true
    return () => {
      liveRef.current = false
      playbackRef.current.abort()
    }
  }, [])

  useEffect(() => {
    onStatus?.({
      phase: step === 'fight' || step === 'preview' ? 'tournament' : step,
      gameMode: 'gauntlet',
      mode: cfg?.mode,
      mentality,
      mapPriority: cfg?.mapPriority,
      rerolls: draft.rerolls,
      wins: streak,
      losses: 0,
      extra: (
        <span className="rounded border border-cs-warn/40 bg-cs-warn/10 px-2 py-1 text-xs text-cs-warn">
          {t('gauntlet.wave', { n: wave })}
        </span>
      ),
    })
  }, [step, cfg, streak, wave, draft.rerolls]) // eslint-disable-line react-hooks/exhaustive-deps

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
  }

  const startWave = async () => {
    if (waveStartedRef.current) return
    waveStartedRef.current = true
    setStep('fight')
    setSimulating(true)
    setLogs([{ type: 'series', text: `═══ WAVE ${wave}: vs ${enemy.shortName} ═══` }])
    const call = pick(TACTICAL_CALLS)
    const seriesVeto = resolveSeriesVeto(userTeam, enemy, mentality, null, { bestOf: 1 })
    setVeto(seriesVeto)
    callsRef.current = Object.fromEntries(
      (seriesVeto.mapOrder || []).map((m) => [m, call]),
    )
    setMapResults([])
    setSeriesScore({ user: 0, enemy: 0 })
    setLiveMvp(null)
    setLiveMapName(seriesVeto.mapOrder[0] || null)
    mapResultsLenRef.current = 0
    mapSimulatingRef.current = false

    const pb = playbackRef.current
    pb.reset()
    pb.setSpeed(speed)
    setPaused(false)
    setTacticalOpen(false)

    setLogs((prev) => [
      ...prev,
      { type: 'tactical', text: `Auto-call: ${call.label}` },
    ])

    const result = await streamLiveSeries({
      userTeam,
      enemyTeam: enemy,
      mentality,
      veto: seriesVeto,
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
        setLogs((prev) => [...prev, log])
        if (log.type === 'clutch' || log.type === 'ace' || log.type === 'eco') {
          setHype(log.type)
          setTimeout(() => setHype(null), 1200)
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

    if (!result || !liveRef.current) {
      waveStartedRef.current = false
      return
    }
    setSimulating(false)
    setPaused(false)
    setMapResults(result.maps)
    setSeriesScore({ user: result.userMaps, enemy: result.enemyMaps })

    if (result.userWon) {
      const nextWave = wave + 1
      setStreak(nextWave - 1)
      setWave(nextWave)
      setEnemy(buildGauntletOpponent(nextWave, seed))
      waveStartedRef.current = false
      setStep('preview')
    } else {
      const finalStreak = streak
      const score = scoreGauntlet(finalStreak, draft.lineup, cfg.mentality, cfg.mapPriority)
      setFinalScore(score)
      const res = await saveGameResult({
        userId: profile.id,
        nickname: profile.nickname,
        mode: 'gauntlet',
        won: finalStreak >= 3,
        score,
        streak: finalStreak,
        lineup: draft.lineup,
        board: 'gauntlet',
      })
      setSubmitInfo(res)
      setStep('results')
    }
  }

  if (step === 'setup') {
    return (
      <ModeSetup
        title={t('modes.gauntlet.title')}
        subtitle={t('modes.gauntlet.blurb')}
        onStart={(c) => {
          setCfg(c)
          draft.reset()
          setWave(1)
          setStreak(0)
          setStep('draft')
        }}
      />
    )
  }

  if (step === 'draft') {
    return (
      <DraftPlay
        draft={draft}
        launchLabel={t('draft.launchGauntlet')}
        onLaunch={() => {
          const team = buildUserTeam(draft.lineup, {
            mapPriority: cfg.mapPriority,
            mentalityId: cfg.mentality,
          })
          setUserTeam(team)
          const opp = buildGauntletOpponent(1, seed)
          setEnemy(opp)
          setStep('preview')
        }}
      />
    )
  }

  if (step === 'preview') {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="font-display text-xs tracking-[0.3em] text-cs-gold uppercase">
          {t('gauntlet.wave', { n: wave })}
        </p>
        <h2 className="mt-2 font-display text-3xl font-bold">{t('gauntlet.survive')}</h2>
        <p className="mt-2 text-cs-muted">
          {t('gauntlet.next')}: <span className="text-cs-loss">{enemy?.name}</span>
        </p>
        {enemy?.chaos && (
          <p className="mt-3 rounded border border-cs-warn/40 bg-cs-warn/10 px-3 py-2 text-sm text-cs-warn">
            {t('gauntlet.chaos')}: {locale === 'pt-BR' ? enemy.chaos.pt : enemy.chaos.en}
          </p>
        )}
        <p className="mt-1 text-sm text-cs-warn">
          {t('gauntlet.streak')}: {streak}
        </p>
        <p className="mt-1 text-xs text-cs-muted">{t('gauntlet.bo1Tag')}</p>
        <button
          type="button"
          className="btn-gold mt-8 rounded px-8 py-3 text-sm uppercase tracking-wider"
          onClick={startWave}
        >
          {t('gauntlet.survive')}
        </button>
      </div>
    )
  }

  if (step === 'fight') {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <HypeBanner event={hype} />
        {tacticalOpen && (
          <TacticalPausePanel
            mapName={pendingTacticMap || liveMapName}
            onSelect={applyLiveTactic}
            onCancel={() => {
              setTacticalOpen(false)
              setPendingTacticMap(null)
              playbackRef.current.setPaused(false)
              setPaused(false)
            }}
          />
        )}
        <MatchLive
          logs={logs}
          title={t('gauntlet.wave', { n: wave })}
          homeName="YOU"
          awayName={enemy?.shortName || 'OPP'}
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
          onTacticalPause={openTacticalPause}
          canTacticalPause={simulating && !tacticalOpen}
          playing={simulating}
        />
      </div>
    )
  }

  return (
    <GameOver
      title={t('gauntlet.fallen')}
      won={streak >= 3}
      streak={streak}
      score={finalScore}
      lineup={draft.lineup}
      mentality={mentality}
      mapPriority={cfg.mapPriority}
      submitInfo={submitInfo}
      sharePayload={{ mode: 'gauntlet', nickname: profile.nickname }}
      onHome={onHome}
      onRetry={() => {
        draft.reset()
        playbackRef.current.abort()
        setWave(1)
        setStreak(0)
        setStep('setup')
      }}
    />
  )
}
