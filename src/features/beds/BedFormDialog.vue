<script setup lang="ts">
import { ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import PhotoPicker from '../../shared/PhotoPicker.vue'
import type { Bed } from '../../data'

export interface BedDraft {
  name: string
  location: string
  sizeText: string
  widthM: number | null
  heightM: number | null
  notes: string
  photoId: string | null
}

function emptyDraft(): BedDraft {
  return { name: '', location: '', sizeText: '', widthM: null, heightM: null, notes: '', photoId: null }
}

const props = defineProps<{ initial?: Bed | null }>()

const emit = defineEmits<{
  save: [draft: BedDraft]
  delete: []
}>()

const visible = defineModel<boolean>('visible', { required: true })

const draft = ref<BedDraft>(emptyDraft())

watch(visible, (open) => {
  if (open) {
    draft.value = props.initial
      ? {
          name: props.initial.name,
          location: props.initial.location,
          sizeText: props.initial.sizeText,
          widthM: props.initial.widthM,
          heightM: props.initial.heightM,
          notes: props.initial.notes,
          photoId: props.initial.photoId,
        }
      : emptyDraft()
  }
})

function save() {
  if (!draft.value.name.trim()) return
  emit('save', { ...draft.value, name: draft.value.name.trim() })
  visible.value = false
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="initial ? 'Beet bearbeiten' : 'Neues Beet'"
    :style="{ width: 'min(480px, 95vw)' }"
  >
    <div class="form-grid">
      <div class="form-field">
        <label for="bed-name">Name *</label>
        <InputText id="bed-name" v-model="draft.name" autofocus placeholder="z. B. Hochbeet Süd" />
      </div>
      <div class="form-field">
        <label for="bed-location">Lage</label>
        <InputText id="bed-location" v-model="draft.location" placeholder="z. B. hinterm Haus" />
      </div>
      <div class="form-row">
        <div class="form-field">
          <label for="bed-width">Breite (m)</label>
          <InputNumber
            id="bed-width"
            v-model="draft.widthM"
            :min="0.2"
            :max="50"
            :step="0.1"
            :min-fraction-digits="1"
            :max-fraction-digits="2"
            suffix=" m"
            placeholder="z. B. 2"
          />
        </div>
        <div class="form-field">
          <label for="bed-height">Länge (m)</label>
          <InputNumber
            id="bed-height"
            v-model="draft.heightM"
            :min="0.2"
            :max="50"
            :step="0.1"
            :min-fraction-digits="1"
            :max-fraction-digits="2"
            suffix=" m"
            placeholder="z. B. 1"
          />
        </div>
      </div>
      <div class="form-field">
        <label for="bed-notes">Notizen</label>
        <Textarea id="bed-notes" v-model="draft.notes" rows="3" auto-resize />
      </div>
      <div class="form-field">
        <label>Titelbild</label>
        <PhotoPicker v-model="draft.photoId" label="Titelbild wählen" />
      </div>
    </div>

    <template #footer>
      <Button v-if="initial" label="Löschen" severity="danger" text @click="emit('delete'); visible = false" />
      <Button label="Abbrechen" severity="secondary" text @click="visible = false" />
      <Button label="Speichern" :disabled="!draft.name.trim()" @click="save" />
    </template>
  </Dialog>
</template>
