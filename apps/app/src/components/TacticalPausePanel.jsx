import { TACTICAL_CALLS } from '../data/constants'
import { useI18n } from '../i18n'

/** Overlay to pick / change an IGL call for a map during live tactical pause. */
export default function TacticalPausePanel({ mapName, onSelect, onCancel }) {
  const { t } = useI18n()

  return (
    <div className="panel rounded-xl border-cs-info/40 p-4 sm:p-5">
      <div className="mb-1 font-display text-[10px] tracking-[0.2em] text-cs-info uppercase">
        {t('live.tacticalPause')}
      </div>
      <h3 className="font-display text-lg font-bold text-cs-text">
        {t('tournament.tactical', { map: mapName || '—' })}
      </h3>
      <p className="mt-1 mb-4 text-sm text-cs-muted">{t('live.tacticalPauseHint')}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {TACTICAL_CALLS.map((call) => (
          <button
            key={call.id}
            type="button"
            onClick={() => onSelect(call)}
            className="min-h-[52px] rounded border border-cs-border bg-cs-bg/40 px-3 py-3 text-left transition hover:border-cs-info/50 hover:bg-cs-info/5 active:scale-[0.99]"
          >
            <div className="text-sm font-bold text-cs-text">
              {t(`tactics.${call.id}.label`) !== `tactics.${call.id}.label`
                ? t(`tactics.${call.id}.label`)
                : call.label}
            </div>
            <div className="mt-1 text-xs text-cs-muted">
              {t(`tactics.${call.id}.description`) !== `tactics.${call.id}.description`
                ? t(`tactics.${call.id}.description`)
                : call.description}
            </div>
          </button>
        ))}
      </div>
      {onCancel && (
        <button type="button" className="btn-ghost mt-4 rounded px-4 py-2 text-sm" onClick={onCancel}>
          {t('live.resume')}
        </button>
      )}
    </div>
  )
}
