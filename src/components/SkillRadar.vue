<script lang="ts" setup>
import type { SkillItem } from '@/types'
import {
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from 'chart.js'
import { computed } from 'vue'
import { Radar } from 'vue-chartjs'

const props = defineProps<{
  data?: SkillItem[]
}>()

ChartJS.register(Filler, Legend, LineElement, PointElement, RadialLinearScale, Tooltip)

const defaultSkills: SkillItem[] = [
  { label: 'GNU/Linux', value: 90 },
  { label: 'Web Security', value: 70 },
  { label: 'Digital Forensics', value: 60 },
  { label: 'Red Teaming', value: 70 },
]

const chartData = computed(() => {
  const skills = props.data ?? defaultSkills
  return {
    labels: skills.map(s => s.label),
    datasets: [
      {
        label: 'Skills',
        data: skills.map(s => s.value),
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        borderColor: 'rgba(139, 92, 246, 0.8)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(139, 92, 246, 1)',
        pointBorderColor: '#1a1a1a',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  }
})

const options = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: 'rgba(30, 30, 40, 0.95)',
      titleColor: '#fff',
      bodyColor: '#fff',
      borderColor: 'rgba(139, 92, 246, 0.5)',
      borderWidth: 1,
      cornerRadius: 8,
      padding: 10,
    },
  },
  scales: {
    r: {
      beginAtZero: true,
      max: 100,
      ticks: {
        stepSize: 20,
        color: 'rgba(150, 150, 150, 0.4)',
        backdropColor: 'transparent',
        font: {
          size: 10,
        },
      },
      grid: {
        color: 'rgba(139, 92, 246, 0.12)',
      },
      angleLines: {
        color: 'rgba(139, 92, 246, 0.12)',
      },
      pointLabels: {
        color: 'rgba(255, 255, 255, 0.7)',
        font: {
          size: 13,
          weight: '500' as const,
        },
      },
    },
  },
}
</script>

<template>
  <div class="radar-wrapper">
    <Radar :data="chartData" :options="options" />
  </div>
</template>

<style scoped>
.radar-wrapper {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  position: relative;
}
</style>
