import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'

/** Short confirmation toast (e.g. invite sent). */
export default function AppToast({ message, onDone }) {
  if (!message) return null

  return (
    <AnimatePresence>
      <motion.div
        key={message}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className="pointer-events-none fixed left-1/2 top-[max(0.75rem,env(safe-area-inset-top,0px))] z-[70] -translate-x-1/2 px-3 pt-[calc(52px+0.5rem)] sm:pt-[calc(56px+0.75rem)]"
        role="status"
        aria-live="polite"
        onAnimationComplete={() => {
          /* keep visible; parent clears via timeout */
        }}
      >
        <div className="pointer-events-auto inline-flex max-w-[min(92vw,24rem)] items-center gap-2 rounded-lg border border-cs-gold/40 bg-[#0a0c10]/95 px-3.5 py-2.5 text-sm text-cs-gold shadow-lg backdrop-blur-md">
          <Check className="h-4 w-4 shrink-0" />
          <span className="font-semibold leading-snug">{message}</span>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
