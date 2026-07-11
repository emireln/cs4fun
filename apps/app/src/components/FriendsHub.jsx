import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useI18n } from '../i18n'
import RoomLobby from './RoomLobby'
import FriendsPanel from './FriendsPanel'
import CountBadge from './CountBadge'
import { countIncomingFriendRequests } from '../lib/friends'

export default function FriendsHub({
  profile,
  initialMode = 'party',
  onBack,
  onStart,
  onNeedAuth,
  onInviteSent,
}) {
  const { t } = useI18n()
  const [tab, setTab] = useState('lobby') // lobby | friends
  const [friendRequestCount, setFriendRequestCount] = useState(0)

  useEffect(() => {
    let alive = true
    const refresh = async () => {
      const n = await countIncomingFriendRequests(profile.id)
      if (alive) setFriendRequestCount(n)
    }
    refresh()
    const id = setInterval(refresh, 8000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [profile.id])

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      <div className="mb-5 flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          className="btn-ghost inline-flex shrink-0 items-center gap-2 rounded px-3 py-2 text-sm"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" /> {t('nav.back')}
        </button>
        <div className="flex min-w-0 flex-1 gap-2 sm:max-w-md">
          <TabBtn active={tab === 'lobby'} onClick={() => setTab('lobby')}>
            {t('friends.tabLobby')}
          </TabBtn>
          <TabBtn active={tab === 'friends'} onClick={() => setTab('friends')}>
            {t('friends.tabFriends')}
            <CountBadge count={friendRequestCount} />
          </TabBtn>
        </div>
      </div>

      {/* Keep both mounted so lobby room state & layout survive tab switches */}
      <div className={tab === 'lobby' ? 'block' : 'hidden'} aria-hidden={tab !== 'lobby'}>
        <RoomLobby
          profile={profile}
          initialMode={initialMode}
          onBack={onBack}
          onStart={onStart}
          embedded
        />
      </div>
      <div className={tab === 'friends' ? 'block' : 'hidden'} aria-hidden={tab !== 'friends'}>
        <FriendsPanel
          profile={profile}
          onStart={onStart}
          onNeedAuth={onNeedAuth}
          onPendingChange={setFriendRequestCount}
          onInviteSent={onInviteSent}
        />
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-w-0 flex-1 items-center justify-center rounded border px-3 py-2.5 text-xs font-bold uppercase tracking-wider sm:px-4 ${
        active ? 'border-cs-gold bg-cs-gold/15 text-cs-gold' : 'border-cs-border text-cs-muted'
      }`}
    >
      {children}
    </button>
  )
}
