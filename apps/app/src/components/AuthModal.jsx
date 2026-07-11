import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '../i18n'
import { useAuth } from '../lib/auth'
import { isSupabaseConfigured } from '../lib/supabase'
import LogoMark from './LogoMark'

export default function AuthModal({ open, onClose }) {
  const { t } = useI18n()
  const { signIn, signUp, isAuthed } = useAuth()
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open && isAuthed) onClose()
  }, [open, isAuthed, onClose])

  if (!open || isAuthed) return null

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    if (tab === 'signup') {
      if (password !== confirmPassword) {
        setError(t('auth.passwordMismatch'))
        return
      }
      if (password.length < 6) {
        setError(t('auth.passwordShort'))
        return
      }
    }

    setBusy(true)
    if (!isSupabaseConfigured) {
      setError(t('auth.noSupabase'))
      setBusy(false)
      return
    }

    const res =
      tab === 'login'
        ? await signIn({ email, password })
        : await signUp({ email, password, nickname })

    setBusy(false)
    if (res.error) {
      setError(res.error === 'no_supabase' ? t('auth.noSupabase') : res.error)
      return
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto overscroll-contain bg-black/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] backdrop-blur-sm sm:items-center sm:pb-4">
      <div className="panel relative my-auto w-full max-w-sm rounded-xl p-5">
        <button
          type="button"
          className="absolute right-3 top-3 text-cs-muted hover:text-cs-text"
          onClick={onClose}
          aria-label={t('common.close')}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="group mb-4 flex items-center gap-3">
          <LogoMark className="h-10 w-10 cursor-pointer" />
          <h2 className="font-display text-lg font-bold text-cs-gold">{t('auth.title')}</h2>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {tab === 'signup' && (
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={16}
              placeholder={t('auth.nickname')}
              className="w-full rounded border border-cs-border bg-cs-bg/60 px-3 py-2 text-sm outline-none focus:border-cs-gold/50"
            />
          )}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.email')}
            className="w-full rounded border border-cs-border bg-cs-bg/60 px-3 py-2 text-sm outline-none focus:border-cs-gold/50"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.password')}
            autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            className="w-full rounded border border-cs-border bg-cs-bg/60 px-3 py-2 text-sm outline-none focus:border-cs-gold/50"
          />
          {tab === 'signup' && (
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('auth.confirmPassword')}
              autoComplete="new-password"
              className="w-full rounded border border-cs-border bg-cs-bg/60 px-3 py-2 text-sm outline-none focus:border-cs-gold/50"
            />
          )}
          {error && <p className="text-xs text-cs-loss">{error}</p>}
          <button type="submit" disabled={busy} className="btn-gold w-full rounded py-2.5 text-sm uppercase tracking-wider">
            {tab === 'login' ? t('auth.login') : t('auth.create')}
          </button>
          <button
            type="button"
            className="w-full text-center text-xs text-cs-muted hover:text-cs-gold"
            onClick={() => {
              setTab(tab === 'login' ? 'signup' : 'login')
              setError('')
              setConfirmPassword('')
            }}
          >
            {tab === 'login' ? t('auth.switchToSignup') : t('auth.switchToLogin')}
          </button>
        </form>
      </div>
    </div>
  )
}
