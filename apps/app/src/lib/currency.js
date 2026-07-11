/** Display currency preference — amounts in career are stored as USD integers. */

export const CURRENCY_STORAGE_KEY = 'cs4fun_currency'
export const CURRENCIES = ['USD', 'BRL']

/** Approximate USD→BRL for display (not a live FX feed). */
export const USD_TO_BRL = 5.5

export function normalizeCurrency(value) {
  const v = String(value || '').toUpperCase()
  return CURRENCIES.includes(v) ? v : 'USD'
}

export function resolveInitialCurrency() {
  try {
    const saved = localStorage.getItem(CURRENCY_STORAGE_KEY)
    if (saved) return normalizeCurrency(saved)
  } catch {
    /* ignore */
  }
  try {
    const loc = String(localStorage.getItem('cs4fun_locale') || '')
    if (loc.toLowerCase().startsWith('pt')) return 'BRL'
  } catch {
    /* ignore */
  }
  return 'USD'
}

/** Live preference (storage) — for non-React helpers like share cards / formatUsd. */
export function getDisplayCurrency() {
  try {
    const saved = localStorage.getItem(CURRENCY_STORAGE_KEY)
    if (saved) return normalizeCurrency(saved)
  } catch {
    /* ignore */
  }
  return resolveInitialCurrency()
}

export function usdToDisplay(amountUsd, currency = 'USD') {
  const n = Number(amountUsd) || 0
  if (normalizeCurrency(currency) === 'BRL') return n * USD_TO_BRL
  return n
}

/**
 * Format a USD-stored amount for UI.
 * @param {number} amountUsd
 * @param {'USD'|'BRL'} currency
 * @param {{ compact?: boolean, decimals?: number }} [opts]
 */
export function formatMoney(amountUsd, currency = 'USD', opts = {}) {
  const cur = normalizeCurrency(currency)
  const n = Number(amountUsd) || 0
  const value = usdToDisplay(n, cur)
  const locale = cur === 'BRL' ? 'pt-BR' : 'en-US'
  const fractionDigits =
    opts.decimals != null
      ? opts.decimals
      : Math.abs(n - Math.round(n)) > 0.001
        ? 2
        : 0
  if (opts.compact && Math.abs(value) >= 1000) {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: cur,
        notation: 'compact',
        maximumFractionDigits: Math.max(1, fractionDigits),
      }).format(value)
    } catch {
      /* fall through */
    }
  }
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value)
  } catch {
    const sym = cur === 'BRL' ? 'R$' : '$'
    const shown =
      fractionDigits > 0
        ? value.toLocaleString(locale, {
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits,
          })
        : Math.round(value).toLocaleString(locale)
    return `${sym}${shown}`
  }
}
