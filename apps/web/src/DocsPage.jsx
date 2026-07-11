import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Coffee,
  Mail,
  Swords,
  Users,
  Trophy,
  Flame,
  Calendar,
  Download,
} from 'lucide-react'
import docsCopy from './docsCopy'
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

export default function DocsPage({ lang, onNavigate, onToggleLang, langLabel }) {
  const t = useMemo(() => docsCopy[lang] || docsCopy.en, [lang])
  const [active, setActive] = useState(t.sections[0]?.id)

  useEffect(() => {
    document.title = `cs4fun — ${t.title}`
    return () => {
      document.title = 'cs4fun'
    }
  }, [t.title])

  useEffect(() => {
    const ids = t.sections.map((s) => s.id)
    const observers = []
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(id)
        },
        { rootMargin: '-20% 0px -60% 0px', threshold: 0 },
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach((o) => o.disconnect())
  }, [t.sections])

  return (
    <div className="carbon-bg min-h-dvh overflow-x-clip">
      <header className="sticky top-0 z-30 border-b border-cs-border/50 bg-cs-bg/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3.5 sm:px-8">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-cs-muted transition hover:text-cs-gold"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {t.back}
          </button>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onToggleLang}
              className="font-display text-xs font-bold tracking-[0.2em] text-cs-muted transition hover:text-cs-gold"
              aria-label={t.langAria || langLabel}
            >
              {langLabel}
            </button>
            <a
              href={APP_URL}
              className="btn-gold rounded px-4 py-2 text-[10px] uppercase tracking-[0.16em]"
            >
              {t.play}
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-1">
            <div className="mb-3 font-display text-[10px] font-bold uppercase tracking-[0.22em] text-cs-gold">
              {t.toc}
            </div>
            {t.sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={`block rounded px-2 py-1.5 text-sm transition ${
                  active === section.id
                    ? 'text-cs-gold'
                    : 'text-cs-muted hover:text-cs-text'
                }`}
              >
                {section.title}
              </a>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <LogoMark className="mb-4 h-14 w-14 cursor-pointer" />
            <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              <span className="gold-text">{t.title}</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-cs-muted sm:text-base">{t.subtitle}</p>
          </motion.div>

          <div className="mt-10 space-y-14">
            {t.sections.map((section, i) => (
              <motion.section
                key={section.id}
                id={section.id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: 0.03 * i, duration: 0.4 }}
                className="scroll-mt-28"
              >
                <h2 className="font-display text-xl font-bold tracking-wide text-cs-gold sm:text-2xl">
                  {section.title}
                </h2>

                <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-cs-text/90">
                  {section.body?.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                </div>

                {section.steps && (
                  <ol className="mt-6 space-y-5 border-l border-cs-border/70 pl-5">
                    {section.steps.map((step, idx) => (
                      <li key={step.title}>
                        <div className="font-display text-sm font-bold tracking-wide">
                          <span className="mr-2 text-cs-gold">{idx + 1}.</span>
                          {step.title}
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-cs-muted">{step.text}</p>
                      </li>
                    ))}
                  </ol>
                )}

                {section.modes && (
                  <ul className="mt-6 divide-y divide-cs-border/60">
                    {section.modes.map((mode) => {
                      const Icon = MODE_ICONS[mode.id] || Trophy
                      return (
                        <li key={mode.id} className="flex gap-4 py-4">
                          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-cs-gold" aria-hidden />
                          <div>
                            <div className="font-display text-sm font-bold tracking-wide">
                              {mode.title}
                            </div>
                            <p className="mt-1 text-sm leading-relaxed text-cs-muted">{mode.text}</p>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}

                {section.download && (
                  <a
                    href={WINDOWS_URL}
                    className="btn-ghost mt-6 inline-flex gap-2 rounded px-5 py-3 text-xs uppercase tracking-wider"
                  >
                    <Download className="h-4 w-4 text-cs-gold" aria-hidden />
                    {t.windows}
                  </a>
                )}
              </motion.section>
            ))}
          </div>

          <div className="mt-14 flex flex-wrap items-center gap-3 border-t border-cs-border/50 pt-8">
            <a
              href={APP_URL}
              className="btn-gold rounded px-7 py-3 text-xs uppercase tracking-[0.18em]"
            >
              {t.play}
            </a>
            <a
              href={WINDOWS_URL}
              className="btn-ghost gap-2 rounded px-5 py-3 text-xs uppercase tracking-wider"
            >
              <Download className="h-4 w-4 text-cs-gold" aria-hidden />
              {t.windows}
            </a>
            <a
              href={SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost gap-2 rounded px-5 py-3 text-xs uppercase tracking-wider"
            >
              <Coffee className="h-4 w-4 text-cs-gold" aria-hidden />
              {t.support}
            </a>
            <a
              href={reportMailto(t)}
              className="btn-ghost gap-2 rounded px-5 py-3 text-xs uppercase tracking-wider"
            >
              <Mail className="h-4 w-4 text-cs-gold" aria-hidden />
              {t.report}
            </a>
          </div>
        </main>
      </div>
    </div>
  )
}
