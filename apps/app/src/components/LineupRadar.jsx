import { motion, AnimatePresence } from 'framer-motion'
import { ROLES } from '../data/constants'
import PlayerCard from './PlayerCard'
import RoleIcon from './RoleIcon'

/**
 * Diamond via CSS grid (no Framer transforms on layout wrappers).
 * Radar décor sits in a true square behind mid slots so its rim never
 * peeks out as a broken gold line under the LINEUP header.
 */
const SLOT_CELL = {
  IGL: 'col-span-2 flex justify-center',
  AWPer: 'min-w-0 justify-self-stretch',
  Entry: 'min-w-0 justify-self-stretch',
  Lurker: 'min-w-0 justify-self-stretch',
  Support: 'min-w-0 justify-self-stretch',
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
    <div className="panel relative overflow-hidden rounded-lg p-3 sm:p-6">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="lineup-ambient" />
      </div>

      <div className="relative mb-3 sm:mb-4">
        <div className="flex items-center justify-between gap-3">
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
        {/* Full-bleed header rule — replaces the accidental radar rim stub */}
        <div className="mt-2 h-px w-full bg-gradient-to-r from-cs-gold/55 via-cs-gold/25 to-transparent" />
      </div>

      <div className="relative mx-auto w-full max-w-md">
        {/* Mid-stage circle — top rim sits below IGL so it never draws a gold chord through that slot */}
        <div
          className="pointer-events-none absolute top-[36%] left-1/2 aspect-square w-[78%] -translate-x-1/2 sm:top-[34%] sm:w-[72%]"
          aria-hidden
        >
          <div className="radar-grid absolute inset-0 overflow-hidden rounded-full border border-cs-gold/10">
            <div className="radar-sweep" />
            <div className="radar-ring radar-ring--mid" />
            <div className="radar-ring radar-ring--inner" />
            <motion.div
              className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cs-gold sm:h-2.5 sm:w-2.5"
              animate={{
                boxShadow: [
                  '0 0 8px 2px rgba(232,197,71,0.35)',
                  '0 0 16px 5px rgba(232,197,71,0.65)',
                  '0 0 8px 2px rgba(232,197,71,0.35)',
                ],
                scale: [1, 1.12, 1],
              }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-2 sm:gap-3">
          {ROLES.map((role, i) => {
            const player = lineup[role.id]
            const isSelected = selectedSlot === role.id
            const canAssign = assignMode && !player && pendingPlayer
            const isIgl = role.id === 'IGL'

            return (
              <div key={role.id} className={SLOT_CELL[role.id]}>
                <motion.div
                  className={`w-full ${isIgl ? 'max-w-[11rem] sm:max-w-[12rem]' : ''}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i, type: 'spring', stiffness: 320, damping: 24 }}
                >
                  <AnimatePresence mode="wait">
                    {player ? (
                      <motion.div
                        key={player.id}
                        className="min-h-[5.5rem] sm:min-h-[6rem]"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 24 }}
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
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          if (onSelectSlot) onSelectSlot(role.id)
                        }}
                        className={`flex min-h-[5.5rem] w-full flex-col items-center justify-center rounded border border-dashed p-1.5 transition sm:min-h-[6rem] sm:p-2 ${
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
                        <span className="text-[10px] opacity-70">
                          {canAssign ? dropLabel : openLabel}
                        </span>
                      </motion.button>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            )
          })}
        </div>
      </div>

      <AnimatePresence>
        {assignHint && (
          <motion.p
            key={assignMode ? 'assign' : 'idle'}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className={`relative mt-4 text-center text-sm ${
              assignMode ? 'text-cs-gold' : 'text-cs-muted'
            }`}
          >
            {assignHint}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
