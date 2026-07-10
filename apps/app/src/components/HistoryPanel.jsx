import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useI18n } from '../i18n'
import { useAuth } from '../lib/auth'
import { fetchGameHistory } from '../lib/history'

export default function HistoryPanel({ onBack, onNeedAuth }) {
  const { t } = useI18n()
  const { profile, isAuthed } = useAuth()
  const [rows, setRows] = useState([])

  useEffect(() => {
    fetchGameHistory(profile.id).then(setRows)
  }, [profile.id])

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <button type="button" className="btn-ghost mb-6 inline-flex items-center gap-2 rounded px-3 py-2 text-sm" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" /> {t('nav.back')}
      </button>

      <h1 className="mb-2 font-display text-3xl font-bold gold-text">{t('history.title')}</h1>
      {!isAuthed && (
        <button type="button" className="mb-4 text-xs text-cs-gold underline" onClick={onNeedAuth}>
          {t('auth.needAuth')}
        </button>
      )}

      <div className="panel overflow-hidden rounded-xl">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-cs-muted">{t('history.empty')}</p>
        ) : (
          <ul>
            {rows.map((row) => (
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
    </div>
  )
}
