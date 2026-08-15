import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Home, Package, Swords } from 'lucide-react'
import { useI18n } from '../../i18n'
import {
  bestDropOf,
  botNickname,
  getCase,
  openBattleRound,
  recordBoxBattle,
  scoreBoxBattle,
  sumDrops,
} from '../../lib/boxBattle'
import { saveGameResult } from '../../lib/history'
import { recordFriendMatch } from '../../lib/friends'
import { samePlayerId, subscribeRoom, updateRoom } from '../../lib/rooms'
import { unlockAudio } from '../../lib/sound'
import BoxDropCard from '../box/BoxDropCard'
import BoxOpenReel from '../box/BoxOpenReel'
import BoxResults from '../box/BoxResults'
import BoxSetup from '../box/BoxSetup'

export default function BoxGame({ profile, room, onHome, onStatus, onNeedFriends, onNeedAuth }) {
  const { t, money } = useI18n()
  // Room writes carry the caller's id explicitly so guest updates never resolve
  // against a stale shared guest key (signed-in users hit the session branch first).
  const roomUpdate = (code, updater, opts = {}) => updateRoom(code, updater, { guestId: profile.id, ...opts })
  const [localRoom, setLocalRoom] = useState(room)
  const [step, setStep] = useState(room ? 'lobby' : 'setup')
  const [cfg, setCfg] = useState(() => {
    const caseIds =
      room?.caseIds ||
      room?.payload?.caseIds ||
      (room?.caseId || room?.payload?.caseId ? [room.caseId || room.payload.caseId] : null)
    return {
      caseId: caseIds?.[0] || room?.caseId || room?.payload?.caseId || null,
      caseIds: caseIds || [],
      rounds: caseIds?.length || room?.rounds || room?.payload?.rounds || 3,
      vsBot: !room,
    }
  })
  const [battleSeed, setBattleSeed] = useState(
    () => room?.seed || `box-${profile.id}-${Date.now()}`,
  )
  const [roundIndex, setRoundIndex] = useState(0)
  const [revealing, setRevealing] = useState(null)
  const [myDrops, setMyDrops] = useState([])
  const [oppDrops, setOppDrops] = useState([])
  const [reelDone, setReelDone] = useState({ me: false, opp: false })
  const [roundResult, setRoundResult] = useState(null)
  const [submitInfo, setSubmitInfo] = useState(null)
  const [statsSnapshot, setStatsSnapshot] = useState(null)
  const submitted = useRef(false)
  const lastBoxToken = useRef(null)
  /** Prevents Strict Mode / re-entry from appending the same round twice */
  const committedRound = useRef(null)

  const caseIds = cfg.caseIds?.length ? cfg.caseIds : cfg.caseId ? [cfg.caseId] : []
  const rounds = caseIds.length || cfg.rounds || 1
  const crate = useMemo(
    () => getCase(caseIds[roundIndex] || caseIds[0] || cfg.caseId),
    [caseIds, roundIndex, cfg.caseId],
  )
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
    if (!localRoom || localRoom.status !== 'rematch') return
    if (step === 'battle' && !localRoom.box && myDrops.length === 0) return
    const ids =
      localRoom.caseIds ||
      localRoom.payload?.caseIds ||
      (localRoom.caseId || localRoom.payload?.caseId
        ? [localRoom.caseId || localRoom.payload.caseId]
        : null)
    const nextCaseIds = ids || caseIds
    submitted.current = false
    lastBoxToken.current = null
    committedRound.current = null
    setSubmitInfo(null)
    setStatsSnapshot(null)
    setMyDrops([])
    setOppDrops([])
    setRoundIndex(0)
    setRevealing(null)
    setRoundResult(null)
    setReelDone({ me: false, opp: false })
    if (nextCaseIds?.length) {
      setCfg({ caseId: nextCaseIds[0], caseIds: nextCaseIds, rounds: nextCaseIds.length, vsBot: false })
      setStep('battle')
    } else {
      setStep('lobby')
    }
    if (localRoom.hostId === profile.id) {
      roomUpdate(localRoom.code, (r) => ({
        ...r,
        status: nextCaseIds?.length ? 'drafting' : 'drafting',
        box: null,
        players: r.players.map((p) => ({
          ...p,
          ready: false,
          boxReelDone: false,
          boxReelRound: null,
          boxTotal: null,
          boxDrops: null,
          boxBest: null,
          wantRematch: false,
        })),
      }))
    }
  }, [localRoom?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    onStatus?.({
      phase: step,
      gameMode: 'box',
      extra:
        step === 'battle'
          ? `${t('box.round')} ${Math.min(roundIndex + 1, rounds)}/${rounds}`
          : crate?.short || undefined,
    })
  }, [step, roundIndex, rounds, crate?.short]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!localRoom) return
    if (localRoom.status === 'drafting' || localRoom.status === 'reveal') {
      const ids =
        localRoom.caseIds ||
        localRoom.payload?.caseIds ||
        (localRoom.caseId || localRoom.payload?.caseId
          ? [localRoom.caseId || localRoom.payload.caseId]
          : null)
      if (ids?.length && step === 'lobby') {
        setCfg({ caseId: ids[0], caseIds: ids, rounds: ids.length, vsBot: false })
        setStep('battle')
        setRoundIndex(0)
        setMyDrops([])
        setOppDrops([])
      }
    }
  }, [localRoom?.status, localRoom?.caseId, localRoom?.caseIds, localRoom?.payload?.caseId]) // eslint-disable-line react-hooks/exhaustive-deps

  const isFriendBox = Boolean(localRoom?.code) && !cfg.vsBot
  const isBoxHost = !localRoom || localRoom.hostId === profile.id

  const startRound = (idx, { publish = true } = {}) => {
    unlockAudio()
    committedRound.current = null
    setRoundResult(null)
    const opens = openBattleRound({
      caseId: caseIds[idx] || cfg.caseId,
      caseIds,
      players: [me, opp].filter(Boolean),
      battleSeed,
      roundIndex: idx,
    })
    setRevealing(opens)
    setReelDone({ me: false, opp: false })
    if (publish && isFriendBox && isBoxHost && localRoom?.code) {
      roomUpdate(localRoom.code, (r) => ({
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

  useEffect(() => {
    if (step !== 'battle') return
    if (!caseIds.length && !cfg.caseId) return
    if (revealing) return
    if (roundIndex >= rounds) return
    if (isFriendBox && !isBoxHost) return
    startRound(roundIndex)
  }, [step, roundIndex, cfg.caseId, caseIds.join(','), isFriendBox, isBoxHost]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isFriendBox || isBoxHost || step !== 'battle') return
    const remote = localRoom?.box
    if (!remote?.revealing || remote.roundIndex == null) return
    if (remote.advanceToken === lastBoxToken.current) return
    lastBoxToken.current = remote.advanceToken
    committedRound.current = null
    setRoundIndex(remote.roundIndex)
    setRevealing(remote.revealing)
    setRoundResult(null)
    setReelDone({ me: false, opp: false })
    unlockAudio()
  }, [isFriendBox, isBoxHost, step, localRoom?.box?.advanceToken]) // eslint-disable-line react-hooks/exhaustive-deps

  const onReelFinished = (who) => {
    setReelDone((prev) => (prev[who] ? prev : { ...prev, [who]: true }))
  }

  useEffect(() => {
    if (!revealing) return
    if (!reelDone.me || !reelDone.opp) return
    const roundKey = `${roundIndex}:${revealing.map((r) => r.drop?.id).join('|')}`
    if (committedRound.current !== roundKey) {
      committedRound.current = roundKey

      const mine = revealing.find((r) => r.playerId === me.id)?.drop
      const theirs = revealing.find((r) => r.playerId === opp?.id)?.drop
      if (mine) setMyDrops((d) => (d.some((x) => x.id === mine.id) ? d : [...d, mine]))
      if (theirs) setOppDrops((d) => (d.some((x) => x.id === theirs.id) ? d : [...d, theirs]))
      setRoundResult({
        mine: mine?.value ?? 0,
        theirs: theirs?.value ?? 0,
        won: (mine?.value ?? 0) > (theirs?.value ?? 0),
        tie: mine?.value != null && theirs?.value != null && mine.value === theirs.value,
      })

      if (isFriendBox && localRoom?.code) {
        roomUpdate(localRoom.code, (r) => ({
          ...r,
          players: r.players.map((p) =>
            p.id === profile.id
              ? { ...p, boxReelDone: true, boxReelRound: roundIndex }
              : p,
          ),
        }))
      }
    }

    const timer = setTimeout(() => {
      setRevealing(null)
      setRoundResult(null)
      if (!isFriendBox) {
        if (roundIndex + 1 >= rounds) setStep('results')
        else setRoundIndex((i) => i + 1)
      }
    }, 1600)
    return () => clearTimeout(timer)
  }, [reelDone.me, reelDone.opp]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isFriendBox || !isBoxHost || step !== 'battle' || revealing) return
    const list = localRoom?.players || []
    if (list.length < 2) return
    const allDone = list.every((p) => p.boxReelDone && p.boxReelRound === roundIndex)
    if (!allDone) return
    if (roundIndex + 1 >= rounds) {
      setStep('results')
      return
    }
    setRoundIndex((i) => i + 1)
  }, [isFriendBox, isBoxHost, step, revealing, localRoom?.players, roundIndex, rounds]) // eslint-disable-line react-hooks/exhaustive-deps

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
      caseId: caseIds[0] || cfg.caseId,
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
          caseId: caseIds[0] || cfg.caseId,
          caseIds,
          caseName: caseIds.map((id) => getCase(id)?.short).filter(Boolean).join(' · '),
          rounds,
          myTotal,
          oppTotal,
          bestDrop: myBest,
          drops: myDrops,
          roundGold: myDrops.filter((d) => d.rarity === 'gold').length,
          roundCovert: myDrops.filter((d) => d.rarity === 'covert').length,
          roundOpens: myDrops.length,
          vsBot: cfg.vsBot,
          friendMatch: isFriendBox,
          friend: isFriendBox,
        },
      })
      setSubmitInfo(info)
      if (isFriendBox && opp?.id && !String(opp.id).startsWith('bot-')) {
        try {
          await recordFriendMatch({
            profileId: profile.id,
            friendId: opp.id,
            won: won && !tie,
          })
        } catch {
          /* optional */
        }
      }
      if (localRoom?.code) {
        await roomUpdate(localRoom.code, (r) => ({
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
          committedRound.current = null
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
          const next = await roomUpdate(localRoom.code, (r) => ({
            ...r,
            caseId: c.caseId,
            caseIds: c.caseIds,
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
          committedRound.current = null
        }}
      />
    )
  }

  if (step === 'battle') {
    const myReveal = revealing?.find((r) => r.playerId === me.id)?.drop
    const oppReveal = revealing?.find((r) => r.playerId === opp?.id)?.drop
    const totalBar = myTotal + oppTotal || 1
    const myPct = Math.round((myTotal / totalBar) * 100)
    return (
      <div className="mx-auto max-w-5xl px-4 py-5 pb-[calc(5rem+env(safe-area-inset-bottom,0px))]">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-3">
            {crate?.image && (
              <img
                src={crate.image}
                alt=""
                className="h-12 w-16 object-contain sm:h-14 sm:w-20"
                referrerPolicy="no-referrer"
              />
            )}
            <div>
              <p className="font-display text-[10px] tracking-[0.25em] text-cs-gold uppercase">
                {t('box.liveBattle')}
              </p>
              <h1 className="font-display text-2xl font-bold sm:text-3xl">
                {crate?.short}{' '}
                <span className="text-cs-muted">
                  · {t('box.round')} {Math.min(roundIndex + 1, rounds)}/{rounds}
                </span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-1.5" aria-label={t('box.roundLog')}>
            {Array.from({ length: rounds }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i < myDrops.length
                    ? 'w-4 bg-cs-gold'
                    : i === roundIndex
                      ? 'w-4 animate-pulse bg-cs-gold/40'
                      : 'w-1.5 bg-cs-border'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-cs-border bg-cs-bg/40 px-3 py-2">
          <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider">
            <span className="min-w-0 truncate font-semibold text-cs-loss">
              {opp?.nickname || t('common.bot')}{' '}
              <span className="font-mono text-cs-loss">{money(oppTotal)}</span>
            </span>
            <span className="shrink-0 text-cs-muted">{t('box.valueBar')}</span>
            <span className="min-w-0 truncate text-right font-semibold text-cs-gold">
              <span className="font-mono text-cs-gold">{money(myTotal)}</span> {me.nickname}
            </span>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full border border-cs-border bg-cs-bg">
            <div
              className="bg-cs-loss/80 transition-all duration-500"
              style={{ width: `${100 - myPct}%` }}
            />
            <div className="bg-cs-gold transition-all duration-500" style={{ width: `${myPct}%` }} />
          </div>
        </div>

        <AnimatePresence>
          {roundResult && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6 }}
              className="mb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-xl border border-cs-gold/40 bg-cs-gold/10 px-4 py-3"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-cs-muted">
                {t('box.roundShort', { n: roundIndex + 1 })}
              </span>
              <span className="font-mono text-lg font-bold text-cs-loss">
                {money(roundResult.theirs)}
              </span>
              <span className="text-cs-muted">vs</span>
              <span className="font-mono text-lg font-bold text-cs-gold">{money(roundResult.mine)}</span>
              <span
                className={`font-display text-sm font-extrabold uppercase tracking-[0.2em] ${
                  roundResult.tie ? 'text-cs-muted' : roundResult.won ? 'gold-text' : 'text-cs-loss'
                }`}
              >
                {roundResult.tie ? t('box.tie') : roundResult.won ? t('box.youWin') : t('box.youLose')}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid gap-5 lg:grid-cols-2">
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
                onDone={() => onReelFinished('opp')}
              />
            )}
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {oppDrops.map((d) => (
                <BoxDropCard key={d.id} drop={d} compact />
              ))}
            </div>
          </div>

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
                delay={1500}
                idleBadge={t('box.openingNext')}
                onDone={() => onReelFinished('me')}
              />
            )}
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {myDrops.map((d) => (
                <BoxDropCard key={d.id} drop={d} compact />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <BoxResults
      won={won}
      tie={tie}
      myTotal={myTotal}
      oppTotal={oppTotal}
      myDrops={myDrops}
      oppDrops={oppDrops}
      myBest={myBest}
      oppBest={oppBest}
      caseIds={caseIds}
      caseName={caseIds.map((id) => getCase(id)?.short).filter(Boolean).join(' · ')}
      profile={profile}
      submitInfo={submitInfo}
      statsSnapshot={statsSnapshot}
      onHome={onHome}
      onNeedAuth={onNeedAuth}
      onRetry={() => {
        submitted.current = false
        committedRound.current = null
        setMyDrops([])
        setOppDrops([])
        setRoundIndex(0)
        setRevealing(null)
        setStep('setup')
      }}
      onRematch={
        isFriendBox && localRoom?.code
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
    />
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
  return <BoxSetup profile={profile} locked={false} onStart={(c) => onConfigured(c)} />
}
