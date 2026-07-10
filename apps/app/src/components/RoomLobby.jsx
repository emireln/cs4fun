import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Copy, Users, Swords } from 'lucide-react'
import { useI18n } from '../i18n'
import { createRoom, joinRoom, subscribeRoom, updateRoom } from '../lib/rooms'
import { displayName } from '../lib/profile'

export default function RoomLobby({ profile, initialMode = 'party', onBack, onStart }) {
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
      setError(t(`room.${res.error}`) || res.error)
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
      setError(t(`room.${res.error}`))
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

  if (!room) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <button type="button" className="btn-ghost mb-6 inline-flex items-center gap-2 rounded px-3 py-2 text-sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> {t('nav.back')}
        </button>
        <h1 className="mb-6 font-display text-3xl font-bold gold-text">{t('room.title')}</h1>

        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setMode('party')}
            className={`flex-1 rounded border px-3 py-3 text-sm font-bold ${
              mode === 'party' ? 'border-cs-gold bg-cs-gold/15 text-cs-gold' : 'border-cs-border'
            }`}
          >
            <Users className="mx-auto mb-1 h-4 w-4" />
            {t('modes.party.title')}
          </button>
          <button
            type="button"
            onClick={() => setMode('duel')}
            className={`flex-1 rounded border px-3 py-3 text-sm font-bold ${
              mode === 'duel' ? 'border-cs-gold bg-cs-gold/15 text-cs-gold' : 'border-cs-border'
            }`}
          >
            <Swords className="mx-auto mb-1 h-4 w-4" />
            {t('modes.duel.title')}
          </button>
        </div>

        <div className="panel space-y-4 rounded-xl p-5">
          <button type="button" className="btn-gold w-full rounded py-3 text-sm uppercase tracking-wider" onClick={handleCreate}>
            {t('room.create')}
          </button>
          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder={t('room.code')}
              maxLength={6}
              className="flex-1 rounded border border-cs-border bg-cs-bg/60 px-3 py-2 font-mono tracking-widest outline-none focus:border-cs-gold/50"
            />
            <button type="button" className="btn-ghost rounded px-4 py-2 text-sm" onClick={handleJoin}>
              {t('room.join')}
            </button>
          </div>
          {error && <p className="text-sm text-cs-loss">{error}</p>}
        </div>
      </div>
    )
  }

  const isHost = room.hostId === profile.id
  const me = room.players.find((p) => p.id === profile.id)

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <button type="button" className="btn-ghost mb-6 inline-flex items-center gap-2 rounded px-3 py-2 text-sm" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" /> {t('room.leave')}
      </button>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="panel rounded-xl p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-cs-muted">{t('room.share')}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <div className="min-w-0 font-display text-2xl font-bold tracking-[0.18em] text-cs-gold sm:text-4xl sm:tracking-[0.2em]">
            {room.code}
          </div>
          <button type="button" className="btn-ghost shrink-0 rounded px-3 py-2 text-sm" onClick={copyCode}>
            <Copy className="mr-1 inline h-3.5 w-3.5" />
            {copied ? t('room.copied') : t('room.copy')}
          </button>
        </div>
        <h3 className="mb-2 mt-6 font-display text-[10px] tracking-[0.2em] text-cs-gold uppercase">
          {t('room.players')} ({room.players.length}/{room.maxPlayers})
        </h3>
        <ul className="space-y-2">
          {room.players.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded border border-cs-border bg-cs-bg/40 px-3 py-2 text-sm"
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

        <div className="mt-6 flex flex-col gap-2">
          <button type="button" className="btn-ghost rounded py-2.5 text-sm" onClick={toggleReady}>
            {me?.ready ? t('room.notReady') : t('room.ready')}
          </button>
          {isHost ? (
            <button
              type="button"
              className="btn-gold rounded py-3 text-sm uppercase tracking-wider"
              onClick={startGame}
              disabled={room.mode === 'duel' && room.players.length < 2}
            >
              {room.mode === 'duel' ? t('room.startDuel') : t('room.startRace')}
            </button>
          ) : (
            <p className="text-center text-sm text-cs-muted">{t('room.waitingHost')}</p>
          )}
        </div>
      </motion.div>
    </div>
  )
}
