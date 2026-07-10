import { AnimatePresence, motion } from 'framer-motion'
import { useI18n } from '../i18n'

export default function HypeBanner({ event }) {
  const { t } = useI18n()
  if (!event) return null

  const label =
    event === 'clutch'
      ? t('hype.clutch')
      : event === 'ace'
        ? t('hype.ace')
        : event === 'eco'
          ? t('hype.eco')
          : event === 'matchpoint'
            ? t('hype.matchpoint')
            : event === 'overtime'
              ? t('hype.overtime')
              : null

  if (!label) return null

  return (
    <AnimatePresence>
      <motion.div
        key={label}
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 1.1 }}
        className="pointer-events-none fixed inset-x-0 top-[calc(6.5rem+env(safe-area-inset-top,0px))] z-50 flex justify-center px-4 sm:top-24"
      >
        <div className="rounded border border-cs-gold/50 bg-black/80 px-6 py-3 font-display text-lg font-bold tracking-[0.2em] text-cs-gold shadow-[0_0_40px_rgba(232,197,71,0.35)] backdrop-blur-md sm:text-2xl">
          {label}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
