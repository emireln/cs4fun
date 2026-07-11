import { useEffect, useMemo, useState } from 'react'
import { Skull, Home } from 'lucide-react'
import { useI18n } from '../../i18n'
import { getAllRosters } from '../../engine/simulation'
import { hashString, mulberry32 } from '../../lib/seed'
import { teamPowerScore } from '../../lib/gameModes'
import { saveGameResult } from '../../lib/history'
import { writeLastSession } from '../../lib/lastSession'
import GameOver from '../GameOver'
import { ROLES } from '../../data/constants'

function randomLineup(rng) {
  const all = getAllRosters().flatMap((r) => (r.players || []).map((p) => ({ ...p, fromTeam: r.team })))
  const lineup = {}
  for (const role of ROLES) {
    const pool = all.filter((p) => !Object.values(lineup).some((x) => x?.id === p.id))
    lineup[role.id] = pool[Math.floor(rng() * pool.length)] || pool[0]
  }
  return lineup
}

/** Survivor: 6 AI seats; each round lowest power is eliminated until one remains. */
export default function SurvivorGame({ profile, onHome, onStatus, onNeedAuth }) {
  const { t } = useI18n()
  const seed = useMemo(() => `surv-${profile?.id}-${Date.now()}`, [profile?.id])
  const [entrants, setEntrants] = useState(() => {
    const rng = mulberry32(hashString(seed))
    const you = {
      id: profile.id,
      nickname: profile.nickname || 'You',
      isYou: true,
      lineup: randomLineup(rng),
      alive: true,
    }
    const bots = Array.from({ length: 5 }, (_, i) => ({
      id: `bot-${i}`,
      nickname: `Seat ${i + 1}`,
      isYou: false,
      lineup: randomLineup(rng),
      alive: true,
    }))
    return [you, ...bots]
  })
  const [round, setRound] = useState(1)
  const [log, setLog] = useState([])
  const [done, setDone] = useState(null)
  const [submitInfo, setSubmitInfo] = useState(null)

  useEffect(() => {
    writeLastSession({ mode: 'survivor' })
    onStatus?.({ phase: 'tournament', gameMode: 'survivor' })
  }, [onStatus])

  const alive = entrants.filter((e) => e.alive)

  const resolveRound = async () => {
    if (alive.length <= 1) return
    const scored = alive.map((e) => ({
      ...e,
      power: teamPowerScore(e.lineup, 'tactical', 'Mirage'),
    }))
    scored.sort((a, b) => a.power - b.power)
    const eliminated = scored[0]
    const next = entrants.map((e) =>
      e.id === eliminated.id ? { ...e, alive: false } : e,
    )
    setEntrants(next)
    setLog((L) => [
      ...L,
      t('survivor.eliminated', { name: eliminated.nickname, power: eliminated.power.toFixed(2) }),
    ])
    setRound((r) => r + 1)
    const still = next.filter((e) => e.alive)
    if (still.length === 1) {
      const winner = still[0]
      const won = Boolean(winner.isYou)
      const score = won ? 800 + round * 40 : round * 50
      setDone({ won, winner: winner.nickname, score })
      const res = await saveGameResult({
        userId: profile.id,
        nickname: profile.nickname,
        mode: 'survivor',
        won,
        score,
        wins: won ? 1 : 0,
        losses: won ? 0 : 1,
        board: 'survivor',
      })
      setSubmitInfo(res)
    }
  }

  if (done) {
    return (
      <GameOver
        title={done.won ? t('survivor.victory') : t('survivor.defeat')}
        blurb={t('survivor.blurb')}
        won={done.won}
        score={done.score}
        wins={done.won ? 1 : 0}
        losses={done.won ? 0 : 1}
        submitInfo={submitInfo}
        onHome={onHome}
        onNeedAuth={onNeedAuth}
        sharePayload={{ mode: 'survivor', nickname: profile.nickname }}
      />
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <p className="font-display text-[10px] tracking-[0.25em] text-cs-gold uppercase">{t('modes.survivor.tag')}</p>
      <h1 className="mt-1 font-display text-3xl font-bold gold-text">{t('modes.survivor.title')}</h1>
      <p className="mt-1 text-sm text-cs-muted">{t('modes.survivor.blurb')}</p>
      <p className="mt-3 font-mono text-sm text-cs-gold">
        {t('survivor.round', { n: round })} · {alive.length} {t('survivor.alive')}
      </p>

      <ul className="mt-4 space-y-2">
        {entrants.map((e) => (
          <li
            key={e.id}
            className={`flex items-center justify-between rounded border px-3 py-2 text-sm ${
              e.alive ? 'border-cs-border bg-cs-panel/50' : 'border-cs-border/40 opacity-40'
            }`}
          >
            <span className={e.isYou ? 'font-bold text-cs-gold' : ''}>
              {e.nickname}
              {e.isYou ? ` (${t('room.you')})` : ''}
            </span>
            <span className="font-mono text-xs text-cs-muted">
              {e.alive ? teamPowerScore(e.lineup, 'tactical', 'Mirage').toFixed(2) : t('survivor.out')}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 space-y-1 text-xs text-cs-muted">
        {log.slice(-5).map((line, i) => (
          <p key={i} className="flex items-center gap-1">
            <Skull className="h-3 w-3 text-cs-loss" /> {line}
          </p>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" className="btn-gold rounded px-5 py-2.5 text-xs uppercase" onClick={resolveRound}>
          {t('survivor.eliminate')}
        </button>
        <button type="button" className="btn-ghost rounded px-4 py-2 text-xs uppercase" onClick={onHome}>
          <Home className="mr-1 inline h-3.5 w-3.5" /> {t('results.home')}
        </button>
      </div>
    </div>
  )
}
