/**
 * Brand mark — public/logo.png.
 * Height must come from className (h-* / max-h-*) — global img { height:auto } excludes .logo-mark.
 */
export default function LogoMark({ className = 'h-10 w-auto max-h-10', title, decorative = true }) {
  const alt = title || (decorative ? '' : 'CS4FUN')

  return (
    <img
      src={`${import.meta.env.BASE_URL}logo.png`}
      alt={alt}
      draggable={false}
      className={`logo-mark ${className}`}
      aria-hidden={decorative && !title ? true : undefined}
      role={title ? 'img' : undefined}
    />
  )
}
