import { useEffect, useMemo, useState } from 'react'
import { Check, Target } from 'lucide-react'
import { useI18n } from '../i18n'
import { useAuth } from '../lib/auth'
import {
  getWeeklyChallenges,
  utcWeekKey,
  weeklyCompletedCount,
} from '../lib/challenges'
import { nextStreakUnlock, syncCosmeticUnlocks } from '../lib/cosmetics'
import { getDailyStreak } from '../lib/dailyStreak'

export default function WeeklyChallenges({ compact = false }) {
  const { t } = useI18n()
  const { profile } = useAuth()
  const pid = profile?.id || 'guest'
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const onEngagement = () => setTick((n) => n + 1)
    const onVis = () => {
      if (document.visibilityState === 'visible') setTick((n) => n + 1)
    }
    window.addEventListener('cs4fun:engagement', onEngagement)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('cs4fun:engagement', onEngagement)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])
  const state = useMemo(() => {
    syncCosmeticUnlocks(pid)
    return getWeeklyChallenges(pid)
  }, [pid, tick])
  const streak = useMemo(() => getDailyStreak(pid), [pid, tick])
  const nextUnlock = nextStreakUnlock(pid)
  const done = weeklyCompletedCount(state)

  return (
    <div className={compact ? 'space-y-2.5' : 'mb-6 space-y-3'}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-display text-[10px] tracking-[0.22em] text-cs-gold uppercase">
            {t('challenges.weeklyTitle')}
          </p>
          <p className="text-xs text-cs-muted">
            {t('challenges.weekLabel', { week: utcWeekKey() })} · {done}/3
          </p>
        </div>
        {streak.currentStreak > 0 && (
          <p className="text-[10px] font-semibold uppercase tracking-wider text-cs-gold">
            {t('challenges.streakHint', { n: streak.currentStreak })}
            {nextUnlock ? ` · ${t('challenges.nextUnlock', { n: nextUnlock.day })}` : ''}
          </p>
        )}
      </div>

      {state.dailyQuest && (
        <QuestRow challenge={state.dailyQuest} t={t} badge={t('challenges.dailyBadge')} />
      )}

      <div className={compact ? 'grid gap-2' : 'grid gap-2 sm:grid-cols-3'}>
        {state.challenges.map((c) => (
          <QuestRow key={c.id} challenge={c} t={t} />
        ))}
      </div>
    </div>
  )
}

function QuestRow({ challenge, t, badge }) {
  const pct = Math.min(100, Math.round((challenge.progress / challenge.target) * 100))
  const done = Boolean(challenge.completedAt)
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 ${
        done ? 'border-cs-gold/40 bg-cs-gold/10' : 'border-cs-border bg-cs-panel/60'
      }`}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          {badge && (
            <span className="mb-0.5 block text-[9px] font-bold tracking-wider text-cs-gold uppercase">
              {badge}
            </span>
          )}
          <p className="text-xs font-semibold text-cs-text">{t(challenge.labelKey)}</p>
        </div>
        {done ? (
          <Check className="h-4 w-4 shrink-0 text-cs-gold" />
        ) : (
          <Target className="h-3.5 w-3.5 shrink-0 text-cs-muted" />
        )}
      </div>
      <div className="h-1 overflow-hidden rounded bg-cs-bg">
        <div className="h-full bg-cs-gold transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 font-mono text-[10px] text-cs-muted">
        {challenge.progress}/{challenge.target}
      </p>
    </div>
  )
}
