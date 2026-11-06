import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the app from /<repo>/; the deploy workflow sets BASE_PATH accordingly.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Press16 — 16-week bench press',
        short_name: 'Press16',
        description: "Offline tracker for Muravyov's 16-week bench press program",
        theme_color: '#111827',
        background_color: '#111827',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        navigateFallback: `${base}index.html`,
        navigateFallbackDenylist: [new RegExp(`^${base}api/`)],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
});
