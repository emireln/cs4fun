import { useState } from 'react'
import { LayoutDashboard, Users, Swords, LogOut, Shield, DoorOpen, Languages } from 'lucide-react'
import { useI18n } from '../../i18n'
import { useAuth } from '../../lib/auth'
import AdminOverview from './AdminOverview'
import AdminUsers from './AdminUsers'
import AdminGames from './AdminGames'
import AdminRooms from './AdminRooms'

const TABS = [
  { id: 'overview', icon: LayoutDashboard },
  { id: 'users', icon: Users },
  { id: 'games', icon: Swords },
  { id: 'rooms', icon: DoorOpen },
]

export default function AdminShell() {
  const { t, locale, setLocale } = useI18n()
  const { profile, signOut, displayName } = useAuth()
  const [tab, setTab] = useState('overview')

  const toggleLocale = () => setLocale(locale === 'en' ? 'pt-BR' : 'en')

  return (
    <div className="carbon-bg min-h-dvh overflow-x-clip text-cs-text">
      <div className="mx-auto flex min-h-dvh max-w-7xl flex-col lg:flex-row">
        <aside className="flex shrink-0 flex-col border-b border-cs-border/60 lg:w-56 lg:border-r lg:border-b-0">
          <div className="flex items-center gap-2 px-4 py-4 pt-[max(1rem,env(safe-area-inset-top,0px))]">
            <Shield className="h-5 w-5 text-cs-gold" aria-hidden />
            <div className="min-w-0">
              <div className="font-display text-xs font-bold tracking-[0.2em] text-cs-gold uppercase">
                {t('admin.title')}
              </div>
              <div className="truncate text-[11px] text-cs-muted">
                {displayName || profile?.nickname}
              </div>
            </div>
          </div>

          <nav className="flex gap-1 overflow-x-auto px-2 pb-3 lg:flex-col lg:overflow-visible lg:px-3 lg:pb-6">
            {TABS.map(({ id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`inline-flex min-h-[40px] items-center gap-2 rounded px-3 py-2 text-left text-xs font-semibold tracking-wider whitespace-nowrap uppercase ${
                  tab === id
                    ? 'bg-cs-gold/15 text-cs-gold'
                    : 'text-cs-muted hover:bg-white/5 hover:text-cs-text'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {t(`admin.nav.${id}`)}
              </button>
            ))}
          </nav>

          <div className="mt-auto hidden space-y-1 border-t border-cs-border/50 px-3 py-4 lg:block">
            <button
              type="button"
              onClick={toggleLocale}
              title={locale === 'en' ? 'PT' : 'EN'}
              aria-label={t('nav.language')}
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-cs-muted transition hover:bg-white/5 hover:text-cs-gold"
            >
              <Languages className="h-[18px] w-[18px]" />
              <span className="absolute -right-0 -bottom-0.5 rounded bg-cs-bg px-0.5 font-mono text-[8px] font-bold text-cs-gold">
                {locale === 'en' ? 'EN' : 'PT'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => signOut()}
              className="flex w-full items-center gap-2 rounded px-2 py-2 text-xs text-cs-muted hover:text-cs-loss"
            >
              <LogOut className="h-3.5 w-3.5" />
              {t('nav.signOut')}
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center justify-between gap-2 lg:hidden">
            <button
              type="button"
              onClick={toggleLocale}
              title={locale === 'en' ? 'PT' : 'EN'}
              aria-label={t('nav.language')}
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-cs-muted transition hover:bg-white/5 hover:text-cs-gold"
            >
              <Languages className="h-[18px] w-[18px]" />
              <span className="absolute -right-0 -bottom-0.5 rounded bg-cs-bg px-0.5 font-mono text-[8px] font-bold text-cs-gold">
                {locale === 'en' ? 'EN' : 'PT'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => signOut()}
              className="inline-flex items-center gap-1.5 text-xs text-cs-muted hover:text-cs-loss"
            >
              <LogOut className="h-3.5 w-3.5" />
              {t('nav.signOut')}
            </button>
          </div>

          {tab === 'overview' && <AdminOverview />}
          {tab === 'users' && <AdminUsers />}
          {tab === 'games' && <AdminGames />}
          {tab === 'rooms' && <AdminRooms />}
        </main>
      </div>
    </div>
  )
}
