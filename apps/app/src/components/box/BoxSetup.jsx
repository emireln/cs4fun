import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Dices, Package, Sparkles, Swords, Trash2, Users, X } from 'lucide-react'
import { useI18n } from '../../i18n'
import { autoPickCases, caseOfTheWeek, getCase, listCases, readBoxStats, RARITY_META } from '../../lib/boxBattle'

const MAX_OPENS = 10

export default function BoxSetup({
  profile,
  onStart,
  onNeedFriends,
  initialCaseId = null,
  locked = false,
}) {
  const { t, money } = useI18n()
  const cases = useMemo(() => listCases(), [])
  const weeklyCase = useMemo(() => caseOfTheWeek(), [])
  const stats = useMemo(() => readBoxStats(profile?.id), [profile?.id])
  const [queue, setQueue] = useState(() =>
    initialCaseId ? [initialCaseId] : cases[0] ? [cases[0].id] : [],
  )
  const [vsBot, setVsBot] = useState(true)
  const preview = getCase(queue[queue.length - 1] || cases[0]?.id)

  const addCase = (id) => {
    if (locked) return
    setQueue((q) => (q.length >= MAX_OPENS ? q : [...q, id]))
  }

  const removeAt = (idx) => {
    if (locked) return
    setQueue((q) => q.filter((_, i) => i !== idx))
  }

  const autoFill = () => {
    if (locked) return
    const need = MAX_OPENS - queue.length
    if (need <= 0) return
    const picked = autoPickCases(need, `${profile?.id || 'p'}-fill-${Date.now()}`)
    setQueue((q) => [...q, ...picked].slice(0, MAX_OPENS))
  }

  const surprise = () => {
    if (locked) return
    const n = Math.max(3, queue.length || 5)
    setQueue(autoPickCases(n, `${profile?.id || 'p'}-surprise-${Date.now()}`))
  }

  const startBattle = () => {
    if (!queue.length) return
    onStart({
      caseId: queue[0],
      caseIds: queue,
      rounds: queue.length,
      vsBot,
    })
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(5rem+env(safe-area-inset-bottom,0px))]">
      <div className="mb-6 text-center">
        <p className="font-display text-xs tracking-[0.28em] text-cs-gold uppercase">{t('box.eyebrow')}</p>
        <h1 className="mt-2 font-display text-3xl font-bold gold-text sm:text-4xl">{t('modes.box.title')}</h1>
        <p className="mt-2 text-sm text-cs-muted">{t('modes.box.blurb')}</p>
        <p className="mt-1 text-[10px] text-cs-muted/70">{t('box.disclaimer')}</p>
        <p className="mt-2 font-mono text-[10px] text-cs-gold/80">
          {t('box.casesAvailable', { n: cases.length })}
        </p>
      </div>

      {stats.bestDrop && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 overflow-hidden rounded-xl border border-cs-gold/35 bg-gradient-to-r from-cs-gold/15 via-cs-panel to-cs-panel"
        >
          <div className="flex items-center gap-3 p-3 sm:p-4">
            <img
              src={stats.bestDrop.image}
              alt=""
              className="h-14 w-20 shrink-0 object-contain sm:h-16 sm:w-24"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-cs-gold">
                <Sparkles className="h-3.5 w-3.5" />
                {t('box.bestDropEver')}
              </div>
              <div className="truncate font-display text-sm font-bold text-cs-text sm:text-base">
                {stats.bestDrop.name}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-cs-muted">
                <span style={{ color: RARITY_META[stats.bestDrop.rarity]?.color }}>
                  {t(`box.rarity.${stats.bestDrop.rarity}`)}
                </span>
                <span className="font-mono text-cs-gold">{money(stats.bestDrop.value)}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {!locked && (
        <div className="mb-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setVsBot(true)}
            className={`inline-flex items-center gap-2 rounded border px-4 py-2.5 text-xs font-bold uppercase tracking-wider ${
              vsBot ? 'border-cs-gold bg-cs-gold/15 text-cs-gold' : 'border-cs-border text-cs-muted'
            }`}
          >
            <Swords className="h-4 w-4" /> {t('box.vsBot')}
          </button>
          <button
            type="button"
            onClick={() => {
              setVsBot(false)
              onNeedFriends?.('box')
            }}
            className="inline-flex items-center gap-2 rounded border border-cs-border px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-cs-muted hover:border-cs-gold/40"
          >
            <Users className="h-4 w-4" /> {t('box.vsFriends')}
          </button>
        </div>
      )}

      {!locked && weeklyCase && (
        <div className="mb-5 flex flex-col gap-3 overflow-hidden rounded-xl border border-cs-gold/35 bg-gradient-to-r from-cs-gold/15 via-cs-panel to-cs-panel p-4 sm:flex-row sm:items-center">
          {weeklyCase.image && (
            <img
              src={weeklyCase.image}
              alt=""
              className="h-20 w-28 shrink-0 object-contain"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-cs-gold">
              {t('box.caseOfWeekTitle')}
            </p>
            <h2 className="truncate font-display text-lg font-bold">{weeklyCase.short || weeklyCase.name}</h2>
            <p className="mt-1 text-xs text-cs-muted">{t('box.caseOfWeekHint')}</p>
          </div>
          <button
            type="button"
            className="btn-gold rounded px-4 py-2 text-xs uppercase tracking-wider"
            disabled={queue.length >= MAX_OPENS}
            onClick={() => addCase(weeklyCase.id)}
          >
            {t('box.addCase')}
          </button>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xs font-bold tracking-[0.22em] text-cs-gold uppercase">
          {t('box.queueLabel', { n: queue.length })}
        </h2>
        {!locked && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={autoFill}
              disabled={queue.length >= MAX_OPENS}
              className="inline-flex items-center gap-1.5 rounded border border-cs-border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cs-muted hover:border-cs-gold/40 disabled:opacity-40"
            >
              <Dices className="h-3.5 w-3.5" /> {t('box.autoFill')}
            </button>
            <button
              type="button"
              onClick={surprise}
              className="inline-flex items-center gap-1.5 rounded border border-cs-gold/40 bg-cs-gold/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cs-gold"
            >
              <Sparkles className="h-3.5 w-3.5" /> {t('box.autoFillAll')}
            </button>
            <button
              type="button"
              onClick={() => setQueue([])}
              disabled={!queue.length}
              className="inline-flex items-center gap-1.5 rounded border border-cs-border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cs-muted hover:border-cs-loss/40 disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" /> {t('box.clearQueue')}
            </button>
          </div>
        )}
      </div>
      <p className="mb-3 text-xs text-cs-muted">{t('box.pickCaseHint')}</p>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {Array.from({ length: MAX_OPENS }).map((_, i) => {
          const id = queue[i]
          const c = id ? getCase(id) : null
          return (
            <div
              key={`slot-${i}`}
              className={`relative flex h-24 w-20 shrink-0 flex-col items-center justify-center rounded-lg border sm:h-28 sm:w-24 ${
                c ? 'border-cs-gold/50 bg-cs-gold/10' : 'border-dashed border-cs-border bg-cs-bg/40'
              }`}
            >
              {c ? (
                <>
                  <img
                    src={c.image}
                    alt=""
                    className="h-12 w-16 object-contain sm:h-14 sm:w-20"
                    referrerPolicy="no-referrer"
                  />
                  <div className="mt-1 truncate px-1 text-[9px] text-cs-gold">{c.short}</div>
                  {!locked && (
                    <button
                      type="button"
                      onClick={() => removeAt(i)}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-cs-border bg-cs-panel text-cs-muted hover:text-cs-loss"
                      title={t('box.removeSlot')}
                      aria-label={t('box.removeSlot')}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </>
              ) : (
                <span className="px-1 text-center text-[9px] uppercase tracking-wider text-cs-muted">
                  {i === queue.length ? t('box.addCase') : t('box.queueEmpty')}
                </span>
              )}
              <span className="absolute bottom-1 left-1 font-mono text-[9px] text-cs-muted/70">{i + 1}</span>
            </div>
          )
        })}
      </div>

      <h2 className="mb-3 font-display text-xs font-bold tracking-[0.22em] text-cs-gold uppercase">
        {t('box.pickCase')}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cases.map((c) => {
          const inQueue = queue.filter((id) => id === c.id).length
          const full = queue.length >= MAX_OPENS
          return (
            <button
              key={c.id}
              type="button"
              disabled={locked || full}
              onClick={() => addCase(c.id)}
              className={`group relative overflow-hidden rounded-xl border p-3 text-left transition ${
                inQueue
                  ? 'border-cs-gold bg-cs-gold/10 shadow-[0_0_24px_rgba(232,197,71,0.12)]'
                  : 'border-cs-border bg-cs-panel/80 hover:border-cs-gold/40'
              } disabled:opacity-50`}
            >
              {inQueue > 0 && (
                <span className="absolute right-2 top-2 rounded bg-cs-gold px-1.5 py-0.5 font-mono text-[10px] font-bold text-cs-bg">
                  ×{inQueue}
                </span>
              )}
              <img
                src={c.image}
                alt=""
                className="mx-auto h-20 w-full object-contain transition group-hover:scale-105 sm:h-24"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <div className="mt-2 truncate font-display text-[11px] font-bold sm:text-xs">{c.short}</div>
              <div className="text-[10px] text-cs-muted">{c.year}</div>
            </button>
          )
        })}
      </div>

      {preview && (
        <div className="mt-6 flex flex-col items-center gap-4 rounded-xl border border-cs-border bg-cs-panel/60 p-4 sm:flex-row sm:p-5">
          <img
            src={preview.image}
            alt=""
            className="h-28 w-40 object-contain sm:h-32 sm:w-44"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="font-display text-xl font-bold text-cs-gold">
              {t('box.opensCount', { n: queue.length || 0 })}
            </div>
            <p className="mt-1 text-sm text-cs-muted">
              {queue.length
                ? t('box.caseMeta', { n: preview.items.length, rounds: queue.length })
                : t('box.needOneCase')}
            </p>
          </div>
          <button
            type="button"
            disabled={!queue.length}
            className="btn-gold hidden w-full items-center justify-center gap-2 rounded px-8 py-3 text-xs uppercase tracking-[0.18em] disabled:opacity-40 sm:inline-flex sm:w-auto"
            onClick={startBattle}
          >
            <Package className="h-4 w-4" />
            {t('box.startBattle')}
          </button>
        </div>
      )}

      <BoxCareerStats stats={stats} />

      {/* Mobile sticky start — same pattern as draft Scout bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-cs-border/80 bg-[#0a0c10] px-3 pt-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] sm:hidden">
        <div className="mx-auto flex max-w-5xl items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-[11px] text-cs-gold">
              {t('box.opensCount', { n: queue.length || 0 })}
            </p>
            <p className="truncate text-[10px] text-cs-muted">
              {queue.length ? t('box.queueLabel', { n: queue.length }) : t('box.needOneCase')}
            </p>
          </div>
          <button
            type="button"
            disabled={!queue.length}
            className="btn-gold inline-flex min-h-[48px] flex-[1.4] items-center justify-center gap-2 rounded px-4 py-3 text-xs uppercase tracking-[0.15em] disabled:opacity-40"
            onClick={startBattle}
          >
            <Package className="h-4 w-4" />
            {t('box.startBattle')}
          </button>
        </div>
      </div>
    </div>
  )
}

function BoxCareerStats({ stats }) {
  const { t, money } = useI18n()
  if (!stats?.battles) return null
  const fav = stats.favoriteCaseId
    ? listCases().find((c) => c.id === stats.favoriteCaseId)
    : null
  return (
    <div className="mt-8 space-y-4">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: t('box.statBattles'), value: stats.battles },
          { label: t('box.statOpened'), value: stats.casesOpened },
          { label: t('box.statGold'), value: stats.goldHits },
          { label: t('box.statCovert'), value: stats.covertHits },
          { label: t('box.statPulled'), value: money(stats.totalValue) },
          {
            label: t('box.statMargin'),
            value: stats.biggestWinMargin ? money(stats.biggestWinMargin) : '—',
          },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * i }}
            className="rounded-lg border border-cs-border bg-cs-bg/40 px-3 py-3 text-center"
          >
            <div className="font-mono text-lg text-cs-gold">{s.value}</div>
            <div className="text-[10px] uppercase tracking-wider text-cs-muted">{s.label}</div>
          </motion.div>
        ))}
      </div>
      {fav && (
        <p className="text-center text-xs text-cs-muted">
          {t('box.favoriteCase')}: <span className="text-cs-gold">{fav.name}</span>
        </p>
      )}
    </div>
  )
}
