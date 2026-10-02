import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `vite build --mode artifact` produces one self-contained HTML file for claude.ai
// (see scripts/build-artifact.mjs); the default build is the Vercel website.
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'artifact' ? [viteSingleFile()] : [])],
  define: mode === 'artifact' ? { 'import.meta.env.VITE_TARGET': JSON.stringify('artifact') } : {},
  build: mode === 'artifact' ? { outDir: 'dist-artifact', copyPublicDir: false, assetsInlineLimit: 100_000_000 } : {},
  server: {
    proxy: {
      '/api': 'http://localhost:3002',
    },
  },
}))
