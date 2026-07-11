/** Clean wordmark — no decorative glyph. */
export default function BrandWordmark({ className = '', size = 'sm' }) {
  const text = size === 'lg' ? 'text-base sm:text-lg' : 'text-sm'

  return (
    <span
      className={`inline-flex font-display font-bold tracking-[0.14em] text-cs-gold ${text} ${className}`}
      aria-label="CS4FUN"
    >
      CS4FUN
    </span>
  )
}
