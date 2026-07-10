import { ROLES } from '../data/constants'
import { useI18n } from '../i18n'
import PlayerCard from './PlayerCard'

/** On-screen shareable result card preview */
export default function ResultCard({
  won,
  title,
  mode,
  score,
  wins,
  losses,
  streak,
  nickname,
  mapPriority,
  lineup,
}) {
  const { t } = useI18n()

  return (
    <div
      className={`overflow-hidden rounded-xl border ${
        won ? 'border-cs-gold/40' : 'border-cs-loss/40'
      } bg-gradient-to-b ${won ? 'from-cs-gold/15' : 'from-cs-loss/10'} to-cs-bg`}
    >
      <div className="flex items-center justify-between border-b border-cs-border/60 px-4 py-3">
        <div>
          <div className="font-display text-xs font-bold tracking-[0.2em] text-cs-gold uppercase">cs4fun</div>
          <div className="text-[10px] uppercase tracking-widest text-cs-muted">{mode}</div>
        </div>
        <div className={`font-display text-lg font-extrabold ${won ? 'gold-text' : 'text-cs-loss'}`}>
          {title || (won ? t('results.shareWin') : t('results.shareLoss'))}
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-3 font-mono text-sm">
          {wins != null && <span className="text-cs-win">{wins}W</span>}
          {losses != null && <span className="text-cs-loss">{losses}L</span>}
          {score != null && <span className="text-cs-gold">{score}</span>}
          {streak != null && <span className="text-cs-warn">{streak}</span>}
          {mapPriority && <span className="text-cs-muted">{mapPriority}</span>}
        </div>
        {nickname && <p className="mt-1 text-xs text-cs-muted">@{nickname}</p>}
      </div>

      {lineup && (
        <div className="grid grid-cols-2 gap-1 border-t border-cs-border/60 px-2 py-3 sm:grid-cols-3 sm:gap-2 sm:px-3 lg:grid-cols-5">
          {ROLES.map((role) => (
            <PlayerCard key={role.id} player={lineup[role.id]} slot={role.id} compact showOrigin />
          ))}
        </div>
      )}
    </div>
  )
}
