import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Coffee } from 'lucide-react'
import { I18nProvider, useI18n } from './i18n'
import { AuthProvider, useAuth } from './lib/auth'
import { unlockAudio } from './lib/sound'
import {
  acceptInvite,
  declineInvite,
  listIncomingInvites,
  subscribeInvites,
} from './lib/friends'
import { displayName } from './lib/profile'
import StatusBar from './components/StatusBar'
import HomeHub from './components/HomeHub'
import LeaderboardPanel from './components/LeaderboardPanel'
import ProfilePage from './components/ProfilePage'
import AuthModal from './components/AuthModal'
import FriendsHub from './components/FriendsHub'
import PublicProfileModal from './components/PublicProfileModal'
import AdminShell from './components/admin/AdminShell'
import BannedScreen from './components/admin/BannedScreen'
import MajorGame from './components/modes/MajorGame'
import DuelGame from './components/modes/DuelGame'
import PartyGame from './components/modes/PartyGame'
import DailyGame from './components/modes/DailyGame'
import GauntletGame from './components/modes/GauntletGame'
import BoxGame from './components/modes/BoxGame'
import DesktopUpdateOverlay from './components/DesktopUpdateOverlay'
import LogoMark from './components/LogoMark'
import MatchInvitePopup from './components/MatchInvitePopup'
import AppToast from './components/AppToast'
import ConnectionLostModal from './components/ConnectionLostModal'
import { useOnlineStatus } from './hooks/useOnlineStatus'

function AppShell() {
  const { t } = useI18n()
  const { profile, loading, isAdmin, isBanned, isAuthed } = useAuth()
  const [screen, setScreen] = useState('hub')
  const [room, setRoom] = useState(null)
  const [friendsMode, setFriendsMode] = useState('party')
  const [status, setStatus] = useState({ phase: 'hub' })
  const [authOpen, setAuthOpen] = useState(false)
  const [peekProfileId, setPeekProfileId] = useState(null)
  const [incomingInvite, setIncomingInvite] = useState(null)
  const [inviteBusy, setInviteBusy] = useState(false)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const seenInviteKeys = useRef(new Set())
  const historyRef = useRef([])
  const navSnapshot = useRef({
    screen: 'hub',
    room: null,
    friendsMode: 'party',
    status: { phase: 'hub' },
  })

  useEffect(() => {
    navSnapshot.current = { screen, room, friendsMode, status }
  }, [screen, room, friendsMode, status])

  const { online } = useOnlineStatus()
  const [offlineDismissed, setOfflineDismissed] = useState(false)

  useEffect(() => {
    if (online) setOfflineDismissed(false)
  }, [online])

  const showToast = useCallback((message) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = setTimeout(() => setToast(null), 2800)
  }, [])

  const goHome = useCallback(() => {
    historyRef.current = []
    setScreen('hub')
    setRoom(null)
    setStatus({ phase: 'hub' })
  }, [])

  const goBack = useCallback(() => {
    const prev = historyRef.current.pop()
    if (!prev) {
      goHome()
      return
    }
    setScreen(prev.screen)
    setRoom(prev.room ?? null)
    if (prev.friendsMode) setFriendsMode(prev.friendsMode)
    setStatus(
      prev.status ?? {
        phase: prev.screen === 'hub' ? 'hub' : prev.screen,
        gameMode: ['major', 'duel', 'party', 'daily', 'gauntlet', 'box'].includes(prev.screen)
          ? prev.screen
          : undefined,
      },
    )
  }, [goHome])

  const navigateTo = useCallback((next) => {
    const cur = navSnapshot.current
    const nextScreen = next.screen ?? cur.screen
    const nextRoom = 'room' in next ? next.room : cur.room
    const screenChanged = nextScreen !== cur.screen
    const roomChanged = (nextRoom?.code || null) !== (cur.room?.code || null)
    if (screenChanged || roomChanged) {
      historyRef.current.push({
        screen: cur.screen,
        room: cur.room,
        friendsMode: cur.friendsMode,
        status: cur.status,
      })
      if (historyRef.current.length > 30) historyRef.current.shift()
    }
    if (next.screen != null) setScreen(next.screen)
    if ('room' in next) setRoom(next.room)
    if (next.friendsMode != null) setFriendsMode(next.friendsMode)
    if (next.status != null) setStatus(next.status)
  }, [])

  const startMatchRoom = useCallback(
    (startedRoom) => {
      if (!startedRoom) return
      const screen =
        startedRoom.mode === 'duel' ? 'duel' : startedRoom.mode === 'box' ? 'box' : 'party'
      navigateTo({
        screen,
        room: startedRoom,
        status: { phase: 'setup', gameMode: startedRoom.mode },
      })
    },
    [navigateTo],
  )

  const openFriends = useCallback(
    (mode = 'party') => {
      const friendsMode = mode === 'duel' ? 'duel' : mode === 'box' ? 'box' : 'party'
      navigateTo({
        screen: 'friends',
        friendsMode,
        room: null,
        status: { phase: 'friends' },
      })
    },
    [navigateTo],
  )

  const openMode = useCallback(
    (modeId) => {
      navigateTo({
        screen: modeId,
        room: null,
        status: { phase: 'setup', gameMode: modeId },
      })
    },
    [navigateTo],
  )

  const pushIncomingInvite = useCallback(
    (inv) => {
      if (!inv || !profile?.id) return
      if (String(inv.fromId) === String(profile.id)) return
      const key = String(inv.id ?? inv.roomCode)
      if (!key || seenInviteKeys.current.has(key)) return
      seenInviteKeys.current.add(key)
      setIncomingInvite((prev) => prev || inv)
    },
    [profile?.id],
  )

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const p = params.get('p')
      if (p) setPeekProfileId(p)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => {
    if (!profile?.id || loading) return undefined
    let alive = true
    listIncomingInvites(profile.id).then((list) => {
      if (!alive || !list?.length) return
      pushIncomingInvite(list[0])
    })
    const unsub = subscribeInvites(profile.id, (inv) => {
      if (alive) pushIncomingInvite(inv)
    })
    return () => {
      alive = false
      unsub()
    }
  }, [profile?.id, loading, pushIncomingInvite])

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    },
    [],
  )

  const handleAcceptInvite = useCallback(
    async (invite) => {
      if (!invite || !profile) return
      setInviteBusy(true)
      const res = await acceptInvite({
        profile: { ...profile, nickname: displayName(profile) },
        invite,
      })
      setInviteBusy(false)
      if (res.error) {
        const mapped = t(`room.${res.error}`)
        showToast(mapped !== `room.${res.error}` ? mapped : res.error)
        setIncomingInvite(null)
        return
      }
      setIncomingInvite(null)
      startMatchRoom(res.room)
    },
    [profile, showToast, startMatchRoom, t],
  )

  const handleDeclineInvite = useCallback(
    async (invite) => {
      if (!invite || !profile) {
        setIncomingInvite(null)
        return
      }
      setIncomingInvite(null)
      await declineInvite({ profileId: profile.id, invite })
    },
    [profile],
  )

  if (loading) {
    return (
      <div className="carbon-bg flex min-h-dvh items-center justify-center overflow-x-clip">
        <p className="font-display text-xs tracking-[0.25em] text-cs-muted uppercase">{t('admin.loading')}</p>
      </div>
    )
  }

  if (isAuthed && isBanned) {
    return <BannedScreen />
  }

  if (isAuthed && isAdmin) {
    return <AdminShell />
  }

  const quietPhase = ['hub', 'leaderboard', 'friends', 'history', 'setup', 'profile'].includes(
    status.phase || (screen === 'hub' ? 'hub' : screen),
  )
  const showFooter = ['hub', 'leaderboard', 'friends', 'profile'].includes(screen)
  const mobileStatsPad =
    !quietPhase &&
    (status.wins != null || status.losses != null || status.stage || status.mapPriority || status.extra)

  return (
    <div
      className={`carbon-bg flex min-h-dvh flex-col overflow-x-clip sm:pt-[calc(120px+env(safe-area-inset-top,0px))] ${
        mobileStatsPad
          ? 'pt-[calc(140px+env(safe-area-inset-top,0px))]'
          : 'pt-[calc(108px+env(safe-area-inset-top,0px))]'
      }`}
    >
      <StatusBar
        wins={status.wins}
        losses={status.losses}
        stage={status.stage}
        mode={status.mode}
        mentality={status.mentality}
        mapPriority={status.mapPriority}
        rerolls={status.rerolls}
        phase={status.phase || (screen === 'hub' ? 'hub' : screen)}
        gameMode={
          status.gameMode ||
          (['major', 'duel', 'party', 'daily', 'gauntlet', 'box'].includes(screen) ? screen : null)
        }
        extra={status.extra}
        onHome={goHome}
        onOpenLeaderboard={() => {
          navigateTo({ screen: 'leaderboard', status: { phase: 'leaderboard' } })
        }}
        onOpenProfile={() => {
          navigateTo({ screen: 'profile', status: { phase: 'hub' } })
        }}
        onNeedAuth={() => setAuthOpen(true)}
      />

      <AnimatePresence mode="wait">
        <motion.main
          key={screen + (room?.code || '')}
          className={showFooter ? 'flex min-h-0 flex-1 flex-col' : 'min-h-0'}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {screen === 'hub' && (
            <HomeHub
              onSelectMode={openMode}
              onOpenFriends={() => openFriends('party')}
            />
          )}

          {screen === 'leaderboard' && (
            <LeaderboardPanel
              profile={profile}
              onBack={goBack}
              onNeedAuth={() => setAuthOpen(true)}
            />
          )}

          {screen === 'profile' && (
            <ProfilePage
              onBack={goBack}
              onNeedAuth={() => setAuthOpen(true)}
              onStartMatch={startMatchRoom}
              onInviteSent={(name) => showToast(t('friends.inviteSent', { name }))}
            />
          )}

          {screen === 'friends' && (
            <FriendsHub
              profile={profile}
              initialMode={friendsMode}
              onBack={goBack}
              onNeedAuth={() => setAuthOpen(true)}
              onStart={startMatchRoom}
              onInviteSent={(name) => showToast(t('friends.inviteSent', { name }))}
            />
          )}

          {screen === 'major' && (
            <MajorGame profile={profile} onHome={goHome} onStatus={setStatus} />
          )}
          {screen === 'duel' && (
            <DuelGame
              profile={profile}
              room={room}
              onHome={goHome}
              onStatus={setStatus}
              onNeedFriends={() => openFriends('duel')}
            />
          )}
          {screen === 'party' && (
            <PartyGame
              profile={profile}
              room={room}
              onHome={goHome}
              onStatus={setStatus}
              onNeedFriends={() => openFriends('party')}
            />
          )}
          {screen === 'daily' && (
            <DailyGame profile={profile} onHome={goHome} onStatus={setStatus} />
          )}
          {screen === 'gauntlet' && (
            <GauntletGame profile={profile} onHome={goHome} onStatus={setStatus} />
          )}
          {screen === 'box' && (
            <BoxGame
              profile={profile}
              room={room}
              onHome={goHome}
              onStatus={setStatus}
              onNeedFriends={() => openFriends('box')}
            />
          )}
        </motion.main>
      </AnimatePresence>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <AppToast message={toast} />
      <MatchInvitePopup
        invite={incomingInvite}
        busy={inviteBusy}
        onAccept={handleAcceptInvite}
        onDecline={handleDeclineInvite}
      />
      <ConnectionLostModal
        open={!online && !offlineDismissed}
        onDismiss={() => setOfflineDismissed(true)}
      />

      {peekProfileId && (
        <PublicProfileModal
          userId={peekProfileId}
          viewerId={profile?.id}
          onClose={() => {
            setPeekProfileId(null)
            try {
              const url = new URL(window.location.href)
              url.searchParams.delete('p')
              window.history.replaceState({}, '', url.pathname + url.search + url.hash)
            } catch {
              /* ignore */
            }
          }}
        />
      )}

      {showFooter && (
        <footer className="mt-auto shrink-0 border-t border-cs-border/40 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:py-3.5">
          <div className="mx-auto flex max-w-lg flex-col items-center gap-2.5 sm:gap-3">
            <a
              href="https://cs4fun.online"
              className="group inline-flex items-center gap-2 text-cs-muted transition hover:text-cs-gold"
            >
              <LogoMark className="h-16 w-16 shrink-0" />
              <span className="font-display text-[10px] font-bold tracking-[0.22em] sm:text-[11px]">
                {t('meta.footer')}
              </span>
            </a>
            <a
              href="https://buymeacoffee.com/emireln"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded border border-cs-gold/30 bg-cs-gold/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-cs-gold/90 transition hover:border-cs-gold/55 hover:bg-cs-gold/15"
            >
              <Coffee className="h-3 w-3" aria-hidden />
              {t('meta.support')}
            </a>
          </div>
        </footer>
      )}
    </div>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <AppShell />
        <DesktopUpdateOverlay />
      </AuthProvider>
    </I18nProvider>
  )
}
