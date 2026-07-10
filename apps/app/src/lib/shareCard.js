import { ROLES } from '../data/constants'

/**
 * Draw a shareable result card to canvas (no external deps).
 * Returns a Blob (PNG) or null.
 */
export async function renderShareCardBlob({
  mode = 'cs4fun',
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
}) {
  const W = 1080
  const H = 1350
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#0a0c10')
  bg.addColorStop(0.45, '#12161f')
  bg.addColorStop(1, won ? '#1a1608' : '#1a0c0c')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Grid texture
  ctx.strokeStyle = 'rgba(255,255,255,0.03)'
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

  // Gold accent bar
  ctx.fillStyle = won ? '#e8c547' : '#e85d5d'
  ctx.fillRect(0, 0, W, 10)

  // Brand
  ctx.fillStyle = '#e8c547'
  ctx.font = 'bold 42px system-ui, sans-serif'
  ctx.fillText('cs4fun', 72, 100)

  ctx.fillStyle = '#8b93a7'
  ctx.font = '28px system-ui, sans-serif'
  ctx.fillText(String(mode).toUpperCase(), 72, 150)

  // Result
  ctx.fillStyle = won ? '#e8c547' : '#e85d5d'
  ctx.font = 'bold 72px system-ui, sans-serif'
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

  // Stats row
  ctx.fillStyle = '#e8ecf4'
  ctx.font = 'bold 40px ui-monospace, monospace'
  const bits = []
  if (wins != null || losses != null) bits.push(`${wins ?? 0}W-${losses ?? 0}L`)
  if (score != null) bits.push(`SCORE ${score}`)
  if (streak != null) bits.push(`STREAK ${streak}`)
  if (mapPriority) bits.push(mapPriority)
  ctx.fillText(bits.join('  ·  '), 72, 420)

  // Nickname
  ctx.fillStyle = '#8b93a7'
  ctx.font = '32px system-ui, sans-serif'
  ctx.fillText(`@${nickname}`, 72, 480)

  // Lineup
  if (lineup) {
    let y = 560
    ctx.fillStyle = '#e8c547'
    ctx.font = 'bold 28px system-ui, sans-serif'
    ctx.fillText(locale === 'pt-BR' ? 'LINEUP' : 'LINEUP', 72, y)
    y += 50

    for (const role of ROLES) {
      const p = lineup[role.id]
      ctx.fillStyle = '#2a3140'
      roundRect(ctx, 72, y, W - 144, 88, 12)
      ctx.fill()

      ctx.fillStyle = '#e8c547'
      ctx.font = 'bold 24px system-ui, sans-serif'
      ctx.fillText(role.short, 96, y + 54)

      ctx.fillStyle = '#e8ecf4'
      ctx.font = 'bold 32px system-ui, sans-serif'
      ctx.fillText(p?.name || '—', 200, y + 54)

      if (p?.fromTeam) {
        ctx.fillStyle = '#8b93a7'
        ctx.font = '22px system-ui, sans-serif'
        ctx.fillText(p.fromTeam, 520, y + 54)
      }
      y += 104
    }
  }

  // Footer
  ctx.fillStyle = '#8b93a7'
  ctx.font = '24px system-ui, sans-serif'
  const url = typeof window !== 'undefined' ? window.location.origin : 'cs4fun'
  ctx.fillText(url, 72, H - 60)

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png')
  })
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
