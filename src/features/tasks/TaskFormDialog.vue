<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import Textarea from 'primevue/textarea'
import type { Task, TaskType } from '../../data'
import { taskTypeLabels } from '../../shared/texts'
import { toIsoDate } from '../../shared/dates'
import PlantSelect from '../plants/PlantSelect.vue'
import { useBedsStore } from '../beds/bedsStore'
import type { TaskDraft } from './tasksStore'

const props = defineProps<{ initial?: Task | null }>()

const emit = defineEmits<{
  save: [draft: TaskDraft]
  delete: []
}>()

const visible = defineModel<boolean>('visible', { required: true })

const bedsStore = useBedsStore()

const title = ref('')
const type = ref<TaskType>('sonstiges')
const dueDate = ref<Date>(new Date())
const intervalDays = ref<number | null>(null)
const plantId = ref<string | null>(null)
const bedId = ref<string | null>(null)
const notes = ref('')

watch(visible, (open) => {
  if (!open) return
  const t = props.initial
  title.value = t?.title ?? ''
  type.value = t?.type ?? 'sonstiges'
  dueDate.value = t ? new Date(t.dueDate) : new Date()
  intervalDays.value = t?.intervalDays ?? null
  plantId.value = t?.plantId ?? null
  bedId.value = t?.bedId ?? null
  notes.value = t?.notes ?? ''
})

const typeOptions = (Object.keys(taskTypeLabels) as TaskType[]).map((value) => ({
  value,
  label: taskTypeLabels[value],
}))

const bedOptions = computed(() => [
  { label: '–', value: null },
  ...bedsStore.beds.map((b) => ({ label: b.name, value: b.id })),
])

function save() {
  if (!title.value.trim()) return
  emit('save', {
    title: title.value.trim(),
    type: type.value,
    dueDate: toIsoDate(dueDate.value),
    intervalDays: intervalDays.value,
    plantId: plantId.value,
    bedId: bedId.value,
    notes: notes.value,
  })
  visible.value = false
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="initial ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'"
    :style="{ width: 'min(520px, 95vw)' }"
  >
    <div class="form-grid">
      <div class="form-field">
        <label for="task-title">Titel *</label>
        <InputText id="task-title" v-model="title" autofocus placeholder="z. B. Rosen schneiden" />
      </div>
      <div class="form-row">
        <div class="form-field">
          <label for="task-type">Art</label>
          <Select id="task-type" v-model="type" :options="typeOptions" option-label="label" option-value="value" />
        </div>
        <div class="form-field">
          <label for="task-due">Fällig am</label>
          <DatePicker id="task-due" v-model="dueDate" date-format="dd.mm.yy" />
        </div>
      </div>
      <div class="form-field">
        <label for="task-interval">Wiederholen alle … Tage (leer = einmalig)</label>
        <InputNumber id="task-interval" v-model="intervalDays" :min="1" :max="365" show-buttons />
      </div>
      <div class="form-row">
        <div class="form-field">
          <label for="task-plant">Pflanze</label>
          <PlantSelect id="task-plant" v-model="plantId" placeholder="–" show-clear />
        </div>
        <div class="form-field">
          <label for="task-bed">Beet</label>
          <Select id="task-bed" v-model="bedId" :options="bedOptions" option-label="label" option-value="value" />
        </div>
      </div>
      <div class="form-field">
        <label for="task-notes">Notizen</label>
        <Textarea id="task-notes" v-model="notes" rows="2" auto-resize />
      </div>
    </div>

    <template #footer>
      <Button v-if="initial" label="Löschen" severity="danger" text @click="emit('delete'); visible = false" />
      <Button label="Abbrechen" severity="secondary" text @click="visible = false" />
      <Button label="Speichern" :disabled="!title.trim()" @click="save" />
    </template>
  </Dialog>
</template>
