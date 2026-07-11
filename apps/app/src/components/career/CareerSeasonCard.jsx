import { useState } from 'react'
import { motion } from 'framer-motion'
import { Star, Share2, Download, Home, RotateCcw, Trophy } from 'lucide-react'
import { useI18n } from '../../i18n'
import { tierForScore } from '../../lib/career'
import { shareResult, downloadShareCard } from '../../lib/history'

export default function CareerSeasonCard({
  state,
  profile,
  onHome,
  onNextSeason,
}) {
  const { t, locale } = useI18n()
  const [shared, setShared] = useState(false)
  const [busy, setBusy] = useState(false)
  const tier = tierForScore(state.seasonScore || 0)
  const majorWon = Boolean(state.majorResult?.won)

  const payload = {
    mode: 'career',
    won: majorWon,
    title: t('career.seasonFinaleTitle', { n: state.season }),
    score: state.seasonScore,
    wins: state.record?.wins || 0,
    losses: state.record?.losses || 0,
    nickname: profile?.nickname || state.orgName,
    mapPriority: state.mapPriority,
    lineup: state.lineup,
    locale,
    careerTier: t(tier.labelKey),
    careerOrg: state.orgName,
    careerMajors: state.majorsWonCareer || 0,
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border border-cs-gold/35 bg-gradient-to-b from-[#16120a] via-cs-panel to-cs-bg p-6 text-center"
      >
        <Star className="mx-auto mb-2 h-8 w-8 fill-cs-gold text-cs-gold" />
        <p className="font-display text-[10px] tracking-[0.28em] text-cs-gold uppercase">CS4FUN</p>
        <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
          {t('career.seasonFinaleTitle', { n: state.season })}
        </h1>
        <p className="mt-1 text-sm text-cs-muted">{state.orgName}</p>
        <p className="mt-3 font-display text-lg text-cs-gold">{t(tier.labelKey)}</p>

        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-cs-border bg-cs-bg/40 px-2 py-3">
            <div className="font-mono text-lg font-bold text-cs-gold">{state.seasonScore}</div>
            <div className="text-[10px] uppercase text-cs-muted">{t('career.seasonScore')}</div>
          </div>
          <div className="rounded-lg border border-cs-border bg-cs-bg/40 px-2 py-3">
            <div className="font-mono text-lg font-bold">
              {state.record?.wins || 0}-{state.record?.losses || 0}
            </div>
            <div className="text-[10px] uppercase text-cs-muted">{t('career.record')}</div>
          </div>
          <div className="rounded-lg border border-cs-border bg-cs-bg/40 px-2 py-3">
            <div className="font-mono text-lg font-bold text-cs-gold">{state.majorsWonCareer || 0}</div>
            <div className="text-[10px] uppercase text-cs-muted">{t('career.majors')}</div>
          </div>
        </div>

        <p className={`mt-4 inline-flex items-center gap-1.5 text-sm font-semibold ${majorWon ? 'text-cs-win' : 'text-cs-muted'}`}>
          <Trophy className="h-4 w-4" />
          {majorWon ? t('career.majorChamp') : t('career.majorFell')}
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            className="btn-ghost inline-flex items-center gap-1.5 rounded px-3 py-2 text-xs uppercase"
            onClick={async () => {
              const res = await shareResult(payload)
              if (res.ok) {
                setShared(true)
                setTimeout(() => setShared(false), 1600)
              }
            }}
          >
            <Share2 className="h-3.5 w-3.5" />
            {shared ? t('profile.shared') : t('common.share')}
          </button>
          <button
            type="button"
            disabled={busy}
            className="btn-ghost inline-flex items-center gap-1.5 rounded px-3 py-2 text-xs uppercase"
            onClick={async () => {
              setBusy(true)
              await downloadShareCard(payload)
              setBusy(false)
            }}
          >
            <Download className="h-3.5 w-3.5" />
            {t('common.download')}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            className="btn-gold inline-flex items-center gap-1.5 rounded px-4 py-2.5 text-xs uppercase"
            onClick={onNextSeason}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t('career.nextSeason')}
          </button>
          <button
            type="button"
            className="btn-ghost inline-flex items-center gap-1.5 rounded px-4 py-2.5 text-xs uppercase"
            onClick={onHome}
          >
            <Home className="h-3.5 w-3.5" />
            {t('common.home')}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
