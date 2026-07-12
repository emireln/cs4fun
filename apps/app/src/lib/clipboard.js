/**
 * Copy plain text to the system clipboard.
 * Prefer Electron IPC on desktop (file:// / denied permissions break navigator.clipboard).
 */
export async function copyText(text) {
  const value = String(text ?? '')
  if (!value) return { ok: false }

  const desktop = typeof window !== 'undefined' ? window.cs4funDesktop : null
  if (desktop?.copyText) {
    try {
      await desktop.copyText(value)
      return { ok: true, method: 'desktop' }
    } catch {
      /* fall through */
    }
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return { ok: true, method: 'clipboard' }
    }
  } catch {
    /* fall through */
  }

  try {
    const el = document.createElement('textarea')
    el.value = value
    el.setAttribute('readonly', '')
    el.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0'
    document.body.appendChild(el)
    el.focus()
    el.select()
    el.setSelectionRange(0, value.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(el)
    if (ok) return { ok: true, method: 'execCommand' }
  } catch {
    /* ignore */
  }

  return { ok: false }
}
