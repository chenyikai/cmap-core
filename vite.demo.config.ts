import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: '/haitu-demo/',
  root: '.',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'haitu-demo',
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['local.dev.com'],
    proxy: {
      '/ship': {
        target: 'http://web.aochensoft.com/hxld-back',
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(RegExp(`^/ship`), ''),
      },
    },
  },
})
