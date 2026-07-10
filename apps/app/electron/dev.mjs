import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const waitOn = require('wait-on')

const root = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.join(root, '..')

const vite = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', '5173'], {
  cwd: appRoot,
  stdio: 'inherit',
  shell: true,
  env: process.env,
})

function shutdown(code = 0) {
  if (!vite.killed) vite.kill()
  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
vite.on('exit', (code) => {
  if (code && code !== 0) shutdown(code)
})

await waitOn({
  resources: ['http://127.0.0.1:5173'],
  timeout: 120000,
})

const { existsSync } = await import('node:fs')
const iconIco = path.join(appRoot, 'build', 'icon.ico')
if (!existsSync(iconIco)) {
  await new Promise((resolve, reject) => {
    const child = spawn('node', ['electron/generate-icons.mjs'], {
      cwd: appRoot,
      stdio: 'inherit',
      shell: true,
    })
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('icons failed'))))
  })
}

const electron = spawn('npx', ['electron', '.'], {
  cwd: appRoot,
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    ELECTRON_DEV: '1',
    VITE_DEV_SERVER_URL: 'http://127.0.0.1:5173',
  },
})

electron.on('exit', (code) => shutdown(code ?? 0))
