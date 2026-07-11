import { useEffect, useState } from 'react'
import { teamInitials, teamLogoCandidates } from '../data/teamLogos'

/**
 * Real org logo with initials fallback when missing / failed to load.
 * Prefers WebP, then PNG — keeps paint fast on mobile/Electron.
 */
export default function TeamLogo({
  name,
  className = '',
  imgClassName = '',
  size = 'md',
  title,
  decorative = false,
  eager = false,
}) {
  const candidates = teamLogoCandidates(name)
  const [idx, setIdx] = useState(0)
  const src = candidates[idx] || null

  useEffect(() => {
    setIdx(0)
  }, [name])

  const box =
    size === 'xs'
      ? 'h-4 w-4'
      : size === 'sm'
        ? 'h-5 w-5'
        : size === 'lg'
          ? 'h-10 w-10'
          : size === 'xl'
            ? 'h-12 w-12'
            : 'h-7 w-7'

  const px = size === 'xs' ? 16 : size === 'sm' ? 20 : size === 'lg' ? 40 : size === 'xl' ? 48 : 28

  const text =
    size === 'xs' || size === 'sm'
      ? 'text-[7px]'
      : size === 'lg' || size === 'xl'
        ? 'text-[10px]'
        : 'text-[8px]'

  const label = title || name || ''
  const showImg = Boolean(src)

  if (!showImg) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded border border-cs-border/70 bg-cs-bg/70 font-display font-bold tracking-wide text-cs-muted ${box} ${text} ${className}`}
        title={label || undefined}
        aria-hidden={decorative && !title ? true : undefined}
        role={title ? 'img' : undefined}
        aria-label={title || undefined}
      >
        {teamInitials(name)}
      </span>
    )
  }

  return (
    <img
      src={src}
      alt={decorative ? '' : label}
      title={label || undefined}
      width={px}
      height={px}
      draggable={false}
      loading={eager || size === 'lg' || size === 'xl' ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={eager || size === 'lg' || size === 'xl' ? 'high' : 'low'}
      onError={() => {
        if (idx + 1 < candidates.length) setIdx((i) => i + 1)
        else setIdx(candidates.length)
      }}
      className={`inline-block shrink-0 object-contain ${box} ${imgClassName} ${className}`}
      aria-hidden={decorative && !title ? true : undefined}
    />
  )
}
