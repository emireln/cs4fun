import { useEffect, useState } from 'react'
import { ArrowLeft, Award } from 'lucide-react'
import { useI18n } from '../i18n'
import { useAuth } from '../lib/auth'
import { BADGE_DEFS, fetchBadgeDefs, fetchUserBadges, fetchUserStats } from '../lib/history'
import { BADGE_ICONS } from './ProfileAvatar'

export default function BadgesPanel({ onBack, onNeedAuth }) {
  const { t } = useI18n()
  const { profile, isAuthed } = useAuth()
  const [defs, setDefs] = useState(BADGE_DEFS)
  const [owned, setOwned] = useState([])
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetchBadgeDefs().then(setDefs)
    fetchUserBadges(profile.id).then(setOwned)
    fetchUserStats(profile.id).then(setStats)
  }, [profile.id])

  const ownedIds = new Set(owned.map((b) => b.id || b.badge_id))

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <button type="button" className="btn-ghost mb-6 inline-flex items-center gap-2 rounded px-3 py-2 text-sm" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" /> {t('nav.back')}
      </button>

      <h1 className="mb-1 font-display text-3xl font-bold gold-text">{t('badges.title')}</h1>
      <p className="mb-2 text-sm text-cs-muted">
        {ownedIds.size}/{defs.length}
      </p>
      {!isAuthed && (
        <button type="button" className="mb-4 text-xs text-cs-gold underline" onClick={onNeedAuth}>
          {t('auth.needAuth')}
        </button>
      )}

      {stats && (
        <div className="mb-5 flex flex-wrap gap-2 text-xs">
          <Stat label={t('profile.statWins')} value={stats.wins} />
          <Stat label={t('profile.statGames')} value={stats.games} />
          <Stat label={t('profile.statStreak')} value={stats.max_streak} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {defs.map((def) => {
          const unlocked = ownedIds.has(def.id)
          const Icon = BADGE_ICONS[def.icon] || Award
          return (
            <div
              key={def.id}
              className={`panel rounded-xl p-3 text-center ${
                unlocked ? 'border-cs-gold/40' : 'opacity-45 grayscale'
              } ${
                def.id === 'completionist' && unlocked
                  ? 'border-cs-gold bg-gradient-to-b from-cs-gold/20 to-transparent shadow-[0_0_20px_rgba(232,197,71,0.2)]'
                  : ''
              }`}
            >
              <div
                className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full border ${
                  unlocked ? 'border-cs-gold/50 bg-cs-gold/15 text-cs-gold' : 'border-cs-border text-cs-muted'
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="font-display text-xs font-bold text-cs-text">{t(`badges.${def.id}.title`)}</div>
              <div className="mt-1 text-[10px] leading-snug text-cs-muted">{t(`badges.${def.id}.desc`)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <span className="rounded border border-cs-border bg-cs-panel2/80 px-2.5 py-1 font-mono">
      <span className="text-cs-muted">{label} </span>
      <span className="text-cs-gold">{value ?? 0}</span>
    </span>
  )
}
