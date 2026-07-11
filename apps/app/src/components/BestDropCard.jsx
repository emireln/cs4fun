import { Sparkles } from 'lucide-react'
import { useI18n } from '../i18n'
import { formatUsd, RARITY_META } from '../lib/boxBattle'

/** Compact best-drop showcase for profile / friends / public card */
export default function BestDropCard({
  drop,
  title,
  emptyLabel,
  className = '',
  compact = false,
}) {
  const { t } = useI18n()
  if (!drop) {
    return (
      <div className={`rounded-xl border border-dashed border-cs-border bg-cs-bg/30 px-3 py-3 ${className}`}>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-cs-muted">
          {title || t('box.bestDropEver')}
        </p>
        <p className="mt-1 text-xs text-cs-muted">{emptyLabel || t('box.noBestDrop')}</p>
      </div>
    )
  }

  const meta = RARITY_META[drop.rarity] || RARITY_META.milspec

  return (
    <div
      className={`overflow-hidden rounded-xl border border-cs-gold/35 bg-gradient-to-r from-cs-gold/12 via-cs-panel/80 to-cs-panel ${className}`}
    >
      <div className={`flex items-center gap-3 ${compact ? 'p-2.5' : 'p-3 sm:p-4'}`}>
        <img
          src={drop.image}
          alt=""
          className={`shrink-0 object-contain ${compact ? 'h-12 w-16' : 'h-14 w-20 sm:h-16 sm:w-24'}`}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-cs-gold">
            <Sparkles className="h-3.5 w-3.5" />
            {title || t('box.bestDropEver')}
          </div>
          <div className={`truncate font-display font-bold text-cs-text ${compact ? 'text-xs' : 'text-sm sm:text-base'}`}>
            {drop.name}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-cs-muted">
            <span style={{ color: meta.color }}>{meta.label}</span>
            <span className="font-mono text-cs-gold">{formatUsd(drop.value)}</span>
            {drop.caseName && <span className="truncate">· {drop.caseName}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
