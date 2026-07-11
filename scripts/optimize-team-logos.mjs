/**
 * Compress team PNGs and emit matching WebP for fast loads.
 * Run: node scripts/optimize-team-logos.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = join(dirname(fileURLToPath(import.meta.url)), '../apps/app/public/teams')
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png'))

let before = 0
let after = 0

for (const f of files) {
  const src = path.join(dir, f)
  const base = f.replace(/\.png$/i, '')
  const webp = path.join(dir, `${base}.webp`)
  const raw = fs.readFileSync(src)
  before += raw.length

  const resized = sharp(raw).resize(96, 96, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })

  const pngBuf = await resized
    .clone()
    .png({ compressionLevel: 9, palette: true })
    .toBuffer()

  const webpBuf = await resized
    .clone()
    .webp({ quality: 82, alphaQuality: 80, effort: 6 })
    .toBuffer()

  // Avoid Windows EPERM on odd filenames — write temp then copy
  const tmpPng = path.join(dir, `.${base}.png.tmp`)
  const tmpWebp = path.join(dir, `.${base}.webp.tmp`)
  fs.writeFileSync(tmpPng, pngBuf)
  fs.writeFileSync(tmpWebp, webpBuf)
  fs.copyFileSync(tmpPng, src)
  fs.copyFileSync(tmpWebp, webp)
  fs.unlinkSync(tmpPng)
  fs.unlinkSync(tmpWebp)

  after += webpBuf.length
  console.log(
    `${base}: png ${Math.round(raw.length / 1024)}→${Math.round(pngBuf.length / 1024)}KB, webp ${Math.round(webpBuf.length / 1024)}KB`,
  )
}

console.log(
  `\n${files.length} logos · source ~${Math.round(before / 1024)}KB → webp set ~${Math.round(after / 1024)}KB`,
)
