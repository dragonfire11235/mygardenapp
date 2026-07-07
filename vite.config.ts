/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      // autoUpdate: neue Versionen aktivieren sich beim nächsten Öffnen von selbst
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Mein Garten',
        short_name: 'Garten',
        description: 'Pflanzen, Beete, Aufgaben, Tagebuch und Geräte für den eigenen Garten',
        lang: 'de',
        theme_color: '#16a34a',
        background_color: '#f6f8f4',
        display: 'standalone',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    host: true,
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      // Trefle.io sendet keine CORS-Header → Browser-Aufrufe laufen über diesen Proxy.
      '/api/trefle': {
        target: 'https://trefle.io/api/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/trefle/, ''),
      },
    },
  },
  preview: {
    host: true,
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api/trefle': {
        target: 'https://trefle.io/api/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/trefle/, ''),
      },
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./src/test-setup.ts'],
  },
})
