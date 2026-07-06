<script setup lang="ts">
import { ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import type { Bed } from '../../data'

export interface BedDraft {
  name: string
  location: string
  sizeText: string
  notes: string
}

const props = defineProps<{ initial?: Bed | null }>()

const emit = defineEmits<{
  save: [draft: BedDraft]
  delete: []
}>()

const visible = defineModel<boolean>('visible', { required: true })

const draft = ref<BedDraft>({ name: '', location: '', sizeText: '', notes: '' })

watch(visible, (open) => {
  if (open) {
    draft.value = props.initial
      ? { name: props.initial.name, location: props.initial.location, sizeText: props.initial.sizeText, notes: props.initial.notes }
      : { name: '', location: '', sizeText: '', notes: '' }
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
      <div class="form-row">
        <div class="form-field">
          <label for="bed-location">Lage</label>
          <InputText id="bed-location" v-model="draft.location" placeholder="z. B. hinterm Haus" />
        </div>
        <div class="form-field">
          <label for="bed-size">Größe</label>
          <InputText id="bed-size" v-model="draft.sizeText" placeholder="z. B. 2 × 1 m" />
        </div>
      </div>
      <div class="form-field">
        <label for="bed-notes">Notizen</label>
        <Textarea id="bed-notes" v-model="draft.notes" rows="3" auto-resize />
      </div>
    </div>

    <template #footer>
      <Button v-if="initial" label="Löschen" severity="danger" text @click="emit('delete'); visible = false" />
      <Button label="Abbrechen" severity="secondary" text @click="visible = false" />
      <Button label="Speichern" :disabled="!draft.name.trim()" @click="save" />
    </template>
  </Dialog>
</template>
