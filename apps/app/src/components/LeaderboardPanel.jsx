import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, RefreshCw, LogIn } from 'lucide-react'
import { useI18n } from '../i18n'
import { useAuth } from '../lib/auth'
import { fetchLeaderboard, fetchMyRank, utcDayKey, TOP_LIMIT } from '../lib/leaderboard'
import { isSupabaseConfigured } from '../lib/supabase'
import { utcSeasonKey } from '../lib/challenges'

const BOARDS = ['daily', 'duel', 'box', 'career', 'major', 'gauntlet', 'survivor']

export default function LeaderboardPanel({ profile, onBack, onNeedAuth }) {
  const { t } = useI18n()
  const { isAuthed } = useAuth()
  const [board, setBoard] = useState('daily')
  const [rows, setRows] = useState([])
  const [myRank, setMyRank] = useState(null)
  const [loading, setLoading] = useState(false)
  const [scope, setScope] = useState('allTime')
  const seqRef = useRef(0)

  const load = async () => {
    const seq = ++seqRef.current
    setLoading(true)
    const dayKey = board === 'daily' ? utcDayKey() : undefined
    try {
      const data = await fetchLeaderboard(board, { dayKey, limit: TOP_LIMIT })
      if (seq !== seqRef.current) return
      setRows(scope === 'season' ? filterSeasonRows(data) : data)

      if (isAuthed && profile?.id) {
        const rank = await fetchMyRank(board, profile.id, { dayKey })
        if (seq !== seqRef.current) return
        setMyRank(rank)
      } else {
        setMyRank(null)
      }
    } catch {
      /* keep previous rows on failure */
    } finally {
      if (seq === seqRef.current) setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [board, scope, isAuthed, profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const season = utcSeasonKey()

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mb-6 flex items-center justify-between gap-3 lg:mb-8">
        <button type="button" className="btn-ghost inline-flex items-center gap-2 rounded px-3 py-2 text-sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> {t('nav.back')}
        </button>
        <button type="button" className="btn-ghost inline-flex items-center gap-2 rounded px-3 py-2 text-sm" onClick={load}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> {t('leaderboard.refresh')}
        </button>
      </div>

      <div className="mb-6 flex flex-col gap-4 lg:mb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="mb-2 font-display text-3xl font-bold gold-text lg:text-4xl">{t('leaderboard.title')}</h1>
          <p className="text-sm text-cs-muted lg:text-base">{t('leaderboard.topN', { n: TOP_LIMIT })}</p>
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 lg:justify-end">
            {['allTime', 'season'].map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setScope(id)}
                className={`rounded border px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${
                  scope === id ? 'border-cs-gold bg-cs-gold/15 text-cs-gold' : 'border-cs-border text-cs-muted'
                }`}
              >
                {id === 'season' ? t('leaderboard.season') : t('leaderboard.allTime')}
              </button>
            ))}
          </div>
          {scope === 'season' && (
            <p className="text-right font-mono text-[10px] text-cs-gold">
              {t('leaderboard.seasonLabel', { season })}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {BOARDS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBoard(b)}
                className={`rounded border px-3 py-1.5 text-sm font-semibold sm:px-4 sm:py-2 ${
                  board === b ? 'border-cs-gold bg-cs-gold/15 text-cs-gold' : 'border-cs-border text-cs-muted'
                }`}
              >
                {t(`leaderboard.${b}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)] lg:gap-6">
        {/* Your global position */}
        <div className="panel h-fit rounded-xl px-4 py-4 sm:px-5 sm:py-5">
          {!isSupabaseConfigured ? (
            <p className="text-sm text-cs-muted">{t('leaderboard.needCloud')}</p>
          ) : !isAuthed ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-cs-muted">{t('leaderboard.accountsOnly')}</p>
              {onNeedAuth && (
                <button
                  type="button"
                  className="btn-gold inline-flex items-center justify-center gap-2 rounded px-3 py-2 text-xs uppercase tracking-wider"
                  onClick={onNeedAuth}
                >
                  <LogIn className="h-3.5 w-3.5" /> {t('nav.signIn')}
                </button>
              )}
            </div>
          ) : myRank?.rank != null ? (
            <div className="flex flex-wrap items-end justify-between gap-3 lg:flex-col lg:items-stretch">
              <div>
                <p className="font-display text-[10px] tracking-[0.2em] text-cs-muted uppercase">
                  {t('leaderboard.yourRank')}
                </p>
                <p className="font-display text-3xl font-bold text-cs-gold lg:text-4xl">
                  #{myRank.rank}
                </p>
                <p className="mt-1 text-sm text-cs-muted">
                  {t('leaderboard.ofTotal', { total: myRank.total })}
                </p>
              </div>
              <div className="text-right lg:mt-4 lg:border-t lg:border-cs-border/60 lg:pt-4 lg:text-left">
                <div className="font-mono text-lg text-cs-gold lg:text-xl">{myRank.score}</div>
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
          {loading && rows.length === 0 ? (
            <p className="p-8 text-center text-cs-muted lg:p-12">{t('admin.loading')}</p>
          ) : rows.length === 0 ? (
            <p className="p-8 text-center text-cs-muted lg:p-12">{t('leaderboard.empty')}</p>
          ) : (
            <>
              <div className="hidden grid-cols-[3.5rem_minmax(0,1fr)_6rem] gap-3 border-b border-cs-border/60 px-5 py-2.5 text-[10px] font-bold tracking-wider text-cs-muted uppercase sm:grid lg:px-6">
                <span>#</span>
                <span>{t('leaderboard.player') || 'Player'}</span>
                <span className="text-right">{t('leaderboard.score') || 'Score'}</span>
              </div>
              <ul>
                {rows.map((row, i) => {
                  const isYou = isAuthed && row.player_id === profile.id
                  return (
                    <motion.li
                      key={`${row.player_id}-${i}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i, 20) * 0.02 }}
                      className={`flex items-center gap-3 border-b border-cs-border/60 px-4 py-3 sm:grid sm:grid-cols-[3.5rem_minmax(0,1fr)_6rem] sm:gap-3 lg:px-6 lg:py-3.5 ${
                        isYou ? 'bg-cs-gold/10' : ''
                      }`}
                    >
                      <span className="w-10 font-mono text-sm text-cs-muted sm:w-auto">#{i + 1}</span>
                      <span
                        className={`min-w-0 flex-1 truncate font-semibold sm:flex-none ${
                          isYou ? 'text-cs-gold' : 'text-cs-text'
                        }`}
                      >
                        {row.nickname}
                        {isYou ? ` · ${t('leaderboard.you')}` : ''}
                      </span>
                      <span className="shrink-0 font-mono text-cs-gold sm:text-right">{row.score}</span>
                    </motion.li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function filterSeasonRows(rows) {
  const season = utcSeasonKey()
  const since = Date.now() - 42 * 24 * 60 * 60 * 1000
  return rows.filter((row) => {
    if (row.meta?.season_key === season || row.meta?.seasonKey === season) return true
    const day = row.day_key || row.meta?.dayKey || row.meta?.day_key
    if (day) return new Date(`${day}T00:00:00Z`).getTime() >= since
    const created = row.created_at ? new Date(row.created_at).getTime() : 0
    return created >= since
  })
}
