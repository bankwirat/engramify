import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: 'src/gui/renderer',
  base: './',
  build: {
    outDir: path.resolve(__dirname, 'dist/gui/renderer'),
    emptyOutDir: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src/gui/renderer') },
  },
})
