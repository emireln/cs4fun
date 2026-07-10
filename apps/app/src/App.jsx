import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Coffee } from 'lucide-react'
import { I18nProvider, useI18n } from './i18n'
import { AuthProvider, useAuth } from './lib/auth'
import { unlockAudio } from './lib/sound'
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

function AppShell() {
  const { t } = useI18n()
  const { profile, loading, isAdmin, isBanned, isAuthed } = useAuth()
  const [screen, setScreen] = useState('hub')
  const [room, setRoom] = useState(null)
  const [friendsMode, setFriendsMode] = useState('party')
  const [status, setStatus] = useState({ phase: 'hub' })
  const [authOpen, setAuthOpen] = useState(false)
  const [peekProfileId, setPeekProfileId] = useState(null)

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const p = params.get('p')
      if (p) setPeekProfileId(p)
    } catch {
      /* ignore */
    }
  }, [])

  const goHome = useCallback(() => {
    setScreen('hub')
    setRoom(null)
    setStatus({ phase: 'hub' })
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

  const openFriends = (mode = 'party') => {
    setFriendsMode(mode === 'duel' ? 'duel' : 'party')
    setScreen('friends')
    setStatus({ phase: 'friends' })
  }

  const openMode = (modeId) => {
    setRoom(null)
    setScreen(modeId)
    setStatus({ phase: 'setup', gameMode: modeId })
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
      className={`carbon-bg min-h-dvh overflow-x-clip sm:pt-[calc(52px+env(safe-area-inset-top,0px))] ${
        mobileStatsPad
          ? 'pt-[calc(108px+env(safe-area-inset-top,0px))]'
          : 'pt-[calc(76px+env(safe-area-inset-top,0px))]'
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
          (['major', 'duel', 'party', 'daily', 'gauntlet'].includes(screen) ? screen : null)
        }
        extra={status.extra}
        onHome={goHome}
        onOpenLeaderboard={() => {
          setScreen('leaderboard')
          setStatus({ phase: 'leaderboard' })
        }}
        onOpenProfile={() => {
          setScreen('profile')
          setStatus({ phase: 'hub' })
        }}
        onNeedAuth={() => setAuthOpen(true)}
      />

      <AnimatePresence mode="wait">
        <motion.main
          key={screen + (room?.code || '')}
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
              onBack={goHome}
              onNeedAuth={() => setAuthOpen(true)}
            />
          )}

          {screen === 'profile' && (
            <ProfilePage
              onBack={goHome}
              onNeedAuth={() => setAuthOpen(true)}
            />
          )}

          {screen === 'friends' && (
            <FriendsHub
              profile={profile}
              initialMode={friendsMode}
              onBack={goHome}
              onNeedAuth={() => setAuthOpen(true)}
              onStart={(startedRoom) => {
                setRoom(startedRoom)
                setScreen(startedRoom.mode === 'duel' ? 'duel' : 'party')
                setStatus({ phase: 'setup', gameMode: startedRoom.mode })
              }}
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
        </motion.main>
      </AnimatePresence>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

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
        <footer className="border-t border-cs-border/40 px-4 py-2.5 sm:py-3">
          <div className="mx-auto flex max-w-lg flex-col items-center gap-5 sm:gap-6">
            <a
              href="https://cs4fun.online"
              className="inline-flex items-center gap-2 text-cs-muted transition hover:text-cs-gold"
            >
              <img src="/logo.svg" alt="" className="h-5 w-5 shrink-0" />
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
      </AuthProvider>
    </I18nProvider>
  )
}
