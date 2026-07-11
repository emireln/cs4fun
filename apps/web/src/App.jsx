import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Coffee, Mail, Swords, Users, Trophy, Flame, Calendar, Download } from 'lucide-react'
import copy from './copy'
import DocsPage from './DocsPage'
import LogoMark from './LogoMark'

const APP_URL = import.meta.env.VITE_APP_URL || 'https://app.cs4fun.online'
const WINDOWS_URL =
  import.meta.env.VITE_WINDOWS_DOWNLOAD_URL || 'https://cs4fun.online/download/cs4fun-Setup.exe'
const SUPPORT_URL = 'https://buymeacoffee.com/emireln'

function reportMailto(t) {
  const subject = encodeURIComponent(t.reportMailSubject || 'cs4fun report')
  const body = encodeURIComponent(t.reportMailBody || '')
  return `mailto:contact.cs4fun@gmail.com?subject=${subject}&body=${body}`
}

const MODE_ICONS = {
  major: Trophy,
  duel: Swords,
  party: Users,
  daily: Calendar,
  gauntlet: Flame,
}

const MODE_IDS = ['major', 'duel', 'party', 'daily', 'gauntlet']

function normalizePath(pathname) {
  const p = (pathname || '/').replace(/\/+$/, '') || '/'
  return p
}

function usePath() {
  const [path, setPath] = useState(() => normalizePath(window.location.pathname))

  useEffect(() => {
    const onPop = () => setPath(normalizePath(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback((to) => {
    const next = normalizePath(to)
    if (normalizePath(window.location.pathname) !== next) {
      window.history.pushState({}, '', next)
    }
    setPath(next)
    window.scrollTo(0, 0)
  }, [])

  return [path, navigate]
}

export default function App() {
  const [path, navigate] = usePath()
  const [lang, setLang] = useState(() => {
    try {
      const saved = localStorage.getItem('cs4fun_web_lang')
      if (saved === 'en' || saved === 'pt') return saved
    } catch {
      /* ignore */
    }
    return navigator.language?.toLowerCase().startsWith('pt') ? 'pt' : 'en'
  })

  const t = useMemo(() => copy[lang], [lang])

  useEffect(() => {
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en'
  }, [lang])

  const toggleLang = () => {
    const next = lang === 'en' ? 'pt' : 'en'
    setLang(next)
    try {
      localStorage.setItem('cs4fun_web_lang', next)
    } catch {
      /* ignore */
    }
  }

  if (path === '/docs') {
    return (
      <DocsPage
        lang={lang}
        onNavigate={navigate}
        onToggleLang={toggleLang}
        langLabel={t.lang}
      />
    )
  }

  return (
    <div className="carbon-bg min-h-dvh overflow-x-clip">
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-4 pt-[max(1rem,env(safe-area-inset-top,0px))] sm:px-8">
        <button
          type="button"
          onClick={() => navigate('/docs')}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cs-muted transition hover:text-cs-gold"
        >
          <BookOpen className="h-3.5 w-3.5" aria-hidden />
          {t.docs}
        </button>
        <button
          type="button"
          onClick={toggleLang}
          className="font-display text-xs font-bold tracking-[0.2em] text-cs-muted transition hover:text-cs-gold"
          aria-label={t.langAria}
        >
          {t.lang}
        </button>
      </header>

      <section className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 pb-16 pt-20 text-center">
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[18%] h-[42vmin] w-[42vmin] -translate-x-1/2 rounded-full bg-cs-gold/15 blur-3xl"
          animate={{ opacity: [0.35, 0.55, 0.35], scale: [1, 1.06, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(232,197,71,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(232,197,71,0.5) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse 70% 55% at 50% 40%, black, transparent)',
          }}
        />

        <motion.div
          className="relative z-10 mb-6"
          initial={{ opacity: 0, y: 18, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <LogoMark className="h-28 w-28 cursor-pointer sm:h-36 sm:w-36" />
        </motion.div>

        <motion.h1
          className="relative z-10 font-display text-5xl font-extrabold tracking-tight sm:text-7xl"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="gold-text">cs4fun</span>
        </motion.h1>

        <motion.p
          className="relative z-10 mt-4 max-w-md text-base text-cs-text/90 sm:text-lg"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.18 }}
        >
          {t.headline}
        </motion.p>

        <motion.p
          className="relative z-10 mt-2 max-w-sm text-sm tracking-wide text-cs-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.28 }}
        >
          {t.supportLine}
        </motion.p>

        <motion.div
          className="relative z-10 mt-9 flex flex-wrap items-center justify-center gap-3"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.34 }}
        >
          <a
            href={APP_URL}
            className="btn-gold rounded px-8 py-3.5 text-xs uppercase tracking-[0.2em]"
          >
            {t.play}
          </a>
          <a
            href={WINDOWS_URL}
            className="btn-ghost gap-2 rounded px-6 py-3.5 text-xs uppercase tracking-wider"
            title={t.windowsHint}
          >
            <Download className="h-4 w-4 text-cs-gold" aria-hidden />
            {t.windows}
          </a>
          <a
            href={SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost gap-2 rounded px-6 py-3.5 text-xs uppercase tracking-wider"
          >
            <Coffee className="h-4 w-4 text-cs-gold" aria-hidden />
            {t.support}
          </a>
        </motion.div>
      </section>

      <section className="border-t border-cs-border/50 px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display text-center text-xl font-bold tracking-wide text-cs-gold sm:text-2xl">
            {t.modesTitle}
          </h2>
          <p className="mt-2 text-center text-sm text-cs-muted">{t.modesBlurb}</p>

          <ul className="mt-10 divide-y divide-cs-border/60">
            {MODE_IDS.map((id, i) => {
              const Icon = MODE_ICONS[id]
              const mode = t.modes[id]
              return (
                <motion.li
                  key={id}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ delay: 0.04 * i, duration: 0.4 }}
                  className="flex items-start gap-4 py-4"
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-cs-gold" aria-hidden />
                  <div>
                    <div className="font-display text-sm font-bold tracking-wide">{mode.title}</div>
                    <div className="mt-0.5 text-sm text-cs-muted">{mode.blurb}</div>
                  </div>
                </motion.li>
              )
            })}
          </ul>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            <a
              href={APP_URL}
              className="btn-gold rounded px-8 py-3 text-xs uppercase tracking-[0.18em]"
            >
              {t.play}
            </a>
            <a
              href={WINDOWS_URL}
              className="btn-ghost gap-2 rounded px-6 py-3 text-xs uppercase tracking-wider"
              title={t.windowsHint}
            >
              <Download className="h-4 w-4 text-cs-gold" aria-hidden />
              {t.windows}
            </a>
            <button
              type="button"
              onClick={() => navigate('/docs')}
              className="btn-ghost gap-2 rounded px-6 py-3 text-xs uppercase tracking-wider"
            >
              <BookOpen className="h-4 w-4 text-cs-gold" aria-hidden />
              {t.readDocs}
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-cs-border/40 px-5 py-8 text-center sm:px-8">
        <div className="font-display text-xs tracking-[0.25em] text-cs-muted">cs4fun.online</div>
        <p className="mt-3 text-xs text-cs-muted/80">{t.disclaimer}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/docs')}
            className="text-xs font-semibold uppercase tracking-wider text-cs-muted transition hover:text-cs-gold"
          >
            {t.docs}
          </button>
          <a
            href={WINDOWS_URL}
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cs-muted transition hover:text-cs-gold"
            title={t.windowsHint}
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            {t.windows}
          </a>
          <a
            href={reportMailto(t)}
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cs-muted transition hover:text-cs-gold"
          >
            <Mail className="h-3.5 w-3.5" aria-hidden />
            {t.report}
          </a>
          <a
            href={SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cs-gold transition hover:text-cs-accent"
          >
            <Coffee className="h-3.5 w-3.5" aria-hidden />
            {t.support}
          </a>
        </div>
      </footer>
    </div>
  )
}
