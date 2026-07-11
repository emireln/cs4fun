import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Swords, Users, Trophy, Calendar, Package, ArrowLeft, Star, Lock, Flame, Zap, Skull } from 'lucide-react'
import { useI18n } from '../i18n'
import { useAuth } from '../lib/auth'
import { getDailyStreak } from '../lib/dailyStreak'
import { caseOfTheWeek } from '../lib/boxBattle'
import LogoMark from './LogoMark'

const MODE_META = [
  { id: 'major', icon: Trophy },
  { id: 'duel', icon: Swords },
  { id: 'party', icon: Users },
  { id: 'box', icon: Package },
  { id: 'daily', icon: Calendar },
  { id: 'gauntlet', icon: Zap },
  { id: 'survivor', icon: Skull },
  { id: 'career', icon: Star, starred: true },
]

export default function HomeHub({ onSelectMode, onOpenFriends, onNeedAuth }) {
  const { t } = useI18n()
  const { profile, isAuthed } = useAuth()
  const streak = useMemo(() => getDailyStreak(profile?.id), [profile?.id])
  const [pickingSolo, setPickingSolo] = useState(false)

  const handleSelect = (id) => {
    if (id === 'career' && !isAuthed) {
      onNeedAuth?.()
      return
    }
    onSelectMode(id)
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col justify-center">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
        <AnimatePresence mode="wait">
          {!pickingSolo ? (
            <motion.div
              key="hub-home"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-8 text-center sm:mb-10">
                <LogoMark
                  title="CS4FUN"
                  decorative={false}
                  className="mx-auto mb-3 h-16 w-auto max-h-16 max-w-[min(100%,14rem)] cursor-pointer sm:mb-4 sm:h-20 sm:max-h-20 sm:max-w-[16rem]"
                />
                <h1 className="font-display text-5xl font-extrabold tracking-tight sm:text-6xl">
                  <span className="gold-text">{t('home.title')}</span>
                </h1>
                <p className="mt-2 text-sm tracking-[0.2em] text-cs-muted uppercase">
                  {t('meta.tagline')}
                </p>

                <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    className="btn-gold rounded px-7 py-3 text-xs uppercase tracking-[0.18em]"
                    onClick={onOpenFriends}
                  >
                    {t('home.ctaFriends')}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost rounded px-6 py-3 text-xs uppercase tracking-wider"
                    onClick={() => setPickingSolo(true)}
                  >
                    {t('home.ctaSolo')}
                  </button>
                </div>
              </div>

              <ModeGrid streak={streak} onSelectMode={handleSelect} t={t} isAuthed={isAuthed} />
            </motion.div>
          ) : (
            <motion.div
              key="hub-solo"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-6 text-center sm:mb-8">
                <button
                  type="button"
                  onClick={() => setPickingSolo(false)}
                  className="mb-4 inline-flex items-center gap-1.5 text-xs tracking-wider text-cs-muted uppercase transition hover:text-cs-gold"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {t('common.back')}
                </button>
                <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                  <span className="gold-text">{t('home.pickSolo')}</span>
                </h1>
                <p className="mx-auto mt-2 max-w-md text-sm text-cs-muted">{t('home.pickSoloHint')}</p>
              </div>

              <ModeGrid streak={streak} onSelectMode={handleSelect} t={t} isAuthed={isAuthed} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function ModeGrid({ streak, onSelectMode, t, isAuthed }) {
  const weeklyCase = useMemo(() => caseOfTheWeek(), [])
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {MODE_META.map((mode, i) => {
        const Icon = mode.icon
        const isDaily = mode.id === 'daily'
        const isCareer = mode.id === 'career'
        const locked = isCareer && !isAuthed
        return (
          <motion.button
            key={mode.id}
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * i }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectMode(mode.id)}
            className={`panel rounded-xl p-4 text-left ${
              mode.starred ? 'border border-cs-gold/45 ring-1 ring-cs-gold/20' : ''
            } ${locked ? 'opacity-90' : ''}`}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <Icon className={`h-5 w-5 text-cs-gold ${mode.starred ? 'fill-cs-gold' : ''}`} />
              {locked && <Lock className="h-3.5 w-3.5 text-cs-muted" />}
              {mode.starred && !locked && (
                <span className="rounded border border-cs-gold/40 bg-cs-gold/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-cs-gold uppercase">
                  {t('career.hubBadge')}
                </span>
              )}
            </div>
            <div className="font-display text-sm font-bold">{t(`modes.${mode.id}.title`)}</div>
            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-cs-gold/80">
              {t(`modes.${mode.id}.tag`)}
            </div>
            <div className="mt-1 text-xs text-cs-muted">{t(`modes.${mode.id}.blurb`)}</div>
            {locked && (
              <div className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-cs-gold">
                {t('career.guestLockedShort')}
              </div>
            )}
            {isDaily && streak.currentStreak > 0 && (
              <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-cs-gold">
                <Flame className="h-3 w-3 fill-cs-gold text-cs-gold" aria-hidden />
                {t('daily.streakShort', { n: streak.currentStreak })}
              </div>
            )}
            {isDaily && !streak.playedToday && streak.currentStreak === 0 && (
              <div className="mt-2 text-[10px] uppercase tracking-wider text-cs-muted">
                {t('daily.playToday')}
              </div>
            )}
            {mode.id === 'box' && (
              <div className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-cs-gold/80">
                {t('box.caseOfWeekTag')}
                {weeklyCase?.short ? ` · ${weeklyCase.short}` : ''}
              </div>
            )}
            {mode.id === 'gauntlet' && (
              <div className="mt-2 text-[10px] uppercase tracking-wider text-cs-muted">
                {t('modes.gauntlet.tag')}
              </div>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}
