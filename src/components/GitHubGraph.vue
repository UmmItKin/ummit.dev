<script lang="ts" setup>
import type { ContributionDay } from '@/utils/github-contributions'
import { computed, shallowRef } from 'vue'

const { days, total } = defineProps<{
  days: ContributionDay[]
  total: number
}>()

const tooltip = shallowRef({ visible: false, text: '', x: 0, y: 0 })

const weeks = computed(() => {
  if (!days.length)
    return []

  const result: (ContributionDay | null)[][] = []
  let currentWeek: (ContributionDay | null)[] = []

  const firstDate = new Date(days[0].date)
  const firstDayOfWeek = firstDate.getUTCDay()
  for (let i = 0; i < firstDayOfWeek; i++)
    currentWeek.push(null)

  for (const day of days) {
    const d = new Date(day.date)
    const dayOfWeek = d.getUTCDay()

    if (dayOfWeek === 0 && currentWeek.length > 0) {
      while (currentWeek.length < 7)
        currentWeek.push(null)
      result.push(currentWeek)
      currentWeek = []
    }

    currentWeek.push(day)
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7)
      currentWeek.push(null)
    result.push(currentWeek)
  }

  return result
})

const months = computed(() => {
  if (!weeks.value.length)
    return []

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const labels: { name: string, col: number }[] = []
  let lastMonth = -1

  for (let i = 0; i < weeks.value.length; i++) {
    const day = weeks.value[i].find(d => d !== null)
    if (day) {
      const month = new Date(day.date).getUTCMonth()
      if (month !== lastMonth) {
        labels.push({ name: monthNames[month], col: i })
        lastMonth = month
      }
    }
  }

  return labels
})

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function showTooltip(event: MouseEvent, day: ContributionDay) {
  const rect = (event.target as HTMLElement).getBoundingClientRect()
  tooltip.value = {
    visible: true,
    text: `${day.count} contribution${day.count !== 1 ? 's' : ''} on ${formatDate(day.date)}`,
    x: rect.left + rect.width / 2,
    y: rect.top,
  }
}

function hideTooltip() {
  tooltip.value = { ...tooltip.value, visible: false }
}
</script>

<template>
  <div class="github-graph">
    <p class="text-sm opacity-70 mb-3">
      {{ total.toLocaleString() }} contributions in the last year
    </p>

    <div class="graph-scroll">
      <div class="graph-grid">
        <div class="months-row">
          <div class="day-label-spacer" />
          <div class="months-track">
            <span
              v-for="m in months"
              :key="m.col"
              class="month-label"
              :style="{ gridColumn: m.col + 1 }"
            >
              {{ m.name }}
            </span>
          </div>
        </div>

        <div class="calendar">
          <div class="day-labels">
            <span class="day-label" />
            <span class="day-label">Mon</span>
            <span class="day-label" />
            <span class="day-label">Wed</span>
            <span class="day-label" />
            <span class="day-label">Fri</span>
            <span class="day-label" />
          </div>

          <div class="weeks-grid">
            <div v-for="(week, wi) in weeks" :key="wi" class="week-col">
              <div
                v-for="(day, di) in week"
                :key="di"
                class="day-cell"
                :class="day ? `level-${day.level}` : 'empty'"
                @mouseenter="day && showTooltip($event, day)"
                @mouseleave="hideTooltip"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-end gap-1 mt-2 text-xs opacity-60">
      <span>Less</span>
      <div class="day-cell legend level-0" />
      <div class="day-cell legend level-1" />
      <div class="day-cell legend level-2" />
      <div class="day-cell legend level-3" />
      <div class="day-cell legend level-4" />
      <span>More</span>
    </div>

    <Teleport to="body">
      <div
        class="graph-tooltip"
        :class="tooltip.visible ? 'graph-tooltip-visible' : ''"
        :style="{
          left: `${tooltip.x}px`,
          top: `${tooltip.y - 8}px`,
        }"
      >
        {{ tooltip.text }}
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.github-graph {
  width: 100%;
}

.graph-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 4px;
}

.graph-grid {
  min-width: 720px;
}

.months-row {
  display: flex;
  align-items: flex-end;
  margin-bottom: 4px;
}

.day-label-spacer {
  width: 30px;
  flex-shrink: 0;
}

.months-track {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(53, 1fr);
}

.month-label {
  font-size: 11px;
  opacity: 0.6;
  white-space: nowrap;
}

.calendar {
  display: flex;
  gap: 3px;
}

.day-labels {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 27px;
  flex-shrink: 0;
}

.day-label {
  height: 11px;
  font-size: 10px;
  line-height: 11px;
  opacity: 0.5;
}

.weeks-grid {
  display: flex;
  gap: 3px;
  flex: 1;
}

.week-col {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.day-cell {
  width: 11px;
  height: 11px;
  border-radius: 2px;
  transition: outline 0.1s ease;
  outline: 1px solid transparent;
}

.day-cell:not(.empty):not(.legend):hover {
  outline: 1px solid rgba(128, 128, 128, 0.6);
  outline-offset: 1px;
}

.day-cell.legend {
  flex-shrink: 0;
}

.day-cell.empty {
  background: transparent;
}

.day-cell.level-0 {
  background: rgba(110, 140, 160, 0.12);
}
.day-cell.level-1 {
  background: rgba(79, 166, 204, 0.35);
}
.day-cell.level-2 {
  background: rgba(79, 166, 204, 0.55);
}
.day-cell.level-3 {
  background: rgba(79, 166, 204, 0.75);
}
.day-cell.level-4 {
  background: rgba(79, 186, 214, 0.95);
}
</style>

<style>
.graph-tooltip {
  position: fixed;
  transform: translateX(-50%) translateY(-100%) translateY(4px);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.4;
  white-space: nowrap;
  pointer-events: none;
  z-index: 1000;
  background: #e8ecf0;
  color: #1a1a1a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 150ms ease-out,
    transform 150ms ease-out,
    visibility 150ms ease-out;
}

.graph-tooltip-visible {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(-100%);
}
</style>
