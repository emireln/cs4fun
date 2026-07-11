import { AnimatePresence, motion } from 'framer-motion'
import { WifiOff } from 'lucide-react'
import { useI18n } from '../i18n'

/**
 * Blocking-ish popup when the browser loses connectivity.
 * Guests can still play local modes; online features need a connection.
 */
export default function ConnectionLostModal({ open, onDismiss }) {
  const { t } = useI18n()

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/65 p-4 sm:items-center"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="offline-title"
        >
          <motion.div
            initial={{ y: 28, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="panel w-full max-w-md overflow-hidden rounded-2xl border-cs-loss/40 shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
          >
            <div className="relative overflow-hidden px-5 pb-5 pt-6 sm:px-6">
              <motion.div
                className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-cs-loss/20 blur-2xl"
                animate={{ opacity: [0.35, 0.7, 0.35], scale: [1, 1.08, 1] }}
                transition={{ duration: 2.4, repeat: Infinity }}
              />
              <div className="relative flex flex-col items-center text-center">
                <motion.div
                  className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-cs-loss/50 bg-cs-loss/15 text-cs-loss"
                  animate={{ rotate: [0, -8, 8, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <WifiOff className="h-7 w-7" />
                </motion.div>
                <h2 id="offline-title" className="font-display text-xl font-bold text-cs-text">
                  {t('connection.title')}
                </h2>
                <p className="mt-2 text-sm text-cs-muted">{t('connection.body')}</p>
                <p className="mt-1 text-xs text-cs-muted/80">{t('connection.hint')}</p>
                <div className="mt-5 flex w-full flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    className="btn-ghost flex-1 rounded py-2.5 text-xs uppercase tracking-wider"
                    onClick={onDismiss}
                  >
                    {t('connection.continueLocal')}
                  </button>
                  <button
                    type="button"
                    className="btn-gold flex-1 rounded py-2.5 text-xs uppercase tracking-wider"
                    onClick={() => window.location.reload()}
                  >
                    {t('connection.retry')}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
