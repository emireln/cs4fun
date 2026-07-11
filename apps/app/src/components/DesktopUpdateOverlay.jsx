import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, RefreshCw, CheckCircle2, AlertTriangle, X, Sparkles } from 'lucide-react'
import { useI18n } from '../i18n'

function getDesktopApi() {
  return typeof window !== 'undefined' ? window.cs4funDesktop : null
}

export default function DesktopUpdateOverlay() {
  const { t } = useI18n()
  const [state, setState] = useState(null)

  useEffect(() => {
    const api = getDesktopApi()
    if (!api?.onUpdateEvent) return undefined
    return api.onUpdateEvent((payload) => {
      if (!payload?.type) return
      setState((prev) => {
        if (payload.type === 'progress' && prev?.type === 'progress') {
          return { ...prev, ...payload }
        }
        if (payload.type === 'progress' && prev?.type === 'available') {
          return { ...prev, ...payload, type: 'progress' }
        }
        return { ...payload, at: Date.now() }
      })
    })
  }, [])

  useEffect(() => {
    if (!state) return undefined
    if (state.type === 'up-to-date' || state.type === 'unavailable') {
      const id = setTimeout(() => setState(null), 4200)
      return () => clearTimeout(id)
    }
    return undefined
  }, [state])

  if (!state) return null

  const dismiss = () => setState(null)

  const install = async () => {
    const api = getDesktopApi()
    await api?.installUpdate?.()
  }

  const percent = Math.round(Number(state.percent) || 0)
  const isModal = state.type === 'downloaded' || state.type === 'error'
  const isToast =
    state.type === 'checking' ||
    state.type === 'available' ||
    state.type === 'progress' ||
    state.type === 'up-to-date' ||
    state.type === 'unavailable'

  return (
    <AnimatePresence>
      {isToast && (
        <motion.div
          key={`toast-${state.type}-${state.at || 0}`}
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12 }}
          className="pointer-events-auto fixed inset-x-0 bottom-0 z-[60] flex justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]"
        >
          <div className="panel w-full max-w-md overflow-hidden rounded-xl border border-cs-gold/35 shadow-[0_12px_40px_rgba(0,0,0,0.55)]">
            <div className="flex items-start gap-3 px-4 py-3.5">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cs-gold/40 bg-cs-gold/10 text-cs-gold">
                {state.type === 'checking' && <RefreshCw className="h-4 w-4 animate-spin" />}
                {(state.type === 'available' || state.type === 'progress') && (
                  <Download className="h-4 w-4" />
                )}
                {(state.type === 'up-to-date' || state.type === 'unavailable') && (
                  <CheckCircle2 className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-[10px] font-bold tracking-[0.2em] text-cs-gold uppercase">
                  {t('desktopUpdate.brand')}
                </div>
                <p className="mt-1 text-sm font-semibold text-cs-text">
                  {state.type === 'checking' && t('desktopUpdate.checking')}
                  {state.type === 'available' &&
                    t('desktopUpdate.available', { version: state.version || '…' })}
                  {state.type === 'progress' &&
                    t('desktopUpdate.downloading', { percent: String(percent) })}
                  {state.type === 'up-to-date' &&
                    t('desktopUpdate.upToDate', { version: state.currentVersion || state.version || '' })}
                  {state.type === 'unavailable' && t('desktopUpdate.unavailable')}
                </p>
                {(state.type === 'available' || state.type === 'progress') && (
                  <p className="mt-1 text-xs text-cs-muted">{t('desktopUpdate.keepPlaying')}</p>
                )}
                {(state.type === 'available' || state.type === 'progress') && (
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-cs-border">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-cs-gold-dim to-cs-gold"
                      initial={false}
                      animate={{ width: `${state.type === 'available' ? 8 : Math.max(percent, 4)}%` }}
                      transition={{ duration: 0.25 }}
                    />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={dismiss}
                className="rounded p-1 text-cs-muted transition hover:bg-white/5 hover:text-cs-gold"
                aria-label={t('desktopUpdate.dismiss')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {isModal && (
        <motion.div
          key={`modal-${state.type}-${state.at || 0}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto bg-black/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] backdrop-blur-sm sm:items-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            className="panel w-full max-w-md overflow-hidden rounded-xl border border-cs-gold/40"
          >
            <div className="border-b border-cs-border/60 bg-cs-gold/8 px-5 py-4">
              <div className="flex items-center gap-2">
                {state.type === 'downloaded' ? (
                  <Sparkles className="h-4 w-4 text-cs-gold" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-cs-warn" />
                )}
                <h2 className="font-display text-xs font-bold tracking-[0.22em] text-cs-gold uppercase">
                  {state.type === 'downloaded'
                    ? t('desktopUpdate.readyTitle')
                    : t('desktopUpdate.errorTitle')}
                </h2>
              </div>
            </div>
            <div className="space-y-4 px-5 py-5">
              <p className="text-sm text-cs-text">
                {state.type === 'downloaded'
                  ? t('desktopUpdate.readyBody', { version: state.version || '' })
                  : t('desktopUpdate.errorBody')}
              </p>
              {state.type === 'error' && state.message && (
                <p className="rounded border border-cs-border bg-cs-bg/50 px-3 py-2 font-mono text-[11px] text-cs-muted">
                  {state.message}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {state.type === 'downloaded' ? (
                  <>
                    <button
                      type="button"
                      className="btn-gold rounded px-5 py-2.5 text-xs uppercase tracking-wider"
                      onClick={install}
                    >
                      {t('desktopUpdate.restartNow')}
                    </button>
                    <button
                      type="button"
                      className="btn-ghost rounded px-4 py-2.5 text-xs uppercase tracking-wider"
                      onClick={dismiss}
                    >
                      {t('desktopUpdate.later')}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn-gold rounded px-5 py-2.5 text-xs uppercase tracking-wider"
                    onClick={dismiss}
                  >
                    {t('desktopUpdate.dismiss')}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
