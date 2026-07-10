import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Relative asset paths so Electron can load dist via file://
  base: './',
  plugins: [react(), tailwindcss()],
})
