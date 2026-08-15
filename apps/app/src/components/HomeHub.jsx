import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Flame,
  Lock,
  Package,
  Play,
  Skull,
  Star,
  Swords,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import { useI18n } from '../i18n'
import { useAuth } from '../lib/auth'
import { getDailyStreak } from '../lib/dailyStreak'
import { caseOfTheWeek } from '../lib/boxBattle'
import { msUntilUtcMidnight } from '../lib/leaderboard'
import { readLastSession } from '../lib/lastSession'
import LogoMark from './LogoMark'

const PLAY_MODES = new Set(['major', 'duel', 'party', 'daily', 'career', 'box', 'gauntlet', 'survivor'])

const MODE_META = [
  { id: 'major', icon: Trophy, section: 'featured' },
  { id: 'duel', icon: Swords, section: 'featured' },
  { id: 'daily', icon: Calendar, section: 'featured' },
  { id: 'career', icon: Star, section: 'featured', starred: true },
  { id: 'party', icon: Users, section: 'arcade' },
  { id: 'gauntlet', icon: Zap, section: 'arcade' },
  { id: 'box', icon: Package, section: 'arcade' },
  { id: 'survivor', icon: Skull, section: 'arcade' },
]

export default function HomeHub({ onSelectMode, onOpenFriends, onNeedAuth }) {
  const { t } = useI18n()
  const { profile, isAuthed } = useAuth()
  const streak = useMemo(() => getDailyStreak(profile?.id), [profile?.id])
  const lastSession = useMemo(() => readLastSession(), [])
  const lastMode = lastSession && PLAY_MODES.has(lastSession.mode) ? lastSession.mode : null
  const [pickingSolo, setPickingSolo] = useState(false)

  const sections = useMemo(
    () => ({
      featured: MODE_META.filter((m) => m.section === 'featured'),
      arcade: MODE_META.filter((m) => m.section === 'arcade'),
    }),
    [],
  )

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

                {lastMode && (
                  <button
                    type="button"
                    onClick={() => handleSelect(lastMode)}
                    className="group mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-cs-gold/40 bg-cs-gold/8 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-cs-gold transition hover:border-cs-gold/60 hover:bg-cs-gold/15"
                  >
                    <Play className="h-3 w-3 fill-cs-gold" />
                    {t('home.resumeMode', { mode: t(`modes.${lastMode}.title`) })}
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </button>
                )}
              </div>

              <DailyStrip streak={streak} playedToday={Boolean(streak.playedToday)} onPlay={() => handleSelect('daily')} t={t} />
              <ModeSections
                t={t}
                streak={streak}
                isAuthed={isAuthed}
                sections={sections}
                onSelect={handleSelect}
              />
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

              <ModeSections
                t={t}
                streak={streak}
                isAuthed={isAuthed}
                sections={sections}
                onSelect={handleSelect}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function SectionHeader({ title, hint }) {
  return (
    <div className="mt-8 mb-2 flex items-center gap-3 sm:mt-10">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cs-gold" aria-hidden />
      <h2 className="font-display text-[11px] font-bold tracking-[0.22em] text-cs-muted uppercase">
        {title}
      </h2>
      {hint && <span className="hidden text-[10px] text-cs-muted/60 sm:inline">{hint}</span>}
      <span className="h-px flex-1 bg-cs-border/60" aria-hidden />
    </div>
  )
}

function ModeSections({ t, streak, isAuthed, sections, onSelect }) {
  return (
    <>
      <SectionHeader title={t('home.sectionFeatured')} hint={t('home.sectionFeaturedHint')} />
      <div className="grid gap-3 sm:grid-cols-2">
        {sections.featured.map((mode, i) => (
          <FeaturedCard
            key={mode.id}
            mode={mode}
            index={i}
            t={t}
            streak={streak}
            locked={mode.id === 'career' && !isAuthed}
            onSelect={() => onSelect(mode.id)}
          />
        ))}
      </div>

      <SectionHeader title={t('home.sectionArcade')} hint={t('home.arcadeHint')} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {sections.arcade.map((mode, i) => (
          <ArcadeCard key={mode.id} mode={mode} index={i} t={t} onSelect={() => onSelect(mode.id)} />
        ))}
      </div>
    </>
  )
}

function FeaturedCard({ mode, index, t, streak, locked, onSelect }) {
  const Icon = mode.icon
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`panel group relative overflow-hidden rounded-xl p-4 text-left sm:p-5 ${
        mode.starred ? 'border border-cs-gold/45 ring-1 ring-cs-gold/20' : ''
      }`}
    >
      <div
        className="pointer-events-none absolute -top-12 -right-10 h-28 w-28 rounded-full bg-cs-gold/8 blur-2xl"
        aria-hidden
      />
      <div className="relative mb-3 flex items-center justify-between gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-cs-gold/25 bg-cs-gold/8 transition group-hover:border-cs-gold/50 group-hover:bg-cs-gold/15">
          <Icon className="h-5 w-5 text-cs-gold" />
        </span>
        {mode.starred && !locked && (
          <span className="rounded border border-cs-gold/40 bg-cs-gold/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-cs-gold uppercase">
            {t('career.hubBadge')}
          </span>
        )}
        {locked && <Lock className="h-4 w-4 text-cs-muted" />}
      </div>
      <div className="relative font-display text-base font-bold">{t(`modes.${mode.id}.title`)}</div>
      <div className="relative mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-cs-gold/80">
        {t(`modes.${mode.id}.tag`)}
      </div>
      <div className="relative mt-1.5 text-xs leading-relaxed text-cs-muted">
        {t(`modes.${mode.id}.blurb`)}
      </div>
      <div className="relative mt-3 flex flex-wrap items-center gap-1.5">
        <span className="rounded border border-cs-border bg-cs-bg/50 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-cs-muted">
          {t(`modes.${mode.id}.meta`)}
        </span>
        {mode.id === 'daily' && streak.currentStreak > 0 && (
          <span className="inline-flex items-center gap-1 rounded border border-cs-gold/40 bg-cs-gold/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cs-gold">
            <Flame className="h-2.5 w-2.5 fill-cs-gold" aria-hidden />
            {t('daily.streakShort', { n: streak.currentStreak })}
          </span>
        )}
        {mode.id === 'daily' && streak.playedToday && (
          <span className="rounded border border-cs-border px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-cs-muted">
            {t('daily.playedToday')}
          </span>
        )}
        {mode.id === 'daily' && !streak.playedToday && streak.currentStreak === 0 && (
          <span className="rounded border border-cs-border px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-cs-muted">
            {t('daily.playToday')}
          </span>
        )}
        {locked && (
          <span className="inline-flex items-center gap-1 rounded border border-cs-gold/40 bg-cs-gold/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cs-gold">
            <Lock className="h-2.5 w-2.5" aria-hidden />
            {t('career.guestLockedShort')}
          </span>
        )}
      </div>
    </motion.button>
  )
}

function ArcadeCard({ mode, index, t, onSelect }) {
  const Icon = mode.icon
  const weeklyCase = useMemo(() => (mode.id === 'box' ? caseOfTheWeek() : null), [mode.id])
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * index }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      className="panel group rounded-lg p-3 text-left"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-cs-border bg-cs-bg/40 transition group-hover:border-cs-gold/40">
          <Icon className="h-4 w-4 text-cs-gold" />
        </span>
        <div className="min-w-0">
          <div className="truncate font-display text-xs font-bold">{t(`modes.${mode.id}.title`)}</div>
          <div className="text-[9px] font-semibold uppercase tracking-wider text-cs-gold/70">
            {t(`modes.${mode.id}.tag`)}
          </div>
        </div>
      </div>
      <div className="mt-2 line-clamp-2 text-[11px] leading-snug text-cs-muted">
        {t(`modes.${mode.id}.blurb`)}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <span className="rounded border border-cs-border bg-cs-bg/50 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-cs-muted">
          {t(`modes.${mode.id}.meta`)}
        </span>
        {weeklyCase?.short && (
          <span className="truncate text-[9px] font-semibold uppercase tracking-wider text-cs-gold/70">
            {weeklyCase.short}
          </span>
        )}
      </div>
    </motion.button>
  )
}

function DailyStrip({ streak, playedToday = false, onPlay, t }) {
  const [msLeft, setMsLeft] = useState(() => msUntilUtcMidnight())
  useEffect(() => {
    const id = setInterval(() => setMsLeft(msUntilUtcMidnight()), 30000)
    return () => clearInterval(id)
  }, [])
  const h = Math.floor(msLeft / 3600000)
  const m = Math.floor((msLeft % 3600000) / 60000)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
    >
      <div className="panel relative overflow-hidden rounded-xl border-cs-gold/40 ring-1 ring-cs-gold/15">
        <div
          className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full bg-cs-gold/10 blur-2xl"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cs-gold/30 bg-cs-gold/10">
              <Calendar className="h-4 w-4 text-cs-gold" />
            </span>
            <div className="min-w-0">
              <div className="font-display text-[11px] font-bold tracking-[0.2em] text-cs-gold uppercase">
                {t('home.today')} — {t('modes.daily.title')}
              </div>
              <div className="truncate text-[11px] text-cs-muted">{t('daily.blindNote')}</div>
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2.5">
            {streak.currentStreak > 0 && (
              <span className="inline-flex items-center gap-1 rounded border border-cs-gold/40 bg-cs-gold/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-cs-gold">
                <Flame className="h-3 w-3 fill-cs-gold" aria-hidden />
                {t('daily.streakShort', { n: streak.currentStreak })}
              </span>
            )}
            <span className="font-mono text-[10px] tracking-wider text-cs-muted">
              {t('daily.endsIn')} {h}h {String(m).padStart(2, '0')}m
            </span>
            <button
              type="button"
              onClick={onPlay}
              disabled={playedToday}
              className="btn-gold rounded px-4 py-2 text-[10px] uppercase tracking-[0.14em] disabled:opacity-45"
            >
              {playedToday ? t('daily.playedToday') : t('daily.playToday')}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
