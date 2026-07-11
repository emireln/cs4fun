import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useI18n } from '../i18n'
import RoomLobby from './RoomLobby'
import FriendsPanel from './FriendsPanel'

export default function FriendsHub({ profile, initialMode = 'party', onBack, onStart, onNeedAuth }) {
  const { t } = useI18n()
  const [tab, setTab] = useState('lobby') // lobby | friends

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-ghost inline-flex items-center gap-2 rounded px-3 py-2 text-sm"
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
          </TabBtn>
        </div>
      </div>

      {tab === 'lobby' ? (
        <RoomLobby
          profile={profile}
          initialMode={initialMode}
          onBack={onBack}
          onStart={onStart}
          embedded
        />
      ) : (
        <FriendsPanel profile={profile} onStart={onStart} onNeedAuth={onNeedAuth} />
      )}
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-0 flex-1 rounded border px-3 py-2.5 text-xs font-bold uppercase tracking-wider sm:px-4 ${
        active ? 'border-cs-gold bg-cs-gold/15 text-cs-gold' : 'border-cs-border text-cs-muted'
      }`}
    >
      {children}
    </button>
  )
}
