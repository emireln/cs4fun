import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(os.tmpdir(), 'cs4fun-electron-release')
const releaseDir = path.join(appRoot, 'release')

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: appRoot,
      stdio: 'inherit',
      shell: true,
      env: process.env,
    })
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`))
    })
  })
}

fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })

await run('node', ['electron/generate-icons.mjs'])
await run('npx', ['vite', 'build'])
await run('npx', [
  'electron-builder',
  '--win',
  'nsis',
  `--config.directories.output=${outDir}`,
])

fs.mkdirSync(releaseDir, { recursive: true })
const setups = fs
  .readdirSync(outDir)
  .filter((name) => name.toLowerCase().endsWith('.exe') && !name.includes('unpacked'))

if (setups.length === 0) {
  throw new Error(`No setup .exe found in ${outDir}`)
}

for (const name of setups) {
  const from = path.join(outDir, name)
  const to = path.join(releaseDir, name)
  fs.copyFileSync(from, to)
  console.log(`Wrote ${to}`)
}
