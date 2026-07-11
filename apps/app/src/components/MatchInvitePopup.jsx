import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Package, Swords, Users, X } from 'lucide-react'
import { useI18n } from '../i18n'
import ProfileAvatar from './ProfileAvatar'

/** Floating popup when another player invites you to duel/party/box. */
export default function MatchInvitePopup({ invite, busy = false, onAccept, onDecline }) {
  const { t } = useI18n()
  const [seconds, setSeconds] = useState(45)

  useEffect(() => {
    if (!invite) return undefined
    setSeconds(45)
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(id)
          onDecline?.(invite)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [invite?.id, invite?.roomCode]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!invite) return null

  const mode = invite.mode === 'party' ? 'party' : invite.mode === 'box' ? 'box' : 'duel'
  const ModeIcon = mode === 'party' ? Users : mode === 'box' ? Package : Swords

  return (
    <AnimatePresence>
      <motion.div
        key={String(invite.id || invite.roomCode)}
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.96 }}
        className="pointer-events-auto fixed right-3 z-[60] w-[min(100%-1.5rem,22rem)] sm:right-5"
        style={{ bottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
        role="dialog"
        aria-live="polite"
        aria-label={t('friends.invitePopupTitle', { name: invite.fromNick })}
      >
        <div className="panel overflow-hidden rounded-xl border-cs-gold/40 shadow-[0_12px_40px_rgba(0,0,0,0.55)]">
          <div className="flex items-start gap-3 p-3.5 sm:p-4">
            <ProfileAvatar
              avatarId={invite.fromAvatarId || 'cs4fun'}
              avatarUrl={invite.fromAvatarUrl}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-cs-gold">
                <ModeIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="font-display text-[10px] font-bold tracking-[0.16em] uppercase">
                  {t(`modes.${mode}.title`)}
                </span>
                <span className="ml-auto font-mono text-[10px] text-cs-muted">{seconds}s</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-cs-text">
                {t('friends.invitePopupTitle', { name: invite.fromNick || 'Player' })}
              </p>
              <p className="mt-0.5 text-xs text-cs-muted">{t('friends.invitePopupHint')}</p>
            </div>
            <button
              type="button"
              className="shrink-0 text-cs-muted hover:text-cs-text"
              onClick={() => onDecline?.(invite)}
              aria-label={t('friends.decline')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-2 border-t border-cs-border/60 bg-cs-bg/40 px-3 py-2.5 sm:px-4">
            <button
              type="button"
              disabled={busy}
              className="btn-ghost flex-1 rounded py-2 text-xs disabled:opacity-50"
              onClick={() => onDecline?.(invite)}
            >
              {t('friends.decline')}
            </button>
            <button
              type="button"
              disabled={busy}
              className="btn-gold flex-1 rounded py-2 text-xs uppercase tracking-wider disabled:opacity-50"
              onClick={() => onAccept?.(invite)}
            >
              <Check className="mr-1 inline h-3.5 w-3.5" />
              {t('friends.accept')}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
