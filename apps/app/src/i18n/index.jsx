import { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react'
import en from './en'
import ptBR from './pt-BR'
import { LOCALE_STORAGE_KEY, normalizeLocale, resolveInitialLocale } from './locale'
import {
  CURRENCY_STORAGE_KEY,
  normalizeCurrency,
  resolveInitialCurrency,
  formatMoney,
} from '../lib/currency'

const DICTS = { en, 'pt-BR': ptBR }
const I18nContext = createContext(null)

function getByPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj)
}

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(() => resolveInitialLocale())
  const [currency, setCurrencyState] = useState(() => resolveInitialCurrency())

  const setLocale = useCallback((next) => {
    const normalized = normalizeLocale(next) || 'en'
    setLocaleState(normalized)
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, normalized)
    } catch {
      /* ignore */
    }
  }, [])

  const setCurrency = useCallback((next) => {
    const normalized = normalizeCurrency(next)
    setCurrencyState(normalized)
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, normalized)
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

  const money = useCallback(
    (amountUsd, opts) => formatMoney(amountUsd, currency, opts),
    [currency],
  )

  const value = useMemo(
    () => ({ locale, setLocale, currency, setCurrency, t, money, dict }),
    [locale, setLocale, currency, setCurrency, t, money, dict],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
