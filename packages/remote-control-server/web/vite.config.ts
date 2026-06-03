import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { copyFileSync } from 'node:fs'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'copy-oidc-client',
      closeBundle() {
        const src = path.resolve(
          __dirname,
          '../node_modules/oidc-client-ts/dist/browser/oidc-client-ts.min.js',
        )
        const dest = path.resolve(__dirname, 'dist/auth/oidc-client-ts.min.js')
        try {
          copyFileSync(src, dest)
        } catch {
          // OIDC bundle may not exist if dependency is not installed
        }
      },
    },
  ],
  base: '/code/',
  resolve: {
    alias: {
      '@/src': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'components'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 10000,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks(id) {
          if (
            id.includes('node_modules/shiki') ||
            id.includes('node_modules/@shikijs')
          ) {
            return 'shiki'
          }
          if (
            id.includes('node_modules/motion') ||
            id.includes('node_modules/framer-motion')
          ) {
            return 'motion'
          }
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/react-dom')
          ) {
            return 'vendor'
          }
          if (
            id.includes('node_modules/ai/') ||
            id.includes('node_modules/@ai-sdk/')
          ) {
            return 'ai-sdk'
          }
          if (
            id.includes('node_modules/qrcode') ||
            id.includes('node_modules/jsqr')
          ) {
            return 'qr'
          }
        },
      },
    },
  },
  server: {
    proxy: {
      '/web': 'http://localhost:3000',
      '/v1': 'http://localhost:3000',
      '/v2': 'http://localhost:3000',
      '/acp': 'http://localhost:3000',
    },
  },
})
