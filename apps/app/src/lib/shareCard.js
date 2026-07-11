import { ROLES } from '../data/constants'
import { formatUsd, RARITY_META } from './boxBattle'
import { teamLogoCandidates } from '../data/teamLogos'

const FONT = 'Arial, Helvetica, sans-serif'

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src || typeof Image === 'undefined') {
      resolve(null)
      return
    }
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

async function loadTeamLogo(name) {
  for (const src of teamLogoCandidates(name)) {
    const img = await loadImage(src)
    if (img) return img
  }
  return null
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
}) {
  const W = 1080
  const H = 1350
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

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

  ctx.fillStyle = '#e8c547'
  ctx.font = `bold 48px ${FONT}`
  ctx.fillText('CS4FUN', 72, 100)

  ctx.fillStyle = '#8b93a7'
  ctx.font = `28px ${FONT}`
  ctx.fillText(String(mode).toUpperCase(), 72, 150)

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
  wrapText(ctx, resultWord, 72, 280, W - 144, 80)

  ctx.fillStyle = '#e8ecf4'
  ctx.font = `bold 40px ${FONT}`
  const bits = []
  if (wins != null || losses != null) bits.push(`${wins ?? 0}W-${losses ?? 0}L`)
  if (score != null) bits.push(`SCORE ${score}`)
  if (streak != null) bits.push(`STREAK ${streak}`)
  if (mapPriority) bits.push(String(mapPriority))
  if (myTotal != null && oppTotal != null) {
    bits.push(`${formatUsd(myTotal)} vs ${formatUsd(oppTotal)}`)
  }
  if (caseName) bits.push(String(caseName))
  ctx.fillText(bits.join('  ·  ') || '—', 72, 420)

  ctx.fillStyle = '#8b93a7'
  ctx.font = `32px ${FONT}`
  ctx.fillText(`@${nickname || 'Player'}`, 72, 480)

  if (mode === 'box' && Array.isArray(boxDrops) && boxDrops.length) {
    let y = 540
    ctx.fillStyle = '#e8c547'
    ctx.font = `bold 28px ${FONT}`
    ctx.fillText(locale === 'pt-BR' ? 'SEUS DROPS' : 'YOUR PULLS', 72, y)
    y += 36

    for (const drop of boxDrops.slice(0, 8)) {
      const color = RARITY_META[drop.rarity]?.color || '#e8c547'
      ctx.fillStyle = '#1a2030'
      roundRect(ctx, 72, y, W - 144, 78, 12)
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.fillStyle = color
      ctx.font = `bold 22px ${FONT}`
      ctx.fillText((drop.rarity || '').toUpperCase(), 96, y + 48)

      ctx.fillStyle = '#e8ecf4'
      ctx.font = `bold 28px ${FONT}`
      const name = String(drop.name || '—')
      const clipped = name.length > 28 ? `${name.slice(0, 27)}…` : name
      ctx.fillText(clipped, 280, y + 48)

      ctx.fillStyle = '#e8c547'
      ctx.font = `bold 26px ${FONT}`
      ctx.fillText(formatUsd(drop.value), W - 220, y + 48)
      y += 90
    }
  } else if (lineup) {
    let y = 560
    ctx.fillStyle = '#e8c547'
    ctx.font = `bold 28px ${FONT}`
    ctx.fillText('LINEUP', 72, y)
    y += 50

    for (const role of ROLES) {
      const p = lineup[role.id]
      ctx.fillStyle = '#2a3140'
      roundRect(ctx, 72, y, W - 144, 88, 12)
      ctx.fill()

      ctx.fillStyle = '#e8c547'
      ctx.font = `bold 24px ${FONT}`
      ctx.fillText(role.short, 96, y + 54)

      ctx.fillStyle = '#e8ecf4'
      ctx.font = `bold 32px ${FONT}`
      ctx.fillText(p?.name || '—', 200, y + 54)

      if (p?.fromTeam) {
        const logo = await loadTeamLogo(p.fromTeam)
        let textX = 520
        if (logo) {
          const size = 40
          ctx.drawImage(logo, 520, y + 24, size, size)
          textX = 520 + size + 12
        }
        ctx.fillStyle = '#8b93a7'
        ctx.font = `22px ${FONT}`
        ctx.fillText(p.fromTeam, textX, y + 54)
      }
      y += 104
    }
  }

  ctx.fillStyle = '#8b93a7'
  ctx.font = `24px ${FONT}`
  const url = typeof window !== 'undefined' ? window.location.origin || 'cs4fun.online' : 'cs4fun.online'
  ctx.fillText(String(url).replace(/^file:.*/, 'cs4fun.online'), 72, H - 60)

  return canvasToPngBlob(canvas)
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
