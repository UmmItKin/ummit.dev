<script lang="ts" setup>
import { useEventListener, useMouse } from '@vueuse/core'
import { computed, onMounted, onUnmounted, ref } from 'vue'

const nekoEl = ref<HTMLDivElement>()
const { x: mouseX, y: mouseY } = useMouse()
const nekoPos = ref({ x: 0, y: 0 })
const mousePos = ref({ x: 0, y: 0 })
const frameCount = ref(0)
const idleTime = ref(0)
const idleAnimation = ref<string | null>(null)
const idleAnimationFrame = ref(0)
const isInitialized = ref(false)

const NEKO_SPEED = 10
const SPRITE_SIZE = 32

const nekoStyle = computed(() => ({
  left: `${nekoPos.value.x - 16}px`,
  top: `${nekoPos.value.y - 16}px`,
  opacity: isInitialized.value ? '1' : '0',
}))

const spriteSets: Record<string, number[][]> = {
  idle: [[-3, -3]],
  alert: [[-7, -3]],
  scratchSelf: [[-5, 0], [-6, 0], [-7, 0]],
  scratchWallN: [[0, 0], [0, -1]],
  scratchWallS: [[-7, -1], [-6, -2]],
  scratchWallE: [[-2, -2], [-2, -3]],
  scratchWallW: [[-4, 0], [-4, -1]],
  tired: [[-3, -2]],
  sleeping: [[-2, 0], [-2, -1]],
  N: [[-1, -2], [-1, -3]],
  NE: [[0, -2], [0, -3]],
  E: [[-3, 0], [-3, -1]],
  SE: [[-5, -1], [-5, -2]],
  S: [[-6, -3], [-7, -2]],
  SW: [[-5, -3], [-6, -1]],
  W: [[-4, -2], [-4, -3]],
  NW: [[-1, 0], [-1, -1]],
}

let animationFrameId: number | null = null
let lastFrameTimestamp: number | undefined

function setSprite(name: string, frame: number) {
  if (!nekoEl.value)
    return
  const sprite = spriteSets[name][frame % spriteSets[name].length]
  nekoEl.value.style.backgroundPosition = `${sprite[0] * SPRITE_SIZE}px ${sprite[1] * SPRITE_SIZE}px`
}

function resetIdleAnimation() {
  idleAnimation.value = null
  idleAnimationFrame.value = 0
}

function idle() {
  idleTime.value += 1

  if (idleTime.value > 10 && Math.floor(Math.random() * 200) === 0 && !idleAnimation.value) {
    const availableIdleAnimations = ['sleeping', 'scratchSelf']
    if (nekoPos.value.x < SPRITE_SIZE)
      availableIdleAnimations.push('scratchWallW')
    if (nekoPos.value.y < SPRITE_SIZE)
      availableIdleAnimations.push('scratchWallN')
    if (nekoPos.value.x > window.innerWidth - SPRITE_SIZE)
      availableIdleAnimations.push('scratchWallE')
    if (nekoPos.value.y > window.innerHeight - SPRITE_SIZE)
      availableIdleAnimations.push('scratchWallS')
    idleAnimation.value = availableIdleAnimations[Math.floor(Math.random() * availableIdleAnimations.length)]
  }

  switch (idleAnimation.value) {
    case 'sleeping':
      if (idleAnimationFrame.value < 8) {
        setSprite('tired', 0)
        break
      }
      setSprite('sleeping', Math.floor(idleAnimationFrame.value / 4))
      if (idleAnimationFrame.value > 192)
        resetIdleAnimation()
      break
    case 'scratchWallN':
    case 'scratchWallS':
    case 'scratchWallE':
    case 'scratchWallW':
    case 'scratchSelf':
      setSprite(idleAnimation.value, idleAnimationFrame.value)
      if (idleAnimationFrame.value > 9)
        resetIdleAnimation()
      break
    default:
      setSprite('idle', 0)
      return
  }
  idleAnimationFrame.value += 1
}

function frame() {
  frameCount.value += 1
  const diffX = nekoPos.value.x - mousePos.value.x
  const diffY = nekoPos.value.y - mousePos.value.y
  const distance = Math.sqrt(diffX ** 2 + diffY ** 2)

  if (distance < NEKO_SPEED || distance < 48) {
    idle()
    return
  }

  idleAnimation.value = null
  idleAnimationFrame.value = 0

  if (idleTime.value > 1) {
    setSprite('alert', 0)
    idleTime.value = Math.min(idleTime.value, 7)
    idleTime.value -= 1
    return
  }

  let direction = ''
  direction += diffY / distance > 0.5 ? 'N' : ''
  direction += diffY / distance < -0.5 ? 'S' : ''
  direction += diffX / distance > 0.5 ? 'W' : ''
  direction += diffX / distance < -0.5 ? 'E' : ''
  setSprite(direction, frameCount.value)

  nekoPos.value.x -= (diffX / distance) * NEKO_SPEED
  nekoPos.value.y -= (diffY / distance) * NEKO_SPEED

  nekoPos.value.x = Math.min(Math.max(16, nekoPos.value.x), window.innerWidth - 16)
  nekoPos.value.y = Math.min(Math.max(16, nekoPos.value.y), window.innerHeight - 16)
}

function onAnimationFrame(timestamp: number) {
  if (!nekoEl.value)
    return
  if (!lastFrameTimestamp)
    lastFrameTimestamp = timestamp
  if (timestamp - lastFrameTimestamp > 100) {
    lastFrameTimestamp = timestamp
    frame()
  }
  animationFrameId = window.requestAnimationFrame(onAnimationFrame)
}

useEventListener('mousemove', (e: MouseEvent) => {
  mousePos.value.x = e.clientX
  mousePos.value.y = e.clientY
})

onMounted(() => {
  if (nekoEl.value) {
    nekoPos.value.x = mouseX.value || window.innerWidth / 2
    nekoPos.value.y = mouseY.value || window.innerHeight / 2
    mousePos.value.x = mouseX.value
    mousePos.value.y = mouseY.value
    isInitialized.value = true
    animationFrameId = window.requestAnimationFrame(onAnimationFrame)
  }
})

onUnmounted(() => {
  if (animationFrameId !== null) {
    window.cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
})
</script>

<template>
  <div
    ref="nekoEl"
    class="oneko"
    :style="nekoStyle"
    aria-hidden="true"
  />
</template>

<style scoped>
.oneko {
  width: 32px;
  height: 32px;
  position: fixed;
  pointer-events: none;
  image-rendering: pixelated;
  z-index: 999;
  background-image: url('https://raw.githubusercontent.com/adryd325/oneko.js/14bab15a755d0e35cd4ae19c931d96d306f99f42/oneko.gif');
  transition: opacity 0.2s ease-in;
}
</style>
