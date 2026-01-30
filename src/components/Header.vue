<script lang="ts" setup>
import { ref } from 'vue'
import siteConfig from '@/site-config'
import { getLinkTarget } from '@/utils/link'
import ThemeToggle from './ThemeToggle.vue'

interface SocialLink {
  text: string
  href: string
  icon: string
  header?: boolean | string
}

const navLinks = siteConfig.header.navLinks || []
const isDrawerOpen = ref(false)

const socialLinks = (siteConfig.socialLinks as SocialLink[])
  .filter(link => link.header)
  .map(link => ({
    ...link,
    icon: typeof link.header === 'string' && link.header.includes('i-')
      ? link.header
      : link.icon,
  }))

function toggleNavDrawer() {
  isDrawerOpen.value = !isDrawerOpen.value
}

function closeDrawer() {
  isDrawerOpen.value = false
}
</script>

<template>
  <header
    id="header"
    z-40 w-full py-6 px-6 flex justify-between items-center
  >
    <div flex items-center h-full>
      <a href="/" mr-6 aria-label="Header Logo Image" font-bold text-xl>
        UmmIt
      </a>
      <nav sm:flex hidden flex-wrap gap-x-6 position-initial flex-row>
        <a
          v-for="link in navLinks"
          :key="link.text"
          :aria-label="link.text"
          :target="getLinkTarget(link.href)"
          :href="link.href"
          nav-link
        >
          {{ link.text }}
        </a>
      </nav>
      <button sm:hidden h-full flex items-center @click="toggleNavDrawer">
        <i i-ri-menu-2-fill />
      </button>
    </div>
    <div flex gap-x-6>
      <a
        v-for="link in socialLinks"
        :key="link.text"
        :aria-label="link.text"
        :class="link.icon"
        :target="getLinkTarget(link.href)"
        :href="link.href"
        nav-link
      />
      <a nav-link target="_blank" href="/rss.xml" i-ri-rss-line aria-label="RSS" />
      <ThemeToggle />
    </div>
  </header>

  <nav
    sm:hidden fixed h-screen z-999 left-0 top-0 min-w-32vw max-w-50vw
    bg-main p-6 text-lg flex flex-col gap-5 transition-transform
    :class="isDrawerOpen ? 'translate-x-0' : 'translate-x--100%'"
  >
    <i i-ri-menu-2-fill />
    <a
      v-for="link in navLinks"
      :key="link.text"
      :aria-label="link.text"
      :target="getLinkTarget(link.href)"
      :href="link.href"
      nav-link
      @click="closeDrawer"
    >
      {{ link.text }}
    </a>
  </nav>

  <Transition name="fade">
    <div
      v-if="isDrawerOpen"
      fixed inset-0 z-998 bg-black:50
      @click="closeDrawer"
    />
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
