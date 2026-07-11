import { useEffect, useState } from 'react'
import { Lock, Star, X } from 'lucide-react'
import { useI18n } from '../i18n'
import { BADGE_DEFS } from '../lib/history'
import { fetchPublicProfile } from '../lib/publicProfile'
import { readBoxStats } from '../lib/boxBattle'
import ProfileAvatar, { BADGE_ICONS } from './ProfileAvatar'
import BestDropCard from './BestDropCard'
import SteamIcon from './SteamIcon'
import { Award } from 'lucide-react'

export default function PublicProfileModal({ userId, viewerId, onClose }) {
  const { t } = useI18n()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetchPublicProfile(userId, { viewerId }).then((p) => {
      if (!alive) return
      setData(p)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [userId, viewerId])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const showcaseDef = data?.showcaseBadge
    ? BADGE_DEFS.find((b) => b.id === data.showcaseBadge)
    : null
  const ShowcaseIcon = BADGE_ICONS[showcaseDef?.icon] || Award

  const hasStats =
    data &&
    (data.wins != null || data.games != null || data.badgeCount != null || data.maxStreak != null)
  const hasModes =
    data &&
    (data.majorWins != null ||
      data.duelWins != null ||
      data.partyWins != null ||
      data.dailyWins != null)
  const hasCareer =
    data &&
    (data.careerMajorsWon != null ||
      data.careerBestSeason != null ||
      data.careerSeasons != null)
  const hasBox = data && (data.boxWins != null || data.bestDrop)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto overscroll-contain bg-black/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] backdrop-blur-sm sm:items-center sm:pb-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="panel relative my-auto w-full max-w-sm rounded-xl p-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('profile.viewTitle')}
      >
        <button
          type="button"
          className="absolute top-3 right-3 text-cs-muted hover:text-cs-text"
          onClick={onClose}
          aria-label={t('common.close')}
        >
          <X className="h-4 w-4" />
        </button>

        {loading || !data ? (
          <p className="py-8 text-center text-sm text-cs-muted">{t('profile.loading')}</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pr-6">
              <ProfileAvatar
                avatarId={data.avatarId}
                avatarUrl={data.avatarUrl}
                showcaseBadge={data.showcaseBadge}
                badgeIcon={showcaseDef?.icon}
                ultra={data.ultra}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-display text-xl font-bold text-cs-gold">
                  {data.nickname}
                </h2>
                <p className="text-xs text-cs-muted">
                  {data.private ? t('profile.visibilityPrivate') : t('profile.visibilityPublic')}
                </p>
              </div>
            </div>

            {data.private ? (
              <div className="flex items-start gap-2 rounded-lg border border-cs-border bg-cs-bg/40 px-3 py-3 text-sm text-cs-muted">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-cs-gold" aria-hidden />
                <span>{t('profile.privateHint')}</span>
              </div>
            ) : (
              <>
                {hasStats && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {data.wins != null && <Chip label={t('profile.statWins')} value={data.wins} />}
                    {data.games != null && <Chip label={t('profile.statGames')} value={data.games} />}
                    {data.badgeCount != null && (
                      <Chip label={t('profile.statBadges')} value={data.badgeCount} />
                    )}
                    {data.maxStreak != null && data.maxStreak > 0 && (
                      <Chip label={t('profile.statStreak')} value={data.maxStreak} />
                    )}
                  </div>
                )}

                {hasModes && (
                  <div>
                    <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-cs-muted uppercase">
                      {t('profile.modeBreakdown')}
                    </p>
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      {data.majorWins != null && (
                        <Chip label={t('profile.statMajor')} value={data.majorWins} />
                      )}
                      {data.duelWins != null && (
                        <Chip label={t('profile.statDuel')} value={data.duelWins} />
                      )}
                      {data.partyWins != null && (
                        <Chip label={t('profile.statParty')} value={data.partyWins} />
                      )}
                      {data.dailyWins != null && (
                        <Chip label={t('profile.statDaily')} value={data.dailyWins} />
                      )}
                    </div>
                  </div>
                )}

                {hasCareer && (
                  <div>
                    <p className="mb-1.5 inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider text-cs-muted uppercase">
                      <Star className="h-3 w-3 text-cs-gold" />
                      {t('profile.careerStats')}
                    </p>
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      {data.careerMajorsWon != null && (
                        <Chip label={t('profile.statCareerMajors')} value={data.careerMajorsWon} />
                      )}
                      {data.careerBestSeason != null && (
                        <Chip label={t('profile.statCareerBest')} value={data.careerBestSeason} />
                      )}
                      {data.careerSeasons != null && (
                        <Chip label={t('profile.statCareerSeasons')} value={data.careerSeasons} />
                      )}
                    </div>
                  </div>
                )}

                {hasBox && (
                  <>
                    {data.boxWins != null && data.boxWins > 0 && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Chip label={t('profile.statBox')} value={data.boxWins} />
                      </div>
                    )}
                    <BestDropCard
                      drop={data.bestDrop || readBoxStats(data.id)?.bestDrop || null}
                      emptyLabel={t('box.noBestDrop')}
                      compact
                    />
                  </>
                )}

                {data.showcaseBadge && (
                  <div className="flex items-center gap-2 rounded-lg border border-cs-gold/30 bg-cs-gold/10 px-3 py-2 text-sm">
                    <ShowcaseIcon className="h-4 w-4 text-cs-gold" aria-hidden />
                    <span className="font-semibold text-cs-gold">
                      {t(`badges.${data.showcaseBadge}.title`)}
                    </span>
                  </div>
                )}

                {data.steamUrl ? (
                  <a
                    href={data.steamUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost inline-flex w-full items-center justify-center gap-2 rounded px-3 py-2.5 text-xs tracking-wider uppercase"
                  >
                    <SteamIcon className="h-4 w-4 text-[#66c0f4]" />
                    {t('profile.openSteam')}
                  </a>
                ) : data.publicSections?.steam !== false ? (
                  <p className="text-center text-xs text-cs-muted">{t('profile.noSteam')}</p>
                ) : null}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Chip({ label, value }) {
  return (
    <span className="rounded border border-cs-border bg-cs-bg/50 px-2 py-0.5 font-mono">
      <span className="text-cs-muted">{label} </span>
      <span className="text-cs-gold">{value ?? 0}</span>
    </span>
  )
}
