/** Small count pill for tabs / nav — shows 1–99 or +99. */
export default function CountBadge({ count, className = '' }) {
  const n = Math.max(0, Math.floor(Number(count) || 0))
  if (n <= 0) return null
  const label = n > 99 ? '+99' : String(n)

  return (
    <span
      className={`ml-1.5 inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-cs-gold px-1 py-0.5 text-[9px] font-bold leading-none text-black tabular-nums ${className}`}
      aria-label={label}
    >
      {label}
    </span>
  )
}
