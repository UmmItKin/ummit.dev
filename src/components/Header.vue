<script lang="ts" setup>
import siteConfig from '@/site-config'
import { getLinkTarget } from '@/utils/link'
import ThemeToggle from './ThemeToggle.vue'

const navLinks = siteConfig.header.navLinks || []

const socialLinks = siteConfig.socialLinks.filter((link: Record<string, any>) => {
  if (link.header && typeof link.header === 'boolean') {
    return link
  }
  else if (link.header && typeof link.header === 'string') {
    link.icon = link.header.includes('i-') ? link.header : link.icon
    return link
  }
  else {
    return false
  }
})

function toggleNavDrawer() {
  const drawer = document.querySelector('.nav-drawer') as HTMLElement
  const mask = document.querySelector('.nav-drawer-mask') as HTMLElement
  if (!drawer || !mask)
    return
  if (drawer.style.transform === `translateX(0%)`) {
    drawer.style.transform = `translateX(-100%)`
    mask.style.display = `none`
  }
  else {
    drawer.style.transform = `translateX(0%)`
    mask.style.display = `block`
  }
}
</script>

<template>
  <header
    id="header"
    class="z-40 w-full py-6 px-6 flex justify-between items-center"
  >
    <div class="flex items-center h-full">
      <a href="/" mr-6 aria-label="Header Logo Image" class="font-bold text-xl">
        UmmIt
      </a>
      <nav class="sm:flex hidden flex-wrap gap-x-6 position-initial flex-row">
        <a
          v-for="link in navLinks" :key="link.text" :aria-label="`${link.text}`" :target="getLinkTarget(link.href)"
          nav-link :href="link.href"
        >
          {{ link.text }}
        </a>
      </nav>
      <div sm:hidden h-full flex items-center @click="toggleNavDrawer()">
        <menu i-ri-menu-2-fill />
      </div>
    </div>
    <div class="flex gap-x-6">
      <a
        v-for="link in socialLinks" :key="link.text" :aria-label="`${link.text}`" :class="link.icon" nav-link
        :target="getLinkTarget(link.href)" :href="link.href"
      />

      <a nav-link target="_blank" href="/rss.xml" i-ri-rss-line aria-label="RSS" />
      <ThemeToggle />
    </div>
  </header>
  <nav
    class="nav-drawer sm:hidden"
  >
    <i i-ri-menu-2-fill />
    <a
      v-for="link in navLinks" :key="link.text" :aria-label="`${link.text}`" :target="getLinkTarget(link.href)"
      nav-link :href="link.href" @click="toggleNavDrawer()"
    >
      {{ link.text }}
    </a>
  </nav>
  <div class="nav-drawer-mask" @click="toggleNavDrawer()" />
</template>

<style scoped>
.nav-drawer {
  transform: translateX(-100%);
  --at-apply: box-border fixed h-screen z-999 left-0 top-0 min-w-32vw max-w-50vw bg-main p-6 text-lg flex flex-col gap-5
    transition-all;
}

.nav-drawer-mask {
  display: none;
  --at-apply: transition-all;
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  z-index: 998;
}
</style>
