import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/metronome/',
  plugins: [VitePWA({
    registerType: 'autoUpdate',
    injectRegister: false,
    scope: '/metronome/',
    includeAssets: ['assets/*.mp3', 'assets/*.webp', 'assets/*.ico', 'fonts/*'],
    manifest: {
      id: '/metronome/',
      name: 'Dave Drums Metronome',
      short_name: 'Metronome',
      description: 'A free metronome with subdivisions, tap tempo and tempo trainer.',
      start_url: '/metronome/',
      scope: '/metronome/',
      display: 'standalone',
      theme_color: '#111517',
      background_color: '#111517',
      icons: [{src: 'assets/metronome.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any'}]
    },
    workbox: { navigateFallbackDenylist: [/^\/metronome\/embed\//] }
  })],
  build: { target: 'es2020' },
  test: { environment: 'jsdom', include: ['tests/unit/**/*.test.js'], setupFiles: ['tests/setup.js'] }
});
