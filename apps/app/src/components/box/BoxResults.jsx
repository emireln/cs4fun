import { motion } from 'framer-motion'
import { Crown, Download, Home, Package, RotateCcw, Share2, Swords, Trophy } from 'lucide-react'
import { useState } from 'react'
import { useI18n } from '../../i18n'
import { useAuth } from '../../lib/auth'
import { RARITY_META, scoreBoxBattle } from '../../lib/boxBattle'
import { downloadShareCard, shareResult } from '../../lib/history'
import BoxDropCard from './BoxDropCard'

/** Distinct vault-style finish screen for Box Battle */
export default function BoxResults({
  won,
  tie,
  myTotal,
  oppTotal,
  myDrops,
  oppDrops,
  myBest,
  oppBest,
  caseIds = [],
  caseName,
  profile,
  submitInfo,
  statsSnapshot,
  onHome,
  onRetry,
  onRematch,
  onNeedAuth,
}) {
  const { t, locale, currency, money } = useI18n()
  const { isAuthed } = useAuth()
  const [shared, setShared] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const score = scoreBoxBattle({
    won: won && !tie,
    totalValue: myTotal,
    bestDrop: myBest,
    rounds: myDrops,
  })
  const maxBar = Math.max(myTotal, oppTotal, 1)
  const title = tie ? t('box.tie') : won ? t('box.victory') : t('box.defeat')
  const showGuestNudge =
    !isAuthed &&
    typeof onNeedAuth === 'function' &&
    (won || myBest?.rarity === 'gold' || myBest?.rarity === 'covert')

  const cardPayload = {
    mode: 'box',
    won: won && !tie,
    title,
    score,
    wins: won && !tie ? 1 : 0,
    losses: !won && !tie ? 1 : 0,
    nickname: profile?.nickname || 'Player',
    locale,
    currency,
    boxDrops: myDrops,
    myTotal,
    oppTotal,
    caseName: caseName || (caseIds?.length ? t('box.opensCount', { n: caseIds.length }) : null),
  }

  const handleShare = async () => {
    const res = await shareResult(cardPayload)
    if (res.ok) {
      setShared(true)
      setTimeout(() => setShared(false), 1800)
    }
  }

  const handleDownload = async () => {
    setDownloading(true)
    await downloadShareCard(cardPayload)
    setDownloading(false)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 pb-[calc(5rem+env(safe-area-inset-bottom,0px))]">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border border-cs-gold/30 bg-gradient-to-b from-[#16120a] via-cs-panel to-cs-bg"
      >
        <div className="relative px-5 py-8 text-center sm:px-8">
          <div className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              background:
                'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(232,197,71,0.35), transparent 70%)',
            }}
          />
          <Package className="relative mx-auto mb-3 h-10 w-10 text-cs-gold" />
          <p className="relative font-display text-[10px] tracking-[0.28em] text-cs-gold uppercase">
            {t('box.vaultTitle')}
          </p>
          <h1
            className={`relative mt-2 font-display text-3xl font-extrabold sm:text-4xl ${
              tie ? 'text-cs-muted' : won ? 'gold-text' : 'text-cs-loss'
            }`}
          >
            {title}
          </h1>
          <p className="relative mx-auto mt-2 max-w-md text-sm text-cs-muted">{t('box.vaultSubtitle')}</p>

          <div className="relative mt-6 font-display text-3xl font-bold sm:text-4xl">
            <span className="text-cs-gold">{money(myTotal)}</span>
            <span className="mx-3 text-lg text-cs-muted">vs</span>
            <span className="text-cs-loss">{money(oppTotal)}</span>
          </div>
          {caseName && (
            <p className="relative mt-2 text-xs text-cs-muted">
              {caseName} · {t('box.opensCount', { n: myDrops.length })}
            </p>
          )}

          <div className="relative mx-auto mt-5 max-w-md">
            <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider text-cs-muted">
              <span>{t('box.valueBar')}</span>
              <span className="font-mono text-cs-gold">{score}</span>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full border border-cs-border bg-cs-bg">
              <div
                className="bg-cs-gold transition-all duration-700"
                style={{ width: `${(myTotal / maxBar) * 100}%` }}
              />
              <div
                className="bg-cs-loss/80 transition-all duration-700"
                style={{ width: `${(oppTotal / maxBar) * 100}%` }}
              />
            </div>
          </div>

          {submitInfo?.ok && submitInfo.global ? (
            <p className="relative mt-3 text-[11px] text-cs-muted">{t('results.submitted')}</p>
          ) : null}
        </div>

        <div className="grid gap-4 border-t border-cs-border/60 px-4 py-5 sm:grid-cols-2 sm:px-6">
          <BestPull title={t('box.yourBest')} drop={myBest} />
          <BestPull title={t('box.theirBest')} drop={oppBest} />
        </div>

        <div className="border-t border-cs-border/60 px-4 py-5 sm:px-6">
          <h2 className="mb-3 font-display text-[10px] font-bold tracking-[0.2em] text-cs-gold uppercase">
            {t('box.yourVault')}
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
            {myDrops.map((d) => (
              <BoxDropCard key={d.id} drop={d} highlight={myBest?.id === d.id} />
            ))}
          </div>
        </div>

        <div className="border-t border-cs-border/60 px-4 py-5 sm:px-6">
          <h2 className="mb-3 font-display text-[10px] font-bold tracking-[0.2em] text-cs-muted uppercase">
            {t('box.rivalVault')}
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
            {oppDrops.map((d) => (
              <BoxDropCard key={d.id} drop={d} highlight={oppBest?.id === d.id} />
            ))}
          </div>
        </div>

        <div className="border-t border-cs-border/60 px-4 py-5 sm:px-6">
          <h2 className="mb-2 font-display text-[10px] font-bold tracking-[0.2em] text-cs-gold uppercase">
            {t('box.roundLog')}
          </h2>
          <ol className="divide-y divide-cs-border/40">
            {myDrops.map((d, i) => {
              const theirs = oppDrops[i]
              const tiedRound = theirs != null && d.value === theirs.value
              const wonRound = !theirs || d.value > theirs.value
              return (
                <li
                  key={`${d.id}-${i}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2"
                >
                  <span className="w-9 shrink-0 font-mono text-[10px] text-cs-muted">
                    {t('box.roundShort', { n: i + 1 })}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs">
                    <span style={{ color: RARITY_META[d.rarity]?.color || undefined }}>{d.name}</span>
                    <span className="mx-1.5 text-cs-muted">·</span>
                    <span className="text-cs-muted">
                      {theirs ? `vs ${theirs.name}` : '—'}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[11px]">
                    <span className="text-cs-gold">{money(d.value)}</span>
                    <span className="mx-1 text-cs-muted">vs</span>
                    <span className="text-cs-loss">{theirs ? money(theirs.value) : '—'}</span>
                  </span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      tiedRound
                        ? 'bg-cs-border/40 text-cs-muted'
                        : wonRound
                          ? 'bg-cs-gold/15 text-cs-gold'
                          : 'bg-cs-loss/15 text-cs-loss'
                    }`}
                  >
                    {tiedRound ? t('box.tie') : wonRound ? t('box.youWin') : t('box.youLose')}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>

        {statsSnapshot?.bestDrop && (
          <div className="mx-4 mb-4 rounded-xl border border-cs-gold/30 bg-cs-gold/5 p-4 sm:mx-6">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-cs-gold">
              <Crown className="h-3.5 w-3.5" /> {t('box.careerBest')}
            </div>
            <div className="flex items-center gap-3">
              <img
                src={statsSnapshot.bestDrop.image}
                alt=""
                className="h-14 w-20 object-contain"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <div className="truncate font-display font-bold">{statsSnapshot.bestDrop.name}</div>
                <div className="font-mono text-cs-gold">{money(statsSnapshot.bestDrop.value)}</div>
              </div>
            </div>
          </div>
        )}

        {showGuestNudge && (
          <div className="mx-4 mb-4 rounded-xl border border-cs-gold/35 bg-cs-gold/10 px-4 py-3 text-left sm:mx-6">
            <p className="text-sm font-semibold text-cs-gold">{t('results.guestNudgeTitle')}</p>
            <p className="mt-1 text-xs text-cs-muted">{t('results.guestNudgeBlurb')}</p>
            <button
              type="button"
              className="btn-gold mt-3 rounded px-4 py-2 text-[10px] uppercase tracking-wider"
              onClick={onNeedAuth}
            >
              {t('results.guestNudgeCta')}
            </button>
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-2 border-t border-cs-border/60 px-4 py-5">
          <button
            type="button"
            className="btn-gold inline-flex items-center gap-2 rounded px-5 py-2.5 text-xs uppercase tracking-wider"
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4" />
            {shared ? t('results.shared') : t('box.sharePull')}
          </button>
          <button
            type="button"
            className="btn-ghost inline-flex items-center gap-2 rounded px-4 py-2.5 text-xs uppercase tracking-wider"
            onClick={handleDownload}
            disabled={downloading}
          >
            <Download className="h-4 w-4" />
            {t('box.savePng')}
          </button>
          {onRematch ? (
            <button
              type="button"
              className="btn-gold inline-flex items-center gap-2 rounded px-4 py-2.5 text-xs uppercase tracking-wider"
              onClick={onRematch}
            >
              <Swords className="h-4 w-4" />
              {t('results.rematch')}
            </button>
          ) : null}
          {onRetry ? (
            <button
              type="button"
              className="btn-ghost inline-flex items-center gap-2 rounded px-4 py-2.5 text-xs uppercase tracking-wider"
              onClick={onRetry}
            >
              <RotateCcw className="h-4 w-4" />
              {t('box.rematchVault')}
            </button>
          ) : null}
          <button
            type="button"
            className="btn-ghost inline-flex items-center gap-2 rounded px-4 py-2.5 text-xs uppercase tracking-wider"
            onClick={onHome}
          >
            <Home className="h-4 w-4" />
            {t('results.home')}
          </button>
        </div>

        <div className="flex flex-wrap justify-center gap-3 border-t border-cs-border/40 px-4 py-3 text-[10px] uppercase tracking-wider text-cs-muted">
          <span className="inline-flex items-center gap-1">
            <Trophy className="h-3 w-3 text-cs-gold" /> {t('box.statGold')}:{' '}
            {myDrops.filter((d) => d.rarity === 'gold').length}
          </span>
          <span>
            {t('box.covertHits')}: {myDrops.filter((d) => d.rarity === 'covert').length}
          </span>
        </div>
      </motion.div>
    </div>
  )
}

function BestPull({ title, drop }) {
  const { t, money } = useI18n()
  const meta = drop ? RARITY_META[drop.rarity] : null
  return (
    <div className="rounded-xl border border-cs-border/80 bg-cs-bg/50 p-4">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-cs-muted">{title}</div>
      {drop ? (
        <div className="flex items-center gap-3">
          <img src={drop.image} alt="" className="h-16 w-24 object-contain" referrerPolicy="no-referrer" />
          <div className="min-w-0">
            <div className="truncate font-display text-sm font-bold" style={{ color: meta?.color }}>
              {drop.name}
            </div>
            <div className="mt-1 text-[11px] text-cs-muted">
              {t(`box.rarity.${drop.rarity}`)} · {t(`box.wear.${drop.wear}`)}
            </div>
            <div className="font-mono text-cs-gold">{money(drop.value)}</div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-cs-muted">—</div>
      )}
    </div>
  )
}
