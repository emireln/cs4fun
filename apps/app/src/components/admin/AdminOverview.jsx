import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n'
import { adminDashboardStats } from '../../lib/admin'

export default function AdminOverview() {
  const { t } = useI18n()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const data = await adminDashboardStats()
        if (!cancelled) setStats(data)
      } catch (e) {
        if (!cancelled) setError(e?.message || 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <p className="text-sm text-cs-muted">{t('admin.loading')}</p>
  }
  if (error) {
    return <p className="text-sm text-cs-loss">{error}</p>
  }

  const cards = [
    { label: t('admin.statUsers'), value: stats?.users_total ?? 0 },
    { label: t('admin.statUsers7d'), value: stats?.users_7d ?? 0 },
    { label: t('admin.statBanned'), value: stats?.banned_total ?? 0 },
    { label: t('admin.statRooms'), value: stats?.rooms_active ?? 0 },
    { label: t('admin.statGamesToday'), value: stats?.games_today ?? 0 },
    { label: t('admin.statGames7d'), value: stats?.games_7d ?? 0 },
    { label: t('admin.statCareerSaves'), value: stats?.career_saves ?? 0 },
  ]

  const byMode = stats?.games_by_mode_7d || {}

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-xl font-bold text-cs-gold">{t('admin.overview')}</h2>
        <p className="mt-1 text-sm text-cs-muted">{t('admin.overviewHint')}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded border border-cs-border bg-cs-bg/40 px-4 py-4">
            <div className="font-display text-[10px] tracking-[0.18em] text-cs-muted uppercase">
              {c.label}
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-cs-text">{c.value}</div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="mb-3 font-display text-xs font-bold tracking-[0.2em] text-cs-gold uppercase">
          {t('admin.byMode7d')}
        </h3>
        <ul className="divide-y divide-cs-border/60 rounded border border-cs-border">
          {Object.keys(byMode).length === 0 ? (
            <li className="px-4 py-3 text-sm text-cs-muted">{t('admin.empty')}</li>
          ) : (
            Object.entries(byMode).map(([mode, n]) => (
              <li key={mode} className="flex justify-between px-4 py-2.5 text-sm">
                <span className="tracking-wider text-cs-text uppercase">{mode}</span>
                <span className="font-mono text-cs-gold">{n}</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}
