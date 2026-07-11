/**
 * Generates Electron desktop icon (solid bg + rounded), tray, public favicons,
 * UI brand mark, and NSIS installer bitmaps (no text).
 *
 * Source: repo-root logo.png
 * Run: node electron/generate-icons.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.join(__dirname, '..')
const repoRoot = path.join(appRoot, '..', '..')
const buildDir = path.join(appRoot, 'build')

/** Prefer repo-root master art; fall back to committed public brand mark (CI has no root logo.png). */
function resolveSourceLogo() {
  const candidates = [
    path.join(repoRoot, 'logo.png'),
    path.join(appRoot, 'public', 'logo.png'),
    path.join(appRoot, 'public', 'favicon.png'),
  ]
  return candidates.find((p) => fs.existsSync(p)) || null
}

const sourceLogo = resolveSourceLogo()

/** Solid carbon — no lines / gradients */
const BG = '#0a0c10'

fs.mkdirSync(buildDir, { recursive: true })

if (!sourceLogo) {
  console.error(
    'Missing source logo. Expected one of:\n' +
      `  - ${path.join(repoRoot, 'logo.png')}\n` +
      `  - ${path.join(appRoot, 'public', 'logo.png')}`,
  )
  process.exit(1)
}

/**
 * Tight brand mark for in-app / landing UI (natural aspect, transparent bg).
 */
async function brandMarkPng(maxWidth = 1024) {
  const trimmed = await sharp(sourceLogo).trim({ threshold: 18 }).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  })
  const { data, info } = trimmed
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 18 && data[i + 1] < 18 && data[i + 2] < 18) data[i + 3] = 0
  }
  const cleared = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer()

  const tight = await sharp(cleared).trim({ threshold: 1 }).toBuffer()
  const meta = await sharp(tight).metadata()
  const pad = Math.max(2, Math.round(Math.max(meta.width, meta.height) * 0.02))
  const padded = await sharp(tight)
    .extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()

  return sharp(padded)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .png()
    .toBuffer()
}

/**
 * Full wide mark on carbon badge — NEVER cover/crop.
 * Fit by width into a padded safe zone so scope + S stay intact.
 */
async function badgePng(size = 32) {
  const r = Math.max(2, Math.round(size * 0.16))
  const pad = Math.max(3, Math.round(size * 0.2))
  const maxW = Math.max(8, size - pad * 2)
  const mark = await brandMarkPng(2048)
  const logo = await sharp(mark)
    .resize({ width: maxW })
    .png()
    .toBuffer()
  const meta = await sharp(logo).metadata()
  // If height somehow exceeds safe area, shrink further by height
  let finalLogo = logo
  let finalMeta = meta
  const maxH = size - pad * 2
  if (meta.height > maxH) {
    finalLogo = await sharp(mark)
      .resize({ height: maxH })
      .png()
      .toBuffer()
    finalMeta = await sharp(finalLogo).metadata()
  }
  const left = Math.max(0, Math.round((size - finalMeta.width) / 2))
  const top = Math.max(0, Math.round((size - finalMeta.height) / 2))
  const bgSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="${BG}"/>
</svg>`
  return sharp(Buffer.from(bgSvg))
    .composite([{ input: finalLogo, top, left }])
    .png()
    .toBuffer()
}

/** Transparent square with full mark contained (installer overlays) */
async function resizeLogo(size, fill = 0.85) {
  const mark = await brandMarkPng(2048)
  const inner = Math.max(1, Math.round(size * fill))
  const fitted = await sharp(mark)
    .resize(inner, inner, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .png()
    .toBuffer()

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: fitted, gravity: 'centre' }])
    .png()
    .toBuffer()
}

async function desktopIconPng(size = 512) {
  return badgePng(size)
}

async function sidebarPng() {
  const w = 164
  const h = 314
  const logo = await resizeLogo(96, 0.9)
  const bgSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${BG}"/>
  <rect x="0" y="0" width="3" height="${h}" fill="#e8c547" fill-opacity="0.75"/>
</svg>`
  return sharp(Buffer.from(bgSvg))
    .composite([{ input: logo, top: 72, left: 34 }])
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
}

async function headerPng() {
  const w = 150
  const h = 57
  const logo = await resizeLogo(44, 0.9)
  const bgSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${BG}"/>
  <rect x="0" y="${h - 2}" width="${w}" height="2" fill="#e8c547" fill-opacity="0.7"/>
</svg>`
  return sharp(Buffer.from(bgSvg))
    .composite([{ input: logo, top: 6, left: 53 }])
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
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

async function main() {
  const desktopPng = path.join(buildDir, 'icon.png')
  await sharp(await desktopIconPng(512)).toFile(desktopPng)

  const sizes = [16, 24, 32, 48, 64, 128, 256]
  const pngBuffers = []
  for (const size of sizes) {
    const buf = await desktopIconPng(size)
    pngBuffers.push(buf)
    await sharp(buf).toFile(path.join(buildDir, `icon-${size}.png`))
  }
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), await pngToIco(pngBuffers))

  // UI brand mark (natural aspect) — do NOT square-pad this
  const brandUi = await brandMarkPng(1024)
  const favicon512 = await badgePng(512)
  const favicon192 = await badgePng(192)
  const favicon48 = await badgePng(48)
  const favicon32 = await badgePng(32)
  const favicon16 = await badgePng(16)
  const brand256 = await badgePng(256)

  fs.writeFileSync(path.join(appRoot, 'public', 'logo.png'), brandUi)
  fs.writeFileSync(path.join(appRoot, 'public', 'favicon.png'), favicon512)
  fs.writeFileSync(path.join(appRoot, 'public', 'favicon-32.png'), favicon32)
  fs.writeFileSync(
    path.join(appRoot, 'public', 'favicon.ico'),
    await pngToIco([favicon16, favicon32, favicon48]),
  )
  fs.writeFileSync(path.join(appRoot, 'public', 'logo-192.png'), favicon192)
  fs.writeFileSync(path.join(appRoot, 'public', 'avatars', 'cs4fun.png'), brand256)

  const webPublic = path.join(appRoot, '..', 'web', 'public')
  fs.mkdirSync(webPublic, { recursive: true })
  fs.writeFileSync(path.join(webPublic, 'logo.png'), brandUi)
  fs.writeFileSync(path.join(webPublic, 'favicon.png'), favicon512)
  fs.writeFileSync(path.join(webPublic, 'favicon-32.png'), favicon32)
  fs.writeFileSync(
    path.join(webPublic, 'favicon.ico'),
    await pngToIco([favicon16, favicon32, favicon48]),
  )
  fs.writeFileSync(path.join(webPublic, 'logo-192.png'), favicon192)

  // Tray — same uncropped carbon badge
  const tray16 = await badgePng(16)
  const tray32 = await badgePng(32)
  const tray64 = await badgePng(64)
  const tray128 = await badgePng(128)
  await sharp(tray32).toFile(path.join(buildDir, 'tray.png'))
  await sharp(tray128).toFile(path.join(buildDir, 'tray@2x.png'))
  fs.writeFileSync(path.join(buildDir, 'tray.ico'), await pngToIco([tray16, tray32, tray64]))

  const side = await sidebarPng()
  writeBmp24(path.join(buildDir, 'installerSidebar.bmp'), 164, 314, side.data)

  const head = await headerPng()
  writeBmp24(path.join(buildDir, 'installerHeader.bmp'), 150, 57, head.data)

  console.log('Generated icons from', sourceLogo)
  console.log('→', buildDir)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
