import { Tent, Map, Brain } from 'lucide-react'
import { useI18n } from '../../i18n'
import { MENTALITIES, MAPS, applyCamp } from '../../lib/career'

export default function CareerCamp({ state, onDone }) {
  const { t } = useI18n()

  const pickMap = (mapId) => {
    onDone(applyCamp(state, { type: 'map', value: mapId }))
  }
  const pickMentality = (id) => {
    onDone(applyCamp(state, { type: 'mentality', value: id }))
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 text-center">
        <Tent className="mx-auto mb-3 h-8 w-8 text-cs-gold" />
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{t('career.campTitle')}</h1>
        <p className="mt-2 text-sm text-cs-muted">{t('career.campBlurb')}</p>
      </div>

      <div className="mb-6 panel rounded-xl p-4">
        <h2 className="mb-3 flex items-center gap-2 font-display text-[10px] tracking-[0.2em] text-cs-gold uppercase">
          <Map className="h-3.5 w-3.5" />
          {t('career.campMap')}
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {MAPS.slice(0, 9).map((m) => (
            <button
              key={m.id}
              type="button"
              className="rounded border border-cs-border px-3 py-2 text-left text-xs hover:border-cs-gold/50"
              onClick={() => pickMap(m.id)}
            >
              <div className="font-semibold text-cs-text">{m.id}</div>
              <div className="mt-0.5 text-[10px] text-cs-muted line-clamp-2">{m.vibe}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="panel rounded-xl p-4">
        <h2 className="mb-3 flex items-center gap-2 font-display text-[10px] tracking-[0.2em] text-cs-gold uppercase">
          <Brain className="h-3.5 w-3.5" />
          {t('career.campMentality')}
        </h2>
        <div className="grid gap-2">
          {MENTALITIES.map((m) => (
            <button
              key={m.id}
              type="button"
              className="rounded border border-cs-border px-3 py-2.5 text-left hover:border-cs-gold/50"
              onClick={() => pickMentality(m.id)}
            >
              <div className="text-sm font-semibold text-cs-gold">{m.label}</div>
              <div className="text-xs text-cs-muted">{m.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
