import { motion } from 'framer-motion'
import { ROLES } from '../data/constants'
import PlayerCard from './PlayerCard'
import RoleIcon from './RoleIcon'

const SLOT_POSITIONS = {
  IGL: 'col-start-2 row-start-1',
  AWPer: 'col-start-1 row-start-2',
  Entry: 'col-start-3 row-start-2',
  Lurker: 'col-start-1 row-start-3',
  Support: 'col-start-3 row-start-3',
}

export default function LineupRadar({
  lineup,
  selectedSlot,
  onSelectSlot,
  hideRatings = false,
  assignMode = false,
  pendingPlayer = null,
  assignHint = null,
  title = 'Lineup',
  openLabel = 'Open',
  dropLabel = 'Here',
}) {
  return (
    <div className="panel relative overflow-hidden rounded-lg p-3 sm:p-6">
      <div className="mb-3 flex items-center justify-between sm:mb-4">
        <h2 className="font-display text-xs font-bold tracking-[0.22em] text-cs-gold uppercase">
          {title}
        </h2>
        <span className="font-mono text-xs text-cs-muted">
          {Object.values(lineup).filter(Boolean).length}/5
        </span>
      </div>

      <div className="radar-grid relative mx-auto aspect-square max-w-md rounded-full border border-cs-gold/20 p-2 sm:p-6">
        <div className="absolute inset-[18%] rounded-full border border-cs-gold/15" />
        <div className="absolute inset-[36%] rounded-full border border-cs-gold/10" />
        <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cs-gold shadow-[0_0_12px_rgba(232,197,71,0.8)]" />

        <div className="relative z-10 grid h-full grid-cols-3 grid-rows-3 gap-1.5 sm:gap-3">
          {ROLES.map((role) => {
            const player = lineup[role.id]
            const isSelected = selectedSlot === role.id
            const canAssign = assignMode && !player && pendingPlayer

            return (
              <motion.div
                key={role.id}
                className={`${SLOT_POSITIONS[role.id]} flex items-center justify-center`}
                layout
              >
                <div className="w-full max-w-[140px]">
                  {player ? (
                    <PlayerCard
                      player={player}
                      slot={role.id}
                      hideRating={hideRatings}
                      compact
                      showOrigin
                      selected={isSelected}
                      onClick={onSelectSlot ? () => onSelectSlot(role.id) : undefined}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (canAssign && onSelectSlot) onSelectSlot(role.id)
                        else if (onSelectSlot) onSelectSlot(role.id)
                      }}
                      className={`flex w-full flex-col items-center justify-center rounded border border-dashed min-h-[72px] p-1.5 transition sm:min-h-[84px] sm:p-2 ${
                        canAssign || isSelected
                          ? 'border-cs-gold bg-cs-gold/10 text-cs-gold animate-pulse'
                          : 'border-cs-border/70 bg-cs-bg/50 text-cs-muted hover:border-cs-gold/40'
                      }`}
                    >
                      <RoleIcon name={role.icon} className="mb-1 h-4 w-4" />
                      <span className="font-display text-[10px] tracking-widest">{role.short}</span>
                      <span className="text-[10px] opacity-70">{canAssign ? dropLabel : openLabel}</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {assignMode && pendingPlayer && (
        <p className="mt-4 text-center text-sm text-cs-gold">
          {assignHint || pendingPlayer.name}
        </p>
      )}
    </div>
  )
}
