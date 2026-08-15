import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function MatchTerminal({ logs, title = 'Match Terminal' }) {
  const bottomRef = useRef(null)
  // Stable per-log keys so appends don't remount the whole feed.
  const feedSeq = useRef(0)
  const feedIds = useRef(new WeakMap())
  const keyForLog = (log) => {
    let id = feedIds.current.get(log)
    if (id == null) {
      id = feedSeq.current++
      feedIds.current.set(log, id)
    }
    return id
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div className="panel flex h-full min-h-[320px] flex-col overflow-hidden rounded-lg">
      <div className="flex items-center justify-between border-b border-cs-border px-4 py-2.5">
        <h3 className="font-display text-[10px] font-bold tracking-[0.22em] text-cs-gold uppercase">
          {title}
        </h3>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-cs-win">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cs-win" /> LIVE
        </span>
      </div>
      <div className="terminal scrollbar-thin flex-1 overflow-y-auto p-3 text-[12px] leading-relaxed sm:text-[13px]">
        <AnimatePresence initial={false}>
          {logs.map((log) => (
            <motion.div
              key={keyForLog(log)}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className={`terminal-line-${log.type || 'round'} mb-1`}
            >
              <span className="mr-2 text-cs-muted/50 select-none">›</span>
              {log.text}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
