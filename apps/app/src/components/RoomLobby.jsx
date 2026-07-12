import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Copy, Users, Swords, Package } from 'lucide-react'
import { useI18n } from '../i18n'
import { useAuth } from '../lib/auth'
import { createRoom, joinRoom, subscribeRoom, updateRoom, samePlayerId } from '../lib/rooms'
import { displayName, ensureGuestNickname, randomGuestTag } from '../lib/profile'
import { equippedTitleLabel, titleLoadout } from '../lib/cosmetics'
import { PROP_OPTIONS, readProps, setPropPick } from '../lib/props'
import { copyText } from '../lib/clipboard'

export default function RoomLobby({ profile, initialMode = 'party', onBack, onStart, embedded = false }) {
  const { t } = useI18n()
  const { updateProfile, isAuthed } = useAuth()
  const [mode, setMode] = useState(
    initialMode === 'duel' ? 'duel' : initialMode === 'box' ? 'box' : 'party',
  )
  const [room, setRoom] = useState(null)
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [propsRow, setPropsRow] = useState({ picks: {} })

  useEffect(() => {
    if (!room?.code) return undefined
    return subscribeRoom(room.code, (next) => {
      setRoom((prev) => {
        // Don't let a stale poll wipe a newer local ready/status flip.
        if (prev?.updatedAt && next?.updatedAt && Number(next.updatedAt) < Number(prev.updatedAt)) {
          return prev
        }
        return { ...next }
      })
    })
  }, [room?.code])

  useEffect(() => {
    if (!room?.code) {
      setPropsRow({ picks: {} })
      return
    }
    setPropsRow(readProps(room.code))
  }, [room?.code])

  /** Guests without a tag get a random one so they can paste a code and play. */
  const resolvePlayer = async () => {
    if (profile?.nickname?.trim()) {
      return { ...profile, nickname: displayName(profile) }
    }
    if (isAuthed) {
      setError(t('room.enterName'))
      return null
    }
    const nick = randomGuestTag()
    const saved = ensureGuestNickname({ ...profile, nickname: nick })
    try {
      await updateProfile({ nickname: saved.nickname })
    } catch {
      /* local tag is enough for lobby play */
    }
    return { ...saved, nickname: displayName(saved) }
  }

  const handleCreate = async () => {
    const player = await resolvePlayer()
    if (!player) return
    setError('')
    const res = await createRoom({
      profile: player,
      mode,
    })
    if (res.error) {
      const key = `room.${res.error}`
      const mapped = t(key)
      setError(mapped !== key ? mapped : res.error)
      return
    }
    setRoom({ ...res.room, updatedAt: Date.now() })
  }

  const handleJoin = async () => {
    const player = await resolvePlayer()
    if (!player) return
    setError('')
    const res = await joinRoom({
      code: joinCode,
      profile: player,
    })
    if (res.error) {
      const key = `room.${res.error}`
      const mapped = t(key)
      setError(mapped !== key ? mapped : res.error)
      return
    }
    setRoom({ ...res.room, updatedAt: Date.now() })
    setMode(res.room.mode)
  }

  const toggleReady = async () => {
    if (!room) return
    const pid = profile.id
    const meNow = (room.players || []).find((p) => samePlayerId(p.id, pid))
    const desiredReady = !Boolean(meNow?.ready)
    const optimistic = {
      ...room,
      updatedAt: Date.now(),
      players: (room.players || []).map((p) =>
        samePlayerId(p.id, pid) ? { ...p, ready: desiredReady } : p,
      ),
    }
    setRoom(optimistic)
    const next = await updateRoom(
      room.code,
      (r) => ({
        ...r,
        updatedAt: Date.now(),
        players: (Array.isArray(r.players) && r.players.length ? r.players : optimistic.players).map((p) =>
          samePlayerId(p.id, pid) ? { ...p, ready: desiredReady } : p,
        ),
      }),
      { guestId: !isAuthed ? profile.id : null, base: optimistic },
    )
    if (next) setRoom({ ...next, updatedAt: next.updatedAt || Date.now() })
  }

  const startGame = async () => {
    if (!room || !samePlayerId(room.hostId, profile.id)) return
    const drafting = {
      ...room,
      status: 'drafting',
      seed: room.seed || `${room.mode}-${room.code}-${Date.now()}`,
      updatedAt: Date.now(),
    }
    const next = await updateRoom(
      room.code,
      (r) => ({
        ...r,
        status: 'drafting',
        seed: r.seed || drafting.seed,
        updatedAt: Date.now(),
      }),
      { guestId: !isAuthed ? profile.id : null, base: drafting },
    )
    if (next) onStart(next)
    else onStart(drafting)
  }

  // Guests auto-forward when host starts; host already navigates via startGame
  useEffect(() => {
    if (room?.status === 'drafting' && room.hostId !== profile.id) onStart(room)
  }, [room?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  const copyCode = async () => {
    if (!room?.code) return
    const res = await copyText(room.code)
    if (!res.ok) return
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const shell = embedded ? 'w-full' : 'mx-auto w-full max-w-5xl px-4 py-8 sm:py-10'
  const showProps = room?.code && (room.mode === 'duel' || room.mode === 'box')
  const titleForPlayer = (playerId) => {
    if (playerId === profile.id) return titleLoadout(profile.id, t) || equippedTitleLabel(profile.id, t)
    try {
      const all = JSON.parse(localStorage.getItem('cs4fun_cosmetics_v1') || '{}')
      if (!all[playerId]) return null
    } catch {
      return null
    }
    return titleLoadout(playerId, t) || equippedTitleLabel(playerId, t)
  }

  if (!room) {
    return (
      <div className={shell}>
        {!embedded && (
          <button type="button" className="btn-ghost mb-6 inline-flex items-center gap-2 rounded px-3 py-2 text-sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" /> {t('nav.back')}
          </button>
        )}
        <h1 className="mb-6 font-display text-3xl font-bold gold-text sm:text-4xl">{t('room.title')}</h1>

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setMode('party')}
            className={`rounded border px-4 py-4 text-left transition ${
              mode === 'party' ? 'border-cs-gold bg-cs-gold/15 text-cs-gold' : 'border-cs-border hover:border-cs-gold/40'
            }`}
          >
            <Users className="mb-2 h-5 w-5" />
            <div className="text-sm font-bold">{t('modes.party.title')}</div>
            <div className="mt-1 text-xs text-cs-muted">{t('modes.party.blurb')}</div>
          </button>
          <button
            type="button"
            onClick={() => setMode('duel')}
            className={`rounded border px-4 py-4 text-left transition ${
              mode === 'duel' ? 'border-cs-gold bg-cs-gold/15 text-cs-gold' : 'border-cs-border hover:border-cs-gold/40'
            }`}
          >
            <Swords className="mb-2 h-5 w-5" />
            <div className="text-sm font-bold">{t('modes.duel.title')}</div>
            <div className="mt-1 text-xs text-cs-muted">{t('modes.duel.blurb')}</div>
          </button>
          <button
            type="button"
            onClick={() => setMode('box')}
            className={`rounded border px-4 py-4 text-left transition ${
              mode === 'box' ? 'border-cs-gold bg-cs-gold/15 text-cs-gold' : 'border-cs-border hover:border-cs-gold/40'
            }`}
          >
            <Package className="mb-2 h-5 w-5" />
            <div className="text-sm font-bold">{t('modes.box.title')}</div>
            <div className="mt-1 text-xs text-cs-muted">{t('modes.box.blurb')}</div>
          </button>
        </div>

        <div className="grid items-stretch gap-4 lg:grid-cols-2">
          <div className="panel flex flex-col rounded-xl p-5 sm:p-6">
            <h2 className="font-display text-xs font-bold tracking-[0.18em] text-cs-gold uppercase">
              {t('room.create')}
            </h2>
            <p className="mt-2 flex-1 text-sm text-cs-muted">{t('room.createHint')}</p>
            <button
              type="button"
              className="btn-gold mt-4 w-full rounded py-2.5 text-sm uppercase tracking-wider"
              onClick={handleCreate}
            >
              {t('room.create')}
            </button>
          </div>
          <div className="panel flex flex-col rounded-xl p-5 sm:p-6">
            <h2 className="font-display text-xs font-bold tracking-[0.18em] text-cs-gold uppercase">
              {t('room.join')}
            </h2>
            <p className="mt-2 flex-1 text-sm text-cs-muted">{t('room.joinHint')}</p>
            <div className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder={t('room.code')}
                maxLength={6}
                className="min-w-0 flex-1 rounded border border-cs-border bg-cs-bg/60 px-3 py-2.5 font-mono tracking-widest outline-none focus:border-cs-gold/50"
              />
              <button
                type="button"
                className="btn-ghost shrink-0 rounded px-5 py-2.5 text-sm uppercase tracking-wider sm:self-stretch"
                onClick={handleJoin}
              >
                {t('room.join')}
              </button>
            </div>
          </div>
        </div>
        {error && <p className="mt-4 text-sm text-cs-loss">{error}</p>}
      </div>
    )
  }

  const isHost = samePlayerId(room.hostId, profile.id)
  const me = room.players.find((p) => samePlayerId(p.id, profile.id))

  return (
    <div className={shell}>
      {!embedded && (
        <button type="button" className="btn-ghost mb-6 inline-flex items-center gap-2 rounded px-3 py-2 text-sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> {t('room.leave')}
        </button>
      )}

      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        className="panel mx-auto w-full max-w-3xl rounded-xl p-5 sm:p-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.25em] text-cs-muted">{t('room.code')}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <div className="min-w-0 font-display text-3xl font-bold tracking-[0.18em] text-cs-gold sm:text-5xl sm:tracking-[0.2em]">
                {room.code}
              </div>
              <button type="button" className="btn-ghost shrink-0 rounded px-3 py-2 text-sm" onClick={copyCode}>
                <Copy className="mr-1 inline h-3.5 w-3.5" />
                {copied ? t('room.copied') : t('room.copy')}
              </button>
            </div>
          </div>
          {embedded && (
            <button
              type="button"
              className="btn-ghost inline-flex shrink-0 items-center gap-1.5 rounded px-3 py-2 text-xs uppercase tracking-wider"
              onClick={() => setRoom(null)}
            >
              <ArrowLeft className="h-3.5 w-3.5" /> {t('room.leave')}
            </button>
          )}
        </div>
        <h3 className="mb-2 mt-6 font-display text-[10px] tracking-[0.2em] text-cs-gold uppercase">
          {t('room.players')} ({room.players.length}/{room.maxPlayers})
        </h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {room.players.map((p) => {
            const title = titleForPlayer(p.id)
            return (
            <li
              key={p.id}
              className="flex items-center justify-between rounded border border-cs-border bg-cs-bg/40 px-3 py-2.5 text-sm"
            >
              <span className="min-w-0">
                <span className="block truncate">
                  {p.nickname}
                  {p.isHost ? ` · ${t('room.host')}` : ''}
                  {p.id && samePlayerId(p.id, profile.id) ? ` (${t('room.you')})` : ''}
                </span>
                {title ? (
                  <span className="mt-0.5 block truncate text-[10px] uppercase tracking-wider text-cs-gold/80">
                    {title}
                  </span>
                ) : null}
              </span>
              <span className={p.ready ? 'text-cs-win' : 'text-cs-muted'}>
                {p.ready ? t('room.ready') : t('room.notReady')}
              </span>
            </li>
          )})}
        </ul>

        {showProps && (
          <div className="mt-5 rounded-xl border border-cs-border bg-cs-bg/40 p-3">
            <div className="mb-2">
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-cs-gold">
                {t('props.title')}
              </p>
              <p className="text-xs text-cs-muted">{t('props.blurb')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {PROP_OPTIONS.map((prop) => {
                const active = propsRow.picks?.[profile.id] === prop.id
                return (
                  <button
                    key={prop.id}
                    type="button"
                    onClick={() => setPropsRow(setPropPick(room.code, profile.id, prop.id))}
                    className={`rounded border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
                      active
                        ? 'border-cs-gold bg-cs-gold/15 text-cs-gold'
                        : 'border-cs-border text-cs-muted hover:border-cs-gold/40'
                    }`}
                  >
                    {t(prop.labelKey)}
                  </button>
                )
              })}
            </div>
            {propsRow.picks?.[profile.id] ? (
              <p className="mt-2 text-[10px] text-cs-muted">
                {t('props.yourPick')}: {t(PROP_OPTIONS.find((p) => p.id === propsRow.picks?.[profile.id])?.labelKey)}
              </p>
            ) : null}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <button type="button" className="btn-ghost flex-1 rounded py-2.5 text-sm" onClick={toggleReady}>
            {me?.ready ? t('room.unready') : t('room.ready')}
          </button>
          {isHost ? (
            <button
              type="button"
              className="btn-gold flex-1 rounded py-2.5 text-sm uppercase tracking-wider"
              onClick={startGame}
              disabled={(room.mode === 'duel' || room.mode === 'box') && room.players.length < 2}
            >
              {room.mode === 'duel'
                ? t('room.startDuel')
                : room.mode === 'box'
                  ? t('room.startBox')
                  : t('room.startRace')}
            </button>
          ) : (
            <p className="flex flex-1 items-center justify-center text-sm text-cs-muted sm:justify-start">
              {t('room.waitingHost')}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  )
}
