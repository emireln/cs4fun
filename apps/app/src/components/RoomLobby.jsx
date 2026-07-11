import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Copy, Users, Swords } from 'lucide-react'
import { useI18n } from '../i18n'
import { createRoom, joinRoom, subscribeRoom, updateRoom } from '../lib/rooms'
import { displayName } from '../lib/profile'

export default function RoomLobby({ profile, initialMode = 'party', onBack, onStart, embedded = false }) {
  const { t } = useI18n()
  const [mode, setMode] = useState(initialMode === 'duel' ? 'duel' : 'party')
  const [room, setRoom] = useState(null)
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!room?.code) return undefined
    return subscribeRoom(room.code, (next) => setRoom({ ...next }))
  }, [room?.code])

  const ensureName = () => {
    if (!profile.nickname?.trim()) {
      setError(t('room.enterName'))
      return false
    }
    return true
  }

  const handleCreate = async () => {
    if (!ensureName()) return
    setError('')
    const res = await createRoom({
      profile: { ...profile, nickname: displayName(profile) },
      mode,
    })
    if (res.error) {
      const key = `room.${res.error}`
      const mapped = t(key)
      setError(mapped !== key ? mapped : res.error)
      return
    }
    setRoom(res.room)
  }

  const handleJoin = async () => {
    if (!ensureName()) return
    setError('')
    const res = await joinRoom({
      code: joinCode,
      profile: { ...profile, nickname: displayName(profile) },
    })
    if (res.error) {
      const key = `room.${res.error}`
      const mapped = t(key)
      setError(mapped !== key ? mapped : res.error)
      return
    }
    setRoom(res.room)
    setMode(res.room.mode)
  }

  const toggleReady = async () => {
    if (!room) return
    await updateRoom(room.code, (r) => ({
      ...r,
      players: r.players.map((p) =>
        p.id === profile.id ? { ...p, ready: !p.ready } : p,
      ),
    }))
  }

  const startGame = async () => {
    if (!room || room.hostId !== profile.id) return
    const next = await updateRoom(room.code, (r) => ({
      ...r,
      status: 'drafting',
      seed: r.seed || `${r.mode}-${r.code}-${Date.now()}`,
    }))
    onStart(next)
  }

  // Guests auto-forward when host starts; host already navigates via startGame
  useEffect(() => {
    if (room?.status === 'drafting' && room.hostId !== profile.id) onStart(room)
  }, [room?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  const copyCode = async () => {
    if (!room) return
    try {
      await navigator.clipboard.writeText(room.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  const shell = embedded ? 'w-full' : 'mx-auto w-full max-w-5xl px-4 py-8 sm:py-10'

  if (!room) {
    return (
      <div className={shell}>
        {!embedded && (
          <button type="button" className="btn-ghost mb-6 inline-flex items-center gap-2 rounded px-3 py-2 text-sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" /> {t('nav.back')}
          </button>
        )}
        <h1 className="mb-6 font-display text-3xl font-bold gold-text sm:text-4xl">{t('room.title')}</h1>

        <div className="mb-5 grid gap-3 sm:grid-cols-2">
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
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="panel space-y-4 rounded-xl p-5 sm:p-6">
            <h2 className="font-display text-xs font-bold tracking-[0.18em] text-cs-gold uppercase">
              {t('room.create')}
            </h2>
            <p className="text-sm text-cs-muted">{t('room.share')}</p>
            <button type="button" className="btn-gold w-full rounded py-3 text-sm uppercase tracking-wider" onClick={handleCreate}>
              {t('room.create')}
            </button>
          </div>
          <div className="panel space-y-4 rounded-xl p-5 sm:p-6">
            <h2 className="font-display text-xs font-bold tracking-[0.18em] text-cs-gold uppercase">
              {t('room.join')}
            </h2>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder={t('room.code')}
                maxLength={6}
                className="min-w-0 flex-1 rounded border border-cs-border bg-cs-bg/60 px-3 py-2.5 font-mono tracking-widest outline-none focus:border-cs-gold/50"
              />
              <button type="button" className="btn-ghost shrink-0 rounded px-5 py-2.5 text-sm" onClick={handleJoin}>
                {t('room.join')}
              </button>
            </div>
          </div>
        </div>
        {error && <p className="mt-4 text-sm text-cs-loss">{error}</p>}
      </div>
    )
  }

  const isHost = room.hostId === profile.id
  const me = room.players.find((p) => p.id === profile.id)

  return (
    <div className={shell}>
      {!embedded && (
        <button type="button" className="btn-ghost mb-6 inline-flex items-center gap-2 rounded px-3 py-2 text-sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> {t('room.leave')}
        </button>
      )}
      {embedded && (
        <button type="button" className="btn-ghost mb-4 inline-flex items-center gap-2 rounded px-3 py-2 text-sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> {t('room.leave')}
        </button>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel mx-auto max-w-3xl rounded-xl p-5 sm:p-8"
      >
        <p className="text-xs uppercase tracking-[0.25em] text-cs-muted">{t('room.share')}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <div className="min-w-0 font-display text-3xl font-bold tracking-[0.18em] text-cs-gold sm:text-5xl sm:tracking-[0.2em]">
            {room.code}
          </div>
          <button type="button" className="btn-ghost shrink-0 rounded px-3 py-2 text-sm" onClick={copyCode}>
            <Copy className="mr-1 inline h-3.5 w-3.5" />
            {copied ? t('room.copied') : t('room.copy')}
          </button>
        </div>
        <h3 className="mb-2 mt-8 font-display text-[10px] tracking-[0.2em] text-cs-gold uppercase">
          {t('room.players')} ({room.players.length}/{room.maxPlayers})
        </h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {room.players.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded border border-cs-border bg-cs-bg/40 px-3 py-2.5 text-sm"
            >
              <span>
                {p.nickname}
                {p.isHost ? ` · ${t('room.host')}` : ''}
                {p.id === profile.id ? ` (${t('room.you')})` : ''}
              </span>
              <span className={p.ready ? 'text-cs-win' : 'text-cs-muted'}>
                {p.ready ? t('room.ready') : t('room.notReady')}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button type="button" className="btn-ghost flex-1 rounded py-2.5 text-sm" onClick={toggleReady}>
            {me?.ready ? t('room.notReady') : t('room.ready')}
          </button>
          {isHost ? (
            <button
              type="button"
              className="btn-gold flex-1 rounded py-3 text-sm uppercase tracking-wider"
              onClick={startGame}
              disabled={room.mode === 'duel' && room.players.length < 2}
            >
              {room.mode === 'duel' ? t('room.startDuel') : t('room.startRace')}
            </button>
          ) : (
            <p className="flex-1 text-center text-sm text-cs-muted sm:text-left">{t('room.waitingHost')}</p>
          )}
        </div>
      </motion.div>
    </div>
  )
}
