<script lang="ts" setup>
import { onMounted, ref } from 'vue'

interface Friend {
  image: {
    src: string
    width: number
    height: number
    format: string
  }
  name: string
  url: string
  github: string
  tooltip: string
}

interface Props {
  friends: Friend[]
}

const props = defineProps<Props>()

interface AvatarPosition {
  x: number
  y: number
  size: number
  friend: Friend
}

const positions = ref<AvatarPosition[]>([])
const container = ref<HTMLDivElement>()
const hoveredIndex = ref<number | null>(null)

const sizes = [100]

function generatePositions() {
  if (!container.value)
    return

  const containerWidth = container.value.clientWidth
  const containerHeight = 600
  const centerX = containerWidth / 2
  const centerY = containerHeight / 2
  const newPositions: AvatarPosition[] = []

  const totalAvatars = props.friends.length
  const rings = Math.ceil(Math.sqrt(totalAvatars / 2.5))
  const baseRadius = 120
  const radiusIncrement = 120

  let avatarIndex = 0

  for (let ring = 0; ring < rings && avatarIndex < totalAvatars; ring++) {
    const radius = baseRadius + ring * radiusIncrement
    const avatarsInRing = Math.ceil(2 * Math.PI * radius / 130)
    const actualAvatarsInRing = Math.min(avatarsInRing, totalAvatars - avatarIndex)

    for (let i = 0; i < actualAvatarsInRing && avatarIndex < totalAvatars; i++) {
      const angle = (2 * Math.PI * i) / actualAvatarsInRing + (ring * 0.5)
      const size = sizes[Math.floor(Math.random() * sizes.length)]

      const randomOffset = 15
      const offsetX = (Math.random() - 0.5) * randomOffset
      const offsetY = (Math.random() - 0.5) * randomOffset

      const x = centerX + radius * Math.cos(angle) + offsetX
      const y = centerY + radius * Math.sin(angle) + offsetY

      newPositions.push({
        x,
        y,
        size,
        friend: props.friends[avatarIndex],
      })

      avatarIndex++
    }
  }

  positions.value = newPositions
}

onMounted(() => {
  generatePositions()
  window.addEventListener('resize', generatePositions)
})
</script>

<template>
  <div ref="container" class="relative w-full h-150 my-8">
    <div
      v-for="(pos, index) in positions"
      :key="pos.friend.name"
      class="absolute transition-all duration-300 ease-out"
      :style="{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: `${pos.size}px`,
        height: `${pos.size}px`,
        transform: hoveredIndex === index ? 'translate(-50%, -50%) scale(1.15)' : 'translate(-50%, -50%) scale(1)',
        zIndex: hoveredIndex === index ? 50 : 1,
      }"
      @mouseenter="hoveredIndex = index"
      @mouseleave="hoveredIndex = null"
    >
      <a
        :href="pos.friend.url"
        target="_blank"
        rel="noopener noreferrer"
        class="block w-full h-full relative group"
      >
        <span
          v-if="pos.friend.tooltip || pos.friend.name"
          class="absolute bottom-full left-50% -translate-x-50% mb-2 px-3 py-1.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-black text-xs rounded-md whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 ease-out z-10 pointer-events-none"
        >
          {{ pos.friend.tooltip || pos.friend.name }}
        </span>
        <img
          :src="pos.friend.image.src"
          :alt="`${pos.friend.name}'s avatar`"
          class="w-full h-full rd-full object-cover opacity-80 hover:opacity-100 transition-all duration-300 shadow-lg hover:shadow-xl"
          loading="lazy"
        >
        <div
          class="absolute inset-0 rd-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3"
        >
          <a
            :href="pos.friend.github"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="`${pos.friend.name}'s GitHub`"
            class="text-white hover:text-gray-300 transition-colors"
            @click.stop
          >
            <i class="i-simple-icons-github text-xl" />
          </a>
          <a
            :href="pos.friend.url"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="`${pos.friend.name}'s Website`"
            class="text-white hover:text-gray-300 transition-colors"
          >
            <i class="i-ri-global-line text-xl" />
          </a>
        </div>
      </a>
    </div>
  </div>
</template>
