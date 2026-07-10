import { useCallback, useEffect, useState } from 'react'
import { useI18n } from '../../i18n'
import { adminCloseRoom, adminListRooms } from '../../lib/admin'

export default function AdminRooms() {
  const { t } = useI18n()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await adminListRooms(50)
      setRooms(data?.rooms || [])
    } catch (e) {
      setError(e?.message || 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const closeRoom = async (code) => {
    setBusy(code)
    setError('')
    try {
      await adminCloseRoom(code)
      await load()
    } catch (e) {
      setError(e?.message || 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-cs-gold">{t('admin.rooms')}</h2>
          <p className="mt-1 text-sm text-cs-muted">{t('admin.roomsHint')}</p>
        </div>
        <button
          type="button"
          className="btn-ghost rounded px-3 py-2 text-xs uppercase tracking-wider"
          onClick={load}
        >
          {t('admin.refresh')}
        </button>
      </div>

      {error ? <p className="text-sm text-cs-loss">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-cs-muted">{t('admin.loading')}</p>
      ) : (
        <div className="overflow-x-auto rounded border border-cs-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-cs-border bg-cs-bg/50 font-display text-[10px] tracking-[0.16em] text-cs-muted uppercase">
              <tr>
                <th className="px-3 py-2.5 font-semibold">{t('admin.colCode')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('admin.colMode')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('admin.colStatus')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('admin.colPlayers')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('admin.colWhen')}</th>
                <th className="px-3 py-2.5 font-semibold" />
              </tr>
            </thead>
            <tbody className="divide-y divide-cs-border/50">
              {rooms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-cs-muted">
                    {t('admin.empty')}
                  </td>
                </tr>
              ) : (
                rooms.map((r) => (
                  <tr key={r.code}>
                    <td className="px-3 py-2.5 font-mono font-bold text-cs-gold">{r.code}</td>
                    <td className="px-3 py-2.5 uppercase">{r.mode}</td>
                    <td className="px-3 py-2.5 text-cs-muted">{r.status}</td>
                    <td className="px-3 py-2.5 font-mono">{r.player_count ?? 0}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-cs-muted">
                      {r.updated_at ? new Date(r.updated_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        disabled={busy === r.code}
                        className="rounded border border-cs-loss/40 px-2 py-1 text-[10px] font-bold uppercase text-cs-loss disabled:opacity-50"
                        onClick={() => closeRoom(r.code)}
                      >
                        {t('admin.closeRoom')}
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
