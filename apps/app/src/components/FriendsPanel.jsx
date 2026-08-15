import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { UserPlus, Swords, Users, Check, X, Trash2, UserRound, Package } from 'lucide-react'
import { useI18n } from '../i18n'
import { useAuth } from '../lib/auth'
import ProfileAvatar from './ProfileAvatar'
import PublicProfileModal from './PublicProfileModal'
import BestDropCard from './BestDropCard'
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
  subscribeGraphPings,
  subscribeInvites,
} from '../lib/friends'
import { displayName } from '../lib/profile'
import { readBoxStats } from '../lib/boxBattle'
import { fetchPublicProfile } from '../lib/publicProfile'
import { fetchUserStats } from '../lib/history'
import { getFriendWeekBoard } from '../lib/friendWeek'
import { createClan, joinClan, leaveClan, getMyClan } from '../lib/clans'

function pickBestDrop(...candidates) {
  return candidates
    .filter(Boolean)
    .reduce((best, drop) => {
      if (!best) return drop
      return Number(drop.value) > Number(best.value) ? drop : best
    }, null)
}

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
  const { t, money } = useI18n()
  const { isAuthed } = useAuth()
  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState([])
  const [outgoing, setOutgoing] = useState([])
  const [invites, setInvites] = useState([])
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [msg, setMsg] = useState('')
  const [h2h, setH2h] = useState({})
  const [friendDrops, setFriendDrops] = useState({})
  const [myBestDrop, setMyBestDrop] = useState(() => readBoxStats(profile?.id)?.bestDrop || null)
  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState(false)
  const [viewProfileId, setViewProfileId] = useState(null)
  const [clanTag, setClanTag] = useState('')
  const [myClan, setMyClan] = useState(() => getMyClan(profile?.id))
  const [clanMsg, setClanMsg] = useState('')

  const refresh = async () => {
    registerLocalPlayer({ ...profile, nickname: displayName(profile) })
    const [f, r, out, inv, mine] = await Promise.all([
      listFriends(profile.id),
      listIncomingRequests(profile.id),
      listOutgoingRequests(profile.id),
      listIncomingInvites(profile.id),
      fetchUserStats(profile.id).catch(() => null),
    ])
    if (!aliveRef.current) return
    setFriends(f)
    setRequests(r)
    setOutgoing(out)
    setInvites(inv)
    onPendingChange?.(r.length)
    setMyBestDrop(pickBestDrop(mine?.best_drop, readBoxStats(profile.id)?.bestDrop))

    const stats = {}
    const drops = {}
    await Promise.allSettled(
      f.map(async (friend) => {
        const [h2h, pub] = await Promise.all([
          getFriendH2H(profile.id, friend.id).catch(() => null),
          fetchPublicProfile(friend.id, { viewerId: profile.id }).catch(() => null),
        ])
        if (!aliveRef.current) return
        stats[friend.id] = h2h
        drops[friend.id] = pickBestDrop(readBoxStats(friend.id)?.bestDrop, pub?.bestDrop)
      }),
    )
    if (!aliveRef.current) return
    setH2h((prev) => ({ ...prev, ...stats }))
    setFriendDrops((prev) => ({ ...prev, ...drops }))
    setMyClan(getMyClan(profile.id))
  }

  const aliveRef = useRef(true)
  useEffect(() => {
    aliveRef.current = true
    refresh()
    return () => {
      aliveRef.current = false
    }
  }, [profile.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return subscribeInvites(profile.id, (inv) => {
      setInvites((prev) => {
        if (prev.some((p) => p.id === inv.id || p.roomCode === inv.roomCode)) return prev
        return [{ ...inv, fromNick: inv.fromNick || 'Friend' }, ...prev]
      })
    })
  }, [profile.id])

  // Same-browser guest graph changes (requests accepted/declined elsewhere) refresh live.
  useEffect(() => {
    return subscribeGraphPings(() => refresh())
  }, [profile.id]) // eslint-disable-line react-hooks/exhaustive-deps

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
    else if (res.error === 'auth_required') setMsg(t('friends.addAuthRequired'))
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

  const friendWeek = getFriendWeekBoard(profile.id, friends)

  const handleClanAction = (action) => {
    setClanMsg('')
    const tag = clanTag.trim()
    const res =
      action === 'create'
        ? createClan(profile.id, displayName(profile), tag)
        : action === 'join'
          ? joinClan(profile.id, displayName(profile), tag)
          : leaveClan(profile.id)
    if (res?.error) {
      setClanMsg(t(`clans.errors.${res.error}`))
      return
    }
    setClanTag('')
    setMyClan(getMyClan(profile.id))
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

      <div className="panel mb-4 rounded-xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-cs-gold">
              {t('clans.title')}
            </h3>
            <p className="mt-1 text-xs text-cs-muted">{t('clans.blurb')}</p>
          </div>
          {myClan ? (
            <div className="text-right">
              <div className="font-display text-lg font-bold text-cs-gold">[{myClan.tag}]</div>
              <div className="text-[10px] text-cs-muted">
                {t('clans.members')}: {myClan.members?.length || 0}/5
              </div>
            </div>
          ) : null}
        </div>
        {myClan ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1 truncate text-xs text-cs-muted">
              {(myClan.members || []).map((m) => m.nickname).join(' · ')}
            </div>
            <button
              type="button"
              className="btn-ghost rounded px-3 py-1.5 text-[10px] uppercase text-cs-loss"
              onClick={() => handleClanAction('leave')}
            >
              {t('clans.leave')}
            </button>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={clanTag}
              onChange={(e) => setClanTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))}
              placeholder={t('clans.tagPlaceholder')}
              maxLength={5}
              className="min-w-0 flex-1 rounded border border-cs-border bg-cs-bg/60 px-3 py-2 font-mono text-sm tracking-widest outline-none focus:border-cs-gold/50"
            />
            <button type="button" className="btn-gold rounded px-4 py-2 text-xs uppercase" onClick={() => handleClanAction('create')}>
              {t('clans.create')}
            </button>
            <button type="button" className="btn-ghost rounded px-4 py-2 text-xs uppercase" onClick={() => handleClanAction('join')}>
              {t('clans.join')}
            </button>
          </div>
        )}
        {clanMsg && <p className="mt-2 text-xs text-cs-gold">{clanMsg}</p>}
      </div>

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
      <div className="panel mb-4 rounded-xl p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-cs-gold">
            {t('friends.friendWeekTitle')}
          </h3>
          <span className="font-mono text-[10px] text-cs-muted">{friendWeek.week}</span>
        </div>
        {friendWeek.rows.some((row) => row.points > 0) ? (
          <ul className="space-y-1.5">
            {friendWeek.rows.slice(0, 5).map((row, i) => (
              <li
                key={row.id}
                className="flex items-center justify-between rounded border border-cs-border/60 bg-cs-bg/30 px-2.5 py-1.5 text-xs"
              >
                <span className="truncate">
                  #{i + 1} {row.nickname}
                </span>
                <span className="font-mono text-cs-gold">{t('friends.friendWeekPoints', { n: row.points })}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-cs-muted">{t('friends.friendWeekEmpty')}</p>
        )}
      </div>
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
                    <div>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-cs-gold">
                        {t('friends.boxDropDuel')}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <BestDropCard
                          drop={myBestDrop}
                          title={t('friends.yourBestDrop')}
                          emptyLabel={t('box.noBestDrop')}
                          compact
                        />
                        <BestDropCard
                          drop={friendDrops[friend.id] || null}
                          title={t('friends.theirBestDrop')}
                          emptyLabel={t('box.noBestDrop')}
                          compact
                        />
                      </div>
                      {myBestDrop && friendDrops[friend.id] && (
                        <p className="mt-2 text-center text-[11px] text-cs-muted">
                          {Number(myBestDrop.value) === Number(friendDrops[friend.id].value)
                            ? t('friends.boxDropTie')
                            : Number(myBestDrop.value) > Number(friendDrops[friend.id].value)
                              ? t('friends.boxDropYouLead', {
                                  value: money(myBestDrop.value),
                                })
                              : t('friends.boxDropTheyLead', {
                                  value: money(friendDrops[friend.id].value),
                                })}
                        </p>
                      )}
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
                            onClick={() => handleInvite(friend, 'box')}
                          >
                            <Package className="h-3.5 w-3.5" />
                            {t('friends.inviteBox')}
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
