import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  // Relative asset paths so Electron can load dist via file://
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@cs4fun/docs-copy': path.resolve(rootDir, '../web/src/docsCopy.js'),
    },
  },
  server: {
    fs: { allow: [path.resolve(rootDir, '..'), path.resolve(rootDir, '../..')] },
  },
})
