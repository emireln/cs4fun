import { useEffect, useMemo, useState } from 'react'
import { MENTALITIES } from '../../data/constants'
import { useI18n } from '../../i18n'
import { useDraftSession } from '../../hooks/useDraftSession'
import { generateSharedRolls, teamPowerScore } from '../../lib/gameModes'
import { saveGameResult } from '../../lib/history'
import { recordFriendMatch } from '../../lib/friends'
import { samePlayerId, subscribeRoom, updateRoom } from '../../lib/rooms'
import { initialSoloSetupState, retrySoloSetupState } from '../../lib/setupPreset'
import DraftPlay from '../DraftPlay'
import GameOver from '../GameOver'
import ModeSetup from '../ModeSetup'

export default function PartyGame({ profile, room, onHome, onStatus, onNeedFriends, onNeedAuth }) {
  const { t } = useI18n()
  // Room writes carry the caller's id explicitly so guest updates never resolve
  // against a stale shared guest key (signed-in users hit the session branch first).
  const roomUpdate = (code, updater, opts = {}) => updateRoom(code, updater, { guestId: profile.id, ...opts })
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
  const [waitingFriends, setWaitingFriends] = useState(false)

  const seed = localRoom?.seed || `party-solo-${profile.id}`
  const sharedRolls = useMemo(() => generateSharedRolls(seed, 5), [seed])

  const draft = useDraftSession({
    hideRatings: cfg?.mode === 'almanac',
    sharedRolls,
    pickTimerSec: 28,
  })

  const mentality = MENTALITIES.find((m) => m.id === cfg?.mentality) || MENTALITIES[1]

  useEffect(() => {
    if (!localRoom?.code) return undefined
    return subscribeRoom(localRoom.code, (next) => setLocalRoom(next))
  }, [localRoom?.code])

  useEffect(() => {
    if (!localRoom || localRoom.status !== 'rematch') return
    if (step === 'draft' && ranking.length === 0 && !localRoom.match) return
    draft.reset()
    setRanking([])
    setPlace(null)
    setSubmitInfo(null)
    setWaitingFriends(false)
    setStep('draft')
    if (localRoom.hostId === profile.id) {
      roomUpdate(localRoom.code, (r) => ({
        ...r,
        status: 'drafting',
        players: r.players.map((p) => ({
          ...p,
          ready: false,
          lineup: null,
          power: 0,
          wantRematch: false,
        })),
      }))
    }
  }, [localRoom?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    onStatus?.({
      phase: step,
      gameMode: 'party',
      mode: cfg?.mode,
      mentality,
      mapPriority: cfg?.mapPriority,
    })
  }, [step, cfg]) // eslint-disable-line react-hooks/exhaustive-deps

  // When friends all locked lineups, resolve ranking for everyone still waiting
  useEffect(() => {
    if (!waitingFriends || !localRoom) return
    const players = localRoom.players || []
    const ready = players.filter((p) => p.lineup && p.power != null)
    if (ready.length === 0) return
    if (ready.length < players.length) return

    const sorted = [...ready].sort((a, b) => b.power - a.power)
    setRanking(sorted)
    const myPlace = sorted.findIndex((p) => p.id === profile.id) + 1
    if (myPlace < 1) return
    setPlace(myPlace)
    setWaitingFriends(false)
    const mine = sorted.find((p) => p.id === profile.id)
    const power = mine?.power || 0
    ;(async () => {
      const score = Math.round(power * 100 + (sorted.length - myPlace + 1) * 40)
      const res = await saveGameResult({
        userId: profile.id,
        nickname: profile.nickname,
        mode: 'party',
        won: myPlace === 1,
        score,
        lineup: mine?.lineup || draft.lineup,
        meta: { place: myPlace, power, room: localRoom?.code, friendMatch: Boolean(localRoom?.code) },
        board: 'party',
      })
      if (localRoom?.code) {
        for (const p of sorted) {
          if (p.id === profile.id) continue
          await recordFriendMatch({
            profileId: profile.id,
            friendId: p.id,
            won: myPlace === 1,
          })
        }
      }
      setSubmitInfo(res)
      setStep('results')
    })()
  }, [waitingFriends, localRoom]) // eslint-disable-line react-hooks/exhaustive-deps

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

  if (step === 'draft' || waitingFriends) {
    return (
      <DraftPlay
        draft={draft}
        hideReroll
        launchLabel={waitingFriends ? t('draft.waitingFriends') : t('draft.launchParty')}
        launchDisabled={waitingFriends}
        banner={
          <div className="mb-4 rounded border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm text-sky-300">
            {waitingFriends ? t('party.waitingLock') : t('party.sharedRolls')}
            {localRoom?.code ? ` · ${localRoom.code}` : ''}
          </div>
        }
        onLaunch={async () => {
          if (waitingFriends) return
          const power = teamPowerScore(draft.lineup, cfg.mentality, cfg.mapPriority, {
            cursedCap: cfg.cursedCap,
          })

          if (localRoom) {
            const updated = await roomUpdate(localRoom.code, (r) => ({
              ...r,
              players: r.players.map((p) =>
                p.id === profile.id
                  ? { ...p, ready: true, lineup: draft.lineup, power }
                  : p,
              ),
            }))
            setLocalRoom(updated)
            const players = updated?.players || []
            const ready = players.filter((p) => p.lineup && p.power != null)
            if (ready.length < players.length || players.length < 2) {
              setWaitingFriends(true)
              return
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
              meta: { place: myPlace, power, room: localRoom?.code, friendMatch: true },
              board: 'party',
            })
            for (const p of sorted) {
              if (p.id === profile.id) continue
              await recordFriendMatch({
                profileId: profile.id,
                friendId: p.id,
                won: myPlace === 1,
              })
            }
            setSubmitInfo(res)
            setStep('results')
            return
          }

          const players = [
            {
              id: profile.id,
              nickname: profile.nickname || t('common.you'),
              power,
              lineup: draft.lineup,
            },
          ]
          setRanking(players)
          setPlace(1)
          const score = Math.round(power * 100 + 40)
          const res = await saveGameResult({
            userId: profile.id,
            nickname: profile.nickname,
            mode: 'party',
            won: true,
            score,
            lineup: draft.lineup,
            meta: { place: 1, power },
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
      onNeedAuth={onNeedAuth}
      onRematch={
        localRoom?.code
          ? () => {
              if (samePlayerId(localRoom.hostId, profile.id)) {
                roomUpdate(localRoom.code, (r) => ({
                  ...r,
                  status: 'rematch',
                  seed: `${r.mode}-${r.code}-${Date.now()}`,
                  players: (r.players || []).map((p) => ({ ...p, wantRematch: false })),
                }))
              } else {
                // Guests send intent; only the host flips status — prevents double-fire
                roomUpdate(localRoom.code, (r) => ({
                  ...r,
                  players: (r.players || []).map((p) =>
                    samePlayerId(p.id, profile.id) ? { ...p, wantRematch: true } : p,
                  ),
                }))
              }
            }
          : null
      }
      onRetry={() => {
        draft.reset()
        setWaitingFriends(false)
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
