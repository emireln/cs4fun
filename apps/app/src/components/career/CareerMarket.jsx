import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ChevronDown, Search, UserMinus, UserPlus } from 'lucide-react'
import { useI18n } from '../../i18n'
import { ROLES } from '../../data/constants'
import { marketPool, releasePlayer, signPlayer, movePlayerSlot, contractCost, weeklySalary } from '../../lib/career'
import TeamLogo from '../TeamLogo'

const SORT_OPTIONS = [
  { value: 'rating', labelKey: 'career.sortRating' },
  { value: 'cost', labelKey: 'career.sortCostAsc' },
  { value: 'cost_desc', labelKey: 'career.sortCostDesc' },
  { value: 'name', labelKey: 'career.sortName' },
  { value: 'team', labelKey: 'career.sortTeam' },
]

export default function CareerMarket({ state, onChange, onBack }) {
  const { t, money } = useI18n()
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('rating')
  const [msg, setMsg] = useState('')
  const deferredQuery = useDeferredValue(query)
  const openSlots = useMemo(
    () => ROLES.filter((r) => !state.lineup?.[r.id]).map((r) => r.id),
    [state.lineup],
  )
  const [signSlot, setSignSlot] = useState(null)

  useEffect(() => {
    setSignSlot((prev) => {
      if (prev && openSlots.includes(prev)) return prev
      return openSlots[0] || null
    })
  }, [openSlots])

  const pool = useMemo(
    () =>
      marketPool(state, {
        role: filter === 'all' ? null : filter,
        query: deferredQuery,
        sort,
      }),
    [state, filter, deferredQuery, sort],
  )

  const handleRelease = (slotId) => {
    onChange(releasePlayer(state, slotId))
    setMsg(t('career.released'))
  }

  const handleMove = (fromSlot, toSlot) => {
    if (fromSlot === toSlot) return
    onChange(movePlayerSlot(state, fromSlot, toSlot))
    setMsg(t('career.roleMoved'))
  }

  const handleSign = (player) => {
    const slot = signSlot || openSlots[0]
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
    setMsg(t('career.signed', { name: player.name, slot: ROLES.find((r) => r.id === slot)?.short || slot }))
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
        {t('career.budget')}: <span className="font-mono text-cs-gold">{money(state.budget)}</span>
        {signSlot
          ? ` · ${t('career.signingFor', { slot: ROLES.find((r) => r.id === signSlot)?.short || signSlot })}`
          : ` · ${t('career.releaseToSign')}`}
      </p>
      {msg && <p className="mb-3 text-xs text-cs-gold">{msg}</p>}

      {openSlots.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-cs-muted uppercase">
            {t('career.pickSignRole')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {openSlots.map((id) => {
              const role = ROLES.find((r) => r.id === id)
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSignSlot(id)}
                  className={`rounded border px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase ${
                    signSlot === id
                      ? 'border-cs-gold bg-cs-gold/15 text-cs-gold'
                      : 'border-cs-border text-cs-muted hover:border-cs-gold/40'
                  }`}
                >
                  {role?.short || id}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="mb-4 panel rounded-xl p-3">
        <h2 className="mb-2 font-display text-[10px] tracking-[0.2em] text-cs-gold uppercase">
          {t('career.yourRoster')}
        </h2>
        <p className="mb-2 text-[10px] text-cs-muted">{t('career.roleMoveHint')}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {ROLES.map((role) => {
            const p = state.lineup?.[role.id]
            return (
              <div
                key={role.id}
                className={`flex items-center justify-between gap-2 rounded border px-3 py-2 ${
                  signSlot === role.id && !p
                    ? 'border-cs-gold/50 bg-cs-gold/10'
                    : 'border-cs-border bg-cs-bg/40'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  {p?.fromTeam && <TeamLogo name={p.fromTeam} size="sm" decorative />}
                  <div className="min-w-0">
                    <div className="text-[10px] text-cs-muted">{role.short}</div>
                    <div className="truncate text-sm font-semibold">{p?.name || '—'}</div>
                    {p && (
                      <div className="font-mono text-[10px] text-cs-gold">
                        {money(p.salary || weeklySalary(p))}/w · {money(p.buyout || contractCost(p))}
                      </div>
                    )}
                  </div>
                </div>
                {p && (
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <RoleMoveMenu
                      currentSlot={role.id}
                      onMove={(to) => handleMove(role.id, to)}
                      t={t}
                    />
                    <button
                      type="button"
                      className="btn-ghost inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] uppercase"
                      onClick={() => handleRelease(role.id)}
                    >
                      <UserMinus className="h-3 w-3" />
                      {t('career.release')}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-cs-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('career.searchPlayers')}
            className="w-full rounded-lg border border-cs-border bg-cs-bg/60 py-2.5 pr-3 pl-9 text-sm text-cs-text outline-none placeholder:text-cs-muted focus:border-cs-gold/50"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <SortMenu value={sort} onChange={setSort} t={t} />
      </div>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
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
        <p className="font-mono text-[10px] text-cs-muted">
          {t('career.marketCount', { n: pool.length })}
        </p>
      </div>

      {pool.length === 0 ? (
        <p className="rounded-lg border border-dashed border-cs-border px-4 py-8 text-center text-sm text-cs-muted">
          {t('career.marketEmpty')}
        </p>
      ) : (
        <div className="grid max-h-[min(70dvh,36rem)] gap-2 overflow-y-auto overscroll-contain pr-0.5 sm:grid-cols-2">
          {pool.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-cs-border bg-cs-panel/70 px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2">
                <TeamLogo name={p.fromTeam} size="sm" decorative />
                <div className="min-w-0">
                  <div className="truncate font-display text-sm font-bold">{p.name}</div>
                  <div className="truncate text-[10px] text-cs-muted">
                    {p.role} · {p.fromTeam}
                    {p.year ? ` · ${p.year}` : ''} · {Number(p.rating).toFixed(2)}
                  </div>
                  <div className="font-mono text-[10px] text-cs-gold">
                    {money(p.cost)} · {money(p.salary)}/w
                  </div>
                </div>
              </div>
              <button
                type="button"
                disabled={!signSlot || state.budget < p.cost}
                className="btn-gold inline-flex shrink-0 items-center gap-1 rounded px-2.5 py-1.5 text-[10px] uppercase disabled:opacity-40"
                onClick={() => handleSign(p)}
              >
                <UserPlus className="h-3 w-3" />
                {t('career.sign')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RoleMoveMenu({ currentSlot, onMove, t }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-bold tracking-wider uppercase transition ${
          open
            ? 'border-cs-gold/50 bg-cs-gold/15 text-cs-gold'
            : 'border-cs-border text-cs-muted hover:border-cs-gold/40 hover:text-cs-gold'
        }`}
      >
        {t('career.changeRole')}
        <ChevronDown className={`h-3 w-3 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute top-[calc(100%+0.25rem)] right-0 z-30 min-w-[7.5rem] overflow-hidden rounded-lg border border-cs-border bg-[#12151c] py-1 shadow-[0_12px_32px_rgba(0,0,0,0.55)]"
        >
          {ROLES.map((role) => {
            const active = role.id === currentSlot
            return (
              <li key={role.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  disabled={active}
                  onClick={() => {
                    onMove(role.id)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center px-3 py-1.5 text-left text-[10px] font-bold tracking-wider uppercase transition ${
                    active
                      ? 'bg-cs-gold/15 text-cs-gold'
                      : 'text-cs-muted hover:bg-cs-gold/10 hover:text-cs-text disabled:opacity-40'
                  }`}
                >
                  {role.short}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function SortMenu({ value, onChange, t }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const current = SORT_OPTIONS.find((o) => o.value === value) || SORT_OPTIONS[0]

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative shrink-0 sm:min-w-[9.5rem]">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('career.sortLabel')}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-xs font-bold tracking-wider uppercase transition ${
          open
            ? 'border-cs-gold/50 bg-cs-gold/15 text-cs-gold'
            : 'border-cs-border bg-cs-bg/60 text-cs-muted hover:border-cs-gold/40 hover:text-cs-gold'
        }`}
      >
        <span>{t(current.labelKey)}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute top-[calc(100%+0.35rem)] right-0 z-30 min-w-full overflow-hidden rounded-lg border border-cs-border bg-[#12151c] py-1 shadow-[0_12px_32px_rgba(0,0,0,0.55)]"
        >
          {SORT_OPTIONS.map((opt) => {
            const active = opt.value === value
            return (
              <li key={opt.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center px-3 py-2 text-left text-xs font-bold tracking-wider uppercase transition ${
                    active
                      ? 'bg-cs-gold/15 text-cs-gold'
                      : 'text-cs-muted hover:bg-cs-gold/10 hover:text-cs-text'
                  }`}
                >
                  {t(opt.labelKey)}
                </button>
              </li>
            )
          })}
        </ul>
      )}
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
