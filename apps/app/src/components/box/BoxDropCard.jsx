import { motion } from 'framer-motion'
import { isHighTierDrop, RARITY_META } from '../../lib/boxBattle'
import { useI18n } from '../../i18n'

export default function BoxDropCard({ drop, compact = false, highlight = false }) {
  const { t, money } = useI18n()
  if (!drop) return null
  const meta = RARITY_META[drop.rarity] || RARITY_META.milspec
  const rarityLabel = t(`box.rarity.${drop.rarity}`)
  const isHeat = isHighTierDrop(drop)
  const isGold = drop.rarity === 'gold'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileHover={{ y: -2, scale: 1.02 }}
      className={`relative overflow-hidden rounded-lg border ${
        compact ? 'p-2' : 'p-3'
      } ${highlight ? 'border-cs-gold bg-cs-gold/10' : 'border-cs-border bg-cs-panel/70'} ${
        isHeat ? 'box-drop-aura' : ''
      } ${isGold ? 'box-drop-aura-gold' : ''}`}
      style={{
        borderColor: isHeat || highlight ? meta.color : undefined,
        boxShadow: isHeat || highlight ? `0 0 18px ${meta.color}44` : undefined,
        ['--drop-glow']: meta.color,
      }}
    >
      <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: meta.color }} />
      {isHeat && (
        <>
          <motion.div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(circle at 50% 20%, ${meta.color}55, transparent 62%)`,
            }}
            animate={{ opacity: [0.22, 0.55, 0.22] }}
            transition={{ duration: isGold ? 1.4 : 1.8, repeat: Infinity }}
          />
          <span
            className="pointer-events-none absolute inset-[-1px] rounded-lg box-drop-ring"
            style={{ borderColor: meta.color }}
          />
          {isGold && (
            <span
              className="pointer-events-none absolute -inset-4 box-rare-spin opacity-30"
              style={{
                background: `conic-gradient(from 90deg, transparent, ${meta.color}88, transparent 40%)`,
              }}
            />
          )}
        </>
      )}
      <img
        src={drop.image}
        alt=""
        className={`relative mx-auto object-contain ${compact ? 'h-12 w-16' : 'h-16 w-24 sm:h-20 sm:w-28'} ${
          isGold ? 'drop-shadow-[0_0_10px_rgba(228,174,57,0.7)]' : ''
        }`}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
      <div
        className={`relative mt-1 line-clamp-2 break-words font-display font-bold leading-tight ${
          compact ? 'min-h-[1.5rem] text-[10px]' : 'min-h-[2rem] text-xs'
        }`}
      >
        {drop.name}
      </div>
      <div className="relative mt-0.5 flex items-center justify-between gap-1 text-[10px]">
        <span style={{ color: meta.color }}>{rarityLabel}</span>
        <span className="font-mono text-cs-gold">{money(drop.value)}</span>
      </div>
    </motion.div>
  )
}
