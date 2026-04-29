<script setup lang="ts">
import { useScrollLock, useStorage } from '@vueuse/core'
import { onMounted, ref } from 'vue'

const props = withDefaults(defineProps<{
  buildTime: number
  preview?: boolean
}>(), {
  preview: false,
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

  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
  const now = Date.now()
  const diff = now - props.buildTime

  if (diff > THIRTY_DAYS) {
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

          <div class="space-y-4 text-gray-300 text-sm leading-relaxed mb-6">
            <p>
              This is an automatically triggered <strong>Dead Man's</strong> Switch notice.
            </p>

            <p>
              UmmIt Kin Github has not been updated for more than <strong class="text-white">30 days</strong> and that mean:
            </p>

            <p>
              UmmIt Kin has passed away, encountered an accident, or is facing a major event that prevents internet access. (I don't think so)
            </p>

            <p>
              I’m probably no longer in this life. Or let’s say, you can’t find me anymore. XD
            </p>

            <p>
              Yes, this may be my last message. To all my friends, it was nice to meet you, but I’m done with this life. My life is very challenging, emotionally challenging as well. This decision has actually been brewing for several years. Unfortunately, you’ve reached this page ...
            </p>

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
</style>
