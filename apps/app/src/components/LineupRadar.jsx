import { motion, AnimatePresence } from 'framer-motion'
import { ROLES } from '../data/constants'
import PlayerCard from './PlayerCard'
import RoleIcon from './RoleIcon'

/** Absolute diamond slots — equal boxes so mobile doesn’t warp when one card is filled */
const SLOT_STYLE = {
  IGL: { top: '0%', left: '50%', transform: 'translateX(-50%)' },
  AWPer: { top: '34%', left: '0%' },
  Entry: { top: '34%', right: '0%' },
  Lurker: { bottom: '0%', left: '0%' },
  Support: { bottom: '0%', right: '0%' },
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
  const filled = Object.values(lineup).filter(Boolean).length

  return (
    <div className="panel relative overflow-visible rounded-lg p-3 sm:p-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg opacity-40">
        <div className="lineup-ambient" />
      </div>

      <div className="relative mb-3 flex items-center justify-between sm:mb-4">
        <h2 className="font-display text-xs font-bold tracking-[0.22em] text-cs-gold uppercase">
          {title}
        </h2>
        <motion.span
          key={filled}
          initial={{ scale: 0.85, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          className="font-mono text-xs text-cs-muted"
        >
          <span className={filled === 5 ? 'text-cs-win' : 'text-cs-gold'}>{filled}</span>/5
        </motion.span>
      </div>

      {/* Square stage — cards must not be clipped by the circular radar mask */}
      <div className="relative mx-auto aspect-square w-full max-w-[22rem] overflow-visible sm:max-w-md">
        <div
          className="radar-grid pointer-events-none absolute inset-[10%] overflow-hidden rounded-full border border-cs-gold/25 sm:inset-[8%]"
          aria-hidden
        >
          <div className="radar-sweep" />
          <div className="radar-ring radar-ring--outer" />
          <div className="radar-ring radar-ring--mid" />
          <div className="radar-ring radar-ring--inner" />
          <div className="radar-crosshair" />
          <motion.div
            className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cs-gold"
            animate={{
              boxShadow: [
                '0 0 8px 2px rgba(232,197,71,0.45)',
                '0 0 18px 6px rgba(232,197,71,0.75)',
                '0 0 8px 2px rgba(232,197,71,0.45)',
              ],
              scale: [1, 1.15, 1],
            }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="relative z-10 h-full w-full">
          {ROLES.map((role, i) => {
            const player = lineup[role.id]
            const isSelected = selectedSlot === role.id
            const canAssign = assignMode && !player && pendingPlayer

            return (
              <motion.div
                key={role.id}
                className="absolute flex w-[42%] max-w-[9.5rem] items-stretch sm:w-[38%] sm:max-w-[10.5rem]"
                style={SLOT_STYLE[role.id]}
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 * i, type: 'spring', stiffness: 320, damping: 24 }}
              >
                <div className="flex w-full flex-col">
                  <AnimatePresence mode="wait">
                    {player ? (
                      <motion.div
                        key={player.id}
                        className="h-full"
                        initial={{ opacity: 0, scale: 0.82, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -6 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                      >
                        <PlayerCard
                          player={player}
                          slot={role.id}
                          hideRating={hideRatings}
                          compact
                          showOrigin
                          selected={isSelected}
                          onClick={onSelectSlot ? () => onSelectSlot(role.id) : undefined}
                        />
                      </motion.div>
                    ) : (
                      <motion.button
                        key={`open-${role.id}`}
                        type="button"
                        initial={{ opacity: 0.6 }}
                        animate={
                          canAssign
                            ? {
                                opacity: 1,
                                boxShadow: [
                                  '0 0 0 0 rgba(232,197,71,0)',
                                  '0 0 20px 2px rgba(232,197,71,0.25)',
                                  '0 0 0 0 rgba(232,197,71,0)',
                                ],
                              }
                            : { opacity: 1 }
                        }
                        transition={
                          canAssign
                            ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
                            : undefined
                        }
                        whileHover={{ scale: 1.03, borderColor: 'rgba(232,197,71,0.55)' }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          if (canAssign && onSelectSlot) onSelectSlot(role.id)
                          else if (onSelectSlot) onSelectSlot(role.id)
                        }}
                        className={`flex min-h-[5.75rem] w-full flex-col items-center justify-center rounded border border-dashed p-1.5 transition sm:min-h-[6.25rem] sm:p-2 ${
                          canAssign || isSelected
                            ? 'border-cs-gold bg-cs-gold/10 text-cs-gold'
                            : 'border-cs-border/70 bg-cs-bg/50 text-cs-muted hover:border-cs-gold/40'
                        }`}
                      >
                        <motion.span
                          animate={canAssign ? { y: [0, -2, 0] } : undefined}
                          transition={canAssign ? { duration: 1.2, repeat: Infinity } : undefined}
                        >
                          <RoleIcon name={role.icon} className="mb-1 h-4 w-4" />
                        </motion.span>
                        <span className="font-display text-[10px] tracking-widest">{role.short}</span>
                        <span className="text-[10px] opacity-70">{canAssign ? dropLabel : openLabel}</span>
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      <AnimatePresence>
        {assignMode && pendingPlayer && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="relative mt-4 text-center text-sm text-cs-gold"
          >
            {assignHint || pendingPlayer.name}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
