import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, UserPlus, Swords, Users, Check, X, Trash2, UserRound } from 'lucide-react'
import { useI18n } from '../i18n'
import { useAuth } from '../lib/auth'
import ProfileAvatar from './ProfileAvatar'
import PublicProfileModal from './PublicProfileModal'
import RoomLobby from './RoomLobby'
import {
  acceptFriendRequest,
  acceptInvite,
  declineFriendRequest,
  declineInvite,
  getFriendH2H,
  inviteFriendToMatch,
  listFriends,
  listIncomingInvites,
  listIncomingRequests,
  registerLocalPlayer,
  removeFriend,
  searchPlayersByTagLocalAware,
  sendFriendRequest,
  subscribeInvites,
} from '../lib/friends'
import { displayName } from '../lib/profile'

export default function FriendsHub({ profile, initialMode = 'party', onBack, onStart, onNeedAuth }) {
  const { t } = useI18n()
  const { isAuthed } = useAuth()
  const [tab, setTab] = useState('lobby') // lobby | friends
  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState([])
  const [invites, setInvites] = useState([])
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [msg, setMsg] = useState('')
  const [h2h, setH2h] = useState({})
  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState(false)
  const [viewProfileId, setViewProfileId] = useState(null)

  const refresh = async () => {
    registerLocalPlayer({ ...profile, nickname: displayName(profile) })
    const [f, r, inv] = await Promise.all([
      listFriends(profile.id),
      listIncomingRequests(profile.id),
      listIncomingInvites(profile.id),
    ])
    setFriends(f)
    setRequests(r)
    setInvites(inv)

    const stats = {}
    await Promise.all(
      f.map(async (friend) => {
        stats[friend.id] = await getFriendH2H(profile.id, friend.id)
      }),
    )
    setH2h(stats)
  }

  useEffect(() => {
    refresh()
  }, [profile.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return subscribeInvites(profile.id, (inv) => {
      setInvites((prev) => {
        if (prev.some((p) => p.id === inv.id || p.roomCode === inv.roomCode)) return prev
        return [{ ...inv, fromNick: inv.fromNick || 'Friend' }, ...prev]
      })
    })
  }, [profile.id])

  useEffect(() => {
    if (search.trim().length < 2) {
      setResults([])
      return undefined
    }
    const id = setTimeout(async () => {
      const list = await searchPlayersByTagLocalAware(search, { excludeId: profile.id })
      setResults(list)
    }, 280)
    return () => clearTimeout(id)
  }, [search, profile.id])

  const handleAdd = async (player) => {
    setMsg('')
    const res = await sendFriendRequest({
      from: { id: profile.id, nickname: displayName(profile) },
      to: player,
    })
    if (res.error === 'exists') setMsg(t('friends.already'))
    else if (res.error) setMsg(res.error)
    else {
      setMsg(t('friends.requestSent'))
      setSearch('')
      setResults([])
    }
  }

  const handleInvite = async (friend, mode) => {
    setBusy(true)
    setMsg('')
    const res = await inviteFriendToMatch({
      from: { ...profile, nickname: displayName(profile) },
      friend,
      mode,
    })
    setBusy(false)
    if (!res.ok) {
      setMsg(res.error || t('friends.inviteFail'))
      return
    }
    setMsg(t('friends.inviteSent', { name: friend.nickname }))
    onStart(res.room)
  }

  const handleAcceptInvite = async (invite) => {
    setBusy(true)
    const res = await acceptInvite({
      profile: { ...profile, nickname: displayName(profile) },
      invite,
    })
    setBusy(false)
    if (res.error) {
      setMsg(t(`room.${res.error}`) !== `room.${res.error}` ? t(`room.${res.error}`) : res.error)
      return
    }
    onStart(res.room)
  }

  if (tab === 'lobby') {
    return (
      <div>
        <div className="mx-auto max-w-lg px-4 pt-6">
          <div className="mb-4 flex gap-2">
            <TabBtn active onClick={() => setTab('lobby')}>
              {t('friends.tabLobby')}
            </TabBtn>
            <TabBtn active={false} onClick={() => setTab('friends')}>
              {t('friends.tabFriends')}
            </TabBtn>
          </div>
        </div>
        <RoomLobby
          profile={profile}
          initialMode={initialMode}
          onBack={onBack}
          onStart={onStart}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <button type="button" className="btn-ghost mb-4 inline-flex items-center gap-2 rounded px-3 py-2 text-sm" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" /> {t('nav.back')}
      </button>

      <div className="mb-4 flex gap-2">
        <TabBtn active={false} onClick={() => setTab('lobby')}>
          {t('friends.tabLobby')}
        </TabBtn>
        <TabBtn active onClick={() => setTab('friends')}>
          {t('friends.tabFriends')}
        </TabBtn>
      </div>

      <h1 className="mb-1 font-display text-3xl font-bold gold-text">{t('friends.title')}</h1>
      <p className="mb-5 text-sm text-cs-muted">{t('friends.blurb')}</p>

      {!isAuthed && (
        <div className="panel mb-4 rounded-xl px-4 py-3 text-sm text-cs-muted">
          {t('friends.guestHint')}{' '}
          {onNeedAuth && (
            <button type="button" className="text-cs-gold underline" onClick={onNeedAuth}>
              {t('nav.signIn')}
            </button>
          )}
        </div>
      )}

      {/* Incoming match invites */}
      {invites.length > 0 && (
        <div className="mb-4 space-y-2">
          <h2 className="font-display text-[10px] tracking-[0.2em] text-cs-gold uppercase">
            {t('friends.invites')}
          </h2>
          {invites.map((inv) => (
            <motion.div
              key={inv.id || inv.roomCode}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="panel flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3"
            >
              <div>
                <div className="text-sm font-semibold text-cs-text">
                  {inv.fromNick} · {t(`modes.${inv.mode}.title`)}
                </div>
                <div className="text-xs text-cs-muted">{t('friends.inviteYou')}</div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  className="btn-gold rounded px-3 py-1.5 text-xs"
                  onClick={() => handleAcceptInvite(inv)}
                >
                  <Check className="mr-1 inline h-3.5 w-3.5" />
                  {t('friends.accept')}
                </button>
                <button
                  type="button"
                  className="btn-ghost rounded px-3 py-1.5 text-xs"
                  onClick={async () => {
                    await declineInvite({ profileId: profile.id, invite: inv })
                    setInvites((prev) => prev.filter((i) => i.id !== inv.id))
                  }}
                >
                  <X className="inline h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Friend requests */}
      {requests.length > 0 && (
        <div className="mb-4 space-y-2">
          <h2 className="font-display text-[10px] tracking-[0.2em] text-cs-gold uppercase">
            {t('friends.requests')}
          </h2>
          {requests.map((req) => (
            <div
              key={req.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cs-border bg-cs-panel2/50 px-3 py-2"
            >
              <span className="min-w-0 truncate text-sm font-semibold">{req.fromNick}</span>
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  className="btn-gold rounded px-2.5 py-1 text-xs"
                  onClick={async () => {
                    await acceptFriendRequest({
                      profileId: profile.id,
                      requestId: req.id,
                      requesterId: req.fromId,
                    })
                    refresh()
                  }}
                >
                  {t('friends.accept')}
                </button>
                <button
                  type="button"
                  className="btn-ghost rounded px-2.5 py-1 text-xs"
                  onClick={async () => {
                    await declineFriendRequest({
                      profileId: profile.id,
                      requestId: req.id,
                      requesterId: req.fromId,
                    })
                    refresh()
                  }}
                >
                  {t('friends.decline')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add friend */}
      <div className="panel mb-4 rounded-xl p-4">
        <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-cs-muted">
          <UserPlus className="h-3.5 w-3.5" />
          {t('friends.addByTag')}
        </label>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('friends.searchPlaceholder')}
          className="w-full rounded border border-cs-border bg-cs-bg/60 px-3 py-2 text-sm outline-none focus:border-cs-gold/50"
        />
        {results.length > 0 && (
          <ul className="mt-2 space-y-1">
            {results.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded border border-cs-border/60 px-2 py-1.5 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    className="flex min-w-0 items-center gap-2 text-left hover:text-cs-gold"
                    onClick={() => setViewProfileId(p.id)}
                  >
                    <ProfileAvatar avatarId={p.avatarId} avatarUrl={p.avatarUrl} size="sm" />
                    <span className="truncate">{p.nickname}</span>
                  </button>
                </span>
                <button type="button" className="btn-gold rounded px-2.5 py-1 text-[10px] uppercase" onClick={() => handleAdd(p)}>
                  {t('friends.add')}
                </button>
              </li>
            ))}
          </ul>
        )}
        {msg && <p className="mt-2 text-xs text-cs-gold">{msg}</p>}
      </div>

      {/* Friends list */}
      <h2 className="mb-2 font-display text-[10px] tracking-[0.2em] text-cs-gold uppercase">
        {t('friends.list')} ({friends.length})
      </h2>
      {friends.length === 0 ? (
        <p className="panel rounded-xl p-6 text-center text-sm text-cs-muted">{t('friends.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {friends.map((friend) => {
            const stats = h2h[friend.id] || { matches: 0, wins: 0, losses: 0 }
            const open = selected === friend.id
            return (
              <li key={friend.id} className="panel overflow-hidden rounded-xl">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-3 py-3 text-left"
                  onClick={() => setSelected(open ? null : friend.id)}
                >
                  <ProfileAvatar avatarId={friend.avatarId} avatarUrl={friend.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-cs-text">{friend.nickname}</div>
                    <div className="text-[11px] text-cs-muted">
                      {t('friends.h2hShort', {
                        m: stats.matches,
                        w: stats.wins,
                        l: stats.losses,
                      })}
                    </div>
                  </div>
                </button>
                {open && (
                  <div className="space-y-3 border-t border-cs-border px-3 py-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <Stat label={t('friends.matches')} value={stats.matches} />
                      <Stat label={t('friends.wins')} value={stats.wins} accent="text-cs-win" />
                      <Stat label={t('friends.losses')} value={stats.losses} accent="text-cs-loss" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-ghost inline-flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-2 text-xs uppercase tracking-wider"
                        onClick={() => setViewProfileId(friend.id)}
                      >
                        <UserRound className="h-3.5 w-3.5" />
                        {t('friends.viewProfile')}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="btn-gold inline-flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-2 text-xs uppercase tracking-wider"
                        onClick={() => handleInvite(friend, 'duel')}
                      >
                        <Swords className="h-3.5 w-3.5" />
                        {t('friends.inviteDuel')}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="btn-ghost inline-flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-2 text-xs uppercase tracking-wider"
                        onClick={() => handleInvite(friend, 'party')}
                      >
                        <Users className="h-3.5 w-3.5" />
                        {t('friends.inviteParty')}
                      </button>
                      <button
                        type="button"
                        className="btn-ghost rounded px-3 py-2 text-cs-loss"
                        title={t('friends.remove')}
                        onClick={async () => {
                          await removeFriend({ profileId: profile.id, friendId: friend.id })
                          setSelected(null)
                          refresh()
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {viewProfileId && (
        <PublicProfileModal
          userId={viewProfileId}
          viewerId={profile.id}
          onClose={() => setViewProfileId(null)}
        />
      )}
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded border px-3 py-2 text-xs font-bold uppercase tracking-wider ${
        active ? 'border-cs-gold bg-cs-gold/15 text-cs-gold' : 'border-cs-border text-cs-muted'
      }`}
    >
      {children}
    </button>
  )
}

function Stat({ label, value, accent = 'text-cs-gold' }) {
  return (
    <div className="rounded border border-cs-border bg-cs-bg/40 px-2 py-2">
      <div className={`font-mono text-lg font-bold ${accent}`}>{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-cs-muted">{label}</div>
    </div>
  )
}
