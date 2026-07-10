import { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react'
import en from './en'
import ptBR from './pt-BR'

const DICTS = { en, 'pt-BR': ptBR }
const I18nContext = createContext(null)

function getByPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj)
}

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(() => {
    try {
      return localStorage.getItem('cs4fun_locale') || 'en'
    } catch {
      return 'en'
    }
  })

  const setLocale = useCallback((next) => {
    setLocaleState(next)
    try {
      localStorage.setItem('cs4fun_locale', next)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale === 'pt-BR' ? 'pt-BR' : 'en'
  }, [locale])

  const dict = DICTS[locale] || en

  const t = useCallback(
    (path, vars) => {
      let str = getByPath(dict, path)
      if (str == null) str = getByPath(en, path) || path
      if (typeof str !== 'string') return path
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replaceAll(`{${k}}`, String(v))
        }
      }
      return str
    },
    [dict],
  )

  const value = useMemo(() => ({ locale, setLocale, t, dict }), [locale, setLocale, t, dict])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
