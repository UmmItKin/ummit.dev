<script setup lang="ts">
import { useScrollLock, useStorage } from '@vueuse/core'
import { onMounted, ref } from 'vue'

const props = withDefaults(defineProps<{
  buildTime: number
  preview?: boolean
  days?: number
}>(), {
  preview: false,
  days: 30,
})

const isVisible = ref(false)
const isLocked = useScrollLock(typeof document !== 'undefined' ? document.body : null)
const dismissedAt = useStorage('dead-man-dismissed', 0)

onMounted(() => {
  if (props.preview) {
    isVisible.value = true
    isLocked.value = true
    return
  }

  const threshold = props.days * 24 * 60 * 60 * 1000
  const now = Date.now()
  const diff = now - props.buildTime

  if (diff > threshold) {
    if (!dismissedAt.value || (now - dismissedAt.value) > 24 * 60 * 60 * 1000) {
      isVisible.value = true
      isLocked.value = true
    }
  }
})

function dismiss() {
  isVisible.value = false
  isLocked.value = false
  if (!props.preview)
    dismissedAt.value = Date.now()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isVisible"
        class="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <div class="bg-hex-0d1117 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
          <button
            class="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors cursor-pointer"
            aria-label="Close dialog"
            @click="dismiss"
          >
            <div class="i-ri-close-line text-xl" />
          </button>

          <div class="flex items-center gap-3 mb-5 text-red-500">
            <div class="i-ri-error-warning-line text-3xl" />
            <h2 class="text-xl font-bold tracking-wide m-0">
              Hidden Flag - Automated Notice
            </h2>
          </div>

          <div class="dead-man-message space-y-4 text-gray-300 text-sm leading-relaxed mb-6">
            <slot />

            <div class="mt-4 pt-4 border-t border-gray-800/80 text-xs text-gray-500 font-italic">
              Last Update: {{ new Date(buildTime).toLocaleDateString() }}
            </div>
          </div>

          <div class="flex justify-end">
            <button
              class="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium cursor-pointer"
              @click="dismiss"
            >
              See you :(
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Slotted markdown: space-y-4 does not reach slot-projected children, so put
   the paragraph gap on the paragraphs directly. */
.dead-man-message :deep(p) {
  margin: 1rem 0 0;
}
.dead-man-message :deep(p:first-child) {
  margin-top: 0;
}

/* Make **bold** stand out white, like the old highlight. */
.dead-man-message :deep(strong) {
  color: #fff;
  font-weight: 700;
}
</style>
