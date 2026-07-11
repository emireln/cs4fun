import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  buildCaseReelStrip,
  isHighTierDrop,
  RARITY_META,
} from '../../lib/boxBattle'
import { playBoxRareDrop, playBoxReelTick, unlockAudio } from '../../lib/sound'
import { useI18n } from '../../i18n'

/** Dense CS2 / CSGOSKINS-style horizontal reel */
const TILE_COUNT = 72
const WIN_INDEX = 58
const SPIN_MS = 6800
const LAND_HOLD_MS = 1500
const LAND_HOLD_RARE_MS = 2200
/** Tile outer width (incl. gap) — keeps ~8–10 skins visible in a panel */
const TILE_PX = 76
const GAP_PX = 6
const STRIP_PAD = 8

function easeOutQuint(t) {
  return 1 - (1 - t) ** 5
}

export default function BoxOpenReel({ drop, label, delay = 0, onDone }) {
  const { t, money } = useI18n()
  const [phase, setPhase] = useState('idle')
  const [targetX, setTargetX] = useState(0)
  const [broken, setBroken] = useState(() => new Set())
  const sounded = useRef(false)
  const viewportRef = useRef(null)
  const stripRef = useRef(null)
  const spinStarted = useRef(0)
  const lastTickIdx = useRef(-1)
  const phaseRef = useRef(phase)
  const targetXRef = useRef(targetX)
  const posRef = useRef(40)

  phaseRef.current = phase
  targetXRef.current = targetX

  const meta = RARITY_META[drop?.rarity] || RARITY_META.milspec
  const isHeat = isHighTierDrop(drop)
  const isGold = drop?.rarity === 'gold'
  const isCovert = drop?.rarity === 'covert'
  const holdMs = isHeat ? LAND_HOLD_RARE_MS : LAND_HOLD_MS
  const particleCount = isGold ? 18 : isCovert ? 12 : isHeat ? 8 : 0

  const { strip, winIndex } = useMemo(() => {
    if (!drop) return { strip: [], winIndex: WIN_INDEX }
    return buildCaseReelStrip(drop.caseId, drop, {
      count: TILE_COUNT,
      winIndex: WIN_INDEX,
      seed: `${drop.id}:reel`,
    })
  }, [drop])

  const setStripX = (px) => {
    posRef.current = px
    const el = stripRef.current
    if (el) el.style.transform = `translate3d(${px}px, 0, 0)`
  }

  // Measure where the winning tile must sit under the center needle
  useLayoutEffect(() => {
    if (!drop || !strip.length) return
    const measure = () => {
      const viewport = viewportRef.current
      if (!viewport) return
      const vw = viewport.clientWidth || 320
      const winCenter =
        STRIP_PAD + winIndex * (TILE_PX + GAP_PX) + TILE_PX / 2
      const jitter = ((hashTiny(drop.id) % 21) - 10) * 0.35
      setTargetX(-(winCenter - vw / 2 + jitter))
      setStripX(40)
    }
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    if (viewportRef.current && ro) ro.observe(viewportRef.current)
    return () => ro?.disconnect()
  }, [drop?.id, strip, winIndex])

  useEffect(() => {
    if (!drop) return undefined
    setPhase('idle')
    setBroken(new Set())
    sounded.current = false
    lastTickIdx.current = -1
    setStripX(40)
    unlockAudio()

    const startTimer = setTimeout(() => {
      spinStarted.current = performance.now()
      setPhase('spin')
    }, delay)

    const landTimer = setTimeout(() => {
      setPhase('land')
      setStripX(targetXRef.current)
      if (isHeat && !sounded.current) {
        sounded.current = true
        playBoxRareDrop(drop.rarity)
      }
    }, SPIN_MS + delay)

    const doneTimer = setTimeout(() => onDone?.(), SPIN_MS + holdMs + delay)

    return () => {
      clearTimeout(startTimer)
      clearTimeout(landTimer)
      clearTimeout(doneTimer)
    }
  }, [drop?.id, delay]) // eslint-disable-line react-hooks/exhaustive-deps

  // Drive translate + tick sounds with the same ease curve (DOM transform — reliable in Electron)
  useEffect(() => {
    let raf = 0
    const tick = (now) => {
      const p = phaseRef.current
      if (p === 'spin') {
        const start = spinStarted.current || now
        const progress = Math.min(1, (now - start) / SPIN_MS)
        const eased = easeOutQuint(progress)
        const from = 40
        const to = targetXRef.current
        const pos = from + (to - from) * eased
        setStripX(pos)

        const vw = viewportRef.current?.clientWidth || 400
        const needle = vw / 2
        const idx = Math.floor((-pos + needle - STRIP_PAD) / (TILE_PX + GAP_PX))
        if (idx !== lastTickIdx.current && idx >= 0 && idx < strip.length) {
          lastTickIdx.current = idx
          playBoxReelTick()
        }
      } else if (p === 'land') {
        setStripX(targetXRef.current)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [strip.length])

  if (!drop) return null

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold tracking-wider text-cs-muted uppercase">
          {label}
        </span>
        <AnimatePresence>
          {phase === 'land' && (
            <motion.span
              initial={{ opacity: 0, y: -4, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="font-mono text-sm font-bold"
              style={{ color: meta.color }}
            >
              {money(drop.value)}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div
        ref={viewportRef}
        className={`relative min-h-[92px] overflow-hidden rounded-xl border bg-[#0c1018] ${
          phase === 'land' && isHeat ? (isGold ? 'box-rare-shake-gold' : 'box-rare-shake') : ''
        }`}
        style={{
          borderColor: phase === 'land' && isHeat ? meta.color : `${meta.color}55`,
          boxShadow:
            phase === 'land' && isHeat
              ? `0 0 48px ${meta.color}55, 0 0 12px ${meta.color}88, inset 0 0 40px ${meta.color}22`
              : 'inset 0 0 24px rgba(0,0,0,0.45)',
        }}
      >
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

        {phase === 'land' && isHeat && (
          <div
            className="pointer-events-none absolute inset-[-40%] z-0 box-rare-spin"
            style={{
              background: `conic-gradient(from 0deg, transparent, ${meta.color}66, transparent 35%, ${meta.color}44, transparent 70%)`,
              opacity: isGold ? 0.55 : 0.4,
            }}
          />
        )}

        {/* Edge fades — CS case open look */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-8 bg-gradient-to-r from-[#0c1018] via-[#0c1018]/80 to-transparent sm:w-12" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-8 bg-gradient-to-l from-[#0c1018] via-[#0c1018]/80 to-transparent sm:w-12" />

        {/* Center needle */}
        <div
          className="pointer-events-none absolute inset-y-0 left-1/2 z-30 w-0.5 -translate-x-1/2"
          style={{ background: meta.color, boxShadow: `0 0 14px ${meta.color}` }}
        />
        <div
          className="pointer-events-none absolute top-0 left-1/2 z-30 h-2.5 w-3.5 -translate-x-1/2"
          style={{
            background: meta.color,
            clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
            filter: `drop-shadow(0 0 6px ${meta.color})`,
          }}
        />
        <div
          className="pointer-events-none absolute bottom-0 left-1/2 z-30 h-2.5 w-3.5 -translate-x-1/2"
          style={{
            background: meta.color,
            clipPath: 'polygon(50% 0, 0 100%, 100% 100%)',
            filter: `drop-shadow(0 0 6px ${meta.color})`,
          }}
        />

        <div
          ref={stripRef}
          className="relative z-[1] flex py-3 will-change-transform"
          style={{
            paddingLeft: STRIP_PAD,
            paddingRight: STRIP_PAD,
            gap: GAP_PX,
            transform: 'translate3d(40px, 0, 0)',
          }}
        >
          {strip.map((item) => {
            const itemMeta = RARITY_META[item.rarity] || RARITY_META.milspec
            const highlight = item.isWin && phase === 'land'
            const imgBroken = broken.has(item.key)
            return (
              <div
                key={item.key}
                className={`relative flex shrink-0 flex-col items-center justify-center rounded-md border ${
                  highlight ? 'scale-105 bg-cs-gold/15' : 'bg-[#161b24]'
                }`}
                style={{
                  width: TILE_PX,
                  height: TILE_PX + 8,
                  borderColor: highlight ? meta.color : `${itemMeta.color}aa`,
                  boxShadow: highlight ? `0 0 28px ${meta.color}77` : undefined,
                }}
              >
                {highlight && isHeat && (
                  <>
                    <span
                      className="pointer-events-none absolute inset-[-5px] rounded-lg box-rare-ring"
                      style={{ borderColor: meta.color, boxShadow: `0 0 14px ${meta.color}` }}
                    />
                    <span
                      className="pointer-events-none absolute inset-0 rounded-md opacity-35"
                      style={{
                        background: `radial-gradient(circle at 50% 40%, ${meta.color}88, transparent 65%)`,
                      }}
                    />
                  </>
                )}
                {item.image && !imgBroken ? (
                  <img
                    src={item.image}
                    alt=""
                    className={`box-reel-skin relative z-[1] object-contain ${
                      highlight && isGold ? 'drop-shadow-[0_0_12px_rgba(228,174,57,0.85)]' : ''
                    }`}
                    style={{ width: 64, height: 52, maxWidth: 64 }}
                    referrerPolicy="no-referrer"
                    draggable={false}
                    loading="eager"
                    decoding="async"
                    onError={() => {
                      setBroken((prev) => {
                        if (prev.has(item.key)) return prev
                        const next = new Set(prev)
                        next.add(item.key)
                        return next
                      })
                    }}
                  />
                ) : (
                  <span
                    className="relative z-[1] flex h-[52px] w-[64px] items-center justify-center rounded px-1 text-center text-[9px] font-bold leading-tight text-cs-text/90"
                    style={{ background: `${itemMeta.color}33`, color: itemMeta.color }}
                  >
                    {(item.name || '?').split('|').pop()?.trim().slice(0, 14) || '•'}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

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
                  className="pointer-events-none absolute top-2 left-1/2 h-1.5 w-1.5 rounded-full"
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
              {t(`box.rarity.${drop.rarity}`)} · {t(`box.wear.${drop.wear}`)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function hashTiny(str) {
  let h = 0
  const s = String(str || '')
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}
