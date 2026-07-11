/**
 * Generates Electron desktop icon (solid bg + rounded), tray (transparent),
 * public favicons, and NSIS installer bitmaps (no text).
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
const sourceLogo = path.join(repoRoot, 'logo.png')

/** Solid carbon — no lines / gradients */
const BG = '#0a0c10'

fs.mkdirSync(buildDir, { recursive: true })

if (!fs.existsSync(sourceLogo)) {
  console.error('Missing source logo:', sourceLogo)
  process.exit(1)
}

async function resizeLogo(size) {
  return sharp(sourceLogo)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .png()
    .toBuffer()
}

/** Desktop / taskbar / installer icon — solid fill, rounded corners */
async function desktopIconPng(size = 512) {
  const r = Math.round(size * 0.18)
  const pad = Math.round(size * 0.08)
  const inner = size - pad * 2
  const logo = await resizeLogo(inner)
  const bgSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="${BG}"/>
</svg>`
  return sharp(Buffer.from(bgSvg))
    .composite([{ input: logo, top: pad, left: pad }])
    .png()
    .toBuffer()
}

/** Installer sidebar 164×314 — solid bg + logo, no text / lines */
async function sidebarPng() {
  const w = 164
  const h = 314
  const logo = await resizeLogo(96)
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

/** Installer header 150×57 — solid bg + logo, no text */
async function headerPng() {
  const w = 150
  const h = 57
  const logo = await resizeLogo(44)
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

  // Public favicons + brand avatar (app + web)
  const favicon512 = await resizeLogo(512)
  const favicon192 = await resizeLogo(192)
  const brand256 = await resizeLogo(256)

  fs.writeFileSync(path.join(appRoot, 'public', 'logo.png'), favicon512)
  fs.writeFileSync(path.join(appRoot, 'public', 'avatars', 'cs4fun.png'), brand256)

  const webPublic = path.join(appRoot, '..', 'web', 'public')
  try {
    fs.mkdirSync(webPublic, { recursive: true })
    fs.writeFileSync(path.join(webPublic, 'logo.png'), favicon512)
  } catch {
    /* web workspace optional */
  }

  // Apple-touch / PWA-sized copy
  fs.writeFileSync(path.join(appRoot, 'public', 'logo-192.png'), favicon192)

  // Transparent tray (logo already has transparent bg)
  await sharp(await resizeLogo(32)).toFile(path.join(buildDir, 'tray.png'))
  await sharp(await resizeLogo(128)).toFile(path.join(buildDir, 'tray@2x.png'))
  fs.writeFileSync(
    path.join(buildDir, 'tray.ico'),
    await pngToIco([await resizeLogo(16), await resizeLogo(32)]),
  )

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
