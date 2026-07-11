import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ImagePlus,
  LogOut,
  Save,
  Volume2,
  VolumeX,
  KeyRound,
  Trash2,
  Lock,
  Globe,
  Share2,
  Award,
  Languages,
} from 'lucide-react'
import { useI18n } from '../i18n'
import { useAuth } from '../lib/auth'
import { AVATARS, DEFAULT_AVATAR_ID } from '../data/avatars'
import {
  BADGE_DEFS,
  fetchBadgeDefs,
  fetchUserBadges,
  fetchUserStats,
  fetchGameHistory,
  shareProfile,
} from '../lib/history'
import ProfileAvatar, { BADGE_ICONS } from './ProfileAvatar'
import { isSoundEnabled, setSoundEnabled, unlockAudio, playShot } from '../lib/sound'
import { compressAvatarFile } from '../lib/avatarImage'

const AUTH_TABS = ['edit', 'badges', 'history']

export default function ProfilePage({ onBack, onNeedAuth }) {
  const { t, locale, setLocale } = useI18n()
  const { profile, isAuthed, updateProfile, signOut, displayName, changePassword, deleteAccount } =
    useAuth()
  const [tab, setTab] = useState('edit')
  const [nickname, setNickname] = useState(profile.nickname || '')
  const [avatarId, setAvatarId] = useState(profile.avatarId || DEFAULT_AVATAR_ID)
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || null)
  const [showcaseBadge, setShowcaseBadge] = useState(profile.showcaseBadge || null)
  const [steamUrl, setSteamUrl] = useState(profile.steamUrl || '')
  const [profilePublic, setProfilePublic] = useState(profile.profilePublic !== false)
  const [saved, setSaved] = useState(false)
  const [shared, setShared] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [formError, setFormError] = useState(null)
  const [uploadBusy, setUploadBusy] = useState(false)
  const fileRef = useRef(null)
  const [defs, setDefs] = useState(BADGE_DEFS)
  const [owned, setOwned] = useState([])
  const [stats, setStats] = useState(null)
  const [history, setHistory] = useState([])
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled())

  const [curPass, setCurPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [passMsg, setPassMsg] = useState(null)
  const [passBusy, setPassBusy] = useState(false)

  const [delEmail, setDelEmail] = useState('')
  const [delTag, setDelTag] = useState('')
  const [delMsg, setDelMsg] = useState(null)
  const [delBusy, setDelBusy] = useState(false)

  useEffect(() => {
    setNickname(profile.nickname || '')
    setAvatarId(profile.avatarId || DEFAULT_AVATAR_ID)
    setAvatarUrl(profile.avatarUrl || null)
    setShowcaseBadge(profile.showcaseBadge || null)
    setSteamUrl(profile.steamUrl || '')
    setProfilePublic(profile.profilePublic !== false)
  }, [profile])

  useEffect(() => {
    if (!isAuthed) return
    fetchBadgeDefs().then(setDefs)
    fetchUserBadges(profile.id).then(setOwned)
    fetchUserStats(profile.id).then(setStats)
    fetchGameHistory(profile.id).then(setHistory)
  }, [profile.id, tab, isAuthed])

  useEffect(() => {
    if (!isAuthed && tab !== 'edit') setTab('edit')
  }, [isAuthed, tab])

  const ownedIds = new Set(owned.map((b) => b.id || b.badge_id))
  const showcaseDef = defs.find((d) => d.id === showcaseBadge)
  const showcaseIcon =
    showcaseDef?.icon || owned.find((b) => (b.id || b.badge_id) === showcaseBadge)?.icon

  const pickPreset = (id) => {
    setAvatarId(id)
    setAvatarUrl(null)
    setUploadError(null)
  }

  const onPickFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadBusy(true)
    setUploadError(null)
    try {
      const dataUrl = await compressAvatarFile(file)
      setAvatarUrl(dataUrl)
    } catch {
      setUploadError(t('profile.uploadError'))
    } finally {
      setUploadBusy(false)
    }
  }

  const save = async () => {
    setFormError(null)
    setUploadError(null)
    const res = await updateProfile(
      isAuthed
        ? {
            nickname: nickname.trim().slice(0, 16),
            avatarId,
            avatarUrl: avatarUrl || null,
            showcaseBadge: showcaseBadge && ownedIds.has(showcaseBadge) ? showcaseBadge : null,
            steamUrl: steamUrl.trim() || null,
            profilePublic,
          }
        : {
            avatarId,
            avatarUrl: avatarUrl || null,
          },
    )
    if (res?.error) {
      if (res.error === 'avatar_invalid') setUploadError(t('profile.uploadError'))
      else if (res.error === 'steam_invalid') setFormError(t('profile.steamInvalid'))
      else setFormError(res.error)
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const toggleSound = () => {
    unlockAudio()
    const next = setSoundEnabled(!soundOn)
    setSoundOn(next)
    if (next) playShot()
  }

  const toggleLocale = () => {
    setLocale(locale === 'en' ? 'pt-BR' : 'en')
  }

  const handleShareProfile = async () => {
    const res = await shareProfile({
      userId: profile.id,
      nickname: nickname.trim() || displayName,
    })
    if (res.ok) {
      setShared(true)
      setTimeout(() => setShared(false), 1800)
    }
  }

  const handleChangePassword = async () => {
    setPassMsg(null)
    if (newPass !== confirmPass) {
      setPassMsg({ ok: false, text: t('auth.passwordMismatch') })
      return
    }
    if (newPass.length < 6) {
      setPassMsg({ ok: false, text: t('auth.passwordShort') })
      return
    }
    setPassBusy(true)
    const res = await changePassword({ currentPassword: curPass, newPassword: newPass })
    setPassBusy(false)
    if (res.error) {
      const map = {
        wrong_password: t('profile.wrongPassword'),
        password_short: t('auth.passwordShort'),
        no_supabase: t('auth.noSupabase'),
        not_authenticated: t('auth.needAuth'),
      }
      setPassMsg({ ok: false, text: map[res.error] || res.error })
      return
    }
    setCurPass('')
    setNewPass('')
    setConfirmPass('')
    setPassMsg({ ok: true, text: t('profile.passwordChanged') })
  }

  const handleDelete = async () => {
    setDelMsg(null)
    setDelBusy(true)
    const res = await deleteAccount({ email: delEmail, tag: delTag })
    setDelBusy(false)
    if (res.error) {
      const map = {
        email_mismatch: t('profile.emailMismatch'),
        tag_mismatch: t('profile.tagMismatch'),
        no_supabase: t('auth.noSupabase'),
        not_authenticated: t('auth.needAuth'),
      }
      setDelMsg({ ok: false, text: map[res.error] || res.error })
      return
    }
    onBack()
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <button
        type="button"
        className="btn-ghost mb-6 inline-flex items-center gap-2 rounded px-3 py-2 text-sm"
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" /> {t('nav.back')}
      </button>

      <div className="panel mb-5 rounded-xl p-5 lg:mb-6 lg:p-6">
        <div className="flex flex-wrap items-center gap-4 lg:gap-6">
          <ProfileAvatar
            avatarId={avatarId}
            avatarUrl={avatarUrl}
            showcaseBadge={
              isAuthed && showcaseBadge && ownedIds.has(showcaseBadge) ? showcaseBadge : null
            }
            badgeIcon={showcaseIcon}
            ultra={isAuthed && ownedIds.has('completionist')}
            size="xl"
          />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-2xl font-bold text-cs-gold lg:text-3xl">
              {isAuthed ? displayName : t('profile.guest')}
            </h1>
            <p className="text-sm text-cs-muted lg:text-base">
              {isAuthed ? profile.email : t('profile.guestBlurb')}
            </p>
            {isAuthed && (
              <p className="mt-1 text-[11px] text-cs-muted lg:text-xs">
                {profilePublic ? t('profile.visibilityPublic') : t('profile.visibilityPrivate')}
                {steamUrl ? ` · ${t('profile.steam')}` : ''}
              </p>
            )}
            {isAuthed && stats && (
              <div className="mt-2 flex flex-wrap gap-2 text-xs lg:mt-3 lg:gap-3 lg:text-sm">
                <Chip label={t('profile.statWins')} value={stats.wins} />
                <Chip label={t('profile.statGames')} value={stats.games} />
                <Chip label={t('profile.statBadges')} value={ownedIds.size} />
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {isAuthed && (
                <button
                  type="button"
                  className="btn-ghost inline-flex items-center gap-2 rounded px-3 py-2 text-xs uppercase tracking-wider"
                  onClick={handleShareProfile}
                >
                  <Share2 className="h-3.5 w-3.5 text-cs-gold" aria-hidden />
                  {shared ? t('profile.shared') : t('profile.share')}
                </button>
              )}
              {!isAuthed && (
                <button
                  type="button"
                  className="btn-gold rounded px-4 py-2 text-xs uppercase tracking-wider"
                  onClick={onNeedAuth}
                >
                  {t('nav.signIn')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {!isAuthed && (
        <div className="mb-4 rounded border border-cs-gold/35 bg-cs-gold/10 px-4 py-3 text-sm text-cs-gold">
          {t('profile.guestUnlock')}
        </div>
      )}

      {isAuthed && (
        <div className="mb-4 flex gap-1.5">
          {AUTH_TABS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded border px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${
                tab === id
                  ? 'border-cs-gold bg-cs-gold/15 text-cs-gold'
                  : 'border-cs-border text-cs-muted'
              }`}
            >
              {t(`profile.tabs.${id}`)}
            </button>
          ))}
        </div>
      )}

      {tab === 'edit' && (
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-6 lg:items-start">
          <div className="panel space-y-5 rounded-xl p-5 lg:p-6">
            {!isAuthed && (
              <p className="text-sm text-cs-muted">{t('profile.guestUnlock')}</p>
            )}
            {isAuthed && (
              <>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold tracking-wider text-cs-muted uppercase">
                    {t('profile.nickname')}
                  </label>
                  <input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    maxLength={16}
                    placeholder={t('profile.nicknamePlaceholder')}
                    className="w-full rounded border border-cs-border bg-cs-bg/60 px-3 py-2 text-sm outline-none focus:border-cs-gold/50"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold tracking-wider text-cs-muted uppercase">
                    {t('profile.steam')}
                  </label>
                  <input
                    value={steamUrl}
                    onChange={(e) => setSteamUrl(e.target.value)}
                    placeholder={t('profile.steamPlaceholder')}
                    inputMode="url"
                    autoComplete="url"
                    className="w-full rounded border border-cs-border bg-cs-bg/60 px-3 py-2 text-sm outline-none focus:border-cs-gold/50"
                  />
                  <p className="mt-1.5 text-[11px] text-cs-muted">{t('profile.steamHint')}</p>
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-bold tracking-wider text-cs-muted uppercase">
                    {t('profile.visibility')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setProfilePublic(true)}
                      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-bold tracking-wider uppercase ${
                        profilePublic
                          ? 'border-cs-gold bg-cs-gold/15 text-cs-gold'
                          : 'border-cs-border text-cs-muted hover:border-cs-gold/40'
                      }`}
                    >
                      <Globe className="h-3.5 w-3.5" aria-hidden />
                      {t('profile.visibilityPublic')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfilePublic(false)}
                      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-bold tracking-wider uppercase ${
                        !profilePublic
                          ? 'border-cs-gold bg-cs-gold/15 text-cs-gold'
                          : 'border-cs-border text-cs-muted hover:border-cs-gold/40'
                      }`}
                    >
                      <Lock className="h-3.5 w-3.5" aria-hidden />
                      {t('profile.visibilityPrivate')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="panel space-y-5 rounded-xl p-5 lg:p-6">
            <div>
              <label className="mb-2 block text-[10px] font-bold tracking-wider text-cs-muted uppercase">
                {t('profile.avatar')}
              </label>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={onPickFile}
                />
                <button
                  type="button"
                  disabled={uploadBusy}
                  onClick={() => fileRef.current?.click()}
                  className="btn-ghost inline-flex items-center gap-2 rounded px-3 py-2 text-xs tracking-wider uppercase disabled:opacity-50"
                >
                  <ImagePlus className="h-3.5 w-3.5 text-cs-gold" aria-hidden />
                  {t('profile.uploadPhoto')}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarUrl(null)
                      setUploadError(null)
                    }}
                    className="rounded border border-cs-border px-3 py-2 text-xs font-semibold tracking-wider text-cs-muted uppercase transition hover:border-cs-gold/40 hover:text-cs-gold"
                  >
                    {t('profile.removePhoto')}
                  </button>
                )}
              </div>
              <p className="mb-3 text-[11px] text-cs-muted">{t('profile.uploadHint')}</p>
              {uploadError && <p className="mb-3 text-xs text-cs-loss">{uploadError}</p>}
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6">
                {AVATARS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => pickPreset(a.id)}
                    title={a.label}
                    className={`flex items-center justify-center rounded-lg border p-2 transition ${
                      !avatarUrl && avatarId === a.id
                        ? 'border-cs-gold bg-cs-gold/10'
                        : 'border-cs-border hover:border-cs-gold/40'
                    }`}
                  >
                    <ProfileAvatar avatarId={a.id} size="sm" />
                  </button>
                ))}
              </div>
            </div>

            {isAuthed && (
              <div>
                <label className="mb-2 block text-[10px] font-bold tracking-wider text-cs-muted uppercase">
                  {t('profile.showcaseBadge')}
                </label>
                {ownedIds.size === 0 ? (
                  <p className="text-xs text-cs-muted">{t('profile.noBadgesYet')}</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    <button
                      type="button"
                      onClick={() => setShowcaseBadge(null)}
                      className={`rounded-lg border px-2 py-2 text-[10px] ${
                        !showcaseBadge
                          ? 'border-cs-gold bg-cs-gold/10 text-cs-gold'
                          : 'border-cs-border text-cs-muted'
                      }`}
                    >
                      {t('profile.none')}
                    </button>
                    {defs
                      .filter((d) => ownedIds.has(d.id))
                      .map((def) => {
                        const Icon = BADGE_ICONS[def.icon] || Award
                        return (
                          <button
                            key={def.id}
                            type="button"
                            onClick={() => setShowcaseBadge(def.id)}
                            className={`flex items-center gap-1.5 rounded-lg border px-2 py-2 text-left ${
                              showcaseBadge === def.id
                                ? 'border-cs-gold bg-cs-gold/10'
                                : 'border-cs-border hover:border-cs-gold/40'
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0 text-cs-gold" />
                            <span className="truncate text-[10px] font-semibold">
                              {t(`badges.${def.id}.title`)}
                            </span>
                          </button>
                        )
                      })}
                  </div>
                )}
              </div>
            )}

            <div className="rounded-lg border border-cs-border bg-cs-bg/40 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-cs-text">{t('profile.sound')}</div>
                  <p className="mt-0.5 text-xs text-cs-muted">{t('profile.soundHint')}</p>
                </div>
                <button
                  type="button"
                  onClick={toggleSound}
                  className={`inline-flex items-center gap-2 rounded border px-4 py-2 text-xs font-bold tracking-wider uppercase ${
                    soundOn
                      ? 'border-cs-gold/50 bg-cs-gold/15 text-cs-gold'
                      : 'border-cs-border text-cs-muted'
                  }`}
                >
                  {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  {soundOn ? t('profile.soundOn') : t('profile.soundOff')}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-cs-border bg-cs-bg/40 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-cs-text">{t('nav.language')}</div>
                  <p className="mt-0.5 text-xs text-cs-muted">{t('profile.languageHint')}</p>
                </div>
                <button
                  type="button"
                  onClick={toggleLocale}
                  aria-label={t('nav.language')}
                  className="inline-flex items-center gap-2 rounded border border-cs-gold/50 bg-cs-gold/15 px-4 py-2 text-xs font-bold tracking-wider uppercase text-cs-gold"
                >
                  <Languages className="h-4 w-4" />
                  {locale === 'en' ? t('lang.en') : t('lang.pt')}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-gold inline-flex items-center gap-2 rounded px-5 py-2.5 text-xs tracking-wider uppercase"
                onClick={save}
              >
                <Save className="h-3.5 w-3.5" />
                {saved ? t('profile.saved') : t('profile.save')}
              </button>
              {isAuthed && (
                <button
                  type="button"
                  className="btn-ghost inline-flex items-center gap-2 rounded px-4 py-2.5 text-xs"
                  onClick={async () => {
                    await signOut()
                    onBack()
                  }}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {t('nav.signOut')}
                </button>
              )}
            </div>
            {formError && <p className="text-xs text-cs-loss">{formError}</p>}
          </div>

          {isAuthed && (
            <>
              <div className="panel space-y-3 rounded-xl p-5">
                <div className="flex items-center gap-2 text-cs-gold">
                  <KeyRound className="h-4 w-4" />
                  <h2 className="font-display text-xs font-bold tracking-[0.2em] uppercase">
                    {t('profile.changePassword')}
                  </h2>
                </div>
                <input
                  type="password"
                  value={curPass}
                  onChange={(e) => setCurPass(e.target.value)}
                  placeholder={t('profile.currentPassword')}
                  className="w-full rounded border border-cs-border bg-cs-bg/60 px-3 py-2 text-sm outline-none focus:border-cs-gold/50"
                />
                <input
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder={t('profile.newPassword')}
                  className="w-full rounded border border-cs-border bg-cs-bg/60 px-3 py-2 text-sm outline-none focus:border-cs-gold/50"
                />
                <input
                  type="password"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder={t('auth.confirmPassword')}
                  className="w-full rounded border border-cs-border bg-cs-bg/60 px-3 py-2 text-sm outline-none focus:border-cs-gold/50"
                />
                {passMsg && (
                  <p className={`text-xs ${passMsg.ok ? 'text-cs-win' : 'text-cs-loss'}`}>
                    {passMsg.text}
                  </p>
                )}
                <button
                  type="button"
                  disabled={passBusy || !curPass || !newPass}
                  className="btn-gold rounded px-4 py-2 text-xs tracking-wider uppercase disabled:opacity-50"
                  onClick={handleChangePassword}
                >
                  {t('profile.updatePassword')}
                </button>
              </div>

              <div className="panel space-y-3 rounded-xl border-cs-loss/30 p-5">
                <div className="flex items-center gap-2 text-cs-loss">
                  <Trash2 className="h-4 w-4" />
                  <h2 className="font-display text-xs font-bold tracking-[0.2em] uppercase">
                    {t('profile.deleteAccount')}
                  </h2>
                </div>
                <p className="text-xs text-cs-muted">{t('profile.deleteHint')}</p>
                <input
                  type="email"
                  value={delEmail}
                  onChange={(e) => setDelEmail(e.target.value)}
                  placeholder={t('auth.email')}
                  className="w-full rounded border border-cs-border bg-cs-bg/60 px-3 py-2 text-sm outline-none focus:border-cs-loss/50"
                />
                <input
                  value={delTag}
                  onChange={(e) => setDelTag(e.target.value)}
                  placeholder={t('profile.nickname')}
                  className="w-full rounded border border-cs-border bg-cs-bg/60 px-3 py-2 text-sm outline-none focus:border-cs-loss/50"
                />
                {delMsg && <p className="text-xs text-cs-loss">{delMsg.text}</p>}
                <button
                  type="button"
                  disabled={delBusy || !delEmail || !delTag}
                  className="rounded border border-cs-loss/50 bg-cs-loss/15 px-4 py-2 text-xs font-bold tracking-wider text-cs-loss uppercase disabled:opacity-50"
                  onClick={handleDelete}
                >
                  {t('profile.confirmDelete')}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {isAuthed && tab === 'badges' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 lg:gap-4">
          {defs.map((def) => {
            const unlocked = ownedIds.has(def.id)
            const Icon = BADGE_ICONS[def.icon] || Award
            return (
              <button
                key={def.id}
                type="button"
                disabled={!unlocked}
                onClick={() => unlocked && setShowcaseBadge(def.id)}
                className={`panel rounded-xl p-3 text-center ${
                  unlocked ? 'border-cs-gold/40' : 'opacity-40 grayscale'
                } ${showcaseBadge === def.id ? 'ring-1 ring-cs-gold' : ''} ${
                  def.id === 'completionist' && unlocked
                    ? 'border-cs-gold bg-gradient-to-b from-cs-gold/20 to-transparent shadow-[0_0_20px_rgba(232,197,71,0.2)]'
                    : ''
                }`}
              >
                <div
                  className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full border ${
                    unlocked
                      ? 'border-cs-gold/50 bg-cs-gold/15 text-cs-gold'
                      : 'border-cs-border text-cs-muted'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="font-display text-xs font-bold">{t(`badges.${def.id}.title`)}</div>
                <div className="mt-1 text-[10px] text-cs-muted">{t(`badges.${def.id}.desc`)}</div>
              </button>
            )
          })}
          {ownedIds.size > 0 && (
            <div className="col-span-full mt-2">
              <button
                type="button"
                className="btn-gold rounded px-4 py-2 text-xs tracking-wider uppercase"
                onClick={save}
              >
                {t('profile.setShowcase')}
              </button>
            </div>
          )}
        </div>
      )}

      {isAuthed && tab === 'history' && (
        <div className="panel overflow-hidden rounded-xl">
          {history.length === 0 ? (
            <p className="p-8 text-center text-cs-muted">{t('history.empty')}</p>
          ) : (
            <ul>
              {history.map((row) => (
                <li
                  key={row.id || row.created_at}
                  className="flex items-center gap-3 border-b border-cs-border/50 px-4 py-3 text-sm"
                >
                  <span className={`w-6 font-bold ${row.won ? 'text-cs-win' : 'text-cs-loss'}`}>
                    {row.won ? t('history.win') : t('history.loss')}
                  </span>
                  <span className="flex-1 font-semibold capitalize">{row.mode}</span>
                  <span className="font-mono text-cs-gold">{row.score}</span>
                  <span className="hidden text-xs text-cs-muted sm:inline">
                    {new Date(row.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function Chip({ label, value }) {
  return (
    <span className="rounded border border-cs-border bg-cs-bg/50 px-2 py-0.5 font-mono">
      <span className="text-cs-muted">{label} </span>
      <span className="text-cs-gold">{value ?? 0}</span>
    </span>
  )
}
