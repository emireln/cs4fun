import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { formatUsd, RARITY_META } from '../../lib/boxBattle'
import { useI18n } from '../../i18n'

/** Spinning reel reveal for a single drop */
export default function BoxOpenReel({ drop, label, delay = 0, onDone }) {
  const { t } = useI18n()
  const [phase, setPhase] = useState('spin') // spin | land
  const meta = RARITY_META[drop?.rarity] || RARITY_META.milspec
  const isHeat = drop?.rarity === 'gold' || drop?.rarity === 'covert'
  const decoys = useMemo(() => {
    if (!drop) return []
    // Visual filler tiles using the real drop image tinted differently
    return Array.from({ length: 18 }, (_, i) => ({
      key: i,
      blur: i !== 14,
      highlight: i === 14,
    }))
  }, [drop])

  useEffect(() => {
    if (!drop) return undefined
    setPhase('spin')
    const t1 = setTimeout(() => setPhase('land'), 1600 + delay)
    const t2 = setTimeout(() => onDone?.(), 2200 + delay)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [drop?.id, delay]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!drop) return null

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold uppercase tracking-wider text-cs-muted">{label}</span>
        <AnimatePresence>
          {phase === 'land' && (
            <motion.span
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-mono text-sm font-bold"
              style={{ color: meta.color }}
            >
              {formatUsd(drop.value)}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div
        className="relative overflow-hidden rounded-xl border bg-cs-bg/80"
        style={{ borderColor: `${meta.color}55` }}
      >
        <div
          className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-0.5 -translate-x-1/2"
          style={{ background: meta.color, boxShadow: `0 0 12px ${meta.color}` }}
        />
        <motion.div
          className="flex gap-2 px-2 py-3"
          initial={{ x: 0 }}
          animate={
            phase === 'spin'
              ? { x: ['0%', '-62%'] }
              : { x: '-62%', transition: { type: 'spring', stiffness: 120, damping: 18 } }
          }
          transition={phase === 'spin' ? { duration: 1.55, ease: [0.15, 0.85, 0.25, 1] } : undefined}
        >
          {decoys.map((d) => (
            <div
              key={d.key}
              className={`flex h-24 w-28 shrink-0 flex-col items-center justify-center rounded-lg border sm:h-28 sm:w-32 ${
                d.highlight && phase === 'land'
                  ? 'border-cs-gold bg-cs-gold/10'
                  : 'border-cs-border/50 bg-cs-panel/40'
              }`}
              style={
                d.highlight && phase === 'land'
                  ? { boxShadow: `0 0 28px ${meta.color}44` }
                  : undefined
              }
            >
              <img
                src={drop.image}
                alt=""
                className={`h-16 w-24 object-contain sm:h-20 sm:w-28 ${d.blur && phase === 'spin' ? 'opacity-50 blur-[1px]' : ''}`}
                referrerPolicy="no-referrer"
                draggable={false}
              />
            </div>
          ))}
        </motion.div>
      </div>

      <AnimatePresence>
        {phase === 'land' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative mt-3 text-center"
          >
            {isHeat && (
              <>
                {[...Array(6)].map((_, i) => (
                  <motion.span
                    key={i}
                    className="pointer-events-none absolute left-1/2 top-0 h-1.5 w-1.5 rounded-full"
                    style={{ background: meta.color }}
                    initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                    animate={{
                      opacity: 0,
                      x: (i % 2 === 0 ? 1 : -1) * (20 + i * 8),
                      y: -18 - i * 6,
                      scale: 0.4,
                    }}
                    transition={{ duration: 0.7, delay: i * 0.04 }}
                  />
                ))}
              </>
            )}
            <div className="font-display text-sm font-bold sm:text-base" style={{ color: meta.color }}>
              {drop.name}
            </div>
            <div className="mt-0.5 text-[11px] text-cs-muted">
              {t(`box.rarity.${drop.rarity}`)} · {drop.wear}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
