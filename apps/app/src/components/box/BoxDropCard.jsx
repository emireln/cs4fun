import { motion } from 'framer-motion'
import { formatUsd, RARITY_META } from '../../lib/boxBattle'
import { useI18n } from '../../i18n'

export default function BoxDropCard({ drop, compact = false, highlight = false }) {
  const { t } = useI18n()
  if (!drop) return null
  const meta = RARITY_META[drop.rarity] || RARITY_META.milspec
  const rarityLabel = t(`box.rarity.${drop.rarity}`)
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileHover={{ y: -2, scale: 1.02 }}
      className={`relative overflow-hidden rounded-lg border ${
        compact ? 'p-2' : 'p-3'
      } ${highlight ? 'border-cs-gold bg-cs-gold/10' : 'border-cs-border bg-cs-panel/70'}`}
      style={{ boxShadow: highlight ? `0 0 20px ${meta.color}33` : undefined }}
    >
      <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: meta.color }} />
      {(drop.rarity === 'gold' || drop.rarity === 'covert') && (
        <motion.div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at 50% 20%, ${meta.color}55, transparent 60%)`,
          }}
          animate={{ opacity: [0.2, 0.45, 0.2] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
      )}
      <img
        src={drop.image}
        alt=""
        className={`relative mx-auto object-contain ${compact ? 'h-12 w-16' : 'h-16 w-24 sm:h-20 sm:w-28'}`}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
      <div className={`relative mt-1 truncate font-display font-bold ${compact ? 'text-[10px]' : 'text-xs'}`}>
        {drop.name}
      </div>
      <div className="relative mt-0.5 flex items-center justify-between gap-1 text-[10px]">
        <span style={{ color: meta.color }}>{rarityLabel}</span>
        <span className="font-mono text-cs-gold">{formatUsd(drop.value)}</span>
      </div>
    </motion.div>
  )
}
