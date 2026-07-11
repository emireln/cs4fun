import { createContext } from 'react'

/** Kept in its own module so Fast Refresh on dictionaries/provider does not recreate the context identity. */
export const I18nContext = createContext(null)
