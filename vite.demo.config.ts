import { resolve } from 'path'
import { existsSync, readdirSync } from 'node:fs'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const shipProxyTarget = env.SHIP_PROXY_TARGET || 'http://web.aochensoft.com/hxld-back'

  return {
    base: env.DEMO_BASE_PATH || '/',
    root: '.',
    resolve: {
      alias: [
        { find: 'cmap-core/style.css', replacement: resolve(__dirname, 'src/styles/index.scss') },
        { find: /^cmap-core$/, replacement: resolve(__dirname, 'src/index.ts') },
        { find: '@', replacement: resolve(__dirname, 'src') },
      ],
    },
    build: {
      outDir: 'dist-demo',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          debugger: resolve(__dirname, 'index.html'),
          examples: resolve(__dirname, 'examples/index.html'),
          ...Object.fromEntries(
            readdirSync(resolve(__dirname, 'examples'), { withFileTypes: true })
              .filter(
                (entry) =>
                  entry.isDirectory() &&
                  existsSync(resolve(__dirname, 'examples', entry.name, 'index.html')),
              )
              .map((entry) => [
                `example-${entry.name}`,
                resolve(__dirname, 'examples', entry.name, 'index.html'),
              ]),
          ),
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts: ['local.dev.com'],
      proxy: {
        '/ship': {
          target: shipProxyTarget,
          ws: true,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ship/, ''),
        },
      },
    },
  }
})
