import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, RefreshCw, LogIn } from 'lucide-react'
import { useI18n } from '../i18n'
import { useAuth } from '../lib/auth'
import { fetchLeaderboard, fetchMyRank, utcDayKey, TOP_LIMIT } from '../lib/leaderboard'
import { isSupabaseConfigured } from '../lib/supabase'

const BOARDS = ['daily', 'duel', 'gauntlet', 'major']

export default function LeaderboardPanel({ profile, onBack, onNeedAuth }) {
  const { t } = useI18n()
  const { isAuthed } = useAuth()
  const [board, setBoard] = useState('daily')
  const [rows, setRows] = useState([])
  const [myRank, setMyRank] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    const dayKey = board === 'daily' ? utcDayKey() : undefined
    const data = await fetchLeaderboard(board, { dayKey, limit: TOP_LIMIT })
    setRows(data)

    if (isAuthed && profile?.id) {
      const rank = await fetchMyRank(board, profile.id, { dayKey })
      setMyRank(rank)
    } else {
      setMyRank(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [board, isAuthed, profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <button type="button" className="btn-ghost inline-flex items-center gap-2 rounded px-3 py-2 text-sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> {t('nav.back')}
        </button>
        <button type="button" className="btn-ghost inline-flex items-center gap-2 rounded px-3 py-2 text-sm" onClick={load}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> {t('leaderboard.refresh')}
        </button>
      </div>

      <h1 className="mb-2 font-display text-3xl font-bold gold-text">{t('leaderboard.title')}</h1>
      <p className="mb-6 text-sm text-cs-muted">{t('leaderboard.topN', { n: TOP_LIMIT })}</p>

      <div className="mb-4 flex flex-wrap gap-2">
        {BOARDS.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => setBoard(b)}
            className={`rounded border px-3 py-1.5 text-sm font-semibold ${
              board === b ? 'border-cs-gold bg-cs-gold/15 text-cs-gold' : 'border-cs-border text-cs-muted'
            }`}
          >
            {t(`leaderboard.${b}`)}
          </button>
        ))}
      </div>

      {/* Your global position */}
      <div className="panel mb-4 rounded-xl px-4 py-3">
        {!isSupabaseConfigured ? (
          <p className="text-sm text-cs-muted">{t('leaderboard.needCloud')}</p>
        ) : !isAuthed ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-cs-muted">{t('leaderboard.accountsOnly')}</p>
            {onNeedAuth && (
              <button
                type="button"
                className="btn-gold inline-flex items-center gap-2 rounded px-3 py-1.5 text-xs uppercase tracking-wider"
                onClick={onNeedAuth}
              >
                <LogIn className="h-3.5 w-3.5" /> {t('nav.signIn')}
              </button>
            )}
          </div>
        ) : myRank?.rank != null ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-display text-[10px] tracking-[0.2em] text-cs-muted uppercase">
                {t('leaderboard.yourRank')}
              </p>
              <p className="font-display text-2xl font-bold text-cs-gold">
                #{myRank.rank}
                <span className="ml-2 text-sm font-normal text-cs-muted">
                  {t('leaderboard.ofTotal', { total: myRank.total })}
                </span>
              </p>
            </div>
            <div className="text-right font-mono text-sm">
              <div className="text-cs-gold">{myRank.score}</div>
              {!myRank.inTop && (
                <div className="text-[10px] text-cs-muted">{t('leaderboard.outsideTop')}</div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-cs-muted">{t('leaderboard.unranked')}</p>
        )}
      </div>

      <div className="panel overflow-hidden rounded-xl">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-cs-muted">{t('leaderboard.empty')}</p>
        ) : (
          <ul>
            {rows.map((row, i) => {
              const isYou = isAuthed && row.player_id === profile.id
              return (
                <motion.li
                  key={`${row.player_id}-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i, 20) * 0.02 }}
                  className={`flex items-center gap-3 border-b border-cs-border/60 px-4 py-3 ${
                    isYou ? 'bg-cs-gold/10' : ''
                  }`}
                >
                  <span className="w-10 font-mono text-sm text-cs-muted">#{i + 1}</span>
                  <span className={`min-w-0 flex-1 truncate font-semibold ${isYou ? 'text-cs-gold' : 'text-cs-text'}`}>
                    {row.nickname}
                    {isYou ? ` · ${t('leaderboard.you')}` : ''}
                  </span>
                  <span className="shrink-0 font-mono text-cs-gold">{row.score}</span>
                </motion.li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
