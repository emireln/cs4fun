import { useEffect, useMemo, useState } from 'react'
import { MENTALITIES } from '../../data/constants'
import { useI18n } from '../../i18n'
import { useDraftSession } from '../../hooks/useDraftSession'
import { generateSharedRolls, teamPowerScore } from '../../lib/gameModes'
import { saveGameResult } from '../../lib/history'
import { updateRoom } from '../../lib/rooms'
import { initialSoloSetupState, retrySoloSetupState } from '../../lib/setupPreset'
import DraftPlay from '../DraftPlay'
import GameOver from '../GameOver'
import ModeSetup from '../ModeSetup'

export default function PartyGame({ profile, room, onHome, onStatus, onNeedFriends }) {
  const { t } = useI18n()
  const [localRoom, setLocalRoom] = useState(room)
  const [boot] = useState(() => {
    if (room) {
      return {
        step: 'draft',
        cfg: { mode: 'classic', mentality: 'tactical', mapPriority: 'Mirage' },
      }
    }
    return initialSoloSetupState(profile, { vsCpu: true })
  })
  const [cfg, setCfg] = useState(boot.cfg)
  const [step, setStep] = useState(boot.step)
  const [ranking, setRanking] = useState([])
  const [place, setPlace] = useState(null)
  const [submitInfo, setSubmitInfo] = useState(null)

  const seed = localRoom?.seed || `party-solo-${profile.id}`
  const sharedRolls = useMemo(() => generateSharedRolls(seed, 5), [seed])

  const draft = useDraftSession({
    hideRatings: cfg?.mode === 'almanac',
    sharedRolls,
    pickTimerSec: 28,
  })

  const mentality = MENTALITIES.find((m) => m.id === cfg?.mentality) || MENTALITIES[1]

  useEffect(() => {
    onStatus?.({
      phase: step,
      gameMode: 'party',
      mode: cfg?.mode,
      mentality,
      mapPriority: cfg?.mapPriority,
      rerolls: 0,
    })
  }, [step, cfg]) // eslint-disable-line react-hooks/exhaustive-deps

  if (step === 'setup') {
    return (
      <ModeSetup
        title={t('modes.party.title')}
        subtitle={t('modes.party.blurb')}
        showPlayWithOption
        soloLabel={t('setup.solo')}
        friendsLabel={t('setup.withFriends')}
        ctaLabel={t('setup.enterDraft')}
        onStart={(c) => {
          setCfg(c)
          if (!c.vsCpu && !localRoom) {
            onNeedFriends?.('party')
            return
          }
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
        hideReroll
        launchLabel={t('draft.launchParty')}
        banner={
          <div className="mb-4 rounded border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm text-sky-300">
            {t('party.sharedRolls')}
            {localRoom?.code ? ` · ${localRoom.code}` : ''}
          </div>
        }
        onLaunch={async () => {
          const power = teamPowerScore(draft.lineup, cfg.mentality, cfg.mapPriority)
          let players = []

          if (localRoom) {
            const updated = await updateRoom(localRoom.code, (r) => ({
              ...r,
              players: r.players.map((p) =>
                p.id === profile.id
                  ? { ...p, ready: true, lineup: draft.lineup, power }
                  : p,
              ),
            }))
            setLocalRoom(updated)
            players = updated?.players || []
          } else {
            players = [
              {
                id: profile.id,
                nickname: profile.nickname || 'You',
                power,
                lineup: draft.lineup,
              },
            ]
          }

          // Include any ready players; if solo/local incomplete, just rank yourself
          const ready = players.filter((p) => p.lineup && p.power)
          if (ready.length === 0) {
            ready.push({
              id: profile.id,
              nickname: profile.nickname || 'You',
              power,
              lineup: draft.lineup,
            })
          }

          const sorted = [...ready].sort((a, b) => b.power - a.power)
          setRanking(sorted)
          const myPlace = sorted.findIndex((p) => p.id === profile.id) + 1
          setPlace(myPlace)

          const score = Math.round(power * 100 + (sorted.length - myPlace + 1) * 40)
          const res = await saveGameResult({
            userId: profile.id,
            nickname: profile.nickname,
            mode: 'party',
            won: myPlace === 1,
            score,
            lineup: draft.lineup,
            meta: { place: myPlace, power, room: localRoom?.code },
            board: 'party',
          })
          setSubmitInfo(res)
          setStep('results')
        }}
      />
    )
  }

  return (
    <GameOver
      title={place === 1 ? t('results.partyWin') : t('results.partyPlace', { place })}
      won={place === 1}
      place={place}
      lineup={draft.lineup}
      mentality={mentality}
      mapPriority={cfg.mapPriority}
      submitInfo={submitInfo}
      sharePayload={{ mode: 'party', nickname: profile.nickname }}
      onHome={onHome}
      onRetry={() => {
        draft.reset()
        if (localRoom) {
          setStep('draft')
          return
        }
        const next = retrySoloSetupState(profile, { vsCpu: true })
        setCfg(next.cfg)
        setStep(next.step)
      }}
      extra={
        <div className="mx-auto mt-4 max-w-sm text-left">
          <p className="mb-2 text-center text-xs uppercase tracking-wider text-cs-muted">{t('party.ranking')}</p>
          <ul className="space-y-1">
            {ranking.map((p, i) => (
              <li
                key={p.id}
                className={`flex justify-between rounded border px-3 py-1.5 text-sm ${
                  p.id === profile.id ? 'border-cs-gold/40 bg-cs-gold/10 text-cs-gold' : 'border-cs-border'
                }`}
              >
                <span>
                  #{i + 1} {p.nickname}
                </span>
                <span className="font-mono">
                  {t('party.power')} {p.power.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      }
    />
  )
}
