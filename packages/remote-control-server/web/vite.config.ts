import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { copyFileSync } from 'node:fs'

export default defineConfig(({ mode }) => {
  // Load .env from both the web/ dir and the parent RCS root dir
  const env = {
    ...loadEnv(mode, process.cwd(), ''),
    ...loadEnv(mode, path.resolve(__dirname, '..'), ''),
  }
  return {
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
          const dest = path.resolve(
            __dirname,
            'dist/auth/oidc-client-ts.min.js',
          )
          try {
            copyFileSync(src, dest)
          } catch {
            // OIDC bundle may not exist if dependency is not installed
          }
        },
      },
    ],
    // Read base path from env var (matches RCS_WEB_BASE at runtime).
    // Supports relative paths ('/code/') for same-origin and full URLs ('https://cdn.example.com/code/') for CDN.
    // loadEnv() reads .env files only; process.env is checked as fallback for Docker ARG/ENV builds.
    base: env.RCS_WEB_BASE || process.env.RCS_WEB_BASE || '/code/',
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
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name][extname]',
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
  }
})
