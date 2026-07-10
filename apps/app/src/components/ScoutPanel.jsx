import { AnimatePresence, motion } from 'framer-motion'
import { Dices, RefreshCw, Radar } from 'lucide-react'
import PlayerCard from './PlayerCard'

export default function ScoutPanel({
  roster,
  hideRatings,
  selectedPlayerId,
  onSelectPlayer,
  onScout,
  onReroll,
  rerolls,
  canScout,
  scouting,
  rerollDisabled = false,
}) {
  return (
    <div className="panel rounded-lg p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xs font-bold tracking-[0.22em] text-cs-gold uppercase">
            Scout Feed
          </h2>
          <p className="mt-1 text-sm text-cs-muted">Roll a historic roster. Draft exactly one player.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-ghost inline-flex items-center gap-2 rounded px-3 py-2 text-sm"
            onClick={onReroll}
            disabled={rerollDisabled}
          >
            <RefreshCw className="h-4 w-4" />
            Re-scout ({rerolls})
          </button>
          <button
            type="button"
            className="btn-gold inline-flex items-center gap-2 rounded px-4 py-2 text-sm uppercase tracking-wider"
            onClick={onScout}
            disabled={!canScout || scouting}
          >
            <Dices className="h-4 w-4" />
            {roster ? 'Next Scout' : 'Scout / Roll'}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!roster ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-[220px] flex-col items-center justify-center rounded border border-dashed border-cs-border bg-cs-bg/40 text-cs-muted"
          >
            <Radar className="mb-3 h-10 w-10 opacity-40" />
            <p className="font-display text-xs tracking-[0.2em] uppercase">Awaiting scout roll</p>
            <p className="mt-1 text-sm">Hit Scout / Roll to reveal a legendary roster</p>
          </motion.div>
        ) : (
          <motion.div
            key={roster.id}
            initial={{ opacity: 0, rotateY: -12, scale: 0.96 }}
            animate={{ opacity: 1, rotateY: 0, scale: 1 }}
            exit={{ opacity: 0, rotateY: 12, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            <div className="mb-4 rounded border border-cs-gold/25 bg-cs-gold/5 px-4 py-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <div className="font-display text-lg font-bold text-cs-gold">{roster.team}</div>
                  <div className="text-sm text-cs-text">{roster.event}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs text-cs-muted">{roster.year}</div>
                  <div className="text-xs text-cs-win">{roster.achievement}</div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {roster.players.map((player, i) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <PlayerCard
                    player={player}
                    hideRating={hideRatings}
                    selected={selectedPlayerId === player.id}
                    onClick={() => onSelectPlayer(player)}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
