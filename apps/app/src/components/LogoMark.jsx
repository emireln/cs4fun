import { useCallback, useState } from 'react'

/**
 * Inline cs4fun mark — gold diamond spins on hover / click.
 * Plain SVG + CSS (Framer/CSS path transforms were unreliable in Electron).
 */
export default function LogoMark({ className = '', title, decorative = true }) {
  const [clickSpin, setClickSpin] = useState(false)

  const triggerClickSpin = useCallback(() => {
    setClickSpin(false)
    requestAnimationFrame(() => setClickSpin(true))
  }, [])

  const onDiamondAnimEnd = useCallback((e) => {
    if (!String(e.animationName).includes('logo-diamond-spin-once')) return
    setClickSpin(false)
  }, [])

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      fill="none"
      className={`logo-mark ${clickSpin ? 'logo-mark--click' : ''} ${className}`}
      aria-hidden={decorative && !title ? true : undefined}
      role={title ? 'img' : undefined}
      aria-label={title}
      onPointerDown={triggerClickSpin}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') triggerClickSpin()
      }}
    >
      <circle cx="64" cy="64" r="38" stroke="#E8EDF5" strokeWidth="5" />
      <path
        d="M64 18v20M64 90v20M18 64h20M90 64h20"
        stroke="#E8EDF5"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <g
        className="logo-diamond"
        onAnimationEnd={onDiamondAnimEnd}
      >
        <path d="M64 52l12 12-12 12-12-12 12-12z" fill="#E8C547" />
      </g>
    </svg>
  )
}
