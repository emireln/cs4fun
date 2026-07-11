import TeamLogo from '../TeamLogo'

/** Org brand mark — custom upload or roster TeamLogo / initials. */
export default function OrgMark({ state, name, src, size = 'md', className = '', eager = false }) {
  const logo = src ?? state?.orgLogo
  const label = name || state?.shortName || state?.orgName || '?'

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

  if (logo) {
    return (
      <img
        src={logo}
        alt=""
        title={label}
        width={size === 'lg' ? 40 : size === 'xl' ? 48 : 28}
        height={size === 'lg' ? 40 : size === 'xl' ? 48 : 28}
        draggable={false}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className={`inline-block shrink-0 rounded object-cover ${box} ${className}`}
        aria-hidden
      />
    )
  }

  return <TeamLogo name={label} size={size} className={className} decorative eager={eager} />
}
