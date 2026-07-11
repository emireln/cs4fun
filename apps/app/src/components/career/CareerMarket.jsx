import { useMemo, useState } from 'react'
import { ArrowLeft, UserMinus, UserPlus } from 'lucide-react'
import { useI18n } from '../../i18n'
import { ROLES } from '../../data/constants'
import { marketPool, releasePlayer, signPlayer, contractCost } from '../../lib/career'
import TeamLogo from '../TeamLogo'

export default function CareerMarket({ state, onChange, onBack }) {
  const { t } = useI18n()
  const [filter, setFilter] = useState('all')
  const [msg, setMsg] = useState('')
  const openSlot = ROLES.find((r) => !state.lineup?.[r.id])?.id || null

  const pool = useMemo(
    () => marketPool(state, { role: filter === 'all' ? null : filter, limit: 20 }),
    [state, filter],
  )

  const handleRelease = (slotId) => {
    onChange(releasePlayer(state, slotId))
    setMsg(t('career.released'))
  }

  const handleSign = (player) => {
    const slot = openSlot || ROLES.find((r) => !state.lineup?.[r.id])?.id
    if (!slot) {
      setMsg(t('career.noOpenSlot'))
      return
    }
    const res = signPlayer(state, slot, player)
    if (!res.ok) {
      setMsg(t(`career.err.${res.error}`))
      return
    }
    onChange(res.state)
    setMsg(t('career.signed', { name: player.name }))
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 pb-[calc(5rem+env(safe-area-inset-bottom,0px))]">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-cs-muted hover:text-cs-gold"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('common.back')}
      </button>
      <h1 className="mb-1 font-display text-2xl font-bold">{t('career.marketTitle')}</h1>
      <p className="mb-4 text-sm text-cs-muted">
        {t('career.budget')}: <span className="font-mono text-cs-gold">${state.budget}</span>
        {openSlot ? ` · ${t('career.signingFor', { slot: openSlot })}` : ` · ${t('career.releaseToSign')}`}
      </p>
      {msg && <p className="mb-3 text-xs text-cs-gold">{msg}</p>}

      <div className="mb-4 panel rounded-xl p-3">
        <h2 className="mb-2 font-display text-[10px] tracking-[0.2em] text-cs-gold uppercase">
          {t('career.yourRoster')}
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {ROLES.map((role) => {
            const p = state.lineup?.[role.id]
            return (
              <div
                key={role.id}
                className="flex items-center justify-between gap-2 rounded border border-cs-border bg-cs-bg/40 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {p?.fromTeam && <TeamLogo name={p.fromTeam} size="sm" decorative />}
                  <div className="min-w-0">
                    <div className="text-[10px] text-cs-muted">{role.short}</div>
                    <div className="truncate text-sm font-semibold">{p?.name || '—'}</div>
                    {p && (
                      <div className="font-mono text-[10px] text-cs-gold">
                        ${p.salary || contractCost(p)}/w · ${p.buyout || contractCost(p)}
                      </div>
                    )}
                  </div>
                </div>
                {p && (
                  <button
                    type="button"
                    className="btn-ghost inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] uppercase"
                    onClick={() => handleRelease(role.id)}
                  >
                    <UserMinus className="h-3 w-3" />
                    {t('career.release')}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label={t('career.filterAll')} />
        {ROLES.map((r) => (
          <FilterChip
            key={r.id}
            active={filter === r.id}
            onClick={() => setFilter(r.id)}
            label={r.short}
          />
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {pool.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-cs-border bg-cs-panel/70 px-3 py-2.5"
          >
            <div className="flex min-w-0 items-center gap-2">
              <TeamLogo name={p.fromTeam} size="sm" decorative />
              <div className="min-w-0">
                <div className="truncate font-display text-sm font-bold">{p.name}</div>
                <div className="flex min-w-0 items-center gap-1 text-[10px] text-cs-muted">
                  <span className="truncate">
                    {p.role} · {p.fromTeam} · {Number(p.rating).toFixed(2)}
                  </span>
                </div>
                <div className="font-mono text-[10px] text-cs-gold">
                  ${p.cost} · ${p.salary}/w
                </div>
              </div>
            </div>
            <button
              type="button"
              disabled={!openSlot || state.budget < p.cost}
              className="btn-gold inline-flex shrink-0 items-center gap-1 rounded px-2.5 py-1.5 text-[10px] uppercase disabled:opacity-40"
              onClick={() => handleSign(p)}
            >
              <UserPlus className="h-3 w-3" />
              {t('career.sign')}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function FilterChip({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
        active ? 'border-cs-gold bg-cs-gold/15 text-cs-gold' : 'border-cs-border text-cs-muted'
      }`}
    >
      {label}
    </button>
  )
}
