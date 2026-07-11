import { ROLES } from '../data/constants'
import { formatMoney, getDisplayCurrency } from './currency'
import { RARITY_META } from './boxBattle'

const CARD_W = 1080
const CARD_H = 1350

/** Prefer app fonts when already loaded; never block render on webfonts. */
function fontStack(kind = 'body') {
  if (kind === 'display') return '"Orbitron", "Arial Black", Arial, sans-serif'
  if (kind === 'mono') return '"IBM Plex Mono", Consolas, monospace'
  return '"Rajdhani", "Segoe UI", Arial, sans-serif'
}

function brandLogoSrc() {
  const base = typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL ? import.meta.env.BASE_URL : '/'
  return `${base}logo.png`
}

function loadImage(src, { cors = false } = {}) {
  return new Promise((resolve) => {
    if (!src || typeof Image === 'undefined') {
      resolve(null)
      return
    }
    const img = new Image()
    if (cors) img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

async function loadBrandLogo() {
  return loadImage(brandLogoSrc())
}

function drawContain(ctx, img, x, y, w, h) {
  if (!img || !img.width || !img.height) return
  const scale = Math.min(w / img.width, h / img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

function fitText(ctx, text, maxWidth) {
  const raw = String(text || '')
  if (ctx.measureText(raw).width <= maxWidth) return raw
  let s = raw
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxWidth) {
    s = s.slice(0, -1)
  }
  return `${s}…`
}

function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rad, y)
  ctx.arcTo(x + w, y, x + w, y + h, rad)
  ctx.arcTo(x + w, y + h, x, y + h, rad)
  ctx.arcTo(x, y + h, x, y, rad)
  ctx.arcTo(x, y, x + w, y, rad)
  ctx.closePath()
}

function paintAtmosphere(ctx, W, H, won) {
  const base = ctx.createLinearGradient(0, 0, W * 0.2, H)
  base.addColorStop(0, '#07090d')
  base.addColorStop(0.55, '#0e1218')
  base.addColorStop(1, won ? '#141008' : '#140a0a')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, W, H)

  // Soft brand glow behind the hero result
  const glow = ctx.createRadialGradient(W * 0.5, H * 0.28, 20, W * 0.5, H * 0.28, W * 0.55)
  glow.addColorStop(0, won ? 'rgba(232,197,71,0.28)' : 'rgba(232,93,93,0.22)')
  glow.addColorStop(0.45, won ? 'rgba(232,197,71,0.08)' : 'rgba(232,93,93,0.06)')
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // Subtle carbon grain (sparse, not a full grid)
  ctx.fillStyle = 'rgba(255,255,255,0.015)'
  for (let i = 0; i < 90; i++) {
    const x = ((i * 97) % W) + (i % 7)
    const y = ((i * 53) % (H - 120)) + 40
    ctx.fillRect(x, y, 2, 2)
  }

  // Gold edge frame
  ctx.strokeStyle = won ? 'rgba(232,197,71,0.35)' : 'rgba(232,93,93,0.28)'
  ctx.lineWidth = 3
  roundRect(ctx, 28, 28, W - 56, H - 56, 28)
  ctx.stroke()

  // Top accent bar
  const bar = ctx.createLinearGradient(0, 0, W, 0)
  bar.addColorStop(0, 'transparent')
  bar.addColorStop(0.2, won ? '#e8c547' : '#e85d5d')
  bar.addColorStop(0.8, won ? '#e8c547' : '#e85d5d')
  bar.addColorStop(1, 'transparent')
  ctx.fillStyle = bar
  ctx.fillRect(80, 28, W - 160, 4)
}

function modeLabel(mode, locale) {
  const m = String(mode || 'cs4fun').toLowerCase()
  const map = {
    major: ['THE MAJOR', 'O MAJOR'],
    duel: ['KNIFE FIGHT', 'BRIGA DE FACA'],
    party: ['POWER PARTY', 'POWER PARTY'],
    daily: ['BLIND DAILY', 'DIÁRIO CEGO'],
    gauntlet: ['CHAOS GAUNTLET', 'GAUNTLET DO CAOS'],
    box: ['BOX BATTLE', 'BOX BATTLE'],
    career: ['CAREER', 'CARREIRA'],
    survivor: ['SURVIVOR', 'SURVIVOR'],
  }
  const pair = map[m]
  if (!pair) return String(mode).toUpperCase()
  return locale === 'pt-BR' ? pair[1] : pair[0]
}

/**
 * Shareable result PNG — brand-first, logo-light, built to look good in Discord/IG/Twitter.
 */
export async function renderShareCardBlob({
  mode = 'CS4FUN',
  won = false,
  title = '',
  score,
  wins,
  losses,
  streak,
  nickname = 'Player',
  mapPriority,
  lineup,
  locale = 'en',
  boxDrops = null,
  myTotal = null,
  oppTotal = null,
  caseName = null,
  currency = null,
  highlight = null,
  careerTier = null,
  careerOrg = null,
}) {
  const W = CARD_W
  const H = CARD_H
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const moneyCur = currency || getDisplayCurrency()
  const fmt = (n) => formatMoney(n, moneyCur)
  const brandLogo = await loadBrandLogo()
  const accent = won ? '#e8c547' : '#e85d5d'
  const text = '#e8ecf4'
  const muted = '#8b93a7'

  paintAtmosphere(ctx, W, H, won)

  // ── Header: one brand mark + mode chip (no logo spam) ──
  const pad = 72
  if (brandLogo) {
    drawContain(ctx, brandLogo, pad, 56, 48, 48)
  }
  ctx.fillStyle = accent
  ctx.font = `700 36px ${fontStack('display')}`
  ctx.fillText('CS4FUN', brandLogo ? pad + 64 : pad, 92)

  // Mode chip (right)
  const modeText = modeLabel(mode, locale)
  ctx.font = `600 22px ${fontStack('body')}`
  const chipW = Math.min(360, ctx.measureText(modeText).width + 36)
  const chipX = W - pad - chipW
  ctx.fillStyle = 'rgba(232,197,71,0.08)'
  roundRect(ctx, chipX, 62, chipW, 40, 20)
  ctx.fill()
  ctx.strokeStyle = 'rgba(232,197,71,0.35)'
  ctx.lineWidth = 1.5
  roundRect(ctx, chipX, 62, chipW, 40, 20)
  ctx.stroke()
  ctx.fillStyle = accent
  ctx.fillText(modeText, chipX + 18, 90)

  // ── Hero result ──
  const resultWord =
    title ||
    (won
      ? locale === 'pt-BR'
        ? 'VITÓRIA'
        : 'VICTORY'
      : locale === 'pt-BR'
        ? 'DERROTA'
        : 'DEFEAT')

  ctx.fillStyle = accent
  ctx.font = `800 96px ${fontStack('display')}`
  const hero = fitText(ctx, String(resultWord).toUpperCase(), W - pad * 2)
  const heroW = ctx.measureText(hero).width
  ctx.fillText(hero, (W - heroW) / 2, 260)

  // Thin gold underline under hero
  ctx.fillStyle = accent
  ctx.globalAlpha = 0.55
  ctx.fillRect((W - Math.min(heroW, 420)) / 2, 280, Math.min(heroW, 420), 3)
  ctx.globalAlpha = 1

  // Player identity
  ctx.fillStyle = text
  ctx.font = `700 40px ${fontStack('body')}`
  const nick = `@${nickname || 'Player'}`
  ctx.fillText(nick, (W - ctx.measureText(nick).width) / 2, 350)

  if (careerOrg) {
    ctx.fillStyle = muted
    ctx.font = `500 26px ${fontStack('body')}`
    const org = fitText(ctx, String(careerOrg), W - pad * 2)
    ctx.fillText(org, (W - ctx.measureText(org).width) / 2, 390)
  }

  // Stats strip — few chips, not a dense meta row
  const chips = []
  if (wins != null || losses != null) chips.push({ label: `${wins ?? 0}–${losses ?? 0}`, sub: locale === 'pt-BR' ? 'PLACAR' : 'RECORD' })
  if (score != null) chips.push({ label: String(score), sub: 'SCORE' })
  if (streak != null) chips.push({ label: String(streak), sub: 'STREAK' })
  if (mapPriority) chips.push({ label: String(mapPriority), sub: locale === 'pt-BR' ? 'MAPA' : 'MAP' })
  if (myTotal != null && oppTotal != null) {
    chips.push({ label: `${fmt(myTotal)}`, sub: locale === 'pt-BR' ? 'SEU TOTAL' : 'YOUR TOTAL' })
  }
  if (careerTier) chips.push({ label: String(careerTier), sub: 'TIER' })
  if (caseName && chips.length < 4) chips.push({ label: fitText(ctx, String(caseName), 200), sub: 'CASE' })

  const shown = chips.slice(0, 4)
  if (shown.length) {
    const gap = 16
    const totalGap = gap * (shown.length - 1)
    const chipWidth = (W - pad * 2 - totalGap) / shown.length
    const y0 = careerOrg ? 420 : 390
    shown.forEach((c, i) => {
      const x = pad + i * (chipWidth + gap)
      ctx.fillStyle = 'rgba(255,255,255,0.03)'
      roundRect(ctx, x, y0, chipWidth, 100, 16)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 1
      roundRect(ctx, x, y0, chipWidth, 100, 16)
      ctx.stroke()

      ctx.fillStyle = accent
      ctx.font = `700 34px ${fontStack('mono')}`
      const label = fitText(ctx, c.label, chipWidth - 24)
      ctx.fillText(label, x + (chipWidth - ctx.measureText(label).width) / 2, y0 + 52)

      ctx.fillStyle = muted
      ctx.font = `600 18px ${fontStack('body')}`
      const sub = c.sub
      ctx.fillText(sub, x + (chipWidth - ctx.measureText(sub).width) / 2, y0 + 80)
    })
  }

  if (highlight) {
    const hy = careerOrg ? 550 : 520
    ctx.fillStyle = 'rgba(232,197,71,0.1)'
    roundRect(ctx, pad, hy, W - pad * 2, 56, 12)
    ctx.fill()
    ctx.fillStyle = accent
    ctx.font = `700 26px ${fontStack('body')}`
    const hl = fitText(ctx, String(highlight), W - pad * 2 - 40)
    ctx.fillText(hl, (W - ctx.measureText(hl).width) / 2, hy + 36)
  }

  const footerY = H - 110
  const contentTop = highlight ? (careerOrg ? 630 : 600) : careerOrg ? 560 : 530

  if (mode === 'box' && Array.isArray(boxDrops) && boxDrops.length) {
    await drawBoxVault(ctx, boxDrops, contentTop, footerY - 24, W, locale, fmt, accent)
  } else if (lineup) {
    await drawLineup(ctx, lineup, contentTop, footerY - 24, W, accent, muted, text)
  }

  // ── Footer CTA — wordmark + invite URL, single logo max ──
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.fillRect(28, H - 110, W - 56, 82)

  ctx.fillStyle = accent
  ctx.font = `700 28px ${fontStack('display')}`
  ctx.fillText('CS4FUN', pad, H - 58)

  ctx.fillStyle = muted
  ctx.font = `600 24px ${fontStack('body')}`
  const cta = locale === 'pt-BR' ? 'Jogue grátis · cs4fun.online' : 'Play free · cs4fun.online'
  ctx.fillText(cta, pad + 160, H - 58)

  if (brandLogo) {
    ctx.globalAlpha = 0.85
    drawContain(ctx, brandLogo, W - pad - 44, H - 92, 40, 40)
    ctx.globalAlpha = 1
  }

  return canvasToPngBlob(canvas)
}

async function drawBoxVault(ctx, boxDrops, topY, bottomY, W, locale, fmt, accent) {
  const list = boxDrops.slice(0, 6)
  const pad = 72
  ctx.fillStyle = accent
  ctx.font = `700 24px ${fontStack('display')}`
  const heading = locale === 'pt-BR' ? 'DROPS' : 'DROPS'
  ctx.fillText(heading, pad, topY)

  const gridTop = topY + 24
  const availH = Math.max(220, bottomY - gridTop)
  const gap = 16
  const availW = W - pad * 2
  const n = list.length
  const cols = n <= 3 ? n : 3
  const rows = Math.ceil(n / cols)
  const cellW = (availW - gap * (cols - 1)) / cols
  const cellH = Math.min(cellW * 1.15, (availH - gap * (rows - 1)) / rows)
  const images = await Promise.all(list.map((d) => loadImage(d.image, { cors: true })))

  for (let i = 0; i < n; i++) {
    const drop = list[i]
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = pad + col * (cellW + gap)
    const y = gridTop + row * (cellH + gap)
    const color = RARITY_META[drop.rarity]?.color || accent

    ctx.fillStyle = '#10141c'
    roundRect(ctx, x, y, cellW, cellH, 18)
    ctx.fill()
    ctx.strokeStyle = `${color}99`
    ctx.lineWidth = 2
    roundRect(ctx, x, y, cellW, cellH, 18)
    ctx.stroke()

    ctx.fillStyle = color
    ctx.fillRect(x, y, cellW, 5)

    const imgPad = 16
    const textH = 56
    if (images[i]) {
      drawContain(ctx, images[i], x + imgPad, y + 18, cellW - imgPad * 2, cellH - textH - 28)
    }

    ctx.fillStyle = '#e8ecf4'
    ctx.font = `700 ${Math.max(18, Math.min(24, cellW / 11))}px ${fontStack('body')}`
    ctx.fillText(fitText(ctx, drop.name || '—', cellW - 28), x + 14, y + cellH - 34)

    ctx.fillStyle = color
    ctx.font = `700 ${Math.max(16, Math.min(22, cellW / 12))}px ${fontStack('mono')}`
    const price = fmt(drop.value)
    ctx.fillText(price, x + 14, y + cellH - 12)
  }
}

async function drawLineup(ctx, lineup, topY, bottomY, W, accent, muted, text) {
  const pad = 72
  ctx.fillStyle = accent
  ctx.font = `700 24px ${fontStack('display')}`
  ctx.fillText('LINEUP', pad, topY)

  const roles = ROLES
  const gap = 12
  const availH = Math.max(260, bottomY - topY - 28)
  const rowH = Math.min(88, (availH - gap * (roles.length - 1)) / roles.length)
  let y = topY + 28

  for (const role of roles) {
    const p = lineup[role.id]
    ctx.fillStyle = 'rgba(255,255,255,0.035)'
    roundRect(ctx, pad, y, W - pad * 2, rowH, 14)
    ctx.fill()

    // Role badge
    ctx.fillStyle = 'rgba(232,197,71,0.12)'
    roundRect(ctx, pad + 14, y + 14, 88, rowH - 28, 10)
    ctx.fill()
    ctx.fillStyle = accent
    ctx.font = `700 22px ${fontStack('display')}`
    const short = role.short
    ctx.fillText(short, pad + 14 + (88 - ctx.measureText(short).width) / 2, y + rowH * 0.62)

    ctx.fillStyle = text
    ctx.font = `700 34px ${fontStack('body')}`
    ctx.fillText(fitText(ctx, p?.name || '—', 420), pad + 120, y + rowH * 0.58)

    if (p?.rating != null) {
      ctx.fillStyle = accent
      ctx.font = `700 28px ${fontStack('mono')}`
      const rating = Number(p.rating).toFixed(2)
      ctx.fillText(rating, W - pad - 28 - ctx.measureText(rating).width, y + rowH * 0.58)
    } else if (p?.fromTeam) {
      ctx.fillStyle = muted
      ctx.font = `500 24px ${fontStack('body')}`
      const team = fitText(ctx, p.fromTeam, 220)
      ctx.fillText(team, W - pad - 28 - ctx.measureText(team).width, y + rowH * 0.58)
    }

    y += rowH + gap
  }
}

export async function canvasToPngBlob(canvas) {
  if (!canvas) return null
  if (typeof canvas.toBlob === 'function') {
    const blob = await new Promise((resolve) => {
      try {
        canvas.toBlob((b) => resolve(b), 'image/png')
      } catch {
        resolve(null)
      }
    })
    if (blob && blob.size > 0) return blob
  }
  try {
    const dataUrl = canvas.toDataURL('image/png')
    const res = await fetch(dataUrl)
    return await res.blob()
  } catch {
    return null
  }
}

export function triggerBlobDownload(blob, filename = 'cs4fun-result.png') {
  if (!blob) return false
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    URL.revokeObjectURL(url)
    a.remove()
  }, 1500)
  return true
}
