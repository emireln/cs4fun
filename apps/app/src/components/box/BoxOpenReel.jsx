import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { formatUsd, isHighTierDrop, RARITY_META } from '../../lib/boxBattle'
import { playBoxRareDrop, unlockAudio } from '../../lib/sound'
import { useI18n } from '../../i18n'

const TILE_COUNT = 32
const WIN_INDEX = 26
const SPIN_MS = 5200
const LAND_HOLD_MS = 1400
const LAND_HOLD_RARE_MS = 2000

/** Slow, tense CS-style case reel */
export default function BoxOpenReel({ drop, label, delay = 0, onDone }) {
  const { t } = useI18n()
  const [phase, setPhase] = useState('spin') // spin | land
  const sounded = useRef(false)
  const meta = RARITY_META[drop?.rarity] || RARITY_META.milspec
  const isHeat = isHighTierDrop(drop)
  const isGold = drop?.rarity === 'gold'
  const isCovert = drop?.rarity === 'covert'
  const holdMs = isHeat ? LAND_HOLD_RARE_MS : LAND_HOLD_MS
  const particleCount = isGold ? 18 : isCovert ? 12 : isHeat ? 8 : 0

  const decoys = useMemo(() => {
    if (!drop) return []
    return Array.from({ length: TILE_COUNT }, (_, i) => ({
      key: i,
      blur: i !== WIN_INDEX,
      highlight: i === WIN_INDEX,
    }))
  }, [drop])

  useEffect(() => {
    if (!drop) return undefined
    setPhase('spin')
    sounded.current = false
    unlockAudio()
    const t1 = setTimeout(() => {
      setPhase('land')
      if (isHeat && !sounded.current) {
        sounded.current = true
        playBoxRareDrop(drop.rarity)
      }
    }, SPIN_MS + delay)
    const t2 = setTimeout(() => onDone?.(), SPIN_MS + holdMs + delay)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [drop?.id, delay]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!drop) return null

  // Land so the winning tile sits near the center needle after a long roll
  const landX = `-${((WIN_INDEX + 0.5) / TILE_COUNT) * 100 - 8}%`

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold uppercase tracking-wider text-cs-muted">{label}</span>
        <AnimatePresence>
          {phase === 'land' && (
            <motion.span
              initial={{ opacity: 0, y: -4, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="font-mono text-sm font-bold"
              style={{ color: meta.color }}
            >
              {formatUsd(drop.value)}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <motion.div
        className={`relative overflow-hidden rounded-xl border bg-cs-bg/90 ${
          phase === 'land' && isHeat ? (isGold ? 'box-rare-shake-gold' : 'box-rare-shake') : ''
        }`}
        style={{
          borderColor: phase === 'land' && isHeat ? meta.color : `${meta.color}55`,
          boxShadow:
            phase === 'land' && isHeat
              ? `0 0 48px ${meta.color}55, 0 0 12px ${meta.color}88, inset 0 0 40px ${meta.color}22`
              : undefined,
        }}
        animate={
          phase === 'land' && isHeat
            ? { scale: [1, 1.02, 1] }
            : undefined
        }
        transition={phase === 'land' && isHeat ? { duration: 0.55, ease: 'easeOut' } : undefined}
      >
        {/* Flash wash on rare land */}
        <AnimatePresence>
          {phase === 'land' && isHeat && (
            <motion.div
              className="pointer-events-none absolute inset-0 z-30"
              style={{ background: meta.color }}
              initial={{ opacity: isGold ? 0.55 : 0.35 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: isGold ? 0.7 : 0.45 }}
            />
          )}
        </AnimatePresence>

        {/* Rotating aura ring */}
        {phase === 'land' && isHeat && (
          <div
            className="pointer-events-none absolute inset-[-40%] z-0 box-rare-spin"
            style={{
              background: `conic-gradient(from 0deg, transparent, ${meta.color}66, transparent 35%, ${meta.color}44, transparent 70%)`,
              opacity: isGold ? 0.55 : 0.4,
            }}
          />
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-cs-bg to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-cs-bg to-transparent" />
        <div
          className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-0.5 -translate-x-1/2"
          style={{ background: meta.color, boxShadow: `0 0 16px ${meta.color}` }}
        />
        <div
          className="pointer-events-none absolute left-1/2 top-1 z-20 h-2 w-3 -translate-x-1/2"
          style={{
            background: meta.color,
            clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
          }}
        />

        <motion.div
          className="relative z-[1] flex gap-2 px-2 py-4"
          initial={{ x: '5%' }}
          animate={
            phase === 'spin'
              ? { x: landX }
              : { x: landX, transition: { type: 'spring', stiffness: 70, damping: 22 } }
          }
          transition={
            phase === 'spin'
              ? { duration: SPIN_MS / 1000, ease: [0.08, 0.65, 0.12, 1] }
              : undefined
          }
        >
          {decoys.map((d) => (
            <div
              key={d.key}
              className={`relative flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-lg border sm:h-32 sm:w-32 ${
                d.highlight && phase === 'land'
                  ? 'scale-105 border-cs-gold bg-cs-gold/15'
                  : 'border-cs-border/50 bg-cs-panel/50'
              }`}
              style={
                d.highlight && phase === 'land'
                  ? {
                      boxShadow: `0 0 36px ${meta.color}77`,
                      borderColor: meta.color,
                    }
                  : undefined
              }
            >
              {d.highlight && phase === 'land' && isHeat && (
                <>
                  <span
                    className="pointer-events-none absolute inset-[-6px] rounded-xl box-rare-ring"
                    style={{ borderColor: meta.color, boxShadow: `0 0 18px ${meta.color}` }}
                  />
                  <span
                    className="pointer-events-none absolute inset-0 rounded-lg opacity-40"
                    style={{
                      background: `radial-gradient(circle at 50% 40%, ${meta.color}88, transparent 65%)`,
                    }}
                  />
                </>
              )}
              <img
                src={drop.image}
                alt=""
                className={`relative z-[1] h-16 w-24 object-contain sm:h-20 sm:w-28 ${
                  d.blur && phase === 'spin' ? 'opacity-40 blur-[1.5px] saturate-50' : ''
                } ${d.highlight && phase === 'land' && isGold ? 'drop-shadow-[0_0_12px_rgba(228,174,57,0.85)]' : ''}`}
                referrerPolicy="no-referrer"
                draggable={false}
              />
            </div>
          ))}
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {phase === 'land' && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="relative mt-3 text-center"
          >
            {particleCount > 0 &&
              [...Array(particleCount)].map((_, i) => (
                <motion.span
                  key={i}
                  className="pointer-events-none absolute left-1/2 top-2 h-1.5 w-1.5 rounded-full"
                  style={{
                    background: meta.color,
                    boxShadow: `0 0 6px ${meta.color}`,
                  }}
                  initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                  animate={{
                    opacity: 0,
                    x: Math.cos((i / particleCount) * Math.PI * 2) * (40 + (i % 5) * 14),
                    y: Math.sin((i / particleCount) * Math.PI * 2) * (28 + (i % 4) * 12) - 10,
                    scale: 0.2,
                  }}
                  transition={{ duration: isGold ? 1.1 : 0.85, delay: i * 0.025, ease: 'easeOut' }}
                />
              ))}
            {isGold && (
              <motion.p
                className="mb-1 font-display text-[10px] font-bold tracking-[0.28em] uppercase"
                style={{ color: meta.color }}
                initial={{ opacity: 0, letterSpacing: '0.4em' }}
                animate={{ opacity: 1, letterSpacing: '0.28em' }}
              >
                ★ {t('box.rarity.gold')}
              </motion.p>
            )}
            <div
              className={`font-display font-bold ${isGold ? 'text-base sm:text-lg' : 'text-sm sm:text-base'}`}
              style={{ color: meta.color }}
            >
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
