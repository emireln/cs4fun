import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Swords, LogIn, Target } from 'lucide-react'
import { STAGES } from '../data/constants'
import { useI18n } from '../i18n'
import { useAuth } from '../lib/auth'
import { BADGE_DEFS, fetchUserBadges, ULTRA_BADGE_ID } from '../lib/history'
import { getCosmetics } from '../lib/cosmetics'
import { weeklyCompletedCount, getWeeklyChallenges } from '../lib/challenges'
import BrandWordmark from './BrandWordmark'
import LogoMark from './LogoMark'
import ProfileAvatar from './ProfileAvatar'
import WeeklyChallenges from './WeeklyChallenges'

export default function StatusBar({
  wins,
  losses,
  stage,
  mode,
  mapPriority,
  rerolls,
  phase,
  gameMode,
  extra = null,
  onHome,
  onOpenLeaderboard,
  onOpenProfile,
  onNeedAuth,
}) {
  const { t } = useI18n()
  const { profile, isAuthed } = useAuth()
  const [hidden, setHidden] = useState(false)
  const [ultra, setUltra] = useState(false)
  const [challengesOpen, setChallengesOpen] = useState(false)
  const panelRef = useRef(null)
  const lastY = useRef(0)
  const showcaseIcon = BADGE_DEFS.find((b) => b.id === profile.showcaseBadge)?.icon
  const cosmetics = getCosmetics(profile?.id || 'guest')
  const challengeDone = weeklyCompletedCount(getWeeklyChallenges(profile?.id || 'guest'))

  useEffect(() => {
    if (!isAuthed) {
      setUltra(false)
      return undefined
    }
    let alive = true
    fetchUserBadges(profile.id).then((list) => {
      if (!alive) return
      setUltra(list.some((b) => (b.id || b.badge_id) === ULTRA_BADGE_ID))
    })
    return () => {
      alive = false
    }
  }, [profile.id, profile.showcaseBadge, isAuthed])

  useEffect(() => {
    if (!challengesOpen) return undefined
    const onDoc = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setChallengesOpen(false)
      }
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setChallengesOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [challengesOpen])

  const stageLabel =
    stage === 'quarterfinals'
      ? t('tournament.qf')
      : stage === 'semifinals'
        ? t('tournament.sf')
        : stage === 'grandfinal'
          ? t('tournament.gf')
          : STAGES.find((s) => s.id === stage)?.label

  const quiet =
    phase === 'hub' ||
    phase === 'leaderboard' ||
    phase === 'friends' ||
    phase === 'history' ||
    phase === 'setup' ||
    phase === 'profile'

  const showStats = !quiet && (wins != null || losses != null || stageLabel || mapPriority || extra)

  useEffect(() => {
    lastY.current = window.scrollY || 0
    const onScroll = () => {
      const y = window.scrollY || 0
      const delta = y - lastY.current
      if (y < 24) {
        setHidden(false)
      } else if (delta > 8) {
        setHidden(true)
        setChallengesOpen(false)
      } else if (delta < -8) {
        setHidden(false)
      }
      lastY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 border-b border-cs-border/80 bg-[#0a0c10]/90 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md transition-transform duration-300 ease-out ${
        hidden ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
        <button type="button" onClick={onHome} className="group/logo flex min-w-0 items-center gap-2 sm:gap-2.5">
          <LogoMark className="h-9 w-auto max-h-9 shrink-0 sm:h-10 sm:max-h-10" />
          <div className="min-w-0 text-left">
            <BrandWordmark />
            {!quiet && gameMode && (
              <div className="truncate text-[10px] uppercase tracking-widest text-cs-muted">
                {t(`modes.${gameMode}.title`)}
              </div>
            )}
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          {!quiet && (
            <div className="mr-0.5 hidden flex-wrap items-center gap-1.5 text-xs sm:flex">
              {(wins != null || losses != null) && (
                <Pill>
                  <Swords className="h-3 w-3 text-cs-gold" />
                  <span className="font-semibold text-cs-win">
                    {wins ?? 0}
                    {t('common.winsShort')}
                  </span>
                  <span className="text-cs-muted">/</span>
                  <span className="font-semibold text-cs-loss">
                    {losses ?? 0}
                    {t('common.lossesShort')}
                  </span>
                </Pill>
              )}
              {stageLabel && (
                <Pill>
                  <Trophy className="h-3 w-3 text-cs-gold" />
                  {stageLabel}
                </Pill>
              )}
              {mapPriority && <Pill>{mapPriority}</Pill>}
              {mode === 'almanac' && <Pill>{t('status.almanac')}</Pill>}
              {phase === 'draft' && rerolls != null && rerolls > 0 && rerolls < 99 && (
                <Pill accent>{t('status.rescouts', { n: rerolls })}</Pill>
              )}
              {extra}
            </div>
          )}

          <div className="relative" ref={panelRef}>
            <button
              type="button"
              onClick={() => setChallengesOpen((o) => !o)}
              title={t('nav.challenges')}
              aria-label={t('nav.challenges')}
              aria-expanded={challengesOpen}
              className={`relative flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                challengesOpen
                  ? 'border-cs-gold/50 bg-cs-gold/10 text-cs-gold'
                  : 'border-cs-border bg-cs-panel text-cs-muted hover:border-cs-gold/50 hover:bg-cs-gold/10 hover:text-cs-gold'
              }`}
            >
              <Target className="h-[18px] w-[18px]" />
              {challengeDone < 3 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cs-gold px-1 font-mono text-[9px] font-bold text-black">
                  {challengeDone}/3
                </span>
              )}
            </button>

            <AnimatePresence>
              {challengesOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full right-0 z-50 mt-2 max-h-[min(70vh,28rem)] w-[min(100vw-1.5rem,22rem)] origin-top-right overflow-y-auto overscroll-contain rounded-xl border border-cs-border bg-[#0c0f14] p-3 shadow-2xl shadow-black/50 sm:w-[24rem]"
                >
                  <WeeklyChallenges compact />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {isAuthed && (
            <button
              type="button"
              onClick={onOpenLeaderboard}
              title={t('nav.leaderboard')}
              aria-label={t('nav.leaderboard')}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-cs-border bg-cs-panel text-cs-muted transition hover:border-cs-gold/50 hover:bg-cs-gold/10 hover:text-cs-gold"
            >
              <Trophy className="h-[18px] w-[18px]" />
            </button>
          )}

          {!isAuthed && (
            <button
              type="button"
              onClick={onNeedAuth}
              title={t('nav.signIn')}
              aria-label={t('nav.signIn')}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-cs-border bg-cs-panel text-cs-gold transition hover:border-cs-gold/50 hover:bg-cs-gold/10"
            >
              <LogIn className="h-[18px] w-[18px]" />
            </button>
          )}

          <button
            type="button"
            onClick={onOpenProfile}
            title={t('nav.account')}
            aria-label={t('nav.account')}
            className="flex h-9 w-9 items-center justify-center rounded-full transition hover:opacity-90"
          >
            <ProfileAvatar
              avatarId={profile.avatarId}
              avatarUrl={profile.avatarUrl}
              showcaseBadge={isAuthed ? profile.showcaseBadge : null}
              badgeIcon={showcaseIcon}
              ultra={ultra}
              frameId={cosmetics.equippedFrame}
              ringId={cosmetics.equippedRing}
              size="sm"
            />
          </button>
        </div>
      </div>

      {showStats && (
        <div className="flex items-center gap-2 overflow-x-auto border-t border-cs-border/50 px-3 py-1.5 text-[11px] sm:hidden">
          {(wins != null || losses != null) && (
            <span className="shrink-0 font-mono">
              <span className="text-cs-win">
                {wins ?? 0}
                {t('common.winsShort')}
              </span>
              <span className="text-cs-muted">/</span>
              <span className="text-cs-loss">
                {losses ?? 0}
                {t('common.lossesShort')}
              </span>
            </span>
          )}
          {stageLabel && <span className="shrink-0 text-cs-gold">{stageLabel}</span>}
          {mapPriority && <span className="shrink-0 text-cs-muted">{mapPriority}</span>}
          {mode === 'almanac' && <span className="shrink-0 text-cs-muted">{t('status.almanac')}</span>}
          {phase === 'draft' && rerolls != null && rerolls > 0 && rerolls < 99 && (
            <span className="shrink-0 text-cs-gold">{t('status.rescouts', { n: rerolls })}</span>
          )}
          {extra}
        </div>
      )}

      {phase === 'tournament' && stage && (
        <div className="h-0.5 w-full bg-cs-border">
          <motion.div
            className="h-full bg-gradient-to-r from-cs-gold-dim to-cs-gold"
            initial={{ width: '0%' }}
            animate={{
              width: stage === 'quarterfinals' ? '33%' : stage === 'semifinals' ? '66%' : '100%',
            }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}
    </header>
  )
}

function Pill({ children, accent }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-1 font-medium ${
        accent ? 'border-cs-gold/50 bg-cs-gold/10 text-cs-gold' : 'border-cs-border bg-cs-panel2/80 text-cs-text/90'
      }`}
    >
      {children}
    </span>
  )
}
