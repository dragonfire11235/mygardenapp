<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import MultiSelect from 'primevue/multiselect'
import DatePicker from 'primevue/datepicker'
import type { DiaryEntry } from '../../data'
import { toIsoDate } from '../../shared/dates'
import { addPhoto } from '../../shared/photos'
import PhotoImg from '../../shared/PhotoImg.vue'
import { usePlantsStore, type PlantDraft } from '../plants/plantsStore'
import PlantFormDialog from '../plants/PlantFormDialog.vue'
import { useBedsStore } from '../beds/bedsStore'
import type { DiaryDraft } from './diaryStore'

const props = defineProps<{ initial?: DiaryEntry | null }>()

const emit = defineEmits<{
  save: [draft: DiaryDraft]
  delete: []
}>()

const visible = defineModel<boolean>('visible', { required: true })

const plantsStore = usePlantsStore()
const bedsStore = useBedsStore()

const date = ref<Date>(new Date())
const title = ref('')
const text = ref('')
const plantIds = ref<string[]>([])
const bedIds = ref<string[]>([])
const photoIds = ref<string[]>([])
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const newPlantVisible = ref(false)

async function onPlantCreated(draft: PlantDraft) {
  const plant = await plantsStore.create(draft)
  plantIds.value = [...plantIds.value, plant.id]
}

watch(visible, (open) => {
  if (!open) return
  const e = props.initial
  date.value = e ? new Date(e.date) : new Date()
  title.value = e?.title ?? ''
  text.value = e?.text ?? ''
  plantIds.value = e ? [...e.plantIds] : []
  bedIds.value = e ? [...e.bedIds] : []
  photoIds.value = e ? [...e.photoIds] : []
})

const plantOptions = computed(() => plantsStore.plants.map((p) => ({ label: p.name, value: p.id })))
const bedOptions = computed(() => bedsStore.beds.map((b) => ({ label: b.name, value: b.id })))

async function onFilesSelected(event: Event) {
  const files = (event.target as HTMLInputElement).files
  if (!files?.length) return
  uploading.value = true
  try {
    for (const file of Array.from(files)) {
      photoIds.value.push(await addPhoto(file))
    }
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

function removePhoto(id: string) {
  photoIds.value = photoIds.value.filter((p) => p !== id)
}

function save() {
  if (!text.value.trim() && !title.value.trim() && !photoIds.value.length) return
  emit('save', {
    date: toIsoDate(date.value),
    title: title.value.trim(),
    text: text.value.trim(),
    plantIds: [...plantIds.value],
    bedIds: [...bedIds.value],
    photoIds: [...photoIds.value],
  })
  visible.value = false
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="initial ? 'Eintrag bearbeiten' : 'Neuer Eintrag'"
    :style="{ width: 'min(560px, 95vw)' }"
  >
    <div class="form-grid">
      <div class="form-row">
        <div class="form-field">
          <label for="diary-date">Datum</label>
          <DatePicker id="diary-date" v-model="date" date-format="dd.mm.yy" />
        </div>
        <div class="form-field">
          <label for="diary-title">Titel</label>
          <InputText id="diary-title" v-model="title" placeholder="z. B. Erste Ernte!" />
        </div>
      </div>

      <div class="form-field">
        <label for="diary-text">Was gibt's Neues im Garten?</label>
        <Textarea id="diary-text" v-model="text" rows="4" auto-resize autofocus />
      </div>

      <div class="form-row">
        <div class="form-field">
          <label for="diary-plants">Pflanzen</label>
          <div class="field-with-add">
            <MultiSelect
              id="diary-plants"
              v-model="plantIds"
              :options="plantOptions"
              option-label="label"
              option-value="value"
              filter
              placeholder="verknüpfen"
              class="grow"
            />
            <Button
              icon="pi pi-plus"
              severity="secondary"
              outlined
              aria-label="Neue Pflanze anlegen"
              @click="newPlantVisible = true"
            />
          </div>
        </div>
        <div class="form-field">
          <label for="diary-beds">Beete</label>
          <MultiSelect
            id="diary-beds"
            v-model="bedIds"
            :options="bedOptions"
            option-label="label"
            option-value="value"
            placeholder="verknüpfen"
          />
        </div>
      </div>

      <div class="form-field">
        <label>Fotos</label>
        <div v-if="photoIds.length" class="photo-grid">
          <div v-for="id in photoIds" :key="id" class="photo-wrap">
            <PhotoImg :photo-id="id" />
            <Button
              icon="pi pi-times"
              rounded
              size="small"
              severity="danger"
              class="photo-remove"
              aria-label="Foto entfernen"
              @click="removePhoto(id)"
            />
          </div>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          multiple
          class="file-hidden"
          @change="onFilesSelected"
        />
        <Button
          :label="uploading ? 'Wird verarbeitet …' : 'Foto hinzufügen'"
          icon="pi pi-camera"
          severity="secondary"
          outlined
          :loading="uploading"
          @click="fileInput?.click()"
        />
      </div>
    </div>

    <template #footer>
      <Button v-if="initial" label="Löschen" severity="danger" text @click="emit('delete'); visible = false" />
      <Button label="Abbrechen" severity="secondary" text @click="visible = false" />
      <Button label="Speichern" @click="save" />
    </template>

    <PlantFormDialog v-model:visible="newPlantVisible" :initial="null" @save="onPlantCreated" />
  </Dialog>
</template>

<style scoped>
.field-with-add {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.field-with-add .grow {
  flex: 1;
  min-width: 0;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.photo-wrap {
  position: relative;
}

.photo-wrap :deep(.photo-img) {
  height: 90px;
}

.photo-remove {
  position: absolute;
  top: 4px;
  right: 4px;
}

.file-hidden {
  display: none;
}
</style>
