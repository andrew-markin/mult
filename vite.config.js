/* eslint-disable import-x/no-nodejs-modules */
import { fileURLToPath, URL } from 'node:url'

import { quasar, transformAssetUrls } from '@quasar/vite-plugin'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

import iosSplashScreens from './plugins/ios-splash-screens.js'

const background = '#37474f'

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 8085,
    strictPort: true
  },
  plugins: [
    vue({
      template: { transformAssetUrls }
    }),
    // @quasar/plugin-vite options list:
    // https://github.com/quasarframework/quasar/blob/dev/vite-plugin/index.d.ts
    quasar({
      sassVariables: fileURLToPath(new URL('./src/quasar.sass', import.meta.url))
    }),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'inline',
      includeAssets: ['favicon.svg', 'favicon.png', 'robots.txt'],
      workbox: {
        // The plugin enables these for autoUpdate only with its own registration
        // script, not with the inline one, so new versions would wait for all tabs to close
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,png,svg,ttf,woff,woff2}'],
        // iOS reads launch screens when the app is added to the home screen, no need to cache them
        globIgnores: ['splash/**']
      },
      manifest: {
        name: 'Mult',
        short_name: 'Mult',
        description: 'Multiplication trainer',
        theme_color: background,
        background_color: background,
        orientation: 'portrait-primary',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    }),
    iosSplashScreens({ color: background })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
