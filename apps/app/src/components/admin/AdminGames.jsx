import { useCallback, useEffect, useState } from 'react'
import { useI18n } from '../../i18n'
import { adminDeleteGame, adminListGames } from '../../lib/admin'

const MODES = ['', 'major', 'duel', 'party', 'daily', 'career', 'box', 'gauntlet']

export default function AdminGames() {
  const { t } = useI18n()
  const [mode, setMode] = useState('')
  const [games, setGames] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await adminListGames({ mode: mode || null, limit: 60, offset: 0 })
      setGames(data?.games || [])
      setTotal(data?.total ?? 0)
    } catch (e) {
      setError(e?.message || 'error')
    } finally {
      setLoading(false)
    }
  }, [mode])

  useEffect(() => {
    load()
  }, [load])

  const remove = async (id) => {
    if (!window.confirm(t('admin.confirmDeleteGame'))) return
    setBusy(id)
    setError('')
    try {
      await adminDeleteGame(id)
      await load()
    } catch (e) {
      setError(e?.message || 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-cs-gold">{t('admin.games')}</h2>
        <p className="mt-1 text-sm text-cs-muted">{t('admin.gamesHint')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button
            key={m || 'all'}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${
              mode === m
                ? 'border-cs-gold/50 bg-cs-gold/15 text-cs-gold'
                : 'border-cs-border text-cs-muted hover:text-cs-text'
            }`}
          >
            {m || t('admin.allModes')}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-cs-loss">{error}</p> : null}
      <p className="text-xs text-cs-muted">{t('admin.results', { n: total })}</p>

      {loading ? (
        <p className="text-sm text-cs-muted">{t('admin.loading')}</p>
      ) : (
        <div className="overflow-x-auto rounded border border-cs-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-cs-border bg-cs-bg/50 font-display text-[10px] tracking-[0.16em] text-cs-muted uppercase">
              <tr>
                <th className="px-3 py-2.5 font-semibold">{t('admin.colWhen')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('admin.colTag')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('admin.colMode')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('admin.colResult')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('admin.colScore')}</th>
                <th className="px-3 py-2.5 font-semibold" />
              </tr>
            </thead>
            <tbody className="divide-y divide-cs-border/50">
              {games.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-cs-muted">
                    {t('admin.empty')}
                  </td>
                </tr>
              ) : (
                games.map((g) => (
                  <tr key={g.id}>
                    <td className="px-3 py-2.5 font-mono text-xs text-cs-muted">
                      {g.created_at ? new Date(g.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2.5 font-semibold">{g.nickname || '—'}</td>
                    <td className="px-3 py-2.5 uppercase tracking-wider text-cs-text">{g.mode}</td>
                    <td className={`px-3 py-2.5 font-bold ${g.won ? 'text-cs-win' : 'text-cs-loss'}`}>
                      {g.won ? 'W' : 'L'}
                      {g.wins != null ? ` ${g.wins}-${g.losses}` : ''}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-cs-gold">{g.score}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        disabled={busy === g.id}
                        className="rounded border border-cs-loss/40 px-2 py-1 text-[10px] font-bold uppercase text-cs-loss disabled:opacity-50"
                        onClick={() => remove(g.id)}
                      >
                        {t('admin.deleteGame')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
