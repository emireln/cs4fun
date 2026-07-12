import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useI18n } from '../i18n'
import RoomLobby from './RoomLobby'
import FriendsPanel from './FriendsPanel'
import CountBadge from './CountBadge'
import { countIncomingFriendRequests } from '../lib/friends'

const NAV_BTN =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded border px-3 py-2.5 text-xs font-bold uppercase tracking-wider'

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
      {/* Same column as RoomLobby code card (max-w-3xl) so Back lines up with the panel */}
      <div className="mx-auto mb-5 flex w-full max-w-3xl items-stretch gap-2 sm:gap-3">
        <button type="button" className={`btn-ghost shrink-0 ${NAV_BTN}`} onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" /> {t('nav.back')}
        </button>
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
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
      className={`${NAV_BTN} w-full ${
        active ? 'border-cs-gold bg-cs-gold/15 text-cs-gold' : 'border-cs-border text-cs-muted'
      }`}
    >
      {children}
    </button>
  )
}
