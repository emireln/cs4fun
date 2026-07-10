import { motion } from 'framer-motion'
import { Dices, Play, RefreshCw, Radar, Timer } from 'lucide-react'
import { ROLES } from '../data/constants'
import { useI18n } from '../i18n'
import { lineupFilledCount } from '../engine/simulation'
import LineupRadar from './LineupRadar'
import PlayerCard from './PlayerCard'

export default function DraftPlay({
  draft,
  launchLabel,
  onLaunch,
  launchDisabled = false,
  banner = null,
  hideReroll = false,
}) {
  const { t } = useI18n()
  const {
    lineup,
    currentRoster,
    usedRosterIds,
    rerolls,
    scouting,
    pendingPlayer,
    complete,
    timer,
    pickTimerSec,
    hideRatings,
    usingShared,
    scout,
    reroll,
    selectPlayer,
    assignSlot,
  } = draft

  const filled = lineupFilledCount(lineup)
  const waitingAssign = Boolean(pendingPlayer)
  const canRoll = !waitingAssign && !complete && !currentRoster
  const hurry = pickTimerSec > 0 && timer > 0 && timer <= 8

  const actionButtons = (
    <>
      {!hideReroll && !usingShared && (
        <button
          type="button"
          className="btn-ghost inline-flex min-h-[44px] items-center gap-2 rounded px-3 py-2 text-sm"
          onClick={reroll}
          disabled={!currentRoster || rerolls <= 0 || scouting || waitingAssign}
        >
          <RefreshCw className="h-4 w-4" />
          <span className="hidden xs:inline sm:inline">{t('draft.rescout')}</span>
          <span>({rerolls})</span>
        </button>
      )}
      <button
        type="button"
        className="btn-gold inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded px-4 py-2 text-sm uppercase tracking-wider sm:flex-none"
        onClick={scout}
        disabled={!canRoll || scouting}
      >
        <Dices className="h-4 w-4" />
        {currentRoster ? t('draft.nextScout') : t('draft.scout')}
      </button>
      {complete && (
        <motion.button
          type="button"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="btn-gold inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded px-6 py-3 text-sm uppercase tracking-[0.15em] sm:flex-none"
          onClick={onLaunch}
          disabled={launchDisabled}
        >
          <Play className="h-4 w-4" /> {launchLabel}
        </motion.button>
      )}
    </>
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6">
      {banner}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide sm:text-3xl">
            {t('draft.title')}{' '}
            <span className="gold-text">
              · {t('draft.round')} {Math.min(filled + (waitingAssign || currentRoster ? 1 : 0), 5)}/5
            </span>
          </h1>
          <p className="mt-1 text-sm text-cs-muted">{t('draft.hint')}</p>
        </div>
        <div className="hidden flex-wrap items-center gap-2 sm:flex">
          {pickTimerSec > 0 && currentRoster && !complete && (
            <div
              className={`inline-flex items-center gap-2 rounded border px-3 py-2 font-mono text-sm ${
                hurry ? 'border-cs-loss bg-cs-loss/15 text-cs-loss animate-pulse' : 'border-cs-border text-cs-gold'
              }`}
            >
              <Timer className="h-4 w-4" />
              {hurry ? t('draft.hurry') : t('draft.pickTimer')}: {timer}s
            </div>
          )}
          {actionButtons}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel rounded-lg p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xs font-bold tracking-[0.22em] text-cs-gold uppercase">
                {t('draft.scoutFeed')}
              </h2>
              <p className="mt-1 text-sm text-cs-muted">{t('draft.scoutHint')}</p>
            </div>
            <div className="hidden gap-2 sm:flex">{/* desktop actions in header */}</div>
          </div>

          {pickTimerSec > 0 && currentRoster && !complete && (
            <div
              className={`mb-3 flex items-center justify-center gap-2 rounded border px-3 py-2 font-mono text-sm sm:hidden ${
                hurry ? 'border-cs-loss bg-cs-loss/15 text-cs-loss animate-pulse' : 'border-cs-border text-cs-gold'
              }`}
            >
              <Timer className="h-4 w-4" />
              {hurry ? t('draft.hurry') : t('draft.pickTimer')}: {timer}s
            </div>
          )}

          {!currentRoster ? (
            <div className="flex min-h-[180px] flex-col items-center justify-center rounded border border-dashed border-cs-border bg-cs-bg/40 text-cs-muted sm:min-h-[220px]">
              <Radar className="mb-3 h-10 w-10 opacity-40" />
              <p className="font-display text-xs tracking-[0.2em] uppercase">{t('draft.awaiting')}</p>
              <p className="mt-1 text-sm">{t('draft.awaitingHint')}</p>
            </div>
          ) : (
            <motion.div
              key={currentRoster.id}
              initial={{ opacity: 0, rotateY: -10, scale: 0.97 }}
              animate={{ opacity: 1, rotateY: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            >
              <div className="mb-4 rounded border border-cs-gold/25 bg-cs-gold/5 px-4 py-3">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <div className="font-display text-lg font-bold text-cs-gold">{currentRoster.team}</div>
                    <div className="text-sm text-cs-text">{currentRoster.event}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs text-cs-muted">{currentRoster.year}</div>
                    <div className="text-xs text-cs-win">{currentRoster.achievement}</div>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {currentRoster.players.map((player, i) => (
                  <motion.div key={player.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }}>
                    <PlayerCard
                      player={player}
                      hideRating={hideRatings}
                      selected={pendingPlayer?.id === player.id}
                      onClick={() => selectPlayer(player)}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        <div className="space-y-4">
          <LineupRadar
            lineup={lineup}
            hideRatings={hideRatings}
            assignMode={waitingAssign}
            pendingPlayer={pendingPlayer}
            onSelectSlot={waitingAssign ? assignSlot : undefined}
            assignHint={
              pendingPlayer ? t('draft.assign', { name: pendingPlayer.name }) : undefined
            }
            title={t('draft.radar')}
            openLabel={t('draft.open')}
            dropLabel={t('draft.dropHere')}
          />

          <div className="panel rounded-lg p-4">
            <h3 className="mb-3 font-display text-[10px] font-bold tracking-[0.2em] text-cs-gold uppercase">
              {t('draft.checklist')}
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {ROLES.map((role) => (
                <div
                  key={role.id}
                  className={`rounded border px-2 py-2.5 text-center sm:px-1 sm:py-2 ${
                    lineup[role.id] ? 'border-cs-win/40 bg-cs-win/10 text-cs-win' : 'border-cs-border text-cs-muted'
                  }`}
                >
                  <div className="font-display text-[10px] tracking-wider sm:text-[10px]">{role.short}</div>
                  <div className="mt-1 truncate text-xs sm:text-[10px]">{lineup[role.id]?.name || '—'}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-cs-muted">{t('draft.scouted', { n: usedRosterIds.length })}</p>
          </div>
        </div>
      </div>

      {/* Mobile sticky action bar — keep flush; footer is hidden during draft */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-cs-border/80 bg-[#0a0c10] px-3 pt-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] sm:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-2">{actionButtons}</div>
      </div>
    </div>
  )
}
