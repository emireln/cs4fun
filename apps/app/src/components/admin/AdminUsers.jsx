import { useCallback, useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { useI18n } from '../../i18n'
import {
  adminBanUser,
  adminGetUser,
  adminListUsers,
  adminPurgeUserHistory,
  adminResetProfile,
  adminUnbanUser,
} from '../../lib/admin'

export default function AdminUsers() {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [bannedOnly, setBannedOnly] = useState(false)
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [banReason, setBanReason] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await adminListUsers({
        search: query,
        limit: 50,
        offset: 0,
        bannedOnly,
      })
      setUsers(data?.users || [])
      setTotal(data?.total ?? 0)
    } catch (e) {
      setError(e?.message || 'error')
    } finally {
      setLoading(false)
    }
  }, [query, bannedOnly])

  useEffect(() => {
    load()
  }, [load])

  const openUser = async (id) => {
    setSelected(id)
    setDetail(null)
    setBanReason('')
    try {
      const data = await adminGetUser(id)
      setDetail(data)
    } catch (e) {
      setError(e?.message || 'error')
    }
  }

  const ban = async () => {
    if (!selected) return
    setBusy(true)
    setError('')
    try {
      await adminBanUser(selected, banReason)
      await openUser(selected)
      await load()
    } catch (e) {
      setError(e?.message || 'error')
    } finally {
      setBusy(false)
    }
  }

  const unban = async () => {
    if (!selected) return
    setBusy(true)
    setError('')
    try {
      await adminUnbanUser(selected)
      await openUser(selected)
      await load()
    } catch (e) {
      setError(e?.message || 'error')
    } finally {
      setBusy(false)
    }
  }

  const purge = async () => {
    if (!selected || !window.confirm(t('admin.confirmPurge'))) return
    setBusy(true)
    setError('')
    try {
      await adminPurgeUserHistory(selected)
      await openUser(selected)
      await load()
    } catch (e) {
      setError(e?.message || 'error')
    } finally {
      setBusy(false)
    }
  }

  const resetProfile = async () => {
    if (!selected || !window.confirm(t('admin.confirmReset'))) return
    setBusy(true)
    setError('')
    try {
      await adminResetProfile(selected)
      await openUser(selected)
      await load()
    } catch (e) {
      setError(e?.message || 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-cs-gold">{t('admin.users')}</h2>
        <p className="mt-1 text-sm text-cs-muted">{t('admin.usersHint')}</p>
      </div>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setQuery(search.trim())
        }}
      >
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cs-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.searchUsers')}
            className="w-full rounded border border-cs-border bg-cs-bg/60 py-2.5 pr-3 pl-9 text-sm text-cs-text outline-none focus:border-cs-gold/50"
          />
        </div>
        <button type="submit" className="btn-gold rounded px-5 py-2.5 text-xs uppercase tracking-wider">
          {t('admin.search')}
        </button>
        <button
          type="button"
          onClick={() => setBannedOnly((v) => !v)}
          className={`rounded border px-3 py-2.5 text-xs font-bold uppercase tracking-wider ${
            bannedOnly
              ? 'border-cs-loss/50 bg-cs-loss/15 text-cs-loss'
              : 'border-cs-border text-cs-muted'
          }`}
        >
          {t('admin.filterBanned')}
        </button>
      </form>

      {error ? <p className="text-sm text-cs-loss">{error}</p> : null}
      <p className="text-xs text-cs-muted">{t('admin.results', { n: total })}</p>

      {loading ? (
        <p className="text-sm text-cs-muted">{t('admin.loading')}</p>
      ) : (
        <div className="overflow-x-auto rounded border border-cs-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-cs-border bg-cs-bg/50 font-display text-[10px] tracking-[0.16em] text-cs-muted uppercase">
              <tr>
                <th className="px-3 py-2.5 font-semibold">{t('admin.colTag')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('admin.colEmail')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('admin.colGames')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('admin.colStatus')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cs-border/50">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-cs-muted">
                    {t('admin.empty')}
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    className="cursor-pointer hover:bg-cs-gold/5"
                    onClick={() => openUser(u.id)}
                  >
                    <td className="px-3 py-2.5 font-semibold text-cs-text">{u.nickname}</td>
                    <td className="px-3 py-2.5 text-cs-muted">{u.email || '—'}</td>
                    <td className="px-3 py-2.5 font-mono text-cs-text">
                      {u.wins}W / {u.losses}L · {u.games}
                    </td>
                    <td className="px-3 py-2.5">
                      {u.is_admin ? (
                        <span className="text-cs-gold">{t('admin.roleAdmin')}</span>
                      ) : u.banned_at ? (
                        <span className="text-cs-loss">{t('admin.statusBanned')}</span>
                      ) : (
                        <span className="text-cs-win">{t('admin.statusOk')}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center">
          <div className="panel relative my-auto w-full max-w-lg rounded-xl p-5">
            <button
              type="button"
              className="absolute top-3 right-3 text-cs-muted hover:text-cs-text"
              onClick={() => {
                setSelected(null)
                setDetail(null)
              }}
              aria-label={t('common.close')}
            >
              <X className="h-4 w-4" />
            </button>

            {!detail ? (
              <p className="text-sm text-cs-muted">{t('admin.loading')}</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="font-display text-[10px] tracking-[0.2em] text-cs-gold uppercase">
                    {t('admin.userDetail')}
                  </div>
                  <h3 className="mt-1 font-display text-xl font-bold">{detail.nickname}</h3>
                  <p className="text-sm text-cs-muted">{detail.email || '—'}</p>
                  <p className="mt-1 break-all font-mono text-[10px] text-cs-muted">{detail.id}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  <Stat label={t('admin.colGames')} value={detail.stats?.games} />
                  <Stat label="W" value={detail.stats?.wins} />
                  <Stat label="L" value={detail.stats?.losses} />
                  <Stat label={t('admin.statStreak')} value={detail.stats?.max_streak} />
                </div>

                {detail.steamUrl ? (
                  <a
                    href={detail.steamUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-cs-info underline"
                  >
                    {detail.steamUrl}
                  </a>
                ) : null}

                {detail.isAdmin ? (
                  <p className="rounded border border-cs-gold/30 bg-cs-gold/10 px-3 py-2 text-xs text-cs-gold">
                    {t('admin.cannotBanAdmin')}
                  </p>
                ) : (
                  <>
                    {detail.bannedAt ? (
                      <div className="space-y-2">
                        <p className="text-sm text-cs-loss">
                          {t('admin.statusBanned')}
                          {detail.banReason ? ` — ${detail.banReason}` : ''}
                        </p>
                        <button
                          type="button"
                          disabled={busy}
                          className="btn-gold rounded px-4 py-2 text-xs uppercase tracking-wider"
                          onClick={unban}
                        >
                          {t('admin.unban')}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <textarea
                          value={banReason}
                          onChange={(e) => setBanReason(e.target.value)}
                          placeholder={t('admin.banReason')}
                          rows={2}
                          className="w-full rounded border border-cs-border bg-cs-bg/60 px-3 py-2 text-sm outline-none focus:border-cs-loss/50"
                        />
                        <button
                          type="button"
                          disabled={busy}
                          className="rounded border border-cs-loss/40 bg-cs-loss/15 px-4 py-2 text-xs font-bold uppercase tracking-wider text-cs-loss"
                          onClick={ban}
                        >
                          {t('admin.ban')}
                        </button>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 border-t border-cs-border/50 pt-3">
                      <button
                        type="button"
                        disabled={busy}
                        className="btn-ghost rounded px-3 py-2 text-[10px] uppercase tracking-wider"
                        onClick={resetProfile}
                      >
                        {t('admin.resetProfile')}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded border border-cs-warn/40 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-cs-warn"
                        onClick={purge}
                      >
                        {t('admin.purgeHistory')}
                      </button>
                    </div>
                  </>
                )}

                <div>
                  <h4 className="mb-2 font-display text-[10px] tracking-[0.18em] text-cs-muted uppercase">
                    {t('admin.recentGames')}
                  </h4>
                  <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
                    {(detail.recentGames || []).length === 0 ? (
                      <li className="text-cs-muted">{t('admin.empty')}</li>
                    ) : (
                      detail.recentGames.map((g) => (
                        <li
                          key={g.id}
                          className="flex justify-between gap-2 border-b border-cs-border/40 py-1"
                        >
                          <span className="text-cs-text uppercase">{g.mode}</span>
                          <span className={g.won ? 'text-cs-win' : 'text-cs-loss'}>
                            {g.won ? 'W' : 'L'} · {g.score}
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded border border-cs-border bg-cs-bg/40 px-2 py-2 text-center">
      <div className="text-[10px] text-cs-muted uppercase">{label}</div>
      <div className="font-mono font-bold">{value ?? 0}</div>
    </div>
  )
}
