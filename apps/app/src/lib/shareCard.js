import { ROLES } from '../data/constants'
import { formatMoney, getDisplayCurrency } from './currency'
import { RARITY_META } from './boxBattle'
import { teamLogoCandidates } from '../data/teamLogos'

const FONT = 'Arial, Helvetica, sans-serif'
const CARD_W = 1080
const CARD_H = 1350

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

async function loadTeamLogo(name) {
  for (const src of teamLogoCandidates(name)) {
    const img = await loadImage(src)
    if (img) return img
  }
  return null
}

/** Draw image letterboxed inside a box (object-fit: contain). */
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

/**
 * Draw a shareable result card to canvas (no external deps).
 * Returns a Blob (PNG) or null.
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

  // Solid fills first — never rely on web fonts / external images for readability
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#0a0c10')
  bg.addColorStop(0.45, '#12161f')
  bg.addColorStop(1, won ? '#1a1608' : '#1a0c0c')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  ctx.strokeStyle = 'rgba(255,255,255,0.04)'
  ctx.lineWidth = 1
  for (let x = 0; x < W; x += 48) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, H)
    ctx.stroke()
  }
  for (let y = 0; y < H; y += 48) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(W, y)
    ctx.stroke()
  }

  ctx.fillStyle = won ? '#e8c547' : '#e85d5d'
  ctx.fillRect(0, 0, W, 12)

  // Brand mark — logo + wordmark (every share PNG)
  const logoSize = 56
  let titleX = 72
  if (brandLogo) {
    drawContain(ctx, brandLogo, 72, 44, logoSize, logoSize)
    titleX = 72 + logoSize + 16
  }
  ctx.fillStyle = '#e8c547'
  ctx.font = `bold 48px ${FONT}`
  ctx.fillText('CS4FUN', titleX, 88)

  // Corner watermark logo
  if (brandLogo) {
    ctx.save()
    ctx.globalAlpha = 0.9
    drawContain(ctx, brandLogo, W - 72 - 64, 40, 64, 64)
    ctx.restore()
  }

  ctx.fillStyle = '#8b93a7'
  ctx.font = `28px ${FONT}`
  ctx.fillText(String(mode).toUpperCase(), titleX, 130)

  ctx.fillStyle = won ? '#e8c547' : '#e85d5d'
  ctx.font = `bold 72px ${FONT}`
  const resultWord =
    title ||
    (won
      ? locale === 'pt-BR'
        ? 'VITÓRIA'
        : 'WIN'
      : locale === 'pt-BR'
        ? 'DERROTA'
        : 'LOSS')
  wrapText(ctx, resultWord, 72, 240, W - 144, 80)

  ctx.fillStyle = '#e8ecf4'
  ctx.font = `bold 40px ${FONT}`
  const bits = []
  if (wins != null || losses != null) bits.push(`${wins ?? 0}W-${losses ?? 0}L`)
  if (score != null) bits.push(`SCORE ${score}`)
  if (streak != null) bits.push(`STREAK ${streak}`)
  if (mapPriority) bits.push(String(mapPriority))
  if (myTotal != null && oppTotal != null) {
    bits.push(`${fmt(myTotal)} vs ${fmt(oppTotal)}`)
  }
  if (caseName) bits.push(String(caseName))
  ctx.fillText(fitText(ctx, bits.join('  ·  ') || '—', W - 144), 72, 360)

  ctx.fillStyle = '#8b93a7'
  ctx.font = `32px ${FONT}`
  ctx.fillText(`@${nickname || 'Player'}`, 72, 415)

  const footerY = H - 56
  const contentBottom = footerY - 36

  if (mode === 'box' && Array.isArray(boxDrops) && boxDrops.length) {
    await drawBoxVault(ctx, boxDrops, 460, contentBottom, W, locale, fmt)
  } else if (lineup) {
    await drawLineup(ctx, lineup, 480, contentBottom, W)
  }

  // Footer bar with mini logo
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.fillRect(0, H - 88, W, 88)
  if (brandLogo) {
    drawContain(ctx, brandLogo, 72, H - 72, 36, 36)
  }
  ctx.fillStyle = '#8b93a7'
  ctx.font = `24px ${FONT}`
  const url =
    typeof window !== 'undefined' ? window.location.origin || 'cs4fun.online' : 'cs4fun.online'
  const urlText = String(url).replace(/^file:.*/, 'cs4fun.online')
  ctx.fillText(urlText, brandLogo ? 120 : 72, H - 46)
  ctx.fillStyle = '#e8c547'
  ctx.font = `bold 22px ${FONT}`
  ctx.fillText('CS4FUN', W - 72 - ctx.measureText('CS4FUN').width, H - 46)

  return canvasToPngBlob(canvas)
}

async function drawBoxVault(ctx, boxDrops, topY, bottomY, W, locale, fmt) {
  const list = boxDrops.slice(0, 10)
  const format = fmt || ((n) => formatMoney(n, getDisplayCurrency()))
  ctx.fillStyle = '#e8c547'
  ctx.font = `bold 28px ${FONT}`
  ctx.fillText(locale === 'pt-BR' ? 'SEU VAULT' : 'YOUR VAULT', 72, topY)

  const gridTop = topY + 28
  const availH = Math.max(200, bottomY - gridTop)
  const padX = 72
  const gap = 14
  const availW = W - padX * 2
  const n = list.length
  const cols = n <= 2 ? n : n <= 4 ? 2 : n <= 6 ? 3 : n <= 8 ? 4 : 5
  const rows = Math.ceil(n / cols)
  const cellW = (availW - gap * (cols - 1)) / cols
  const cellH = Math.min(cellW * 1.25, (availH - gap * (rows - 1)) / rows)

  const images = await Promise.all(list.map((d) => loadImage(d.image, { cors: true })))

  for (let i = 0; i < n; i++) {
    const drop = list[i]
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = padX + col * (cellW + gap)
    const y = gridTop + row * (cellH + gap)
    const color = RARITY_META[drop.rarity]?.color || '#e8c547'

    ctx.fillStyle = '#141820'
    roundRect(ctx, x, y, cellW, cellH, 14)
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth = 2.5
    roundRect(ctx, x, y, cellW, cellH, 14)
    ctx.stroke()

    // Rarity top strip
    ctx.fillStyle = color
    ctx.fillRect(x + 10, y + 10, cellW - 20, 4)

    const imgPad = 12
    const textBlock = Math.max(52, Math.min(72, cellH * 0.28))
    const imgAreaH = cellH - textBlock - 28
    if (images[i]) {
      drawContain(ctx, images[i], x + imgPad, y + 22, cellW - imgPad * 2, imgAreaH)
    } else {
      // CORS fallback — rarity-colored placeholder so the card still fits
      ctx.fillStyle = `${color}22`
      roundRect(ctx, x + imgPad, y + 28, cellW - imgPad * 2, imgAreaH - 8, 10)
      ctx.fill()
      ctx.fillStyle = color
      ctx.font = `bold ${Math.max(18, cellW / 8)}px ${FONT}`
      const mark = '◆'
      ctx.fillText(mark, x + (cellW - ctx.measureText(mark).width) / 2, y + 22 + imgAreaH / 2)
    }

    const textY = y + 22 + imgAreaH + 8
    ctx.fillStyle = '#e8ecf4'
    const nameSize = Math.max(16, Math.min(24, cellW / 10))
    ctx.font = `bold ${nameSize}px ${FONT}`
    ctx.fillText(fitText(ctx, drop.name || '—', cellW - 24), x + 12, textY + nameSize)

    ctx.font = `bold ${Math.max(14, nameSize - 2)}px ${FONT}`
    ctx.fillStyle = color
    const rarity = String(drop.rarity || '').toUpperCase()
    ctx.fillText(fitText(ctx, rarity, cellW * 0.55), x + 12, textY + nameSize + 22)

    ctx.fillStyle = '#e8c547'
    ctx.font = `bold ${Math.max(16, nameSize)}px ${FONT}`
    const price = format(drop.value)
    const pw = ctx.measureText(price).width
    ctx.fillText(price, x + cellW - 12 - pw, textY + nameSize + 22)
  }
}

async function drawLineup(ctx, lineup, topY, bottomY, W) {
  ctx.fillStyle = '#e8c547'
  ctx.font = `bold 28px ${FONT}`
  ctx.fillText('LINEUP', 72, topY)

  const roles = ROLES
  const availH = Math.max(280, bottomY - topY - 40)
  const rowH = Math.min(96, (availH - 8 * (roles.length - 1)) / roles.length)
  let y = topY + 36

  for (const role of roles) {
    const p = lineup[role.id]
    ctx.fillStyle = '#2a3140'
    roundRect(ctx, 72, y, W - 144, rowH, 12)
    ctx.fill()

    ctx.fillStyle = '#e8c547'
    ctx.font = `bold 24px ${FONT}`
    ctx.fillText(role.short, 96, y + rowH * 0.62)

    ctx.fillStyle = '#e8ecf4'
    ctx.font = `bold 32px ${FONT}`
    ctx.fillText(fitText(ctx, p?.name || '—', 280), 200, y + rowH * 0.62)

    if (p?.fromTeam) {
      const logo = await loadTeamLogo(p.fromTeam)
      let textX = 520
      if (logo) {
        const size = Math.min(40, rowH - 20)
        drawContain(ctx, logo, 520, y + (rowH - size) / 2, size, size)
        textX = 520 + size + 12
      }
      ctx.fillStyle = '#8b93a7'
      ctx.font = `22px ${FONT}`
      ctx.fillText(fitText(ctx, p.fromTeam, W - 72 - textX), textX, y + rowH * 0.62)
    }
    y += rowH + 8
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

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(' ')
  let line = ''
  let cy = y
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy)
      line = word
      cy += lineHeight
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, x, cy)
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
