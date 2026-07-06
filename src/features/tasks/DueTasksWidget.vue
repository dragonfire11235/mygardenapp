<script setup lang="ts">
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import type { Task } from '../../data'
import { daysFromToday, formatDue } from '../../shared/dates'
import { taskTypeIcons } from '../../shared/texts'
import { useTasksStore } from './tasksStore'

const store = useTasksStore()
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
</script>

<template>
  <div v-if="store.dueTasks.length" class="widget-list">
    <div v-for="task in store.dueTasks.slice(0, 6)" :key="task.id" class="widget-row">
      <Button icon="pi pi-check" rounded outlined size="small" aria-label="Erledigt" @click="complete(task)" />
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
  color: var(--app-accent);
  text-decoration: none;
  font-size: 0.85rem;
  margin-top: 0.25rem;
}
</style>
