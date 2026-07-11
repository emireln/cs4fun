import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Package, Sparkles, Swords, Users } from 'lucide-react'
import { useI18n } from '../../i18n'
import { formatUsd, listCases, readBoxStats, RARITY_META } from '../../lib/boxBattle'

export default function BoxSetup({
  profile,
  onStart,
  onNeedFriends,
  initialCaseId = null,
  locked = false,
}) {
  const { t } = useI18n()
  const cases = useMemo(() => listCases(), [])
  const stats = useMemo(() => readBoxStats(profile?.id), [profile?.id])
  const [caseId, setCaseId] = useState(initialCaseId || cases[0]?.id)
  const [rounds, setRounds] = useState(3)
  const [vsBot, setVsBot] = useState(true)
  const selected = cases.find((c) => c.id === caseId) || cases[0]

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-[calc(5rem+env(safe-area-inset-bottom,0px))]">
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
                  {RARITY_META[stats.bestDrop.rarity]?.label}
                </span>
                <span className="font-mono text-cs-gold">{formatUsd(stats.bestDrop.value)}</span>
                {stats.bestDrop.caseName && <span>· {stats.bestDrop.caseName}</span>}
              </div>
            </div>
            <div className="hidden shrink-0 text-right sm:block">
              <div className="font-mono text-xs text-cs-muted">{t('box.record')}</div>
              <div className="font-display text-lg text-cs-gold">
                {stats.wins}–{stats.losses}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {[3, 5, 7].map((n) => (
          <button
            key={n}
            type="button"
            disabled={locked}
            onClick={() => setRounds(n)}
            className={`rounded border px-3 py-2 text-xs font-bold uppercase tracking-wider transition ${
              rounds === n
                ? 'border-cs-gold bg-cs-gold/15 text-cs-gold'
                : 'border-cs-border text-cs-muted hover:border-cs-gold/40'
            }`}
          >
            {t('box.rounds', { n })}
          </button>
        ))}
      </div>

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

      <h2 className="mb-3 font-display text-xs font-bold tracking-[0.22em] text-cs-gold uppercase">
        {t('box.pickCase')}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cases.map((c) => {
          const active = c.id === selected?.id
          return (
            <button
              key={c.id}
              type="button"
              disabled={locked}
              onClick={() => setCaseId(c.id)}
              className={`group relative overflow-hidden rounded-xl border p-3 text-left transition ${
                active
                  ? 'border-cs-gold bg-cs-gold/10 shadow-[0_0_24px_rgba(232,197,71,0.18)]'
                  : 'border-cs-border bg-cs-panel/80 hover:border-cs-gold/40'
              }`}
            >
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

      {selected && (
        <div className="mt-6 flex flex-col items-center gap-4 rounded-xl border border-cs-border bg-cs-panel/60 p-4 sm:flex-row sm:p-5">
          <img
            src={selected.image}
            alt=""
            className="h-28 w-40 object-contain sm:h-32 sm:w-44"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="font-display text-xl font-bold text-cs-gold">{selected.name}</div>
            <p className="mt-1 text-sm text-cs-muted">
              {t('box.caseMeta', { n: selected.items.length, rounds })}
            </p>
          </div>
          <button
            type="button"
            className="btn-gold inline-flex w-full items-center justify-center gap-2 rounded px-8 py-3 text-xs uppercase tracking-[0.18em] sm:w-auto"
            onClick={() =>
              onStart({
                caseId: selected.id,
                rounds,
                vsBot,
              })
            }
          >
            <Package className="h-4 w-4" />
            {t('box.startBattle')}
          </button>
        </div>
      )}

      <BoxCareerStats stats={stats} />
    </div>
  )
}

function BoxCareerStats({ stats }) {
  const { t } = useI18n()
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
          { label: t('box.statPulled'), value: formatUsd(stats.totalValue) },
          {
            label: t('box.statMargin'),
            value: stats.biggestWinMargin ? formatUsd(stats.biggestWinMargin) : '—',
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
      {stats.recentDrops?.length > 0 && (
        <div>
          <h3 className="mb-2 text-center font-display text-[10px] font-bold tracking-[0.2em] text-cs-gold uppercase">
            {t('box.recentPulls')}
          </h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {stats.recentDrops.slice(0, 6).map((d, i) => (
              <div
                key={`${d.name}-${i}`}
                className="rounded border border-cs-border bg-cs-panel/50 p-2 text-center"
              >
                <img
                  src={d.image}
                  alt=""
                  className="mx-auto h-10 w-14 object-contain"
                  referrerPolicy="no-referrer"
                />
                <div className="mt-1 truncate text-[9px] text-cs-muted">{d.name}</div>
                <div className="font-mono text-[10px] text-cs-gold">{formatUsd(d.value)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
