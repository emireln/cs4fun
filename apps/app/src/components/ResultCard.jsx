import { ROLES } from '../data/constants'
import { useI18n } from '../i18n'

/** On-screen preview of the shareable result card (mirrors PNG composition). */
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
  highlight = null,
}) {
  const { t } = useI18n()
  const result =
    title || (won ? t('results.shareWin') : t('results.shareLoss'))

  const chips = []
  if (wins != null || losses != null) chips.push(`${wins ?? 0}–${losses ?? 0}`)
  if (score != null) chips.push(String(score))
  if (streak != null) chips.push(`×${streak}`)
  if (mapPriority) chips.push(mapPriority)

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${
        won ? 'border-cs-gold/40' : 'border-cs-loss/35'
      } bg-gradient-to-b ${won ? 'from-[#1a1608] via-cs-panel to-cs-bg' : 'from-[#1a0c0c] via-cs-panel to-cs-bg'}`}
    >
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${
          won ? 'from-cs-gold/20' : 'from-cs-loss/15'
        } to-transparent`}
        aria-hidden
      />

      <div className="relative px-4 pb-4 pt-5 text-center sm:px-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="font-display text-[11px] font-bold tracking-[0.22em] text-cs-gold uppercase">
            CS4FUN
          </span>
          <span className="rounded-full border border-cs-gold/30 bg-cs-gold/10 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-cs-gold uppercase">
            {mode}
          </span>
        </div>

        <h3
          className={`font-display text-3xl font-extrabold tracking-tight sm:text-4xl ${
            won ? 'gold-text' : 'text-cs-loss'
          }`}
        >
          {result}
        </h3>
        {nickname && (
          <p className="mt-2 text-sm font-semibold text-cs-text">@{nickname}</p>
        )}

        {chips.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {chips.map((c) => (
              <span
                key={c}
                className="rounded-lg border border-cs-border/80 bg-cs-bg/50 px-3 py-1.5 font-mono text-xs font-bold text-cs-gold"
              >
                {c}
              </span>
            ))}
          </div>
        )}

        {highlight && (
          <p className="mt-3 text-xs font-semibold text-cs-gold/90">{highlight}</p>
        )}
      </div>

      {lineup && (
        <div className="relative space-y-1.5 border-t border-cs-border/50 px-3 py-3 sm:px-4">
          {ROLES.map((role) => {
            const p = lineup[role.id]
            return (
              <div
                key={role.id}
                className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-2.5 py-2"
              >
                <span className="w-12 shrink-0 text-center font-display text-[10px] font-bold tracking-wider text-cs-gold uppercase">
                  {role.short}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-cs-text">
                  {p?.name || '—'}
                </span>
                {p?.rating != null && (
                  <span className="shrink-0 font-mono text-xs text-cs-gold">
                    {Number(p.rating).toFixed(2)}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="border-t border-cs-border/40 px-4 py-2.5 text-center text-[10px] tracking-wider text-cs-muted uppercase">
        cs4fun.online
      </div>
    </div>
  )
}
