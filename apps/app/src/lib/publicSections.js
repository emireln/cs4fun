/** Which blocks appear on a public profile (when profile is not fully private). */

export const PUBLIC_SECTION_KEYS = ['stats', 'modes', 'career', 'box', 'steam', 'showcase']

export const DEFAULT_PUBLIC_SECTIONS = {
  stats: true,
  modes: true,
  career: true,
  box: true,
  steam: true,
  showcase: true,
}

export function normalizePublicSections(value) {
  const src = value && typeof value === 'object' ? value : {}
  const out = { ...DEFAULT_PUBLIC_SECTIONS }
  for (const key of PUBLIC_SECTION_KEYS) {
    if (src[key] !== undefined) out[key] = Boolean(src[key])
  }
  return out
}
