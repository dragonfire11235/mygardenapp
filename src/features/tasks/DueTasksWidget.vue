<script setup lang="ts">
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import type { Task } from '../../data'
import { daysFromToday, formatDue } from '../../shared/dates'
import { taskTypeIcons } from '../../shared/texts'
import { useWeatherStore } from '../weather/weatherStore'
import { useTasksStore } from './tasksStore'

const store = useTasksStore()
const weather = useWeatherStore()
const toast = useToast()

async function complete(task: Task) {
  const next = await store.complete(task)
  toast.add({
    severity: 'success',
    summary: 'Erledigt',
    detail: next ? `Nächste Fälligkeit: ${formatDue(next.dueDate)}` : task.title,
    life: 3000,
  })
}

async function waterAll() {
  const count = await store.completeAllWatering()
  toast.add({
    severity: 'success',
    summary: 'Alles gegossen 💧',
    detail: count === 1 ? '1 Gießaufgabe erledigt.' : `${count} Gießaufgaben erledigt.`,
    life: 3000,
  })
}
</script>

<template>
  <div v-if="store.dueTasks.length" class="widget-list">
    <Button
      v-if="store.dueWatering.length"
      :label="`${weather.rainToday ? '🌧️ ' : ''}Alles gegossen (${store.dueWatering.length})`"
      icon="ph-bold ph-check"
      size="small"
      severity="info"
      class="water-all"
      :class="{ 'rain-highlight': weather.rainToday }"
      @click="waterAll"
    />
    <div v-for="task in store.dueTasks.slice(0, 6)" :key="task.id" class="widget-row">
      <Button icon="ph-bold ph-check" rounded outlined size="small" aria-label="Erledigt" @click="complete(task)" />
      <span class="widget-row-text">{{ taskTypeIcons[task.type] }} {{ task.title }}</span>
      <span class="muted" :class="{ overdue: daysFromToday(task.dueDate) < 0 }">{{ formatDue(task.dueDate) }}</span>
    </div>
    <RouterLink to="/aufgaben" class="widget-link">Alle Aufgaben →</RouterLink>
  </div>
  <p v-else class="muted">Nichts fällig. 🎉</p>
</template>

<style scoped>
.widget-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.water-all {
  align-self: flex-start;
  margin-bottom: 0.25rem;
}

/* Bei Regen pulsieren, weil der Regen das Gießen übernimmt */
.rain-highlight {
  animation: rain-pulse 1.6s ease-in-out infinite;
}

@keyframes rain-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(111, 163, 199, 0.55);
  }
  50% {
    box-shadow: 0 0 0 7px rgba(111, 163, 199, 0);
  }
}

.widget-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.widget-row-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.widget-link {
  color: var(--accent);
  text-decoration: none;
  font-size: 0.85rem;
  margin-top: 0.25rem;
}
</style>
