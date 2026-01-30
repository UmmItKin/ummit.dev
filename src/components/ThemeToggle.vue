<script lang="ts" setup>
import { useDark } from '@vueuse/core'
import { nextTick, onMounted } from 'vue'

interface AstroBeforeSwapEvent extends Event {
  newDocument: Document
}

const isDark = useDark()

function syncDarkMode(doc: Document) {
  doc.documentElement.classList.toggle('dark', isDark.value)
}

onMounted(() => {
  document.addEventListener('astro:before-swap', (event) => {
    syncDarkMode((event as AstroBeforeSwapEvent).newDocument)
  })
})

function toggleTheme(event: MouseEvent) {
  const shouldAnimate = document.startViewTransition
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!shouldAnimate) {
    isDark.value = !isDark.value
    return
  }

  const { clientX: x, clientY: y } = event
  const endRadius = Math.hypot(
    Math.max(x, innerWidth - x),
    Math.max(y, innerHeight - y),
  )

  const transition = document.startViewTransition(async () => {
    isDark.value = !isDark.value
    await nextTick()
  })

  transition.ready.then(() => {
    const clipPath = [
      `circle(0px at ${x}px ${y}px)`,
      `circle(${endRadius}px at ${x}px ${y}px)`,
    ]

    document.documentElement.animate(
      { clipPath: isDark.value ? [...clipPath].reverse() : clipPath },
      {
        duration: 400,
        easing: 'ease-out',
        fill: 'forwards',
        pseudoElement: isDark.value
          ? '::view-transition-old(root)'
          : '::view-transition-new(root)',
      },
    )
  })
}
</script>

<template>
  <button
    :aria-label="isDark ? 'Dark Theme' : 'Light Theme'"
    nav-link
    :class="isDark ? 'i-ri-moon-line' : 'i-ri-sun-line'"
    @click="toggleTheme"
  />
</template>
