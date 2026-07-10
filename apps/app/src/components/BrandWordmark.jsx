import { Crosshair } from 'lucide-react'

/** Wordmark with a diagonal AWP/crosshair over the “n” in fun. */
export default function BrandWordmark({ className = '', size = 'sm' }) {
  const text = size === 'lg' ? 'text-base sm:text-lg' : 'text-sm'
  const scope =
    size === 'lg'
      ? 'h-3.5 w-3.5 -translate-y-[55%]'
      : 'h-2.5 w-2.5 -translate-y-[50%]'

  return (
    <span
      className={`relative inline-flex items-baseline font-display font-bold tracking-[0.14em] text-cs-gold ${text} ${className}`}
      aria-label="cs4fun"
    >
      <span>cs4fu</span>
      <span className="relative inline-block">
        n
        <Crosshair
          className={`pointer-events-none absolute left-1/2 top-0 ${scope} -translate-x-1/2 rotate-[38deg] text-cs-gold drop-shadow-[0_0_4px_rgba(232,197,71,0.55)]`}
          strokeWidth={2.4}
          aria-hidden
        />
      </span>
    </span>
  )
}
