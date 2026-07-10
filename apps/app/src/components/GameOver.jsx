import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Skull, RotateCcw, Home, Share2, Download, Swords, Flame, Coffee } from 'lucide-react'
import { useI18n } from '../i18n'
import { shareResult, downloadShareCard } from '../lib/history'
import { playPerfectWin, unlockAudio } from '../lib/sound'
import ResultCard from './ResultCard'
import SideConfetti from './SideConfetti'

export default function GameOver({
  title,
  subtitle,
  blurb,
  won,
  wins,
  losses,
  streak,
  score,
  place,
  lineup,
  mentality,
  mapPriority,
  submitInfo,
  onHome,
  onRetry,
  onRematch = null,
  extra = null,
  sharePayload = null,
  dailyInfo = null,
}) {
  const { t, locale } = useI18n()
  const [shared, setShared] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const mode = sharePayload?.mode || 'cs4fun'
  const nickname = sharePayload?.nickname
  const perfectMajor = mode === 'major' && won && (losses ?? 0) === 0

  useEffect(() => {
    if (!perfectMajor) return undefined
    unlockAudio()
    const id = window.setTimeout(() => playPerfectWin(), 120)
    return () => window.clearTimeout(id)
  }, [perfectMajor])

  const cardPayload = {
    mode,
    won,
    title,
    score,
    wins,
    losses,
    streak,
    nickname,
    mapPriority,
    lineup,
    place,
    locale,
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
    <div className="relative mx-auto max-w-3xl overflow-visible px-4 py-8 sm:py-10">
      {perfectMajor && <SideConfetti />}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="panel relative overflow-hidden rounded-xl"
      >
        <div
          className={`px-5 py-7 text-center sm:py-8 ${
            won ? 'bg-gradient-to-b from-cs-gold/20 to-transparent' : 'bg-gradient-to-b from-cs-loss/15 to-transparent'
          }`}
        >
          {won ? (
            <Trophy className="mx-auto mb-3 h-12 w-12 text-cs-gold" />
          ) : (
            <Skull className="mx-auto mb-3 h-12 w-12 text-cs-loss" />
          )}
          {subtitle && (
            <p className="font-display text-[10px] tracking-[0.28em] text-cs-muted uppercase">{subtitle}</p>
          )}
          <h1 className={`mt-1 font-display text-3xl font-extrabold sm:text-4xl ${won ? 'gold-text' : 'text-cs-loss'}`}>
            {title}
          </h1>
          {blurb ? <p className="mx-auto mt-2 max-w-md text-sm text-cs-muted">{blurb}</p> : null}
          {place != null && <p className="mt-2 text-cs-gold">{t('results.partyPlace', { place })}</p>}

          <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-3 rounded border border-cs-border bg-cs-bg/50 px-4 py-2 font-mono text-sm">
            {wins != null && <span className="text-cs-win">{wins}W</span>}
            {losses != null && <span className="text-cs-loss">{losses}L</span>}
            {streak != null && <span className="text-cs-warn">{streak}</span>}
            {score != null && <span className="text-cs-gold">{score}</span>}
            {mapPriority && <span className="text-cs-muted">{mapPriority}</span>}
          </div>

          {dailyInfo && (
            <div className="mx-auto mt-4 max-w-sm rounded border border-cs-gold/30 bg-cs-gold/10 px-4 py-3 text-sm">
              <div className="flex items-center justify-center gap-2 font-semibold text-cs-gold">
                <Flame className="h-4 w-4" />
                {t('daily.streakDay', { n: dailyInfo.currentStreak })}
              </div>
              {dailyInfo.bestStreak > 0 && (
                <p className="mt-1 text-xs text-cs-muted">
                  {t('daily.bestStreak', { n: dailyInfo.bestStreak })}
                </p>
              )}
              <p className="mt-2 text-xs text-cs-muted">
                {t('daily.comeBack')} · {t('daily.endsIn')} {dailyInfo.remainLabel}
              </p>
            </div>
          )}

          {submitInfo && (
            <p className="mt-2 text-[11px] text-cs-muted">
              {submitInfo.global ? t('results.submitted') : t('results.localOnly')}
            </p>
          )}
          {submitInfo?.newBadges?.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {submitInfo.newBadges.map((id) => (
                <span
                  key={id}
                  className="rounded border border-cs-gold/40 bg-cs-gold/15 px-2.5 py-1 text-xs font-bold text-cs-gold"
                >
                  {t('badges.new')} {t(`badges.${id}.title`)}
                </span>
              ))}
            </div>
          )}
          {extra}
        </div>

        <div className="border-t border-cs-border px-3 py-4 sm:px-4">
          <p className="mb-2 text-center font-display text-[10px] tracking-[0.2em] text-cs-muted uppercase">
            {t('results.shareCard')}
          </p>
          <ResultCard
            won={won}
            title={title}
            mode={mode}
            score={score}
            wins={wins}
            losses={losses}
            streak={streak}
            nickname={nickname}
            mapPriority={mapPriority}
            lineup={lineup}
          />
        </div>

        <div className="flex flex-wrap justify-center gap-2 border-t border-cs-border px-4 py-5">
          <button
            type="button"
            className="btn-gold inline-flex items-center gap-2 rounded px-5 py-2.5 text-xs uppercase tracking-wider"
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4" />
            {shared ? t('results.shared') : t('results.share')}
          </button>
          <button
            type="button"
            className="btn-ghost inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded px-2.5 py-2.5"
            onClick={handleDownload}
            disabled={downloading}
            title={t('results.saveCard')}
            aria-label={t('results.saveCard')}
          >
            <Download className="h-4 w-4" />
          </button>
          {onRematch && (
            <button
              type="button"
              className="btn-gold inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded px-2.5 py-2.5"
              onClick={onRematch}
              title={t('results.rematch')}
              aria-label={t('results.rematch')}
            >
              <Swords className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            className="btn-ghost inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded px-2.5 py-2.5"
            onClick={onRetry}
            title={t('results.newRun')}
            aria-label={t('results.newRun')}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="btn-ghost inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded px-2.5 py-2.5"
            onClick={onHome}
            title={t('results.home')}
            aria-label={t('results.home')}
          >
            <Home className="h-4 w-4" />
          </button>
          <a
            href="https://buymeacoffee.com/emireln"
            target="_blank"
            rel="noopener noreferrer"
            title={t('meta.support')}
            aria-label={t('meta.support')}
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded border border-cs-gold/35 bg-cs-gold/10 px-2.5 py-2.5 text-cs-gold transition hover:border-cs-gold hover:bg-cs-gold/20"
          >
            <Coffee className="h-4 w-4" aria-hidden />
          </a>
        </div>
      </motion.div>
    </div>
  )
}
