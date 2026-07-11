/**
 * Brand mark — root logo.png (served from /logo.png).
 */
export default function LogoMark({ className = '', title, decorative = true }) {
  const alt = title || (decorative ? '' : 'cs4fun')

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
