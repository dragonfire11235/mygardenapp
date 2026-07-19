<script setup lang="ts">
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import type { Task } from '../../data'
import { daysFromToday, formatDue } from '../../shared/dates'
import { taskTypePhosphor } from '../../shared/texts'
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

const cheerUrl = `${import.meta.env.BASE_URL}lumi/mascot/lumi-cheer.png`

const dialogVisible = ref(false)
const editingTask = ref<Task | null>(null)
const showDone = ref(false)

// Segmented Control: Heute / Diese Woche / Alle (bezieht sich auf offene Aufgaben)
type Segment = 'heute' | 'woche' | 'alle'
const segment = ref<Segment>('heute')
const segments: { id: Segment; label: string }[] = [
  { id: 'heute', label: 'Heute' },
  { id: 'woche', label: 'Diese Woche' },
  { id: 'alle', label: 'Alle' },
]

const visibleTasks = computed(() => {
  if (segment.value === 'heute') return store.openTasks.filter((t) => daysFromToday(t.dueDate) <= 0)
  if (segment.value === 'woche') return store.openTasks.filter((t) => daysFromToday(t.dueDate) <= 7)
  return [...store.openTasks]
})

// Fortschritt: heute erledigte + offene fällige ergeben das Tagespensum
const doneToday = computed(() => {
  const today = new Date().toDateString()
  return store.doneTasks.filter((t) => t.doneAt && new Date(t.doneAt).toDateString() === today).length
})
const dueOpenToday = computed(() => store.openTasks.filter((t) => daysFromToday(t.dueDate) <= 0).length)
const progressTotal = computed(() => doneToday.value + dueOpenToday.value)
const progressPct = computed(() =>
  progressTotal.value ? Math.round((doneToday.value / progressTotal.value) * 100) : 0,
)
const allDoneToday = computed(() => progressTotal.value > 0 && dueOpenToday.value === 0)

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
    message: `„${task.title}“ wirklich löschen?`,
    header: 'Aufgabe löschen',
    icon: 'ph-fill ph-warning',
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
    icon: 'ph-fill ph-warning',
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
      <h1 class="page-title">Aufgaben</h1>
      <div class="header-actions">
        <button
          v-if="store.dueWatering.length"
          type="button"
          class="pill-btn water-btn"
          :class="{ 'rain-highlight': weather.rainToday }"
          :title="weather.rainToday ? 'Es regnet – der Garten ist gewässert' : undefined"
          @click="waterAll"
        >
          <i class="ph-fill ph-drop" />
          {{ weather.rainToday ? '🌧️ ' : '' }}Alles gegossen ({{ store.dueWatering.length }})
        </button>
        <button
          v-if="store.openTasks.length"
          type="button"
          class="pill-btn-ghost"
          title="Aufgaben als .ics für Google/Apple Kalender exportieren"
          @click="exportCalendar"
        >
          <i class="ph-bold ph-calendar-blank" /> Kalender
        </button>
        <button type="button" class="round-icon-btn" aria-label="Neue Aufgabe" @click="openNew">
          <i class="ph-bold ph-plus" />
        </button>
      </div>
    </div>

    <!-- Segmented Control (Glas-Pille) -->
    <div class="segmented">
      <button
        v-for="seg in segments"
        :key="seg.id"
        type="button"
        class="segment"
        :class="{ 'is-active': segment === seg.id }"
        @click="segment = seg.id"
      >
        {{ seg.label }}
      </button>
    </div>

    <!-- Tagesfortschritt -->
    <div v-if="progressTotal" class="progress-row">
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: `${progressPct}%` }" />
      </div>
      {{ doneToday }} von {{ progressTotal }} erledigt
    </div>

    <!-- Erfolgskarte, wenn das Tagespensum geschafft ist -->
    <div v-if="allDoneToday" class="card success-card">
      <img :src="cheerUrl" alt="Lumi jubelt" class="success-mascot" />
      <div class="success-title">Alles erledigt! 🎉</div>
      <div class="muted">Dein Garten dankt dir. Zeit für eine Pause.</div>
    </div>

    <div v-if="visibleTasks.length" class="card task-card">
      <div
        v-for="task in visibleTasks"
        :key="task.id"
        class="task-row"
        :class="{ 'task-overdue': daysFromToday(task.dueDate) < 0 }"
      >
        <button type="button" class="check-ring" aria-label="Erledigt" @click="complete(task)" />
        <div
          class="icon-tile task-tile"
          :style="{
            background: `color-mix(in srgb, ${taskTypePhosphor[task.type].color} 13%, transparent)`,
            color: taskTypePhosphor[task.type].color,
          }"
        >
          <i class="ph-fill" :class="taskTypePhosphor[task.type].icon" />
        </div>
        <button type="button" class="task-body" @click="openEdit(task)">
          <span class="task-title">{{ task.title }}</span>
          <span class="task-meta">{{ context(task) }}</span>
        </button>
        <span class="task-when" :class="{ overdue: daysFromToday(task.dueDate) < 0 }">
          {{ formatDue(task.dueDate) }}
        </span>
      </div>
    </div>

    <div v-else-if="!allDoneToday" class="empty-state">
      <i class="ph-fill ph-list-checks" />
      <p>
        {{ segment === 'alle' ? 'Keine offenen Aufgaben. 🎉' : 'Hier ist gerade nichts fällig. 🎉' }}<br />
        <span class="muted">
          Tipp: Trage bei deinen Pflanzen Gieß-/Düngeintervalle ein und setze sie in ein Beet —
          die Pflegeaufgaben entstehen dann automatisch.
        </span>
      </p>
    </div>

    <div v-if="store.doneTasks.length" class="done-section">
      <div class="done-header">
        <button type="button" class="pill-btn-ghost" @click="showDone = !showDone">
          <i class="ph-bold" :class="showDone ? 'ph-caret-up' : 'ph-caret-down'" />
          {{ showDone ? 'Erledigte ausblenden' : `Erledigte anzeigen (${store.doneTasks.length})` }}
        </button>
        <Button
          v-if="showDone"
          label="Alle erledigten löschen"
          icon="ph-bold ph-trash"
          text
          size="small"
          severity="danger"
          @click="removeAllDone"
        />
      </div>
      <div v-if="showDone" class="card task-card">
        <div v-for="task in store.doneTasks" :key="task.id" class="task-row task-done">
          <span class="check-ring is-done"><i class="ph-bold ph-check" /></span>
          <div
            class="icon-tile task-tile"
            :style="{
              background: `color-mix(in srgb, ${taskTypePhosphor[task.type].color} 13%, transparent)`,
              color: taskTypePhosphor[task.type].color,
            }"
          >
            <i class="ph-fill" :class="taskTypePhosphor[task.type].icon" />
          </div>
          <div class="task-body">
            <span class="task-title done-strike">{{ task.title }}</span>
            <span class="task-meta">erledigt am {{ new Date(task.doneAt!).toLocaleDateString('de-DE') }}</span>
          </div>
          <Button
            icon="ph-bold ph-trash"
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
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.water-btn {
  background: var(--info);
  font-size: 14px;
  padding: 10px 16px;
}

/* Bei Regen den „Alles gegossen"-Button pulsieren lassen */
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

/* Segmented Control als Glas-Pille */
.segmented {
  display: flex;
  background: var(--surface-card);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-pill);
  padding: 4px;
  box-shadow: var(--shadow-glow);
  border: 1px solid var(--border-soft);
}
.segment {
  flex: 1;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  padding: 9px;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--text-2);
  transition: all var(--dur-fast) var(--ease-out);
}
.segment.is-active {
  background: var(--surface-raised);
  color: var(--text-1);
  box-shadow: var(--shadow-card);
}

.progress-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-2);
}

.success-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px;
  text-align: center;
}
.success-mascot {
  width: 110px;
  border-radius: 24px;
  animation: lumiFloat 3s ease-in-out infinite;
}
.success-title {
  font-weight: 800;
  font-size: 16px;
}

/* Aufgabenliste: eine Glaskarte, Zeilen mit Trennlinien */
.task-card {
  padding: 8px 16px;
}

.task-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 2px;
  border-bottom: 1px solid var(--border-soft);
}
.task-row:last-child {
  border-bottom: none;
}

/* Abhak-Kreis (26px) */
.check-ring {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid var(--border-soft);
  background: transparent;
  cursor: pointer;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 14px;
  flex: none;
  padding: 0;
  transition: all var(--dur-fast) var(--ease-spring);
}
.check-ring:hover {
  border-color: var(--accent);
}
.check-ring.is-done {
  border-color: var(--accent);
  background: var(--accent);
  cursor: default;
}

.task-tile {
  width: 36px;
  height: 36px;
  border-radius: 13px;
  font-size: 19px;
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
  font-weight: 700;
  font-size: 15px;
}
.done-strike {
  text-decoration: line-through;
  color: var(--text-3);
}

.task-meta {
  font-size: 12px;
  color: var(--text-3);
}

.task-when {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-3);
}
.task-when.overdue {
  color: var(--danger);
}

.done-section {
  margin-top: 8px;
}

.done-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.task-done {
  opacity: 0.75;
}
</style>
