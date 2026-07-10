import { motion } from 'framer-motion'
import { Ban, Crosshair } from 'lucide-react'
import { useI18n } from '../i18n'
import { useMapVetoSession } from '../hooks/useMapVetoSession'
import MapThumb from './MapThumb'
import MapVeto from './MapVeto'

export default function MapVetoPlay({
  userPriority,
  enemyBias = [],
  mentalityId = 'tactical',
  enemyName = 'Enemy',
  onComplete,
}) {
  const { t } = useI18n()
  const veto = useMapVetoSession({ userPriority, enemyBias, mentalityId })

  const promptLabel = (() => {
    if (veto.done) return t('veto.ready')
    if (veto.prompt === 'ban') return t('veto.yourBan')
    if (veto.prompt === 'pick') return t('veto.yourPick')
    if (veto.prompt === 'enemy') return t('veto.enemyTurn', { name: enemyName })
    if (veto.prompt === 'decider') return t('veto.decider')
    return t('tournament.mapVeto')
  })()

  return (
    <div className="space-y-4">
      <div className="panel rounded-xl p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-[10px] font-bold tracking-[0.22em] text-cs-gold uppercase">
            {t('tournament.mapVeto')}
          </h3>
          <span
            className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-semibold ${
              veto.userCanAct
                ? 'border-cs-gold/50 bg-cs-gold/15 text-cs-gold animate-pulse'
                : 'border-cs-border text-cs-muted'
            }`}
          >
            {veto.prompt === 'ban' ? <Ban className="h-3.5 w-3.5" /> : <Crosshair className="h-3.5 w-3.5" />}
            {promptLabel}
            {veto.userCanAct && veto.turnTimer != null && (
              <span className="font-mono text-cs-warn">{veto.turnTimer}s</span>
            )}
          </span>
        </div>

        <p className="mb-3 text-xs text-cs-muted">
          {t('veto.priorityHint', { map: userPriority })}
        </p>

        {!veto.done && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {veto.pool.map((map) => {
              const clickable = veto.userCanAct
              return (
                <motion.button
                  key={map}
                  type="button"
                  disabled={!clickable}
                  whileTap={clickable ? { scale: 0.97 } : undefined}
                  onClick={() => veto.selectMap(map)}
                  className={`text-left transition ${
                    clickable ? 'cursor-pointer hover:brightness-110' : 'cursor-default opacity-90'
                  }`}
                >
                  <MapThumb
                    name={map}
                    className={`aspect-[16/10] ${clickable ? 'ring-1 ring-cs-gold/40' : ''}`}
                    selected={map === userPriority}
                    overlay={
                      map === userPriority ? (
                        <span className="rounded bg-cs-gold/90 px-1 py-0.5 text-[9px] font-bold uppercase text-black">
                          {t('veto.priority')}
                        </span>
                      ) : null
                    }
                  />
                </motion.button>
              )
            })}
          </div>
        )}

        {!veto.done && (veto.bans.length > 0 || veto.picks.length > 0) && (
          <div className="mt-4 space-y-2">
            {veto.bans.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {veto.bans.map((b) => (
                  <span
                    key={`ban-${b.map}`}
                    className="rounded border border-cs-loss/40 bg-cs-loss/10 px-2 py-0.5 text-[10px] uppercase text-cs-loss"
                  >
                    {t('veto.ban')} · {b.map} · {b.by === 'user' ? t('tournament.you') : t('tournament.enemy')}
                  </span>
                ))}
              </div>
            )}
            {veto.picks.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {veto.picks.map((p) => (
                  <span
                    key={`pick-${p.map}`}
                    className="rounded border border-cs-gold/40 bg-cs-gold/10 px-2 py-0.5 text-[10px] uppercase text-cs-gold"
                  >
                    {p.by === 'decider'
                      ? t('tournament.decider')
                      : p.by === 'user'
                        ? t('tournament.yourPick')
                        : t('tournament.enemyPick')}{' '}
                    · {p.map}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {veto.done && veto.result && (
        <div className="space-y-4">
          <MapVeto veto={veto.result} />
          <div className="text-center">
            <button
              type="button"
              className="btn-gold rounded px-8 py-3 text-sm uppercase tracking-wider"
              onClick={() => onComplete?.(veto.result)}
            >
              {t('veto.confirm')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
