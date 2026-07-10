import { motion } from 'framer-motion'
import { ROLES } from '../data/constants'
import RoleIcon from './RoleIcon'

export default function PlayerCard({
  player,
  slot,
  hideRating = false,
  selected = false,
  onClick,
  compact = false,
  showOrigin = false,
  disabled = false,
  openLabel = 'Open',
}) {
  if (!player) {
    const role = ROLES.find((r) => r.id === slot)
    return (
      <div
        className={`flex flex-col items-center justify-center rounded border border-dashed border-cs-border/80 bg-cs-bg/40 text-cs-muted ${
          compact ? 'min-h-[88px] p-2' : 'min-h-[140px] p-4'
        }`}
      >
        <RoleIcon name={role?.icon} className="mb-1 h-5 w-5 opacity-50" />
        <span className="font-display text-[10px] tracking-widest uppercase">{role?.short || slot}</span>
        <span className="text-xs opacity-60">{openLabel}</span>
      </div>
    )
  }

  const role = ROLES.find((r) => r.id === slot) || ROLES.find((r) => r.id === player.role)

  return (
    <motion.button
      type="button"
      layout
      whileHover={onClick && !disabled ? { y: -3, scale: 1.02 } : undefined}
      whileTap={onClick && !disabled ? { scale: 0.98 } : undefined}
      onClick={disabled ? undefined : onClick}
      disabled={disabled || !onClick}
      title={player.name}
      className={`group relative w-full min-w-0 overflow-hidden rounded border text-left transition ${
        selected
          ? 'border-cs-gold bg-cs-gold/15 shadow-[0_0_24px_rgba(232,197,71,0.2)]'
          : 'border-cs-border bg-gradient-to-b from-[#1a2030] to-[#10141c] hover:border-cs-gold/50'
      } ${compact ? 'p-2.5' : 'p-3.5'} ${!onClick ? 'cursor-default' : 'cursor-pointer'} ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-cs-gold/70 to-transparent opacity-70" />
      <div className="mb-1.5 flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1 overflow-hidden">
          <div
            className={`truncate font-display font-bold tracking-wide text-cs-text ${compact ? 'text-sm' : 'text-base'}`}
          >
            {player.name}
          </div>
          {!compact && player.realName && (
            <div className="truncate text-[11px] text-cs-muted">{player.realName}</div>
          )}
        </div>
        {!hideRating && (
          <div className="shrink-0 rounded border border-cs-gold/30 bg-cs-gold/10 px-1.5 py-0.5 font-mono text-xs font-semibold text-cs-gold">
            {Number(player.rating ?? 0).toFixed(2)}
          </div>
        )}
        {hideRating && (
          <div className="shrink-0 rounded border border-cs-border px-1.5 py-0.5 font-mono text-[10px] text-cs-muted">???</div>
        )}
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="inline-flex max-w-full items-center gap-1 truncate rounded bg-cs-bg/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cs-muted">
          <RoleIcon name={role?.icon || 'Crosshair'} className="h-3 w-3 shrink-0 text-cs-gold" />
          <span className="truncate">{player.role}</span>
        </span>
        {slot && (
          <span className="shrink-0 rounded border border-cs-border/80 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-cs-gold/80">
            → {slot}
          </span>
        )}
      </div>

      {!compact && player.bestMaps && (
        <div className="mt-2 flex flex-wrap gap-1">
          {player.bestMaps.slice(0, 3).map((m) => (
            <span key={m} className="rounded bg-cs-panel2 px-1.5 py-0.5 text-[10px] text-cs-muted">
              {m}
            </span>
          ))}
        </div>
      )}

      {showOrigin && player.fromTeam && (
        <div className="mt-2 truncate text-[10px] text-cs-muted" title={`${player.fromTeam} · ${player.fromEvent || ''}`}>
          {player.fromTeam}
          {player.fromEvent ? ` · ${player.fromEvent}` : ''}
        </div>
      )}
    </motion.button>
  )
}
