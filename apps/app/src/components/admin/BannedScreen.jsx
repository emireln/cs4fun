import { ShieldOff } from 'lucide-react'
import { useI18n } from '../../i18n'
import { useAuth } from '../../lib/auth'

export default function BannedScreen() {
  const { t } = useI18n()
  const { access, signOut } = useAuth()

  return (
    <div className="carbon-bg flex min-h-dvh flex-col items-center justify-center overflow-x-clip px-5 py-12 text-center">
      <ShieldOff className="mb-4 h-12 w-12 text-cs-loss" aria-hidden />
      <h1 className="font-display text-2xl font-bold text-cs-loss sm:text-3xl">{t('admin.bannedTitle')}</h1>
      <p className="mt-3 max-w-md text-sm text-cs-muted">{t('admin.bannedBody')}</p>
      {access?.banReason ? (
        <p className="mt-4 max-w-md rounded border border-cs-loss/30 bg-cs-loss/10 px-4 py-3 text-sm text-cs-text">
          {access.banReason}
        </p>
      ) : null}
      <button
        type="button"
        className="btn-ghost mt-8 rounded px-6 py-3 text-xs uppercase tracking-wider"
        onClick={() => signOut()}
      >
        {t('nav.signOut')}
      </button>
    </div>
  )
}
