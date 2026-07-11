import { Lock, LogIn, Star } from 'lucide-react'
import { useI18n } from '../../i18n'

export default function CareerLocked({ onNeedAuth, onHome }) {
  const { t } = useI18n()
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-lg flex-col items-center justify-center px-4 py-10 text-center">
      <div className="panel w-full rounded-2xl border border-cs-gold/35 bg-gradient-to-b from-cs-gold/10 to-transparent p-6 sm:p-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-cs-gold/40 bg-cs-gold/15">
          <Lock className="h-6 w-6 text-cs-gold" />
        </div>
        <div className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.22em] text-cs-gold uppercase">
          <Star className="h-3.5 w-3.5 fill-cs-gold" />
          {t('modes.career.tag')}
        </div>
        <h1 className="font-display text-2xl font-bold text-cs-text sm:text-3xl">{t('modes.career.title')}</h1>
        <p className="mt-3 text-sm text-cs-muted">{t('career.guestLocked')}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            className="btn-gold inline-flex items-center gap-2 rounded px-5 py-2.5 text-xs uppercase tracking-wider"
            onClick={onNeedAuth}
          >
            <LogIn className="h-3.5 w-3.5" />
            {t('career.signInToPlay')}
          </button>
          <button
            type="button"
            className="btn-ghost rounded px-4 py-2.5 text-xs uppercase tracking-wider"
            onClick={onHome}
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    </div>
  )
}
