import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Crosshair, Flame, Shield, Swords, Zap, Star, Radio } from 'lucide-react'
import { getMapAsset } from '../data/maps'
import { useI18n } from '../i18n'
import { playMatchEvent, unlockAudio } from '../lib/sound'
import TeamLogo from './TeamLogo'
import OrgMark from './career/OrgMark'

const TYPE_STYLE = {
  ace: { icon: Flame, color: 'text-cs-gold', bg: 'bg-cs-gold/15 border-cs-gold/40', labelKey: 'live.feedAce' },
  clutch: { icon: Crosshair, color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-400/40', labelKey: 'live.feedClutch' },
  eco: { icon: Shield, color: 'text-cs-win', bg: 'bg-cs-win/15 border-cs-win/40', labelKey: 'live.feedEco' },
  multikill: { icon: Zap, color: 'text-violet-300', bg: 'bg-violet-500/15 border-violet-400/40', labelKey: 'live.feedMulti' },
  mapwin: { icon: Swords, color: 'text-cs-win', bg: 'bg-cs-win/15 border-cs-win/40', labelKey: 'live.feedMap' },
  maploss: { icon: Swords, color: 'text-cs-loss', bg: 'bg-cs-loss/15 border-cs-loss/40', labelKey: 'live.feedMap' },
  series: { icon: Swords, color: 'text-cs-gold', bg: 'bg-cs-gold/10 border-cs-gold/30', labelKey: 'live.feedSeries' },
  tactical: { icon: Crosshair, color: 'text-cs-info', bg: 'bg-cs-info/10 border-cs-info/30', labelKey: 'live.feedCall' },
  halftime: { icon: Shield, color: 'text-cs-warn', bg: 'bg-cs-warn/10 border-cs-warn/30', labelKey: 'live.feedHt' },
  matchpoint: { icon: Flame, color: 'text-cs-gold', bg: 'bg-cs-gold/20 border-cs-gold/45', labelKey: 'live.feedMp' },
  system: { icon: Crosshair, color: 'text-cs-muted', bg: 'bg-white/5 border-cs-border', labelKey: 'live.feedInfo' },
  buy: { icon: Shield, color: 'text-cs-muted', bg: 'bg-white/[0.03] border-cs-border/70', labelKey: 'live.feedBuy' },
  beat: { icon: Radio, color: 'text-cs-info', bg: 'bg-cs-info/10 border-cs-info/25', labelKey: 'live.feedBeat' },
  info: { icon: Radio, color: 'text-cs-muted', bg: 'bg-white/[0.03] border-cs-border/70', labelKey: 'live.feedInfo' },
  round: { icon: Swords, color: 'text-cs-text', bg: 'bg-white/[0.03] border-cs-border/80', labelKey: 'live.feedRound' },
  mvp: { icon: Star, color: 'text-cs-gold', bg: 'bg-cs-gold/20 border-cs-gold/50', labelKey: 'live.feedMvp' },
}

function parseScore(logs) {
  let you = 0
  let them = 0
  let map = null
  for (let i = logs.length - 1; i >= 0; i--) {
    const log = logs[i]
    if (log?.userRounds != null && log?.enemyRounds != null) {
      you = Number(log.userRounds) || 0
      them = Number(log.enemyRounds) || 0
      if (log.map) map = log.map
      break
    }
  }
  if (!map) {
    for (let i = logs.length - 1; i >= 0; i--) {
      if (logs[i].map) {
        map = logs[i].map
        break
      }
      const t = logs[i].text || ''
      const mm =
        t.match(/MAP(?:A)?:\s*([A-Za-z0-9]+)/i) ||
        t.match(/Live on ([A-Za-z0-9]+)/i) ||
        t.match(/Ao vivo em ([A-Za-z0-9]+)/i) ||
        t.match(/MAP WIN — ([A-Za-z0-9]+)/i) ||
        t.match(/MAP LOSS — ([A-Za-z0-9]+)/i)
      if (mm) {
        map = mm[1]
        break
      }
    }
  }
  return { you, them, map }
}

export default function MatchLive({
  logs,
  title,
  homeName = 'YOU',
  awayName = 'OPP',
  homeLogoSrc = null,
  awayLogoSrc = null,
  mapName = null,
  mapOrder = [],
  mapResults = [],
  seriesScore = null,
  mvp = null,
  speed = 1,
  onSpeedChange,
  speedLocked = false,
  paused = false,
  onTacticalPause,
  canTacticalPause = false,
  playing = false,
}) {
  const { t } = useI18n()
  const bottomRef = useRef(null)
  const heardRef = useRef(0)
  const [imgOk, setImgOk] = useState(true)

  const { you, them, map: parsedMap } = useMemo(() => parseScore(logs), [logs])
  const activeMap = mapName || parsedMap
  const asset = getMapAsset(activeMap)
  const highlightTypes = new Set(['ace', 'clutch', 'eco', 'mapwin', 'maploss', 'multikill', 'mvp', 'matchpoint'])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [logs])

  useEffect(() => {
    setImgOk(true)
  }, [activeMap])

  useEffect(() => {
    if (!logs?.length) {
      heardRef.current = 0
      return
    }
    if (logs.length <= heardRef.current) {
      heardRef.current = logs.length
      return
    }
    unlockAudio()
    for (let i = heardRef.current; i < logs.length; i++) {
      const log = logs[i]
      playMatchEvent(log.type || 'round', log.text || '')
    }
    heardRef.current = logs.length
  }, [logs])

  const feed = logs.filter(
    (l) => l.type !== 'system' || /OVERTIME|Side:|Connecting|MAP:/i.test(l.text || ''),
  )

  // Stable per-log keys: appends and resets never remount existing rows.
  const feedSeq = useRef(0)
  const feedIds = useRef(new WeakMap())
  const keyForLog = (log) => {
    let id = feedIds.current.get(log)
    if (id == null) {
      id = feedSeq.current++
      feedIds.current.set(log, id)
    }
    return id
  }

  return (
    <div className="panel overflow-hidden rounded-xl">
      {/* Series map strip */}
      {mapOrder?.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-cs-border/60 px-3 py-2.5 sm:px-4">
          <span className="font-display text-[10px] tracking-[0.18em] text-cs-muted uppercase">
            {t('live.series')}
          </span>
          {mapOrder.map((m, i) => {
            const done = mapResults[i]
            const live = !done && activeMap === m
            return (
              <span
                key={m}
                className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-semibold ${
                  live
                    ? 'border-cs-gold bg-cs-gold/15 text-cs-gold'
                    : done
                      ? done.userWon
                        ? 'border-cs-win/40 bg-cs-win/10 text-cs-win'
                        : 'border-cs-loss/40 bg-cs-loss/10 text-cs-loss'
                      : 'border-cs-border text-cs-muted'
                }`}
              >
                <span className="font-mono text-[9px] opacity-70">M{i + 1}</span>
                {m}
                {done ? (
                  <span className="font-mono text-[10px]">
                    {done.userRounds}-{done.enemyRounds}
                  </span>
                ) : null}
              </span>
            )
          })}
          {seriesScore && (
            <span className="ml-auto font-mono text-sm font-bold text-cs-gold">
              {seriesScore.user}–{seriesScore.enemy}
            </span>
          )}
        </div>
      )}

      <div className="relative min-h-[160px] overflow-hidden sm:min-h-[200px]">
        {asset.thumb && imgOk ? (
          <img
            src={asset.thumb}
            alt={activeMap || 'map'}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ height: '100%' }}
            onError={() => setImgOk(false)}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${asset.accent}33, #0a0c10)` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c10] via-[#0a0c10]/75 to-[#0a0c10]/35" />

        <div className="relative z-10 flex h-full flex-col justify-between p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {asset.icon && (
                <img
                  src={asset.icon}
                  alt=""
                  className="h-8 w-8 drop-shadow"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              )}
              <div>
                <div className="font-display text-[10px] tracking-[0.25em] text-cs-gold uppercase">
                  {title || t('tournament.live')}
                </div>
                <div className="text-sm font-semibold text-cs-text">{activeMap || '—'}</div>
              </div>
            </div>
            {paused && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cs-warn/40 bg-cs-warn/15 px-2.5 py-1 text-[10px] font-bold tracking-wider text-cs-warn">
                <span className="h-1.5 w-1.5 rounded-full bg-cs-warn" />
                {t('live.tacticalTimeout')}
              </span>
            )}
          </div>

          <div className="mt-6 flex items-end justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                {homeLogoSrc ? (
                  <OrgMark src={homeLogoSrc} name={homeName} size="sm" />
                ) : (
                  <TeamLogo name={homeName} size="sm" decorative />
                )}
                <div className="truncate text-xs uppercase tracking-wider text-cs-muted">{homeName}</div>
              </div>
              <motion.div
                key={`y-${you}`}
                initial={{ scale: 1.15, color: '#e8c547' }}
                animate={{ scale: 1 }}
                className="font-display text-4xl font-extrabold text-cs-text sm:text-5xl"
              >
                {you}
              </motion.div>
            </div>
            <div className="pb-2 font-display text-lg text-cs-muted">{t('live.vs')}</div>
            <div className="min-w-0 flex-1 text-right">
              <div className="flex min-w-0 items-center justify-end gap-2">
                <div className="truncate text-xs uppercase tracking-wider text-cs-muted">{awayName}</div>
                {awayLogoSrc ? (
                  <OrgMark src={awayLogoSrc} name={awayName} size="sm" />
                ) : (
                  <TeamLogo name={awayName} size="sm" decorative />
                )}
              </div>
              <motion.div
                key={`t-${them}`}
                initial={{ scale: 1.15 }}
                animate={{ scale: 1 }}
                className="font-display text-4xl font-extrabold text-cs-loss sm:text-5xl"
              >
                {them}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      {(onSpeedChange || onTacticalPause) && (
        <div className="flex flex-wrap items-center gap-2 border-b border-cs-border/60 px-3 py-2 sm:px-4">
          {onSpeedChange && (
            <div
              className="inline-flex rounded border border-cs-border p-0.5"
              title={speedLocked ? t('live.speedHostOnly') : undefined}
            >
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onSpeedChange(n)}
                  disabled={speedLocked}
                  aria-pressed={speed === n}
                  aria-label={`${t('live.speed')} ${n}x`}
                  className={`rounded px-2.5 py-1 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40 ${
                    speed === n ? 'bg-cs-gold/20 text-cs-gold' : 'text-cs-muted hover:text-cs-text'
                  }`}
                >
                  {n}x
                </button>
              ))}
            </div>
          )}
          {onTacticalPause && (
            <button
              type="button"
              onClick={onTacticalPause}
              disabled={!canTacticalPause}
              className="btn-ghost inline-flex min-h-[36px] items-center gap-1.5 rounded px-2.5 py-1.5 text-xs disabled:opacity-40"
            >
              <Radio className="h-3.5 w-3.5 text-cs-info" />
              {t('live.tacticalPause')}
            </button>
          )}
          {mvp && (
            <span className="ml-auto inline-flex items-center gap-1.5 rounded border border-cs-gold/40 bg-cs-gold/10 px-2 py-1 text-[11px] text-cs-gold">
              <Star className="h-3 w-3" />
              {t('live.mvp')}: {mvp.name}
            </span>
          )}
        </div>
      )}

      <div
        role="log"
        aria-live="polite"
        aria-label={t('live.terminal')}
        className="scrollbar-thin max-h-[340px] space-y-2 overflow-y-auto p-3 sm:p-4"
      >
        <AnimatePresence initial={false}>
          {feed.map((log) => {
            const style = TYPE_STYLE[log.type] || TYPE_STYLE.round
            const Icon = style.icon
            const big = highlightTypes.has(log.type)
            return (
              <motion.div
                key={keyForLog(log)}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                className={`flex gap-3 rounded-lg border px-3 py-2.5 ${style.bg} ${
                  big ? 'shadow-[0_0_24px_rgba(232,197,71,0.12)]' : ''
                }`}
              >
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-black/25 ${style.color}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-[10px] font-bold tracking-[0.18em] uppercase ${style.color}`}>
                    {t(style.labelKey)}
                  </div>
                  <div className={`text-sm leading-snug ${big ? 'font-semibold text-cs-text' : 'text-cs-text/90'}`}>
                    {log.text}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
