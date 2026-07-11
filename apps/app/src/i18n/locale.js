export const SUPPORTED_LOCALES = ['en', 'pt-BR']
export const LOCALE_STORAGE_KEY = 'cs4fun_locale'

/** Map browser language tags to a supported app locale; anything else → EN. */
export function detectDeviceLocale() {
  try {
    const candidates = [
      ...(typeof navigator !== 'undefined' && Array.isArray(navigator.languages)
        ? navigator.languages
        : []),
      typeof navigator !== 'undefined' ? navigator.language : null,
      typeof navigator !== 'undefined' ? navigator.userLanguage : null,
    ].filter(Boolean)

    for (const raw of candidates) {
      const tag = String(raw).toLowerCase().replace('_', '-')
      if (tag === 'pt' || tag.startsWith('pt-')) return 'pt-BR'
    }
  } catch {
    /* ignore */
  }
  return 'en'
}

export function normalizeLocale(value) {
  if (value === 'pt-BR' || value === 'pt') return 'pt-BR'
  if (value === 'en') return 'en'
  return null
}

/** Saved preference wins; otherwise device language with EN fallback. */
export function resolveInitialLocale() {
  try {
    const saved = normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY))
    if (saved) return saved
  } catch {
    /* ignore */
  }
  return detectDeviceLocale()
}
