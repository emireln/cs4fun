import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Crosshair, Flame, Swords } from 'lucide-react'
import { ACTIVE_MAP_POOL, MENTALITIES } from '../data/constants'
import { useI18n } from '../i18n'
import MapThumb from './MapThumb'

export default function ModeSetup({
  title,
  subtitle,
  onStart,
  showPlayWithOption = false,
  /** @deprecated use showPlayWithOption */
  showCpuOption = false,
  ctaLabel,
  soloLabel,
  friendsLabel,
  /** Lock classic/almanac (e.g. daily is always blind). */
  lockedMode = null,
  modeNote = null,
}) {
  const { t } = useI18n()
  const [mode, setMode] = useState(lockedMode || 'classic')
  const [mentality, setMentality] = useState('tactical')
  const [mapPriority, setMapPriority] = useState('Mirage')
  const [vsCpu, setVsCpu] = useState(true)
  const [cursedCap, setCursedCap] = useState(false)
  const playWith = showPlayWithOption || showCpuOption
  const modeLocked = Boolean(lockedMode)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
          <span className="gold-text">{title}</span>
        </h1>
        {subtitle && <p className="mx-auto mt-2 max-w-xl text-cs-muted">{subtitle}</p>}
        {modeNote && <p className="mx-auto mt-2 max-w-xl text-xs text-cs-gold">{modeNote}</p>}
      </motion.div>

      {playWith && (
        <div className="mb-6">
          <p className="mb-2 text-center font-display text-[10px] font-bold tracking-[0.2em] text-cs-gold uppercase">
            {t('setup.playWith')}
          </p>
          <div className="mx-auto flex max-w-md justify-center gap-2">
            <button
              type="button"
              onClick={() => setVsCpu(true)}
              className={`min-h-[48px] flex-1 rounded border px-4 py-3 text-sm font-bold transition ${
                vsCpu ? 'border-cs-gold bg-cs-gold/15 text-cs-gold' : 'border-cs-border text-cs-muted hover:border-cs-gold/40'
              }`}
            >
              {soloLabel || t('setup.solo')}
            </button>
            <button
              type="button"
              onClick={() => setVsCpu(false)}
              className={`min-h-[48px] flex-1 rounded border px-4 py-3 text-sm font-bold transition ${
                !vsCpu ? 'border-cs-gold bg-cs-gold/15 text-cs-gold' : 'border-cs-border text-cs-muted hover:border-cs-gold/40'
              }`}
            >
              {friendsLabel || t('setup.withFriends')}
            </button>
          </div>
        </div>
      )}

      <div className={`grid gap-5 ${modeLocked ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
        {!modeLocked && (
          <Panel title={t('setup.gameMode')} icon={<BookOpen className="h-4 w-4 text-cs-gold" />}>
            <Choice active={mode === 'classic'} onClick={() => setMode('classic')} title={t('setup.classic')} subtitle={t('setup.classicDesc')} />
            <Choice active={mode === 'almanac'} onClick={() => setMode('almanac')} title={t('setup.almanac')} subtitle={t('setup.almanacDesc')} />
          </Panel>
        )}

        <Panel title={t('setup.mentality')} icon={<Flame className="h-4 w-4 text-cs-gold" />}>
          {MENTALITIES.map((m) => (
            <Choice
              key={m.id}
              active={mentality === m.id}
              onClick={() => setMentality(m.id)}
              title={t(`setup.${m.id}`)}
              subtitle={t(`setup.${m.id}Desc`)}
            />
          ))}
        </Panel>

        <Panel title={t('setup.mapPriority')} icon={<Crosshair className="h-4 w-4 text-cs-gold" />}>
          <div className="grid grid-cols-2 gap-2">
            {ACTIVE_MAP_POOL.map((map) => (
              <button
                key={map}
                type="button"
                onClick={() => setMapPriority(map)}
                className="overflow-hidden rounded-lg text-left"
              >
                <MapThumb name={map} className="aspect-[16/10]" selected={mapPriority === map} />
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-5 flex justify-center">
        <button
          type="button"
          onClick={() => setCursedCap((v) => !v)}
          className={`rounded border px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition ${
            cursedCap
              ? 'border-cs-gold bg-cs-gold/15 text-cs-gold'
              : 'border-cs-border text-cs-muted hover:border-cs-gold/40'
          }`}
        >
          {t('setup.cursedCap')}: {cursedCap ? t('setup.cursedCapOn') : t('setup.cursedCapOff')}
        </button>
      </div>
      {cursedCap && (
        <p className="mx-auto mt-2 max-w-md text-center text-[11px] text-cs-muted">{t('setup.cursedCapHint')}</p>
      )}

      <div className="mt-8 text-center">
        <button
          type="button"
          className="btn-gold rounded px-10 py-3.5 text-sm uppercase tracking-[0.2em]"
          onClick={() =>
            onStart({ mode: lockedMode || mode, mentality, mapPriority, vsCpu, cursedCap })
          }
        >
          <span className="inline-flex items-center gap-2">
            <Swords className="h-5 w-5" /> {ctaLabel || t('setup.enterDraft')}
          </span>
        </button>
      </div>
    </div>
  )
}

function Panel({ title, icon, children }) {
  return (
    <div className="panel rounded-lg p-5">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h2 className="font-display text-xs font-bold tracking-[0.2em] text-cs-gold uppercase">{title}</h2>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Choice({ active, onClick, title, subtitle }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded border px-3 py-3 text-left transition ${
        active ? 'border-cs-gold bg-cs-gold/10' : 'border-cs-border bg-cs-bg/30 hover:border-cs-gold/40'
      }`}
    >
      <div className={`text-sm font-bold ${active ? 'text-cs-gold' : 'text-cs-text'}`}>{title}</div>
      <div className="mt-1 text-xs leading-snug text-cs-muted">{subtitle}</div>
    </button>
  )
}
