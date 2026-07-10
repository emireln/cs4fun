import { motion } from 'framer-motion'
import { Trophy, RotateCcw, Skull } from 'lucide-react'
import PlayerCard from './PlayerCard'
import { ROLES } from '../data/constants'

export default function ResultsScreen({ won, userTeam, wins, losses, mentality, onRestart }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="panel overflow-hidden rounded-xl"
      >
        <div
          className={`px-6 py-10 text-center ${
            won
              ? 'bg-gradient-to-b from-cs-gold/20 to-transparent'
              : 'bg-gradient-to-b from-cs-loss/15 to-transparent'
          }`}
        >
          {won ? (
            <Trophy className="mx-auto mb-4 h-14 w-14 text-cs-gold" />
          ) : (
            <Skull className="mx-auto mb-4 h-14 w-14 text-cs-loss" />
          )}
          <p className="font-display text-xs tracking-[0.3em] text-cs-muted uppercase">
            {won ? 'Major Champions' : 'Eliminated'}
          </p>
          <h1
            className={`mt-2 font-display text-4xl font-extrabold sm:text-5xl ${
              won ? 'gold-text' : 'text-cs-loss'
            }`}
          >
            {won ? '3–0 RUN COMPLETE' : 'BRACKET EXIT'}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-cs-muted">
            {won
              ? 'Your drafted legends closed the Major undefeated. Screenshot this lineup — it belongs in the hall of fame.'
              : 'The dream five fell short. Re-scout history and try another run.'}
          </p>
          <div className="mt-5 inline-flex items-center gap-4 rounded border border-cs-border bg-cs-bg/50 px-5 py-2 font-mono text-sm">
            <span className="text-cs-win">{wins}W</span>
            <span className="text-cs-muted">·</span>
            <span className="text-cs-loss">{losses}L</span>
            <span className="text-cs-muted">·</span>
            <span className="text-cs-text">{mentality?.label}</span>
            <span className="text-cs-muted">·</span>
            <span className="text-cs-gold">{userTeam.mapPriority}</span>
          </div>
        </div>

        <div className="border-t border-cs-border px-6 py-6">
          <h2 className="mb-4 text-center font-display text-xs font-bold tracking-[0.22em] text-cs-gold uppercase">
            Your Lineup
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {ROLES.map((role) => (
              <PlayerCard
                key={role.id}
                player={userTeam.lineup[role.id]}
                slot={role.id}
                compact
                showOrigin
              />
            ))}
          </div>
        </div>

        <div className="border-t border-cs-border px-6 py-6 text-center">
          <button
            type="button"
            className="btn-gold inline-flex items-center gap-2 rounded px-8 py-3 text-sm uppercase tracking-[0.15em]"
            onClick={onRestart}
          >
            <RotateCcw className="h-4 w-4" /> New Run
          </button>
        </div>
      </motion.div>
    </div>
  )
}
