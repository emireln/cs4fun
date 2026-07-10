import { motion } from 'framer-motion'
import { useI18n } from '../i18n'
import MapThumb from './MapThumb'

/** Post-veto summary — only the 3 series maps (no leftover pool / ban grid). */
export default function MapVeto({ veto }) {
  const { t } = useI18n()
  if (!veto) return null

  const order = veto.mapOrder?.length ? veto.mapOrder : (veto.picks || []).map((p) => p.map)
  const pickBy = Object.fromEntries((veto.picks || []).map((p) => [p.map, p.by]))

  return (
    <div className="panel rounded-xl p-4">
      <h3 className="mb-1 font-display text-[10px] font-bold tracking-[0.22em] text-cs-gold uppercase">
        {t('veto.seriesMaps')}
      </h3>
      <p className="mb-3 text-xs text-cs-muted">{t('veto.seriesHint')}</p>

      <div className="grid grid-cols-3 gap-2">
        {order.map((map, i) => {
          const by = pickBy[map]
          return (
            <motion.div
              key={map}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <MapThumb
                name={map}
                className="aspect-[16/11]"
                selected
                overlay={
                  <span className="rounded bg-black/55 px-1.5 py-0.5 text-[10px] uppercase text-cs-gold">
                    M{i + 1}
                    {by === 'decider'
                      ? ` · ${t('tournament.decider')}`
                      : by === 'user'
                        ? ` · ${t('tournament.yourPick')}`
                        : by === 'enemy'
                          ? ` · ${t('tournament.enemyPick')}`
                          : ''}
                  </span>
                }
              />
            </motion.div>
          )
        })}
      </div>

      {veto.bans?.length > 0 && (
        <p className="mt-3 text-[10px] leading-relaxed text-cs-muted">
          {t('veto.bannedList')}: {veto.bans.map((b) => b.map).join(' · ')}
        </p>
      )}
    </div>
  )
}
