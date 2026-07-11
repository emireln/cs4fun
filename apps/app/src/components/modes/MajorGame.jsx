import { useEffect, useMemo, useState } from 'react'
import { MENTALITIES } from '../../data/constants'
import { useI18n } from '../../i18n'
import { useDraftSession } from '../../hooks/useDraftSession'
import { buildUserTeam, scoreMajorRun } from '../../lib/gameModes'
import { saveGameResult } from '../../lib/history'
import { generateBracket } from '../../engine/simulation'
import { initialSoloSetupState, retrySoloSetupState } from '../../lib/setupPreset'
import ModeSetup from '../ModeSetup'
import DraftPlay from '../DraftPlay'
import TournamentView from '../TournamentView'
import GameOver from '../GameOver'

export default function MajorGame({ profile, onHome, onStatus }) {
  const { t } = useI18n()
  const [boot] = useState(() => initialSoloSetupState(profile))
  const [step, setStep] = useState(boot.step)
  const [cfg, setCfg] = useState(boot.cfg)
  const [bracket, setBracket] = useState(null)
  const [userTeam, setUserTeam] = useState(null)
  const [wins, setWins] = useState(0)
  const [losses, setLosses] = useState(0)
  const [stage, setStage] = useState('quarterfinals')
  const [won, setWon] = useState(false)
  const [submitInfo, setSubmitInfo] = useState(null)

  const draft = useDraftSession({
    hideRatings: cfg?.mode === 'almanac',
    pickTimerSec: 35,
  })

  const mentality = useMemo(
    () => MENTALITIES.find((m) => m.id === cfg?.mentality) || MENTALITIES[1],
    [cfg],
  )

  useEffect(() => {
    onStatus?.({
      phase: step === 'setup' ? 'setup' : step,
      gameMode: 'major',
      mode: cfg?.mode,
      mentality,
      mapPriority: cfg?.mapPriority,
      rerolls: draft.rerolls,
      wins,
      losses,
      stage: step === 'tournament' ? stage : null,
    })
  }, [step, cfg, draft.rerolls, wins, losses, stage, mentality]) // eslint-disable-line react-hooks/exhaustive-deps

  if (step === 'setup') {
    return (
      <ModeSetup
        title={t('modes.major.title')}
        subtitle={t('modes.major.blurb')}
        onStart={(c) => {
          setCfg(c)
          draft.reset()
          setStep('draft')
        }}
      />
    )
  }

  if (step === 'draft') {
    return (
      <DraftPlay
        draft={draft}
        launchLabel={t('draft.launch')}
        onLaunch={() => {
          const team = buildUserTeam(draft.lineup, {
            mapPriority: cfg.mapPriority,
            mentalityId: cfg.mentality,
          })
          setUserTeam(team)
          setBracket(generateBracket(team, draft.usedRosterIds))
          setWins(0)
          setLosses(0)
          setStage('quarterfinals')
          setStep('tournament')
        }}
      />
    )
  }

  if (step === 'tournament') {
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
        hideRatings={cfg.mode === 'almanac'}
        onChampion={async () => {
          setWon(true)
          const w = wins + 1
          const score = scoreMajorRun({
            wins: w,
            losses,
            lineup: draft.lineup,
            mentalityId: cfg.mentality,
            mapPriority: cfg.mapPriority,
          })
          const res = await saveGameResult({
            userId: profile.id,
            nickname: profile.nickname,
            mode: 'major',
            won: true,
            score,
            wins: w,
            losses,
            lineup: draft.lineup,
            meta: { difficulty: cfg.mode },
            board: 'major',
          })
          setSubmitInfo(res)
          setStep('results')
        }}
        onEliminated={async () => {
          setWon(false)
          const l = losses + 1
          const score = scoreMajorRun({
            wins,
            losses: l,
            lineup: draft.lineup,
            mentalityId: cfg.mentality,
            mapPriority: cfg.mapPriority,
          })
          const res = await saveGameResult({
            userId: profile.id,
            nickname: profile.nickname,
            mode: 'major',
            won: false,
            score,
            wins,
            losses: l,
            lineup: draft.lineup,
            meta: { difficulty: cfg.mode },
            board: 'major',
          })
          setSubmitInfo(res)
          setStep('results')
        }}
      />
    )
  }

  return (
    <GameOver
      title={won ? t('results.runComplete') : t('results.bracketExit')}
      subtitle={won ? t('results.champions') : t('results.eliminated')}
      blurb={won ? t('results.winBlurb') : t('results.lossBlurb')}
      won={won}
      wins={wins}
      losses={losses}
      lineup={draft.lineup}
      mentality={mentality}
      mapPriority={cfg.mapPriority}
      submitInfo={submitInfo}
      sharePayload={{ mode: 'major', nickname: profile.nickname }}
      onHome={onHome}
      onRetry={() => {
        draft.reset()
        const next = retrySoloSetupState(profile)
        setCfg(next.cfg)
        setStep(next.step)
      }}
    />
  )
}
