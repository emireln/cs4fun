import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Swords, Users, Trophy, Flame, Calendar } from 'lucide-react'
import { useI18n } from '../i18n'
import { useAuth } from '../lib/auth'
import { getDailyStreak } from '../lib/dailyStreak'

const MODE_META = [
  { id: 'major', icon: Trophy },
  { id: 'duel', icon: Swords },
  { id: 'party', icon: Users },
  { id: 'daily', icon: Calendar },
  { id: 'gauntlet', icon: Flame },
]

export default function HomeHub({ onSelectMode, onOpenFriends }) {
  const { t } = useI18n()
  const { profile } = useAuth()
  const streak = useMemo(() => getDailyStreak(profile?.id), [profile?.id])

  return (
    <div className="relative">
      <div className="mx-auto max-w-5xl px-4 pb-14 pt-6 sm:pt-10">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
          <img src="/logo.svg" alt="cs4fun" className="mx-auto mb-4 h-20 w-20 sm:h-24 sm:w-24" />
          <h1 className="font-display text-5xl font-extrabold tracking-tight sm:text-6xl">
            <span className="gold-text">{t('home.title')}</span>
          </h1>
          <p className="mt-2 text-sm tracking-[0.2em] text-cs-muted uppercase">{t('meta.tagline')}</p>

          {streak.currentStreak > 0 && (
            <button
              type="button"
              onClick={() => onSelectMode('daily')}
              className="mt-4 inline-flex items-center gap-2 rounded border border-cs-gold/40 bg-cs-gold/10 px-4 py-2 text-sm text-cs-gold transition hover:bg-cs-gold/20"
            >
              <Flame className="h-4 w-4" />
              {streak.playedToday
                ? t('daily.streakDay', { n: streak.currentStreak })
                : t('daily.returnCta', { n: streak.currentStreak })}
            </button>
          )}

          <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
            <button type="button" className="btn-gold rounded px-7 py-3 text-xs uppercase tracking-[0.18em]" onClick={onOpenFriends}>
              {t('home.ctaFriends')}
            </button>
            <button type="button" className="btn-ghost rounded px-6 py-3 text-xs uppercase tracking-wider" onClick={() => onSelectMode('major')}>
              {t('home.ctaSolo')}
            </button>
          </div>
        </motion.div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {MODE_META.map((mode, i) => {
            const Icon = mode.icon
            const isDaily = mode.id === 'daily'
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
                className="panel rounded-xl p-4 text-left"
              >
                <Icon className="mb-3 h-5 w-5 text-cs-gold" />
                <div className="font-display text-sm font-bold">{t(`modes.${mode.id}.title`)}</div>
                <div className="mt-1 text-xs text-cs-muted">{t(`modes.${mode.id}.blurb`)}</div>
                {isDaily && streak.currentStreak > 0 && (
                  <div className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-cs-gold">
                    {t('daily.streakShort', { n: streak.currentStreak })}
                  </div>
                )}
                {isDaily && !streak.playedToday && streak.currentStreak === 0 && (
                  <div className="mt-2 text-[10px] uppercase tracking-wider text-cs-muted">
                    {t('daily.playToday')}
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
