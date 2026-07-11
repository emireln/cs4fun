import { useState } from 'react'
import { motion } from 'framer-motion'
import { Play } from 'lucide-react'
import ScoutPanel from './ScoutPanel'
import LineupRadar from './LineupRadar'
import { ROLES } from '../data/constants'
import { lineupComplete, lineupFilledCount, lineupOwnsPlayer } from '../engine/simulation'

export default function DraftScreen({
  lineup,
  setLineup,
  currentRoster,
  onScout,
  onReroll,
  rerolls,
  hideRatings,
  usedRosterIds,
  onStartTournament,
  scouting,
}) {
  const [pendingPlayer, setPendingPlayer] = useState(null)
  const filled = lineupFilledCount(lineup)
  const complete = lineupComplete(lineup)
  const waitingAssign = Boolean(pendingPlayer)
  const canRoll = !waitingAssign && !complete && !currentRoster

  const handleSelectPlayer = (player) => {
    if (complete) return
    if (lineupOwnsPlayer(lineup, player)) return
    setPendingPlayer(player)
  }

  const handleAssignSlot = (slotId) => {
    if (!pendingPlayer) return
    if (lineup[slotId]) return
    if (lineupOwnsPlayer(lineup, pendingPlayer)) {
      setPendingPlayer(null)
      return
    }
    const origin = currentRoster
    setLineup((prev) => {
      if (prev[slotId] || lineupOwnsPlayer(prev, pendingPlayer)) return prev
      return {
        ...prev,
        [slotId]: {
          ...pendingPlayer,
          fromTeam: origin?.shortName,
          fromEvent: origin?.event,
        },
      }
    })
    setPendingPlayer(null)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide text-cs-text sm:text-3xl">
            Draft Room <span className="gold-text">· Round {Math.min(filled + (waitingAssign || currentRoster ? 1 : 0), 5)}/5</span>
          </h1>
          <p className="mt-1 text-sm text-cs-muted">
            Pick one player from each scouted roster and slot them into your five.
          </p>
        </div>
        {complete && (
          <motion.button
            type="button"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="btn-gold inline-flex items-center gap-2 rounded px-6 py-3 text-sm uppercase tracking-[0.15em]"
            onClick={onStartTournament}
          >
            <Play className="h-4 w-4" /> Launch Major Bracket
          </motion.button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ScoutPanel
          roster={currentRoster}
          hideRatings={hideRatings}
          selectedPlayerId={pendingPlayer?.id}
          onSelectPlayer={handleSelectPlayer}
          onScout={onScout}
          onReroll={onReroll}
          rerolls={rerolls}
          canScout={canRoll}
          scouting={scouting}
          rerollDisabled={waitingAssign || !currentRoster || rerolls <= 0 || scouting}
        />

        <div className="space-y-4">
          <LineupRadar
            lineup={lineup}
            hideRatings={hideRatings}
            assignMode={waitingAssign}
            pendingPlayer={pendingPlayer}
            onSelectSlot={waitingAssign ? handleAssignSlot : undefined}
          />

          <div className="panel rounded-lg p-4">
            <h3 className="mb-3 font-display text-[10px] font-bold tracking-[0.2em] text-cs-gold uppercase">
              Role Checklist
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {ROLES.map((role) => (
                <div
                  key={role.id}
                  className={`rounded border px-1 py-2 text-center ${
                    lineup[role.id]
                      ? 'border-cs-win/40 bg-cs-win/10 text-cs-win'
                      : 'border-cs-border text-cs-muted'
                  }`}
                >
                  <div className="font-display text-[10px] tracking-wider">{role.short}</div>
                  <div className="mt-1 truncate text-[10px]">
                    {lineup[role.id]?.name || '—'}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-cs-muted">
              Scouted: {usedRosterIds.length} rosters · Chemistry bonuses for dedicated IGL + AWPer
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
