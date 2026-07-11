import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Star,
  Swords,
  Users,
  Tent,
  Trophy,
  Wallet,
  Calendar,
  TrendingUp,
  History,
  Pencil,
  ImagePlus,
  Trash2,
  GraduationCap,
  Landmark,
} from 'lucide-react'
import { useI18n } from '../../i18n'
import { compressAvatarFile } from '../../lib/avatarImage'
import LineupRadar from '../LineupRadar'
import TeamLogo from '../TeamLogo'
import OrgMark from './OrgMark'
import {
  CAREER_WEEKS,
  PHASE,
  totalWeeklySalary,
  weekKind,
  lineupComplete,
  rosterPower,
  nextTierProgress,
  movePlayerSlot,
  rosterFinance,
  fillEmptyWithAcademy,
  takeBridgeLoan,
  BRIDGE_LOAN_AMOUNT,
} from '../../lib/career'

export default function CareerHub({
  state,
  onPlayWeek,
  onOpenMarket,
  onOpenCamp,
  onStartMajor,
  onUpdateOrg,
  onChange,
  onHome,
  onResetCareer,
  saving,
}) {
  const { t, money } = useI18n()
  const kind = weekKind(state.week)
  const ready = lineupComplete(state.lineup)
  const salary = totalWeeklySalary(state.lineup)
  const power = rosterPower(state)
  const { current: tier, next: nextTier, pct, remaining } = nextTierProgress(state.seasonScore || 0)
  const week = Math.min(Math.max(1, state.week), CAREER_WEEKS)
  const history = [...(state.results || [])].reverse()
  const [editing, setEditing] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [financeMsg, setFinanceMsg] = useState('')
  const [resetOpen, setResetOpen] = useState(false)
  const [resetBusy, setResetBusy] = useState(false)
  const [resetError, setResetError] = useState('')
  const finance = useMemo(() => rosterFinance(state), [state])

  const handleResetCareer = async () => {
    if (!onResetCareer || resetBusy) return
    setResetBusy(true)
    setResetError('')
    const res = await onResetCareer()
    if (!res?.ok) {
      setResetError(res?.error ? String(res.error) : t('career.resetFailed'))
      setResetBusy(false)
      return
    }
    setResetBusy(false)
    setResetOpen(false)
  }

  const handleSelectSlot = (slotId) => {
    if (!selectedSlot) {
      if (state.lineup?.[slotId]) setSelectedSlot(slotId)
      return
    }
    if (selectedSlot === slotId) {
      setSelectedSlot(null)
      return
    }
    onChange?.(movePlayerSlot(state, selectedSlot, slotId))
    setSelectedSlot(null)
  }

  const handleFillAcademy = () => {
    const res = fillEmptyWithAcademy(state)
    if (!res.ok) {
      setFinanceMsg(t(`career.err.${res.error}`))
      return
    }
    onChange?.(res.state)
    setFinanceMsg(t('career.academyFilled', { n: res.filled }))
  }

  const handleLoan = () => {
    const res = takeBridgeLoan(state)
    if (!res.ok) {
      setFinanceMsg(t(`career.err.${res.error}`))
      return
    }
    onChange?.(res.state)
    setFinanceMsg(t('career.loanTaken', { amount: money(BRIDGE_LOAN_AMOUNT) }))
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-1.5 font-display text-[10px] tracking-[0.25em] text-cs-gold uppercase">
            <Star className="h-3.5 w-3.5 fill-cs-gold" />
            {t('modes.career.title')}
          </p>
          <div className="mt-1 flex min-w-0 items-center gap-3">
            <OrgMark state={state} size="lg" eager />
            <div className="min-w-0">
              <h1 className="truncate font-display text-2xl font-bold sm:text-3xl">{state.orgName}</h1>
              <p className="font-mono text-xs tracking-wider text-cs-gold/80">{state.shortName}</p>
              <p className="mt-1 text-sm text-cs-muted">
                {t('career.seasonWeek', { season: state.season, week })}
                {' · '}
                {t(tier.labelKey)}
                {state.majorsWonCareer > 0
                  ? ` · ${t('career.majorsWon', { n: state.majorsWonCareer })}`
                  : ''}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-ghost inline-flex items-center gap-1.5 rounded px-3 py-2 text-xs uppercase"
            onClick={() => setEditing((v) => !v)}
          >
            <Pencil className="h-3.5 w-3.5" />
            {t('career.editOrg')}
          </button>
          <button type="button" className="btn-ghost rounded px-3 py-2 text-xs uppercase" onClick={onHome}>
            {t('common.home')}
          </button>
        </div>
      </div>

      {editing && (
        <OrgIdentityEditor
          state={state}
          saving={saving}
          onCancel={() => setEditing(false)}
          onSave={async (patch) => {
            await onUpdateOrg?.(patch)
            setEditing(false)
          }}
        />
      )}

      {/* Season calendar */}
      <div className="mb-4 panel rounded-xl p-3 sm:p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-[10px] tracking-[0.2em] text-cs-gold uppercase">
            {t('career.seasonPath')}
          </h2>
          <span className="font-mono text-[10px] text-cs-muted">
            {t('career.weekOf', { week, total: CAREER_WEEKS })}
          </span>
        </div>
        <div className="grid grid-cols-8 gap-1 sm:gap-1.5">
          {Array.from({ length: CAREER_WEEKS }, (_, i) => {
            const n = i + 1
            const result = (state.results || []).find(
              (r) => r.week === n && (r.season == null || r.season === state.season),
            )
            const isCamp = n === 4
            const isNow = n === week && state.phase !== PHASE.MAJOR && state.phase !== PHASE.SEASON_END
            const done = Boolean(result) || n < week
            return (
              <div
                key={n}
                title={
                  isCamp
                    ? t('career.pathCamp')
                    : result
                      ? `${result.opponentName || ''} · ${result.won ? 'W' : 'L'}`
                      : t('career.weekN', { n })
                }
                className={`flex aspect-square flex-col items-center justify-center rounded border text-[9px] font-bold sm:text-[10px] ${
                  isNow
                    ? 'border-cs-gold bg-cs-gold/20 text-cs-gold'
                    : result?.won
                      ? 'border-cs-win/40 bg-cs-win/10 text-cs-win'
                      : result && !result.won
                        ? 'border-cs-loss/40 bg-cs-loss/10 text-cs-loss'
                        : done
                          ? 'border-cs-border bg-cs-bg/40 text-cs-muted'
                          : 'border-cs-border/60 text-cs-muted/70'
                }`}
              >
                {isCamp ? <Tent className="h-3 w-3" /> : n}
              </div>
            )
          })}
        </div>
      </div>

      {/* Tier growth */}
      <div className="mb-4 panel rounded-xl p-3 sm:p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="inline-flex items-center gap-1.5 font-display text-[10px] tracking-[0.2em] text-cs-gold uppercase">
            <TrendingUp className="h-3.5 w-3.5" />
            {t('career.orgGrowth')}
          </h2>
          <span className="font-mono text-[10px] text-cs-muted">
            {nextTier
              ? t('career.toNextTier', { tier: t(nextTier.labelKey), n: remaining })
              : t('career.maxTier')}
          </span>
        </div>
        <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider text-cs-muted">
          <span>{t(tier.labelKey)}</span>
          <span>{nextTier ? t(nextTier.labelKey) : t('career.tierDynasty')}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-cs-bg">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-cs-gold/70 to-cs-gold"
            initial={false}
            animate={{ width: `${Math.round(pct * 100)}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </div>
        <p className="mt-2 text-xs text-cs-muted">
          {t('career.powerBlurb', { power: power.toFixed(2), score: state.seasonScore || 0 })}
        </p>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Stat icon={Wallet} label={t('career.budget')} value={money(state.budget)} />
        <Stat icon={Calendar} label={t('career.salaryWeek')} value={money(salary)} />
        <Stat
          icon={Swords}
          label={t('career.record')}
          value={`${state.record?.wins || 0}–${state.record?.losses || 0}`}
        />
        <Stat icon={Trophy} label={t('career.seasonScore')} value={String(state.seasonScore || 0)} />
        <Stat icon={TrendingUp} label={t('career.teamPower')} value={power.toFixed(2)} />
      </div>

      <div className="mb-4 panel rounded-xl p-3 sm:p-4">
        <h2 className="mb-3 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-cs-gold">
          {t('career.rivalsTitle')}
        </h2>
        {state.rivals?.length ? (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {state.rivals.map((rival) => (
              <li
                key={rival.id || rival.name}
                className="rounded border border-cs-border/70 bg-cs-bg/40 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-display text-sm font-bold">{rival.name}</span>
                  <span className="font-mono text-[10px] text-cs-gold">
                    {t('career.rivalHeat', { n: rival.heat || 0 })}
                  </span>
                </div>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-cs-muted">
                  {rival.lastResult === 'win' || rival.lastResult === true
                    ? t('career.rivalLastWin')
                    : rival.lastResult === 'loss' || rival.lastResult === false
                      ? t('career.rivalLastLoss')
                      : t('career.rivalNone')}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-cs-muted">{t('career.rivalNone')}</p>
        )}
      </div>

      {finance.debt > 0 && (
        <p className="mb-4 rounded-lg border border-cs-border bg-cs-bg/40 px-3 py-2 text-xs text-cs-muted">
          {t('career.loanDebt', { amount: money(finance.debt) })}
        </p>
      )}

      {!ready && (
        <div className="mb-4 rounded-xl border border-cs-gold/35 bg-cs-gold/10 px-3 py-3 sm:px-4">
          <p className="font-display text-[10px] tracking-[0.2em] text-cs-gold uppercase">
            {t('career.brokeTitle')}
          </p>
          <p className="mt-1 text-sm text-cs-muted">
            {finance.canSignOneAcademy || finance.canFillAcademy
              ? t('career.brokeAcademyHint', {
                  n: finance.openCount,
                  cost: money(finance.cheapestOne),
                })
              : t('career.brokeLoanHint', {
                  gap: money(finance.gap),
                  loan: money(BRIDGE_LOAN_AMOUNT),
                })}
          </p>
          {financeMsg && <p className="mt-2 text-xs text-cs-gold">{financeMsg}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {finance.canFillAcademy && (
              <button
                type="button"
                className="btn-gold inline-flex items-center gap-1.5 rounded px-3 py-2 text-[10px] uppercase"
                onClick={handleFillAcademy}
              >
                <GraduationCap className="h-3.5 w-3.5" />
                {t('career.fillAcademy', { n: finance.openCount, cost: money(finance.fillCost) })}
              </button>
            )}
            {finance.loanAvailable && !finance.canSignOneAcademy && (
              <button
                type="button"
                className="btn-gold inline-flex items-center gap-1.5 rounded px-3 py-2 text-[10px] uppercase"
                onClick={handleLoan}
              >
                <Landmark className="h-3.5 w-3.5" />
                {t('career.takeLoan', { amount: money(BRIDGE_LOAN_AMOUNT) })}
              </button>
            )}
            <button
              type="button"
              className="btn-ghost inline-flex items-center gap-1.5 rounded px-3 py-2 text-[10px] uppercase"
              onClick={() => onOpenMarket?.({ tier: 'academy' })}
            >
              <Users className="h-3.5 w-3.5" />
              {t('career.browseAcademy')}
            </button>
          </div>
        </div>
      )}

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
          dropLabel={t('career.dropHere')}
          selectedSlot={selectedSlot}
          onSelectSlot={handleSelectSlot}
          assignMode={Boolean(selectedSlot)}
          pendingPlayer={selectedSlot ? state.lineup?.[selectedSlot] : null}
          assignHint={
            selectedSlot
              ? t('career.swapHint', {
                  name: state.lineup?.[selectedSlot]?.name || '',
                })
              : t('career.pickToMove')
          }
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

          <div className="panel rounded-xl p-4">
            <h2 className="mb-2 inline-flex items-center gap-1.5 font-display text-[10px] tracking-[0.2em] text-cs-gold uppercase">
              <History className="h-3.5 w-3.5" />
              {t('career.seasonHistory')}
            </h2>
            {history.length === 0 ? (
              <p className="text-xs text-cs-muted">{t('career.historyEmpty')}</p>
            ) : (
              <ul className="max-h-56 space-y-1.5 overflow-y-auto overscroll-contain text-xs">
                {history.map((r, i) => (
                  <li
                    key={`${r.season || state.season}-${r.week}-${r.at || i}`}
                    className="flex items-center justify-between gap-2 rounded border border-cs-border/60 bg-cs-bg/30 px-2 py-1.5"
                  >
                    <span className="inline-flex min-w-0 items-center gap-1.5 text-cs-muted">
                      <TeamLogo name={r.opponentName} size="xs" decorative />
                      <span className="truncate">
                        {r.season && r.season !== state.season ? `S${r.season} ` : ''}
                        {t('career.weekN', { n: r.week })}
                        {r.kind === 'camp' ? ` · ${t('career.pathCamp')}` : ''}
                        {' · '}
                        {r.opponentName || '—'}
                      </span>
                    </span>
                    <span className={`shrink-0 font-mono ${r.won ? 'text-cs-win' : 'text-cs-loss'}`}>
                      {r.won ? t('career.win') : t('career.loss')}
                      {r.power != null ? ` · ${Number(r.power).toFixed(2)}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {onResetCareer && (
        <div className="panel mt-6 rounded-xl border border-cs-loss/35 p-4 sm:p-5">
          <div className="mb-2 flex items-center gap-2 text-cs-loss">
            <Trash2 className="h-4 w-4 shrink-0" />
            <h2 className="font-display text-sm font-bold tracking-[0.14em] uppercase">
              {t('career.resetTitle')}
            </h2>
          </div>
          <p className="mb-4 text-xs leading-relaxed text-cs-muted">{t('career.resetWarning')}</p>
          {!resetOpen ? (
            <button
              type="button"
              className="rounded border border-cs-loss/50 bg-cs-loss/15 px-4 py-2.5 text-xs font-bold tracking-wider text-cs-loss uppercase"
              onClick={() => {
                setResetError('')
                setResetOpen(true)
              }}
            >
              {t('career.resetButton')}
            </button>
          ) : (
            <div className="space-y-3 rounded border border-cs-loss/40 bg-cs-loss/10 p-3">
              <p className="text-xs font-medium leading-relaxed text-cs-loss">{t('career.resetWarning')}</p>
              {resetError && <p className="text-xs text-cs-loss">{resetError}</p>}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={resetBusy}
                  className="rounded border border-cs-loss/60 bg-cs-loss/25 px-4 py-2.5 text-xs font-bold tracking-wider text-cs-loss uppercase disabled:opacity-50"
                  onClick={handleResetCareer}
                >
                  {resetBusy ? t('career.resetBusy') : t('career.resetConfirm')}
                </button>
                <button
                  type="button"
                  disabled={resetBusy}
                  className="btn-ghost rounded px-4 py-2.5 text-xs uppercase disabled:opacity-50"
                  onClick={() => {
                    setResetOpen(false)
                    setResetError('')
                  }}
                >
                  {t('career.resetCancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function OrgIdentityEditor({ state, onSave, onCancel, saving }) {
  const { t } = useI18n()
  const fileRef = useRef(null)
  const [orgName, setOrgName] = useState(state.orgName || '')
  const [shortName, setShortName] = useState(state.shortName || 'ORG')
  const [orgLogo, setOrgLogo] = useState(state.orgLogo || null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleLogo = async (file) => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      setOrgLogo(await compressAvatarFile(file))
    } catch {
      setError(t('career.logoError'))
    } finally {
      setBusy(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    const name = orgName.trim()
    const tag = shortName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
    if (name.length < 2) {
      setError(t('career.orgNameRequired'))
      return
    }
    if (tag.length < 2) {
      setError(t('career.orgTagRequired'))
      return
    }
    await onSave({ orgName: name, shortName: tag, orgLogo })
  }

  return (
    <form onSubmit={submit} className="mb-4 panel space-y-3 rounded-xl p-4">
      <h2 className="font-display text-[10px] tracking-[0.2em] text-cs-gold uppercase">
        {t('career.editOrg')}
      </h2>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || saving}
          onClick={() => fileRef.current?.click()}
          className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-cs-gold/40 bg-cs-bg/60"
          aria-label={t('career.uploadLogo')}
        >
          {orgLogo ? (
            <img src={orgLogo} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-6 w-6 text-cs-gold/80" />
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleLogo(e.target.files?.[0])}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-ghost rounded px-3 py-1.5 text-[10px] uppercase"
            onClick={() => fileRef.current?.click()}
            disabled={busy || saving}
          >
            {t('career.uploadLogo')}
          </button>
          {orgLogo && (
            <button
              type="button"
              className="btn-ghost inline-flex items-center gap-1 rounded px-3 py-1.5 text-[10px] uppercase text-cs-loss"
              onClick={() => setOrgLogo(null)}
            >
              <Trash2 className="h-3 w-3" />
              {t('career.clearLogo')}
            </button>
          )}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-cs-muted">
            {t('career.orgName')}
          </span>
          <input
            value={orgName}
            onChange={(e) => setOrgName(e.target.value.slice(0, 32))}
            className="w-full rounded-lg border border-cs-border bg-cs-bg/60 px-3 py-2.5 text-sm outline-none focus:border-cs-gold/50"
            maxLength={32}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-cs-muted">
            {t('career.orgTag')}
          </span>
          <input
            value={shortName}
            onChange={(e) =>
              setShortName(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))
            }
            className="w-full rounded-lg border border-cs-border bg-cs-bg/60 px-3 py-2.5 font-mono text-sm tracking-wider outline-none focus:border-cs-gold/50"
            maxLength={8}
          />
        </label>
      </div>
      {error && <p className="text-xs text-cs-loss">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={busy || saving}
          className="btn-gold rounded px-4 py-2 text-xs uppercase disabled:opacity-40"
        >
          {t('career.saveOrg')}
        </button>
        <button type="button" className="btn-ghost rounded px-4 py-2 text-xs uppercase" onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}

function Stat({ icon: Icon, label, value }) {
  return (
    <motion.div layout className="panel flex items-center gap-3 rounded-xl px-3 py-2.5">
      <Icon className="h-4 w-4 shrink-0 text-cs-gold" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-cs-muted">{label}</div>
        <div className="truncate font-mono text-sm font-bold text-cs-gold">{value}</div>
      </div>
    </motion.div>
  )
}
