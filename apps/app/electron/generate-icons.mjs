/**
 * Generates Electron desktop icon (styled bg + rounded), tray (transparent),
 * and NSIS installer bitmaps (no text).
 *
 * Run: node electron/generate-icons.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.join(__dirname, '..')
const buildDir = path.join(appRoot, 'build')
const publicLogoSvg = path.join(appRoot, 'public', 'logo.svg')

const BG = '#0a0c10'
const PANEL = '#11151c'
const GOLD = '#e8c547'
const GOLD_DIM = '#b8942e'

fs.mkdirSync(buildDir, { recursive: true })

const logoSvg = fs.readFileSync(publicLogoSvg, 'utf8')

/** Desktop / taskbar / installer icon — carbon panel, gold rim, rounded */
function desktopIconSvg(size = 512) {
  const r = Math.round(size * 0.18)
  const pad = Math.round(size * 0.14)
  const inner = size - pad * 2
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${PANEL}"/>
      <stop offset="55%" stop-color="${BG}"/>
      <stop offset="100%" stop-color="#07090c"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="28%" r="55%">
      <stop offset="0%" stop-color="${GOLD}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${GOLD}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="round">
      <rect width="${size}" height="${size}" rx="${r}" ry="${r}"/>
    </clipPath>
  </defs>
  <g clip-path="url(#round)">
    <rect width="${size}" height="${size}" fill="url(#g)"/>
    <rect width="${size}" height="${size}" fill="url(#glow)"/>
    <g opacity="0.07">
      ${Array.from({ length: 18 }, (_, i) => {
        const y = Math.round((i + 1) * (size / 19))
        return `<line x1="0" y1="${y}" x2="${size}" y2="${y}" stroke="#ffffff" stroke-width="1"/>`
      }).join('')}
    </g>
    <g transform="translate(${pad} ${pad})">
      <svg width="${inner}" height="${inner}" viewBox="0 0 128 128">${logoSvg.replace(/<\/?svg[^>]*>/g, '')}</svg>
    </g>
  </g>
  <rect x="1.5" y="1.5" width="${size - 3}" height="${size - 3}" rx="${r - 1}" ry="${r - 1}"
    stroke="${GOLD}" stroke-opacity="0.55" stroke-width="3" fill="none"/>
</svg>`
}

/** Installer sidebar 164×314 — visual only, no text */
function sidebarSvg() {
  const w = 164
  const h = 314
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${PANEL}"/>
      <stop offset="100%" stop-color="${BG}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="22%" r="70%">
      <stop offset="0%" stop-color="${GOLD}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${GOLD}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" fill="url(#glow)"/>
  <g opacity="0.06">
    ${Array.from({ length: 40 }, (_, i) => {
      const y = (i + 1) * 8
      return `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="#fff" stroke-width="1"/>`
    }).join('')}
  </g>
  <rect x="0" y="0" width="3" height="${h}" fill="${GOLD}" fill-opacity="0.75"/>
  <g transform="translate(34 72)">
    <svg width="96" height="96" viewBox="0 0 128 128">${logoSvg.replace(/<\/?svg[^>]*>/g, '')}</svg>
  </g>
  <circle cx="82" cy="250" r="36" fill="${GOLD}" fill-opacity="0.06"/>
  <circle cx="82" cy="250" r="18" fill="${GOLD}" fill-opacity="0.1"/>
</svg>`
}

/** Installer header 150×57 — visual only, no text */
function headerSvg() {
  const w = 150
  const h = 57
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${BG}"/>
      <stop offset="100%" stop-color="${PANEL}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect x="0" y="${h - 2}" width="${w}" height="2" fill="${GOLD}" fill-opacity="0.7"/>
  <g transform="translate(53 6)">
    <svg width="44" height="44" viewBox="0 0 128 128">${logoSvg.replace(/<\/?svg[^>]*>/g, '')}</svg>
  </g>
</svg>`
}

function writeBmp24(filePath, width, height, rgba) {
  const rowSize = Math.floor((width * 3 + 3) / 4) * 4
  const pixelSize = rowSize * height
  const fileSize = 54 + pixelSize
  const buf = Buffer.alloc(fileSize)

  buf.write('BM', 0)
  buf.writeUInt32LE(fileSize, 2)
  buf.writeUInt32LE(0, 6)
  buf.writeUInt32LE(54, 10)
  buf.writeUInt32LE(40, 14)
  buf.writeInt32LE(width, 18)
  buf.writeInt32LE(height, 22)
  buf.writeUInt16LE(1, 26)
  buf.writeUInt16LE(24, 28)
  buf.writeUInt32LE(0, 30)
  buf.writeUInt32LE(pixelSize, 34)
  buf.writeInt32LE(2835, 38)
  buf.writeInt32LE(2835, 42)
  buf.writeUInt32LE(0, 46)
  buf.writeUInt32LE(0, 50)

  for (let y = 0; y < height; y++) {
    const srcY = height - 1 - y
    const rowOff = 54 + y * rowSize
    for (let x = 0; x < width; x++) {
      const i = (srcY * width + x) * 4
      const o = rowOff + x * 3
      buf[o] = rgba[i + 2]
      buf[o + 1] = rgba[i + 1]
      buf[o + 2] = rgba[i]
    }
  }

  fs.writeFileSync(filePath, buf)
}

async function svgToRgba(svg, width, height) {
  const { data } = await sharp(Buffer.from(svg))
    .resize(width, height)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return data
}

async function main() {
  const desktopSvg = desktopIconSvg(512)
  const desktopPng = path.join(buildDir, 'icon.png')
  await sharp(Buffer.from(desktopSvg)).png().toFile(desktopPng)

  const sizes = [16, 24, 32, 48, 64, 128, 256]
  const pngBuffers = []
  for (const size of sizes) {
    const buf = await sharp(Buffer.from(desktopIconSvg(size))).png().toBuffer()
    pngBuffers.push(buf)
    await sharp(buf).toFile(path.join(buildDir, `icon-${size}.png`))
  }
  const ico = await pngToIco(pngBuffers)
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), ico)

  // Transparent tray / in-window fallback (no background)
  const traySvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" fill="none">
  ${logoSvg.replace(/<\/?svg[^>]*>/g, '')}
</svg>`
  await sharp(Buffer.from(traySvg)).resize(32, 32).png().toFile(path.join(buildDir, 'tray.png'))
  await sharp(Buffer.from(traySvg)).resize(128, 128).png().toFile(path.join(buildDir, 'tray@2x.png'))
  const trayIco = await pngToIco([
    await sharp(Buffer.from(traySvg)).resize(16, 16).png().toBuffer(),
    await sharp(Buffer.from(traySvg)).resize(32, 32).png().toBuffer(),
  ])
  fs.writeFileSync(path.join(buildDir, 'tray.ico'), trayIco)

  const sideRgba = await svgToRgba(sidebarSvg(), 164, 314)
  writeBmp24(path.join(buildDir, 'installerSidebar.bmp'), 164, 314, sideRgba)

  const headRgba = await svgToRgba(headerSvg(), 150, 57)
  writeBmp24(path.join(buildDir, 'installerHeader.bmp'), 150, 57, headRgba)

  console.log('Generated icons in', buildDir)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
