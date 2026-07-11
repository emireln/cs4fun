import { useEffect, useState, useCallback } from 'react'

/** True when browser reports offline. Updates on online/offline events. */
export function useOnlineStatus() {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine !== false,
  )

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    // Periodic sanity check (some browsers miss events after sleep)
    const id = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine !== online) {
        setOnline(navigator.onLine)
      }
    }, 4000)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      clearInterval(id)
    }
  }, [online])

  const dismissUntilReconnect = useCallback(() => {
    /* consumers can track dismissed state separately */
  }, [])

  return { online, dismissUntilReconnect }
}
