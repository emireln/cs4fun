#!/usr/bin/env node
/**
 * Bump @cs4fun/app (and root) semver for Windows installer builds.
 * Rule: patch 0→9, then minor++ and patch=0
 *   1.0.0 → 1.0.1 → … → 1.0.9 → 1.1.0 → 1.1.1 → …
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const appPkgPath = path.join(root, 'apps', 'app', 'package.json')
const rootPkgPath = path.join(root, 'package.json')

function bump(version) {
  const parts = String(version).split('.').map((n) => Number.parseInt(n, 10))
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    throw new Error(`Invalid semver: ${version}`)
  }
  let [major, minor, patch] = parts
  patch += 1
  if (patch >= 10) {
    patch = 0
    minor += 1
  }
  if (minor >= 10) {
    minor = 0
    major += 1
  }
  return `${major}.${minor}.${patch}`
}

const appPkg = JSON.parse(fs.readFileSync(appPkgPath, 'utf8'))
const prev = appPkg.version || '1.0.0'
const next = bump(prev)
appPkg.version = next
fs.writeFileSync(appPkgPath, `${JSON.stringify(appPkg, null, 2)}\n`)

if (fs.existsSync(rootPkgPath)) {
  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'))
  rootPkg.version = next
  fs.writeFileSync(rootPkgPath, `${JSON.stringify(rootPkg, null, 2)}\n`)
}

process.stdout.write(next)
