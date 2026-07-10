import en from './en'
import ptBR from './pt-BR'

const DICTS = { en, 'pt-BR': ptBR }

export function getStoredLocale() {
  try {
    return localStorage.getItem('cs4fun_locale') || 'en'
  } catch {
    return 'en'
  }
}

function getByPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj)
}

function applyVars(str, vars) {
  if (!vars || typeof str !== 'string') return str
  let out = str
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{${k}}`, String(v))
  }
  return out
}

/** Non-React translator for engines / playback (reads current locale). */
export function translate(path, vars, locale = getStoredLocale()) {
  const dict = DICTS[locale] || en
  let val = getByPath(dict, path)
  if (val == null) val = getByPath(en, path)
  if (typeof val !== 'string') return path
  return applyVars(val, vars)
}

/** Pick a random string from an i18n array path (e.g. liveLog.flavors.eco). */
export function translatePick(path, vars, locale = getStoredLocale()) {
  const dict = DICTS[locale] || en
  let arr = getByPath(dict, path)
  if (!Array.isArray(arr) || !arr.length) arr = getByPath(en, path)
  if (!Array.isArray(arr) || !arr.length) return ''
  const text = arr[Math.floor(Math.random() * arr.length)]
  return applyVars(text, vars)
}
