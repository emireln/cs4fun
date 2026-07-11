import { useCallback, useEffect, useRef, useState } from 'react'
import { MENTALITIES } from '../../data/constants'
import { useI18n } from '../../i18n'
import { useAuth } from '../../lib/auth'
import {
  PHASE,
  afterMajorResult,
  afterMatchResult,
  buildCareerMajorBracket,
  buildCareerUserTeam,
  buildWeekOpponent,
  createNewCareerState,
  migrateCareerState,
  updateOrgIdentity,
  effectiveMentalityId,
  loadCareerSave,
  saveCareerSave,
  scoreCareerSeason,
  startNextSeason,
  weekKind,
} from '../../lib/career'
import { resolveSeriesVeto } from '../../lib/gameModes'
import { createPlaybackController, streamLiveSeries } from '../../lib/matchPlayback'
import { saveGameResult } from '../../lib/history'
import CareerLocked from '../career/CareerLocked'
import CareerSetup from '../career/CareerSetup'
import CareerHub from '../career/CareerHub'
import CareerMarket from '../career/CareerMarket'
import CareerCamp from '../career/CareerCamp'
import CareerSeasonCard from '../career/CareerSeasonCard'
import TournamentView from '../TournamentView'
import MatchLive from '../MatchLive'
import TacticalPausePanel from '../TacticalPausePanel'
import HypeBanner from '../HypeBanner'
import GameOver from '../GameOver'

export default function CareerGame({ profile, onHome, onStatus, onNeedAuth }) {
  const { t } = useI18n()
  const { isAuthed } = useAuth()
  const [boot, setBoot] = useState('loading') // loading | ready | locked
  const [state, setState] = useState(null)
  const [view, setView] = useState('hub') // setup | hub | market | camp | match | major | week_result | season_end
  const [saving, setSaving] = useState(false)
  const [enemy, setEnemy] = useState(null)
  const [userTeam, setUserTeam] = useState(null)
  const [bracket, setBracket] = useState(null)
  const [wins, setWins] = useState(0)
  const [losses, setLosses] = useState(0)
  const [stage, setStage] = useState('quarterfinals')
  const [veto, setVeto] = useState(null)
  const [logs, setLogs] = useState([])
  const [hype, setHype] = useState(null)
  const [liveMapName, setLiveMapName] = useState(null)
  const [mapResults, setMapResults] = useState([])
  const [seriesScore, setSeriesScore] = useState({ user: 0, enemy: 0 })
  const [liveMvp, setLiveMvp] = useState(null)
  const [speed, setSpeed] = useState(1)
  const [paused, setPaused] = useState(false)
  const [tacticalOpen, setTacticalOpen] = useState(false)
  const [pendingTacticMap, setPendingTacticMap] = useState(null)
  const [simulating, setSimulating] = useState(false)
  const [weekOutcome, setWeekOutcome] = useState(null)

  const liveRef = useRef(true)
  const playbackRef = useRef(createPlaybackController(1))
  const callsRef = useRef({})
  const mapSimulatingRef = useRef(false)
  const mapResultsLenRef = useRef(0)
  const matchStarted = useRef(false)

  const persist = useCallback(async (next) => {
    setSaving(true)
    setState(next)
    await saveCareerSave(next)
    setSaving(false)
  }, [])

  useEffect(() => {
    liveRef.current = true
    return () => {
      liveRef.current = false
      playbackRef.current.abort()
    }
  }, [])

  useEffect(() => {
    if (!isAuthed) {
      setBoot('locked')
      return undefined
    }
    let cancelled = false
    ;(async () => {
      const res = await loadCareerSave()
      if (cancelled) return
      if (!res.ok && res.error === 'not_authenticated') {
        setBoot('locked')
        return
      }
      if (res.exists && res.state) {
        const migrated = migrateCareerState(res.state)
        setState(migrated)
        if (migrated !== res.state) await saveCareerSave(migrated)
        setView(
          migrated.phase === PHASE.SEASON_END
            ? 'season_end'
            : migrated.phase === PHASE.CAMP
              ? 'camp'
              : 'hub',
        )
      } else {
        setState(null)
        setView('setup')
      }
      setBoot('ready')
    })()
    return () => {
      cancelled = true
    }
  }, [isAuthed, profile?.id, profile?.nickname])

  const createOrg = async ({ orgName, shortName, orgLogo }) => {
    const fresh = createNewCareerState({
      orgName,
      shortName,
      orgLogo,
      nickname: profile?.nickname,
      seed: `career-${profile?.id}-${Date.now()}`,
    })
    setSaving(true)
    setState(fresh)
    await saveCareerSave(fresh)
    setSaving(false)
    setView('hub')
  }

  const saveOrgIdentity = async (patch) => {
    if (!state) return
    const next = updateOrgIdentity(state, patch)
    await persist(next)
  }

  useEffect(() => {
    onStatus?.({
      phase: view === 'match' || view === 'major' ? 'tournament' : view,
      gameMode: 'career',
      mode: 'classic',
      mentality: MENTALITIES.find((m) => m.id === effectiveMentalityId(state || {})) || MENTALITIES[1],
      mapPriority: state?.mapPriority,
      wins: state?.record?.wins || 0,
      losses: state?.record?.losses || 0,
      extra: state ? (
        <span className="rounded border border-cs-gold/40 bg-cs-gold/10 px-2 py-1 text-xs text-cs-gold">
          S{state.season} · W{Math.min(state.week, 8)}
        </span>
      ) : null,
    })
  }, [view, state]) // eslint-disable-line react-hooks/exhaustive-deps

  const startWeekMatch = async () => {
    if (!state) return
    const team = buildCareerUserTeam(state)
    const opp = buildWeekOpponent(state)
    const mentality = MENTALITIES.find((m) => m.id === effectiveMentalityId(state)) || MENTALITIES[1]
    const v = resolveSeriesVeto(team, opp, mentality, null, { bestOf: 1 })
    setUserTeam(team)
    setEnemy(opp)
    setVeto(v)
    setLogs([])
    setHype(null)
    setMapResults([])
    setSeriesScore({ user: 0, enemy: 0 })
    setLiveMvp(null)
    setSimulating(false)
    matchStarted.current = false
    callsRef.current = {}
    playbackRef.current = createPlaybackController(speed)
    setView('match')
  }

  // Auto-run week match when entering match view
  useEffect(() => {
    if (view !== 'match' || !userTeam || !enemy || !veto || matchStarted.current) return undefined
    matchStarted.current = true
    const mentality = MENTALITIES.find((m) => m.id === effectiveMentalityId(state)) || MENTALITIES[1]
    let cancelled = false
    ;(async () => {
      setSimulating(true)
      const pb = playbackRef.current
      pb.reset?.()
      pb.setSpeed?.(speed)
      setPaused(false)
      const result = await streamLiveSeries({
        userTeam,
        enemyTeam: enemy,
        mentality,
        veto,
        getCalls: () => callsRef.current,
        playback: pb,
        shouldStop: () => cancelled || !liveRef.current,
        matchSeed: `${state.seed}-s${state.season}-w${state.week}`,
        beforeMap: async (mapName) => {
          mapSimulatingRef.current = true
          setLiveMapName(mapName)
          setLiveMvp(null)
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
          if (sc) setSeriesScore(sc)
        },
        onMapEnd: ({ result: mapRes, maps, seriesScore: sc }) => {
          mapResultsLenRef.current = maps.length
          mapSimulatingRef.current = false
          setMapResults(maps)
          if (sc) setSeriesScore(sc)
          if (mapRes?.mvp) setLiveMvp(mapRes.mvp)
        },
      })
      if (cancelled || !liveRef.current || !result) return
      setSimulating(false)
      setPaused(false)
      const next = afterMatchResult(state, {
        won: result.userWon,
        opponentName: enemy.shortName || enemy.name,
      })
      next.seasonScore = scoreCareerSeason(next)
      await persist(next)
      setWeekOutcome({ won: result.userWon, enemy: enemy.name, result })
      setView('week_result')
      await saveGameResult({
        userId: profile.id,
        nickname: profile.nickname,
        mode: 'career',
        board: 'career',
        won: result.userWon,
        score: next.seasonScore,
        wins: result.userWon ? 1 : 0,
        losses: result.userWon ? 0 : 1,
        lineup: next.lineup,
        meta: {
          event: 'week',
          week: state.week,
          season: state.season,
          opponent: enemy.name,
        },
      })
    })()
    return () => {
      cancelled = true
    }
  }, [view, userTeam, enemy, veto]) // eslint-disable-line react-hooks/exhaustive-deps

  const openTacticalPause = () => {
    if (!simulating || !veto?.mapOrder?.length) return
    playbackRef.current.setPaused?.(true)
    setPaused(true)
    const idx = mapSimulatingRef.current ? mapResultsLenRef.current + 1 : mapResultsLenRef.current
    const target = veto.mapOrder[idx]
    if (!target) return
    setPendingTacticMap(target)
    setTacticalOpen(true)
  }

  const applyLiveTactic = (call) => {
    const map = pendingTacticMap || liveMapName
    if (map) callsRef.current = { ...callsRef.current, [map]: call }
    setTacticalOpen(false)
    setPendingTacticMap(null)
    playbackRef.current.setPaused?.(false)
    setPaused(false)
  }

  if (boot === 'loading') {
    return (
      <div className="flex min-h-[40dvh] items-center justify-center text-sm text-cs-muted">
        {t('career.loading')}
      </div>
    )
  }

  if (boot === 'locked' || !isAuthed) {
    return <CareerLocked onNeedAuth={onNeedAuth} onHome={onHome} />
  }

  if (view === 'setup' || !state) {
    return (
      <CareerSetup
        nickname={profile?.nickname}
        saving={saving}
        onCreate={createOrg}
      />
    )
  }

  if (view === 'market') {
    return (
      <CareerMarket
        state={state}
        onChange={(next) => persist(next)}
        onBack={() => setView('hub')}
      />
    )
  }

  if (view === 'camp' || (state.phase === PHASE.CAMP && view === 'hub' && weekKind(state.week) === 'camp')) {
    return (
      <CareerCamp
        state={state}
        onDone={async (next) => {
          await persist({ ...next, phase: PHASE.HUB })
          setView('hub')
        }}
      />
    )
  }

  if (view === 'match') {
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
              playbackRef.current.setPaused?.(false)
              setPaused(false)
            }}
          />
        )}
        <MatchLive
          logs={logs}
          title={t('career.weekN', { n: state.week })}
          homeName={userTeam?.shortName || state.shortName || 'YOU'}
          awayName={enemy?.shortName || 'OPP'}
          homeLogoSrc={state.orgLogo || null}
          mapName={liveMapName}
          mapOrder={veto?.mapOrder || []}
          mapResults={mapResults}
          seriesScore={seriesScore}
          mvp={liveMvp}
          speed={speed}
          onSpeedChange={(n) => {
            setSpeed(n)
            playbackRef.current.setSpeed?.(n)
          }}
          paused={paused}
          onTacticalPause={openTacticalPause}
          canTacticalPause={simulating && !tacticalOpen}
          playing={simulating}
        />
      </div>
    )
  }

  if (view === 'week_result' && weekOutcome) {
    return (
      <GameOver
        title={weekOutcome.won ? t('career.weekWin') : t('career.weekLoss')}
        subtitle={weekOutcome.enemy}
        opponentName={weekOutcome.enemy}
        blurb={t('career.weekBlurb', { week: Math.max(1, state.week - 1), score: state.seasonScore })}
        won={weekOutcome.won}
        wins={state.record?.wins}
        losses={state.record?.losses}
        score={state.seasonScore}
        lineup={state.lineup}
        mapPriority={state.mapPriority}
        onHome={onHome}
        sharePayload={{
          mode: 'career',
          nickname: profile.nickname,
          title: t('career.weekShare', { week: Math.max(1, state.week - 1) }),
        }}
        extra={
          <button
            type="button"
            className="btn-gold mt-0 rounded px-6 py-2.5 text-xs uppercase tracking-wider"
            onClick={() => {
              if (state.phase === PHASE.CAMP) setView('camp')
              else setView('hub')
            }}
          >
            {t('career.backToHub')}
          </button>
        }
      />
    )
  }

  if (view === 'major') {
    const mentality = MENTALITIES.find((m) => m.id === effectiveMentalityId(state)) || MENTALITIES[1]
    return (
      <TournamentView
        userTeam={userTeam}
        mentality={mentality}
        bracket={bracket}
        setBracket={setBracket}
        wins={wins}
        setWins={setWins}
        losses={losses}
        setLosses={setLosses}
        setStage={setStage}
        hideRatings={false}
        onChampion={async () => {
          const next = afterMajorResult(state, { won: true, wins: wins + 1, losses })
          await persist(next)
          await saveGameResult({
            userId: profile.id,
            nickname: profile.nickname,
            mode: 'career',
            board: 'career',
            won: true,
            score: next.seasonScore,
            wins: wins + 1,
            losses,
            lineup: next.lineup,
            meta: { event: 'major_win', season: state.season },
          })
          setView('season_end')
        }}
        onEliminated={async () => {
          const next = afterMajorResult(state, { won: false, wins, losses: losses + 1 })
          await persist(next)
          await saveGameResult({
            userId: profile.id,
            nickname: profile.nickname,
            mode: 'career',
            board: 'career',
            won: false,
            score: next.seasonScore,
            wins,
            losses: losses + 1,
            lineup: next.lineup,
            meta: { event: 'major_out', season: state.season },
          })
          setView('season_end')
        }}
      />
    )
  }

  if (view === 'season_end' || state.phase === PHASE.SEASON_END) {
    return (
      <CareerSeasonCard
        state={state}
        profile={profile}
        onHome={onHome}
        onNextSeason={async () => {
          const next = startNextSeason(state)
          await persist(next)
          await saveGameResult({
            userId: profile.id,
            nickname: profile.nickname,
            mode: 'career',
            board: 'career',
            won: Boolean(state.majorResult?.won),
            score: state.seasonScore,
            wins: state.record?.wins || 0,
            losses: state.record?.losses || 0,
            lineup: state.lineup,
            meta: { event: 'season_end', season: state.season },
          })
          setView('hub')
        }}
      />
    )
  }

  return (
    <CareerHub
      state={state}
      saving={saving}
      onHome={onHome}
      onChange={(next) => persist(next)}
      onOpenMarket={() => setView('market')}
      onOpenCamp={() => setView('camp')}
      onPlayWeek={startWeekMatch}
      onUpdateOrg={saveOrgIdentity}
      onStartMajor={async () => {
        const team = buildCareerUserTeam(state)
        setUserTeam(team)
        setBracket(buildCareerMajorBracket(state))
        setWins(0)
        setLosses(0)
        setStage('quarterfinals')
        await persist({ ...state, phase: PHASE.MAJOR })
        setView('major')
      }}
    />
  )
}
