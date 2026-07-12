<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import type { Task } from '../../data'
import { daysFromToday, formatDue } from '../../shared/dates'
import { taskTypeIcons } from '../../shared/texts'
import { usePlantsStore } from '../plants/plantsStore'
import { useBedsStore } from '../beds/bedsStore'
import { useWeatherStore } from '../weather/weatherStore'
import { useTasksStore, type TaskDraft } from './tasksStore'
import { downloadTasksIcs } from './taskCalendar'
import TaskFormDialog from './TaskFormDialog.vue'

const store = useTasksStore()
const plantsStore = usePlantsStore()
const bedsStore = useBedsStore()
const weather = useWeatherStore()
const toast = useToast()
const confirm = useConfirm()

const dialogVisible = ref(false)
const editingTask = ref<Task | null>(null)
const showDone = ref(false)

function openNew() {
  editingTask.value = null
  dialogVisible.value = true
}

function openEdit(task: Task) {
  editingTask.value = task
  dialogVisible.value = true
}

async function save(draft: TaskDraft) {
  if (editingTask.value) {
    await store.update({ ...editingTask.value, ...draft })
  } else {
    await store.create(draft)
  }
}

function removeCurrent() {
  const task = editingTask.value
  if (!task) return
  confirm.require({
    message: `„${task.title}" wirklich löschen?`,
    header: 'Aufgabe löschen',
    icon: 'pi pi-exclamation-triangle',
    acceptProps: { label: 'Löschen', severity: 'danger' },
    rejectProps: { label: 'Abbrechen', severity: 'secondary', text: true },
    accept: () => store.remove(task.id),
  })
}

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

function context(task: Task): string {
  const parts: string[] = []
  const plant = task.plantId ? plantsStore.byId.get(task.plantId) : null
  const bed = task.bedId ? bedsStore.bedById.get(task.bedId) : null
  if (plant) parts.push(plant.name)
  if (bed) parts.push(bed.name)
  if (task.intervalDays) parts.push(`alle ${task.intervalDays} Tage`)
  return parts.join(' · ')
}

function removeAllDone() {
  confirm.require({
    message: `Alle ${store.doneTasks.length} erledigten Aufgaben löschen?`,
    header: 'Erledigte löschen',
    icon: 'pi pi-exclamation-triangle',
    acceptProps: { label: 'Löschen', severity: 'danger' },
    rejectProps: { label: 'Abbrechen', severity: 'secondary', text: true },
    accept: async () => {
      const count = await store.removeDone()
      toast.add({ severity: 'success', summary: `${count} erledigte Aufgaben gelöscht`, life: 2500 })
    },
  })
}

function exportCalendar() {
  downloadTasksIcs(store.openTasks, context)
  toast.add({
    severity: 'success',
    summary: 'Kalender exportiert',
    detail: 'Die .ics-Datei kann in Google/Apple Kalender importiert werden.',
    life: 3500,
  })
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>Aufgaben</h1>
        <span class="muted">{{ store.openTasks.length }} offen</span>
      </div>
      <div class="header-actions">
        <Button
          v-if="store.dueWatering.length"
          :label="`${weather.rainToday ? '🌧️ ' : ''}Alles gegossen (${store.dueWatering.length})`"
          icon="pi pi-check"
          severity="info"
          :class="{ 'rain-highlight': weather.rainToday }"
          :title="weather.rainToday ? 'Es regnet – der Garten ist gewässert' : undefined"
          @click="waterAll"
        />
        <Button
          v-if="store.openTasks.length"
          label="Kalender"
          icon="pi pi-calendar"
          severity="secondary"
          outlined
          title="Aufgaben als .ics für Google/Apple Kalender exportieren"
          @click="exportCalendar"
        />
        <Button label="Neue Aufgabe" icon="pi pi-plus" @click="openNew" />
      </div>
    </div>

    <div v-if="store.openTasks.length" class="task-list">
      <div
        v-for="task in store.openTasks"
        :key="task.id"
        class="card task"
        :class="{ 'task-due': daysFromToday(task.dueDate) <= 0 }"
      >
        <Button
          icon="pi pi-check"
          rounded
          outlined
          aria-label="Erledigt"
          class="task-check"
          @click="complete(task)"
        />
        <button class="task-body" @click="openEdit(task)">
          <span class="task-title">{{ taskTypeIcons[task.type] }} {{ task.title }}</span>
          <span class="muted">{{ context(task) }}</span>
        </button>
        <span class="task-due-label" :class="{ overdue: daysFromToday(task.dueDate) < 0 }">
          {{ formatDue(task.dueDate) }}
        </span>
      </div>
    </div>

    <div v-else class="empty-state">
      <i class="pi pi-check-square" />
      <p>
        Keine offenen Aufgaben. 🎉<br />
        <span class="muted">
          Tipp: Trage bei deinen Pflanzen Gieß-/Düngeintervalle ein und setze sie in ein Beet —
          die Pflegeaufgaben entstehen dann automatisch.
        </span>
      </p>
    </div>

    <div v-if="store.doneTasks.length" class="done-section">
      <div class="done-header">
        <Button
          :label="showDone ? 'Erledigte ausblenden' : `Erledigte anzeigen (${store.doneTasks.length})`"
          text
          severity="secondary"
          :icon="showDone ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
          @click="showDone = !showDone"
        />
        <Button
          v-if="showDone"
          label="Alle erledigten löschen"
          icon="pi pi-trash"
          text
          size="small"
          severity="danger"
          @click="removeAllDone"
        />
      </div>
      <div v-if="showDone" class="task-list">
        <div v-for="task in store.doneTasks" :key="task.id" class="card task task-done">
          <i class="pi pi-check-circle task-done-icon" />
          <div class="task-body">
            <span class="task-title">{{ taskTypeIcons[task.type] }} {{ task.title }}</span>
            <span class="muted">erledigt am {{ new Date(task.doneAt!).toLocaleDateString('de-DE') }}</span>
          </div>
          <Button
            icon="pi pi-trash"
            text
            rounded
            size="small"
            severity="secondary"
            aria-label="Löschen"
            @click="store.remove(task.id)"
          />
        </div>
      </div>
    </div>

    <TaskFormDialog v-model:visible="dialogVisible" :initial="editingTask" @save="save" @delete="removeCurrent" />
  </div>
</template>

<style scoped>
.header-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* Bei Regen den „Alles gegossen"-Button pulsieren lassen */
.rain-highlight {
  animation: rain-pulse 1.6s ease-in-out infinite;
}

@keyframes rain-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.55);
  }
  50% {
    box-shadow: 0 0 0 7px rgba(59, 130, 246, 0);
  }
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.task {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.9rem;
}

.task-due {
  border-left: 4px solid var(--app-accent);
}

.task-due:has(.overdue) {
  border-left-color: var(--app-danger);
}

.task-check {
  flex-shrink: 0;
}

.task-body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1;
  min-width: 0;
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.task-title {
  font-weight: 600;
}

.task-due-label {
  flex-shrink: 0;
  font-size: 0.85rem;
  color: var(--app-text-muted);
}

.done-section {
  margin-top: 1.25rem;
}

.done-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.task-done {
  opacity: 0.7;
}

.task-done-icon {
  color: var(--app-accent);
  font-size: 1.2rem;
}
</style>
