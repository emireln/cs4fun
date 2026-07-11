import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { UserPlus, Swords, Users, Check, X, Trash2, UserRound } from 'lucide-react'
import { useI18n } from '../i18n'
import { useAuth } from '../lib/auth'
import ProfileAvatar from './ProfileAvatar'
import PublicProfileModal from './PublicProfileModal'
import {
  acceptFriendRequest,
  acceptInvite,
  cancelFriendRequest,
  declineFriendRequest,
  declineInvite,
  getFriendH2H,
  inviteFriendToMatch,
  listFriends,
  listIncomingInvites,
  listIncomingRequests,
  listOutgoingRequests,
  registerLocalPlayer,
  removeFriend,
  searchPlayersByTagLocalAware,
  sendFriendRequest,
  subscribeInvites,
} from '../lib/friends'
import { displayName } from '../lib/profile'

/**
 * Friends social panel — search, list, incoming/outgoing requests, match invites.
 * Used in Profile and Friends hub.
 */
export default function FriendsPanel({
  profile,
  onStart,
  onNeedAuth,
  showHeader = true,
  className = '',
  onPendingChange,
  onInviteSent,
}) {
  const { t } = useI18n()
  const { isAuthed } = useAuth()
  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState([])
  const [outgoing, setOutgoing] = useState([])
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
    const [f, r, out, inv] = await Promise.all([
      listFriends(profile.id),
      listIncomingRequests(profile.id),
      listOutgoingRequests(profile.id),
      listIncomingInvites(profile.id),
    ])
    setFriends(f)
    setRequests(r)
    setOutgoing(out)
    setInvites(inv)
    onPendingChange?.(r.length)

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
      refresh()
    }
  }

  const handleInvite = async (friend, mode) => {
    if (!onStart) return
    setBusy(true)
    setMsg('')
    const res = await inviteFriendToMatch({
      from: {
        ...profile,
        nickname: displayName(profile),
        avatarId: profile.avatarId,
        avatarUrl: profile.avatarUrl,
      },
      friend,
      mode,
    })
    setBusy(false)
    if (!res.ok) {
      setMsg(res.error || t('friends.inviteFail'))
      return
    }
    onInviteSent?.(friend.nickname)
    setMsg(t('friends.inviteSent', { name: friend.nickname }))
    onStart(res.room)
  }

  const handleAcceptInvite = async (invite) => {
    if (!onStart) return
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

  return (
    <div className={className}>
      {showHeader && (
        <>
          <h2 className="mb-1 font-display text-xl font-bold text-cs-gold sm:text-2xl">
            {t('friends.title')}
          </h2>
          <p className="mb-5 text-sm text-cs-muted">{t('friends.blurb')}</p>
        </>
      )}

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

      {invites.length > 0 && (
        <div className="mb-4 space-y-2">
          <h3 className="font-display text-[10px] tracking-[0.2em] text-cs-gold uppercase">
            {t('friends.invites')}
          </h3>
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
                  disabled={busy || !onStart}
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

      {requests.length > 0 && (
        <div className="mb-4 space-y-2">
          <h3 className="font-display text-[10px] tracking-[0.2em] text-cs-gold uppercase">
            {t('friends.requests')}
          </h3>
          {requests.map((req) => (
            <div
              key={req.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cs-border bg-cs-panel2/50 px-3 py-2"
            >
              <button
                type="button"
                className="flex min-w-0 items-center gap-2 text-left hover:text-cs-gold"
                onClick={() => setViewProfileId(req.fromId)}
              >
                <ProfileAvatar avatarId={req.avatarId} avatarUrl={req.avatarUrl} size="sm" />
                <span className="truncate text-sm font-semibold">{req.fromNick}</span>
              </button>
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

      {outgoing.length > 0 && (
        <div className="mb-4 space-y-2">
          <h3 className="font-display text-[10px] tracking-[0.2em] text-cs-gold uppercase">
            {t('friends.sentRequests')}
          </h3>
          {outgoing.map((req) => (
            <div
              key={req.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cs-border/70 bg-cs-bg/30 px-3 py-2"
            >
              <button
                type="button"
                className="flex min-w-0 items-center gap-2 text-left hover:text-cs-gold"
                onClick={() => setViewProfileId(req.toId)}
              >
                <ProfileAvatar avatarId={req.avatarId} avatarUrl={req.avatarUrl} size="sm" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{req.toNick}</div>
                  <div className="text-[10px] text-cs-muted">{t('friends.pending')}</div>
                </div>
              </button>
              <button
                type="button"
                className="btn-ghost rounded px-2.5 py-1 text-xs text-cs-loss"
                onClick={async () => {
                  await cancelFriendRequest({
                    profileId: profile.id,
                    requestId: req.id,
                    addresseeId: req.toId,
                  })
                  refresh()
                }}
              >
                {t('friends.cancelRequest')}
              </button>
            </div>
          ))}
        </div>
      )}

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
                <button
                  type="button"
                  className="flex min-w-0 items-center gap-2 text-left hover:text-cs-gold"
                  onClick={() => setViewProfileId(p.id)}
                >
                  <ProfileAvatar avatarId={p.avatarId} avatarUrl={p.avatarUrl} size="sm" />
                  <span className="truncate">{p.nickname}</span>
                </button>
                <button
                  type="button"
                  className="btn-gold rounded px-2.5 py-1 text-[10px] uppercase"
                  onClick={() => handleAdd(p)}
                >
                  {t('friends.add')}
                </button>
              </li>
            ))}
          </ul>
        )}
        {msg && <p className="mt-2 text-xs text-cs-gold">{msg}</p>}
      </div>

      <h3 className="mb-2 font-display text-[10px] tracking-[0.2em] text-cs-gold uppercase">
        {t('friends.list')} ({friends.length})
      </h3>
      {friends.length === 0 ? (
        <p className="panel rounded-xl p-6 text-center text-sm text-cs-muted">{t('friends.empty')}</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
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
                      {onStart && (
                        <>
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
                        </>
                      )}
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

function Stat({ label, value, accent = 'text-cs-gold' }) {
  return (
    <div className="rounded border border-cs-border bg-cs-bg/40 px-2 py-2">
      <div className={`font-mono text-lg font-bold ${accent}`}>{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-cs-muted">{label}</div>
    </div>
  )
}
