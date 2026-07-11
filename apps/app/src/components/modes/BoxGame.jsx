import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Crown, Home, Package, Swords, Trophy } from 'lucide-react'
import { useI18n } from '../../i18n'
import {
  bestDropOf,
  botNickname,
  formatUsd,
  getCase,
  openBattleRound,
  RARITY_META,
  recordBoxBattle,
  scoreBoxBattle,
  sumDrops,
} from '../../lib/boxBattle'
import { saveGameResult } from '../../lib/history'
import { subscribeRoom, updateRoom } from '../../lib/rooms'
import { unlockAudio } from '../../lib/sound'
import BoxDropCard from '../box/BoxDropCard'
import BoxOpenReel from '../box/BoxOpenReel'
import BoxSetup from '../box/BoxSetup'
import GameOver from '../GameOver'

export default function BoxGame({ profile, room, onHome, onStatus, onNeedFriends }) {
  const { t } = useI18n()
  const [localRoom, setLocalRoom] = useState(room)
  const [step, setStep] = useState(room ? 'lobby' : 'setup')
  const [cfg, setCfg] = useState(() => ({
    caseId: room?.caseId || room?.payload?.caseId || null,
    rounds: room?.rounds || room?.payload?.rounds || 3,
    vsBot: !room,
  }))
  const [battleSeed, setBattleSeed] = useState(
    () => room?.seed || `box-${profile.id}-${Date.now()}`,
  )
  const [roundIndex, setRoundIndex] = useState(0)
  const [revealing, setRevealing] = useState(null) // current round opens
  const [myDrops, setMyDrops] = useState([])
  const [oppDrops, setOppDrops] = useState([])
  const [reelDone, setReelDone] = useState({ me: false, opp: false })
  const [submitInfo, setSubmitInfo] = useState(null)
  const [statsSnapshot, setStatsSnapshot] = useState(null)
  const submitted = useRef(false)
  const lastBoxToken = useRef(null)

  const crate = useMemo(() => getCase(cfg.caseId), [cfg.caseId])
  const botName = useMemo(() => botNickname(battleSeed), [battleSeed])

  const players = useMemo(() => {
    if (localRoom?.players?.length) {
      return localRoom.players.map((p) => ({
        id: p.id,
        nickname: p.nickname || t('common.player'),
        isBot: false,
      }))
    }
    return [
      { id: profile.id, nickname: profile.nickname || t('common.you'), isBot: false },
      { id: `bot-${battleSeed}`, nickname: botName, isBot: true },
    ]
  }, [localRoom, profile, battleSeed, botName, t])

  const me = players.find((p) => p.id === profile.id) || players[0]
  const opp = players.find((p) => p.id !== profile.id) || players[1]

  useEffect(() => {
    if (!localRoom?.code) return undefined
    return subscribeRoom(localRoom.code, (next) => {
      setLocalRoom(next)
      if (next?.seed) setBattleSeed(next.seed)
    })
  }, [localRoom?.code])

  useEffect(() => {
    if (localRoom?.seed) setBattleSeed(localRoom.seed)
  }, [localRoom?.seed])

  useEffect(() => {
    onStatus?.({
      phase: step,
      gameMode: 'box',
      extra:
        step === 'battle'
          ? `${t('box.round')} ${Math.min(roundIndex + 1, cfg.rounds)}/${cfg.rounds}`
          : crate?.short || undefined,
    })
  }, [step, roundIndex, cfg.rounds, crate?.short]) // eslint-disable-line react-hooks/exhaustive-deps

  // Friends room: wait until host configured case, then auto-start when status drafting
  useEffect(() => {
    if (!localRoom) return
    if (localRoom.status === 'drafting' || localRoom.status === 'reveal') {
      const caseId = localRoom.caseId || localRoom.payload?.caseId || cfg.caseId
      const rounds = localRoom.rounds || localRoom.payload?.rounds || cfg.rounds
      if (caseId && step === 'lobby') {
        setCfg({ caseId, rounds, vsBot: false })
        setStep('battle')
        setRoundIndex(0)
        setMyDrops([])
        setOppDrops([])
      }
    }
  }, [localRoom?.status, localRoom?.caseId, localRoom?.payload?.caseId]) // eslint-disable-line react-hooks/exhaustive-deps

  const isFriendBox = Boolean(localRoom?.code) && !cfg.vsBot
  const isBoxHost = !localRoom || localRoom.hostId === profile.id

  const startRound = (idx, caseId = cfg.caseId, { publish = true } = {}) => {
    unlockAudio()
    const opens = openBattleRound({
      caseId,
      players: [me, opp].filter(Boolean),
      battleSeed,
      roundIndex: idx,
    })
    setRevealing(opens)
    setReelDone({ me: false, opp: false })
    if (publish && isFriendBox && isBoxHost && localRoom?.code) {
      updateRoom(localRoom.code, (r) => ({
        ...r,
        box: {
          roundIndex: idx,
          revealing: opens,
          advanceToken: `${idx}-${Date.now()}`,
        },
        players: r.players.map((p) => ({
          ...p,
          boxReelDone: false,
          boxReelRound: idx,
        })),
      }))
    }
  }

  // Solo / host: drive rounds. Guest: wait for room.box.
  useEffect(() => {
    if (step !== 'battle') return
    if (!cfg.caseId) return
    if (revealing) return
    if (roundIndex >= cfg.rounds) return

    if (isFriendBox && !isBoxHost) return

    startRound(roundIndex)
  }, [step, roundIndex, cfg.caseId, isFriendBox, isBoxHost]) // eslint-disable-line react-hooks/exhaustive-deps

  // Guest mirrors host-published opens so both animate the same round together
  useEffect(() => {
    if (!isFriendBox || isBoxHost || step !== 'battle') return
    const remote = localRoom?.box
    if (!remote?.revealing || remote.roundIndex == null) return
    if (remote.advanceToken === lastBoxToken.current) return
    lastBoxToken.current = remote.advanceToken
    setRoundIndex(remote.roundIndex)
    setRevealing(remote.revealing)
    setReelDone({ me: false, opp: false })
    unlockAudio()
  }, [isFriendBox, isBoxHost, step, localRoom?.box?.advanceToken]) // eslint-disable-line react-hooks/exhaustive-deps

  const onReelFinished = (who) => {
    setReelDone((prev) => ({ ...prev, [who]: true }))
  }

  useEffect(() => {
    if (!revealing) return
    if (!reelDone.me || !reelDone.opp) return
    const mine = revealing.find((r) => r.playerId === me.id)?.drop
    const theirs = revealing.find((r) => r.playerId === opp?.id)?.drop
    if (mine) setMyDrops((d) => [...d, mine])
    if (theirs) setOppDrops((d) => [...d, theirs])

    if (isFriendBox && localRoom?.code) {
      updateRoom(localRoom.code, (r) => ({
        ...r,
        players: r.players.map((p) =>
          p.id === profile.id
            ? { ...p, boxReelDone: true, boxReelRound: roundIndex }
            : p,
        ),
      }))
    }

    const t = setTimeout(() => {
      setRevealing(null)
      if (!isFriendBox) {
        if (roundIndex + 1 >= cfg.rounds) setStep('results')
        else setRoundIndex((i) => i + 1)
      }
      // Friend: host advances when both reels reported (effect below)
    }, 700)
    return () => clearTimeout(t)
  }, [reelDone.me, reelDone.opp]) // eslint-disable-line react-hooks/exhaustive-deps

  // Host advances shared round when both players finished reels
  useEffect(() => {
    if (!isFriendBox || !isBoxHost || step !== 'battle' || revealing) return
    const players = localRoom?.players || []
    if (players.length < 2) return
    const allDone = players.every(
      (p) => p.boxReelDone && p.boxReelRound === roundIndex,
    )
    if (!allDone) return
    if (roundIndex + 1 >= cfg.rounds) {
      setStep('results')
      return
    }
    setRoundIndex((i) => i + 1)
  }, [isFriendBox, isBoxHost, step, revealing, localRoom?.players, roundIndex, cfg.rounds]) // eslint-disable-line react-hooks/exhaustive-deps

  const myTotal = sumDrops(myDrops)
  const oppTotal = sumDrops(oppDrops)
  const myBest = bestDropOf(myDrops)
  const oppBest = bestDropOf(oppDrops)
  const won = myTotal > oppTotal
  const tie = myTotal === oppTotal && myDrops.length > 0

  useEffect(() => {
    if (step !== 'results' || submitted.current || myDrops.length === 0) return
    submitted.current = true
    const score = scoreBoxBattle({
      won: won && !tie,
      totalValue: myTotal,
      bestDrop: myBest,
      rounds: myDrops,
    })
    const stats = recordBoxBattle(profile.id, {
      won: won && !tie,
      caseId: cfg.caseId,
      myDrops,
      myTotal,
      oppTotal,
    })
    setStatsSnapshot(stats)
    ;(async () => {
      const info = await saveGameResult({
        userId: profile.id,
        nickname: profile.nickname,
        mode: 'box',
        board: 'box',
        won: won && !tie,
        score,
        wins: won && !tie ? 1 : 0,
        losses: !won && !tie ? 1 : 0,
        streak: 0,
        lineup: null,
        meta: {
          caseId: cfg.caseId,
          caseName: crate?.name,
          rounds: cfg.rounds,
          myTotal,
          oppTotal,
          bestDrop: myBest,
          vsBot: cfg.vsBot,
        },
      })
      setSubmitInfo(info)
      if (localRoom?.code) {
        await updateRoom(localRoom.code, (r) => ({
          ...r,
          status: 'finished',
          players: r.players.map((p) =>
            p.id === profile.id
              ? { ...p, ready: true, boxTotal: myTotal, boxDrops: myDrops, boxBest: myBest }
              : p,
          ),
        }))
      }
    })()
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  if (step === 'setup') {
    return (
      <BoxSetup
        profile={profile}
        onNeedFriends={onNeedFriends}
        onStart={(c) => {
          setCfg(c)
          setMyDrops([])
          setOppDrops([])
          setRoundIndex(0)
          setRevealing(null)
          submitted.current = false
          setStep('battle')
        }}
      />
    )
  }

  if (step === 'lobby' && localRoom) {
    return (
      <BoxRoomConfig
        profile={profile}
        room={localRoom}
        onHome={onHome}
        onConfigured={async (c) => {
          setCfg({ ...c, vsBot: false })
          const next = await updateRoom(localRoom.code, (r) => ({
            ...r,
            caseId: c.caseId,
            rounds: c.rounds,
            status: 'drafting',
            seed: r.seed || battleSeed,
          }))
          setLocalRoom(next)
          setStep('battle')
          setRoundIndex(0)
          setMyDrops([])
          setOppDrops([])
          submitted.current = false
        }}
      />
    )
  }

  if (step === 'battle') {
    const myReveal = revealing?.find((r) => r.playerId === me.id)?.drop
    const oppReveal = revealing?.find((r) => r.playerId === opp?.id)?.drop
    return (
      <div className="mx-auto max-w-5xl px-4 py-5 pb-[calc(5rem+env(safe-area-inset-bottom,0px))]">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-display text-[10px] tracking-[0.25em] text-cs-gold uppercase">
              {t('box.liveBattle')}
            </p>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">
              {crate?.short}{' '}
              <span className="text-cs-muted">
                · {t('box.round')} {Math.min(roundIndex + 1, cfg.rounds)}/{cfg.rounds}
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-4 font-mono text-sm">
            <span className="text-cs-gold">{formatUsd(myTotal)}</span>
            <span className="text-cs-muted">{t('common.vs')}</span>
            <span className="text-cs-loss">{formatUsd(oppTotal)}</span>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="panel rounded-xl p-3 sm:p-4">
            <div className="mb-3 flex items-center gap-2">
              <Swords className="h-4 w-4 text-cs-gold" />
              <span className="font-display text-xs font-bold uppercase tracking-wider text-cs-gold">
                {me.nickname}
              </span>
            </div>
            {myReveal && (
              <BoxOpenReel
                drop={myReveal}
                label={t('box.yourDrop')}
                onDone={() => onReelFinished('me')}
              />
            )}
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {myDrops.map((d) => (
                <BoxDropCard key={d.id} drop={d} compact />
              ))}
            </div>
          </div>

          <div className="panel rounded-xl p-3 sm:p-4">
            <div className="mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-cs-loss" />
              <span className="font-display text-xs font-bold uppercase tracking-wider text-cs-muted">
                {opp?.nickname || t('common.bot')}
              </span>
            </div>
            {oppReveal && (
              <BoxOpenReel
                drop={oppReveal}
                label={t('box.theirDrop')}
                delay={180}
                onDone={() => onReelFinished('opp')}
              />
            )}
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {oppDrops.map((d) => (
                <BoxDropCard key={d.id} drop={d} compact />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Results
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 pb-[calc(5rem+env(safe-area-inset-bottom,0px))]">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
        <div
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${
            tie
              ? 'border-cs-border text-cs-muted'
              : won
                ? 'border-cs-win/50 bg-cs-win/10 text-cs-win'
                : 'border-cs-loss/50 bg-cs-loss/10 text-cs-loss'
          }`}
        >
          {tie ? t('box.tie') : won ? t('box.youWin') : t('box.youLose')}
        </div>
        <h1 className="mt-3 font-display text-3xl font-bold gold-text sm:text-4xl">
          {formatUsd(myTotal)} <span className="text-cs-muted text-xl">{t('common.vs')}</span>{' '}
          {formatUsd(oppTotal)}
        </h1>
        <p className="mt-2 text-sm text-cs-muted">
          {crate?.name} · {cfg.rounds} {t('box.opens')}
        </p>
      </motion.div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <BestPullPanel title={t('box.yourBest')} drop={myBest} />
        <BestPullPanel title={t('box.theirBest')} drop={oppBest} />
      </div>

      {statsSnapshot?.bestDrop && (
        <div className="mb-6 rounded-xl border border-cs-gold/30 bg-cs-gold/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-cs-gold">
            <Crown className="h-3.5 w-3.5" /> {t('box.careerBest')}
          </div>
          <div className="flex items-center gap-3">
            <img
              src={statsSnapshot.bestDrop.image}
              alt=""
              className="h-14 w-20 object-contain"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <div className="truncate font-display font-bold">{statsSnapshot.bestDrop.name}</div>
              <div className="font-mono text-cs-gold">{formatUsd(statsSnapshot.bestDrop.value)}</div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {myDrops.map((d) => (
          <BoxDropCard key={d.id} drop={d} highlight={myBest?.id === d.id} />
        ))}
      </div>

      <GameOver
        title={tie ? t('box.tie') : won ? t('box.victory') : t('box.defeat')}
        subtitle={`${formatUsd(myTotal)} vs ${formatUsd(oppTotal)}`}
        blurb={t('box.resultBlurb')}
        won={won && !tie}
        wins={won && !tie ? 1 : 0}
        losses={!won && !tie ? 1 : 0}
        score={scoreBoxBattle({ won: won && !tie, totalValue: myTotal, bestDrop: myBest, rounds: myDrops })}
        lineup={null}
        submitInfo={submitInfo}
        onHome={onHome}
        onRetry={() => {
          submitted.current = false
          setMyDrops([])
          setOppDrops([])
          setRoundIndex(0)
          setRevealing(null)
          setStep('setup')
        }}
        sharePayload={{
          mode: 'box',
          nickname: profile.nickname,
          won: won && !tie,
          score: Math.round(myTotal * 10),
        }}
        extra={
          <div className="mt-2 flex flex-wrap justify-center gap-2 text-[10px] uppercase tracking-wider text-cs-muted">
            <span className="inline-flex items-center gap-1">
              <Trophy className="h-3 w-3 text-cs-gold" /> {t('box.statGold')}:{' '}
              {myDrops.filter((d) => d.rarity === 'gold').length}
            </span>
            <span>
              {t('box.covertHits')}: {myDrops.filter((d) => d.rarity === 'covert').length}
            </span>
          </div>
        }
      />
    </div>
  )
}

function BestPullPanel({ title, drop }) {
  const { t } = useI18n()
  const meta = drop ? RARITY_META[drop.rarity] : null
  return (
    <div className="rounded-xl border border-cs-border bg-cs-panel/60 p-4">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-cs-muted">{title}</div>
      {drop ? (
        <div className="flex items-center gap-3">
          <img src={drop.image} alt="" className="h-16 w-24 object-contain" referrerPolicy="no-referrer" />
          <div className="min-w-0">
            <div className="truncate font-display text-sm font-bold" style={{ color: meta?.color }}>
              {drop.name}
            </div>
            <div className="mt-1 text-[11px] text-cs-muted">
              {t(`box.rarity.${drop.rarity}`)} · {drop.wear}
            </div>
            <div className="font-mono text-cs-gold">{formatUsd(drop.value)}</div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-cs-muted">—</div>
      )}
    </div>
  )
}

function BoxRoomConfig({ profile, room, onHome, onConfigured }) {
  const { t } = useI18n()
  const isHost = room.hostId === profile.id
  if (!isHost) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <Package className="mx-auto mb-4 h-10 w-10 text-cs-gold" />
        <h1 className="font-display text-2xl font-bold">{t('box.waitingHost')}</h1>
        <p className="mt-2 text-sm text-cs-muted">{t('box.waitingHostHint')}</p>
        <p className="mt-4 font-mono text-cs-gold">{room.code}</p>
        <button type="button" className="btn-ghost mt-8 rounded px-6 py-2 text-xs uppercase" onClick={onHome}>
          <Home className="mr-2 inline h-4 w-4" /> {t('results.home')}
        </button>
      </div>
    )
  }
  return (
    <BoxSetup
      profile={profile}
      locked={false}
      onStart={(c) => onConfigured(c)}
    />
  )
}
