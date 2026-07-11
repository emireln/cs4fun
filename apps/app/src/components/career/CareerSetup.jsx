import { useRef, useState } from 'react'
import { ImagePlus, Trash2, Star } from 'lucide-react'
import { useI18n } from '../../i18n'
import { compressAvatarFile } from '../../lib/avatarImage'
import { STARTING_BUDGET } from '../../lib/career'

export default function CareerSetup({ nickname, onCreate, saving }) {
  const { t, money } = useI18n()
  const fileRef = useRef(null)
  const [orgName, setOrgName] = useState(() => `${nickname || 'ORG'}`.slice(0, 24))
  const [shortName, setShortName] = useState(() =>
    String(nickname || 'ORG')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 5) || 'ORG',
  )
  const [orgLogo, setOrgLogo] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleLogo = async (file) => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const dataUrl = await compressAvatarFile(file)
      setOrgLogo(dataUrl)
    } catch {
      setError(t('career.logoError'))
    } finally {
      setBusy(false)
    }
  }

  const submit = (e) => {
    e.preventDefault()
    const name = orgName.trim()
    const tag = shortName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
    if (name.length < 2) {
      setError(t('career.orgNameRequired'))
      return
    }
    if (tag.length < 2) {
      setError(t('career.orgTagRequired'))
      return
    }
    onCreate({ orgName: name, shortName: tag, orgLogo })
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 pb-[calc(5rem+env(safe-area-inset-bottom,0px))]">
      <p className="inline-flex items-center gap-1.5 font-display text-[10px] tracking-[0.25em] text-cs-gold uppercase">
        <Star className="h-3.5 w-3.5 fill-cs-gold" />
        {t('modes.career.title')}
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold">{t('career.setupTitle')}</h1>
      <p className="mt-2 text-sm text-cs-muted">{t('career.setupBlurb', { budget: money(STARTING_BUDGET) })}</p>

      <form onSubmit={submit} className="mt-6 space-y-4 panel rounded-xl p-4 sm:p-5">
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            disabled={busy || saving}
            onClick={() => fileRef.current?.click()}
            className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-cs-gold/40 bg-cs-bg/60"
            aria-label={t('career.uploadLogo')}
          >
            {orgLogo ? (
              <img src={orgLogo} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus className="h-8 w-8 text-cs-gold/80" />
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handleLogo(e.target.files?.[0])}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-ghost rounded px-3 py-1.5 text-[10px] uppercase"
              onClick={() => fileRef.current?.click()}
              disabled={busy || saving}
            >
              {t('career.uploadLogo')}
            </button>
            {orgLogo && (
              <button
                type="button"
                className="btn-ghost inline-flex items-center gap-1 rounded px-3 py-1.5 text-[10px] uppercase text-cs-loss"
                onClick={() => setOrgLogo(null)}
              >
                <Trash2 className="h-3 w-3" />
                {t('career.clearLogo')}
              </button>
            )}
          </div>
        </div>

        <label className="block">
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-cs-muted">
            {t('career.orgName')}
          </span>
          <input
            value={orgName}
            onChange={(e) => setOrgName(e.target.value.slice(0, 32))}
            className="w-full rounded-lg border border-cs-border bg-cs-bg/60 px-3 py-2.5 text-sm outline-none focus:border-cs-gold/50"
            maxLength={32}
            required
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-cs-muted">
            {t('career.orgTag')}
          </span>
          <input
            value={shortName}
            onChange={(e) =>
              setShortName(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))
            }
            className="w-full rounded-lg border border-cs-border bg-cs-bg/60 px-3 py-2.5 font-mono text-sm tracking-wider outline-none focus:border-cs-gold/50"
            maxLength={8}
            required
          />
          <span className="mt-1 block text-[10px] text-cs-muted">{t('career.orgTagHint')}</span>
        </label>

        {error && <p className="text-xs text-cs-loss">{error}</p>}

        <button
          type="submit"
          disabled={busy || saving}
          className="btn-gold w-full rounded px-4 py-3 text-xs uppercase tracking-wider disabled:opacity-40"
        >
          {saving ? t('career.saving') : t('career.foundOrg')}
        </button>
      </form>
    </div>
  )
}
