import { EventEmitter } from 'node:events'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import vue from '@astrojs/vue'
import { defineConfig } from 'astro/config'
import UnoCSS from 'unocss/astro'

// Suppress MaxListenersExceededWarning from Astro/Vite FSWatcher in dev.
EventEmitter.defaultMaxListeners = 30

export default defineConfig({
  site: 'https://ummit.dev',
  devToolbar: {
    enabled: false,
  },
  server: {
    port: 3199,
  },
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'viewport',
  },
  integrations: [
    mdx(),
    sitemap(),
    UnoCSS({
      injectReset: true,
    }),
    vue(),
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-dark-default',
      wrap: true,
    },
  },
})
