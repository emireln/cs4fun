import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Crosshair, Flame, Eye, Swords } from 'lucide-react'
import { GAME_MODES, MENTALITIES, ACTIVE_MAP_POOL } from '../data/constants'

export default function SetupScreen({ onStart }) {
  const [mode, setMode] = useState('classic')
  const [mentality, setMentality] = useState('tactical')
  const [mapPriority, setMapPriority] = useState('Mirage')

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10 text-center"
      >
        <p className="mb-3 font-display text-xs tracking-[0.35em] text-cs-gold/80">ROLL · DRAFT · SIMULATE</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-cs-text sm:text-5xl md:text-6xl">
          Build your <span className="gold-text">dream five</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-cs-muted">
          Scout historic CS:GO / CS2 Major rosters. Pick one legend per roll. Fill IGL, AWPer, Entry, Lurker, Support —
          then run an 8-team MD3 bracket for the trophy.
        </p>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-3">
        <Section title="Game Mode" icon={<BookOpen className="h-4 w-4 text-cs-gold" />}>
          <div className="space-y-2">
            {GAME_MODES.map((m) => (
              <Choice
                key={m.id}
                active={mode === m.id}
                onClick={() => setMode(m.id)}
                title={m.label}
                subtitle={m.description}
              />
            ))}
          </div>
        </Section>

        <Section title="Coach Mentality" icon={<Flame className="h-4 w-4 text-cs-gold" />}>
          <div className="space-y-2">
            {MENTALITIES.map((m) => (
              <Choice
                key={m.id}
                active={mentality === m.id}
                onClick={() => setMentality(m.id)}
                title={m.label}
                subtitle={m.description}
              />
            ))}
          </div>
        </Section>

        <Section title="Map Priority" icon={<Crosshair className="h-4 w-4 text-cs-gold" />}>
          <div className="grid grid-cols-2 gap-2">
            {ACTIVE_MAP_POOL.map((map) => (
              <button
                key={map}
                type="button"
                onClick={() => setMapPriority(map)}
                className={`rounded border px-3 py-2.5 text-left text-sm font-semibold transition ${
                  mapPriority === map
                    ? 'border-cs-gold bg-cs-gold/15 text-cs-gold'
                    : 'border-cs-border bg-cs-bg/40 text-cs-text hover:border-cs-gold/40'
                }`}
              >
                {map}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-cs-muted">
            Your priority map gets a veto preference and a simulation bonus when it lands.
          </p>
        </Section>
      </div>

      <motion.div
        className="mt-10 flex flex-col items-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
      >
        <button
          type="button"
          className="btn-gold rounded px-10 py-4 text-base uppercase tracking-[0.2em]"
          onClick={() => onStart({ mode, mentality, mapPriority })}
        >
          <span className="inline-flex items-center gap-2">
            <Swords className="h-5 w-5" /> Enter Draft Room
          </span>
        </button>
        <p className="flex items-center gap-2 text-xs text-cs-muted">
          <Eye className="h-3.5 w-3.5" /> 20+ real historic rosters · 3 re-scouts per run
        </p>
      </motion.div>
    </div>
  )
}

function Section({ title, icon, children }) {
  return (
    <div className="panel rounded-lg p-5">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h2 className="font-display text-xs font-bold tracking-[0.2em] text-cs-gold uppercase">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function Choice({ active, onClick, title, subtitle }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded border px-3 py-3 text-left transition ${
        active
          ? 'border-cs-gold bg-cs-gold/10'
          : 'border-cs-border bg-cs-bg/30 hover:border-cs-gold/40'
      }`}
    >
      <div className={`text-sm font-bold ${active ? 'text-cs-gold' : 'text-cs-text'}`}>{title}</div>
      <div className="mt-1 text-xs leading-snug text-cs-muted">{subtitle}</div>
    </button>
  )
}
