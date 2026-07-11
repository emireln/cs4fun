import { useEffect, useMemo, useState } from 'react'
import { MENTALITIES } from '../../data/constants'
import { useI18n } from '../../i18n'
import { useDraftSession } from '../../hooks/useDraftSession'
import {
  buildUserTeam,
  dailySeed,
  generateSharedRolls,
  scoreDaily,
} from '../../lib/gameModes'
import { msUntilUtcMidnight, utcDayKey } from '../../lib/leaderboard'
import { saveGameResult } from '../../lib/history'
import { getDailyStreak, recordDailyPlay } from '../../lib/dailyStreak'
import { generateBracket } from '../../engine/simulation'
import { initialSoloSetupState, retrySoloSetupState } from '../../lib/setupPreset'
import ModeSetup from '../ModeSetup'
import DraftPlay from '../DraftPlay'
import TournamentView from '../TournamentView'
import GameOver from '../GameOver'

export default function DailyGame({ profile, onHome, onStatus, onNeedAuth }) {
  const { t } = useI18n()
  const [boot] = useState(() => initialSoloSetupState(profile, { lockedMode: 'almanac' }))
  const [step, setStep] = useState(boot.step)
  const [cfg, setCfg] = useState(boot.cfg)
  const [bracket, setBracket] = useState(null)
  const [userTeam, setUserTeam] = useState(null)
  const [wins, setWins] = useState(0)
  const [losses, setLosses] = useState(0)
  const [stage, setStage] = useState('quarterfinals')
  const [won, setWon] = useState(false)
  const [finalScore, setFinalScore] = useState(0)
  const [submitInfo, setSubmitInfo] = useState(null)
  const [remain, setRemain] = useState(msUntilUtcMidnight())
  const [streak, setStreak] = useState(() => getDailyStreak(profile.id))

  const seed = dailySeed()
  const sharedRolls = useMemo(() => generateSharedRolls(seed, 5), [seed])
  const dayKey = utcDayKey()

  const draft = useDraftSession({
    hideRatings: true,
    sharedRolls,
    pickTimerSec: 25,
  })

  const mentality = MENTALITIES.find((m) => m.id === cfg?.mentality) || MENTALITIES[1]

  useEffect(() => {
    const id = setInterval(() => setRemain(msUntilUtcMidnight()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    setStreak(getDailyStreak(profile.id))
  }, [profile.id])

  useEffect(() => {
    onStatus?.({
      phase: step === 'setup' ? 'setup' : step,
      gameMode: 'daily',
      mode: cfg?.mode,
      mentality,
      mapPriority: cfg?.mapPriority,
      rerolls: 0,
      wins,
      losses,
      stage: step === 'tournament' ? stage : null,
      extra:
        streak.currentStreak > 0 ? (
          <span className="rounded border border-cs-gold/40 bg-cs-gold/10 px-2 py-1 text-cs-gold">
            {t('daily.streakShort', { n: streak.currentStreak })}
          </span>
        ) : null,
    })
  }, [step, cfg, wins, losses, stage, streak]) // eslint-disable-line react-hooks/exhaustive-deps

  const remainLabel = formatRemain(remain)

  if (step === 'setup') {
    return (
      <div>
        <div className="mx-auto max-w-5xl px-4 pt-6">
          <div className="panel mb-2 rounded-lg px-4 py-3 text-center text-sm">
            <span className="text-cs-gold">{t('daily.today')}: </span>
            <span className="font-mono">{dayKey}</span>
            <span className="mx-2 text-cs-muted">·</span>
            <span className="text-cs-muted">{t('daily.endsIn')} </span>
            <span className="font-mono text-cs-warn">{remainLabel}</span>
            {streak.currentStreak > 0 && (
              <p className="mt-2 font-semibold text-cs-gold">
                {t('daily.streakDay', { n: streak.currentStreak })}
                {streak.playedToday ? ` · ${t('daily.playedToday')}` : ` · ${t('daily.playToday')}`}
              </p>
            )}
            {!streak.currentStreak && !streak.playedToday && (
              <p className="mt-2 text-xs text-cs-gold">{t('daily.startStreak')}</p>
            )}
            <p className="mt-1 text-xs text-cs-muted">{t('daily.sameRolls')}</p>
          </div>
        </div>
        <ModeSetup
          title={t('modes.daily.title')}
          subtitle={t('modes.daily.blurb')}
          lockedMode="almanac"
          modeNote={t('daily.blindNote')}
          onStart={(c) => {
            setCfg({ ...c, mode: 'almanac' })
            draft.reset()
            setStep('draft')
          }}
        />
      </div>
    )
  }

  if (step === 'draft') {
    return (
      <DraftPlay
        draft={draft}
        hideReroll
        launchLabel={t('draft.launchDaily')}
        onLaunch={() => {
          const team = buildUserTeam(draft.lineup, {
            mapPriority: cfg.mapPriority,
            mentalityId: cfg.mentality,
          })
          setUserTeam(team)
          setBracket(generateBracket(team, draft.usedRosterIds))
          setWins(0)
          setLosses(0)
          setStep('tournament')
        }}
      />
    )
  }

  if (step === 'tournament') {
    const finish = async (didWin, w, l) => {
      setWon(didWin)
      const score = scoreDaily({
        wins: w,
        losses: l,
        lineup: draft.lineup,
        mentalityId: cfg.mentality,
        mapPriority: cfg.mapPriority,
      })
      setFinalScore(score)
      const nextStreak = recordDailyPlay(profile.id, { won: didWin, dayKey })
      setStreak(nextStreak)
      const res = await saveGameResult({
        userId: profile.id,
        nickname: profile.nickname,
        mode: 'daily',
        won: didWin,
        score,
        wins: w,
        losses: l,
        streak: nextStreak.currentStreak,
        lineup: draft.lineup,
        meta: { dayKey, difficulty: cfg.mode, streak: nextStreak.currentStreak },
        board: 'daily',
      })
      setSubmitInfo(res)
      setStep('results')
    }

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
        hideRatings
        bestOf={1}
        onChampion={() => finish(true, wins + 1, losses)}
        onEliminated={() => finish(false, wins, losses + 1)}
      />
    )
  }

  return (
    <GameOver
      title={`${t('results.dailyScore')}: ${finalScore}`}
      subtitle={won ? t('results.champions') : t('results.eliminated')}
      won={won}
      wins={wins}
      losses={losses}
      score={finalScore}
      streak={streak.currentStreak}
      lineup={draft.lineup}
      mentality={mentality}
      mapPriority={cfg.mapPriority}
      submitInfo={submitInfo}
      sharePayload={{ mode: 'daily', nickname: profile.nickname }}
      dailyInfo={{
        currentStreak: streak.currentStreak,
        bestStreak: streak.bestStreak,
        remainLabel,
      }}
      onHome={onHome}
      onNeedAuth={onNeedAuth}
      onRetry={() => {
        draft.reset()
        const next = retrySoloSetupState(profile, { lockedMode: 'almanac' })
        setCfg(next.cfg)
        setStep(next.step)
      }}
    />
  )
}

function formatRemain(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}
