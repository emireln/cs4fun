import { motion } from 'framer-motion'
import {
  Star,
  Swords,
  Users,
  Tent,
  Trophy,
  Wallet,
  Calendar,
} from 'lucide-react'
import { useI18n } from '../../i18n'
import LineupRadar from '../LineupRadar'
import TeamLogo from '../TeamLogo'
import {
  CAREER_WEEKS,
  PHASE,
  tierForScore,
  totalWeeklySalary,
  weekKind,
  lineupComplete,
} from '../../lib/career'

function formatCash(n) {
  return `$${Math.round(Number(n) || 0).toLocaleString('en-US')}`
}

export default function CareerHub({
  state,
  onPlayWeek,
  onOpenMarket,
  onOpenCamp,
  onStartMajor,
  onHome,
  saving,
}) {
  const { t } = useI18n()
  const tier = tierForScore(state.seasonScore || 0)
  const kind = weekKind(state.week)
  const ready = lineupComplete(state.lineup)
  const salary = totalWeeklySalary(state.lineup)

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 font-display text-[10px] tracking-[0.25em] text-cs-gold uppercase">
            <Star className="h-3.5 w-3.5 fill-cs-gold" />
            {t('modes.career.title')}
          </p>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{state.orgName}</h1>
          <p className="mt-1 text-sm text-cs-muted">
            {t('career.seasonWeek', { season: state.season, week: Math.min(state.week, CAREER_WEEKS) })}
            {' · '}
            {t(tier.labelKey)}
          </p>
        </div>
        <button type="button" className="btn-ghost rounded px-3 py-2 text-xs uppercase" onClick={onHome}>
          {t('common.home')}
        </button>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-4">
        <Stat icon={Wallet} label={t('career.budget')} value={formatCash(state.budget)} />
        <Stat icon={Calendar} label={t('career.salaryWeek')} value={formatCash(salary)} />
        <Stat
          icon={Swords}
          label={t('career.record')}
          value={`${state.record?.wins || 0}–${state.record?.losses || 0}`}
        />
        <Stat icon={Trophy} label={t('career.seasonScore')} value={String(state.seasonScore || 0)} />
      </div>

      {state.camp?.weeksLeft > 0 && (
        <p className="mb-4 rounded-lg border border-cs-gold/30 bg-cs-gold/10 px-3 py-2 text-xs text-cs-gold">
          {t('career.campActive', {
            left: state.camp.weeksLeft,
            buff:
              state.camp.type === 'map'
                ? state.camp.value
                : t(`career.mentality.${state.camp.value}`, { defaultValue: state.camp.value }),
          })}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <LineupRadar
          lineup={state.lineup}
          title={t('career.roster')}
          openLabel={t('career.openSlot')}
        />

        <div className="space-y-3">
          <div className="panel rounded-xl p-4">
            <h2 className="mb-3 font-display text-[10px] tracking-[0.2em] text-cs-gold uppercase">
              {t('career.nextUp')}
            </h2>
            <p className="mb-4 text-sm text-cs-muted">
              {kind === 'camp'
                ? t('career.nextCamp')
                : kind === 'major' || state.phase === PHASE.MAJOR
                  ? t('career.nextMajor')
                  : kind === 'qualifier'
                    ? t('career.nextQualifier')
                    : t('career.nextLeague')}
            </p>
            <div className="flex flex-col gap-2">
              {(kind === 'camp' || state.phase === PHASE.CAMP) && (
                <button type="button" className="btn-gold rounded px-4 py-2.5 text-xs uppercase" onClick={onOpenCamp}>
                  <Tent className="mr-1.5 inline h-3.5 w-3.5" />
                  {t('career.goCamp')}
                </button>
              )}
              {(state.phase === PHASE.MAJOR || state.week > CAREER_WEEKS) && (
                <button
                  type="button"
                  disabled={!ready || saving}
                  className="btn-gold rounded px-4 py-2.5 text-xs uppercase disabled:opacity-40"
                  onClick={onStartMajor}
                >
                  <Trophy className="mr-1.5 inline h-3.5 w-3.5" />
                  {t('career.enterMajor')}
                </button>
              )}
              {kind !== 'camp' && state.week <= CAREER_WEEKS && state.phase !== PHASE.MAJOR && (
                <button
                  type="button"
                  disabled={!ready || saving}
                  className="btn-gold rounded px-4 py-2.5 text-xs uppercase disabled:opacity-40"
                  onClick={onPlayWeek}
                >
                  <Swords className="mr-1.5 inline h-3.5 w-3.5" />
                  {t('career.playWeek')}
                </button>
              )}
              <button
                type="button"
                className="btn-ghost rounded px-4 py-2.5 text-xs uppercase"
                onClick={onOpenMarket}
              >
                <Users className="mr-1.5 inline h-3.5 w-3.5" />
                {t('career.openMarket')}
              </button>
            </div>
            {!ready && (
              <p className="mt-3 text-xs text-cs-loss">{t('career.needFullRoster')}</p>
            )}
            {saving && <p className="mt-2 text-[10px] text-cs-muted">{t('career.saving')}</p>}
          </div>

          {state.results?.length > 0 && (
            <div className="panel rounded-xl p-4">
              <h2 className="mb-2 font-display text-[10px] tracking-[0.2em] text-cs-gold uppercase">
                {t('career.recent')}
              </h2>
              <ul className="space-y-1.5 text-xs">
                {[...state.results].slice(-5).reverse().map((r, i) => (
                  <li key={`${r.week}-${i}`} className="flex justify-between gap-2">
                    <span className="inline-flex min-w-0 items-center gap-1.5 text-cs-muted">
                      <TeamLogo name={r.opponentName} size="xs" decorative />
                      <span className="truncate">
                        {t('career.weekN', { n: r.week })} · {r.opponentName}
                      </span>
                    </span>
                    <span className={r.won ? 'text-cs-win' : 'text-cs-loss'}>
                      {r.won ? t('career.win') : t('career.loss')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value }) {
  return (
    <motion.div
      layout
      className="panel flex items-center gap-3 rounded-xl px-3 py-2.5"
    >
      <Icon className="h-4 w-4 shrink-0 text-cs-gold" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-cs-muted">{label}</div>
        <div className="truncate font-mono text-sm font-bold text-cs-gold">{value}</div>
      </div>
    </motion.div>
  )
}
