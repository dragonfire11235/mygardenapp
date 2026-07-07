<script setup lang="ts">
// Wiederverwendbarer Foto-Wähler: aufnehmen/hochladen, Vorschau, entfernen.
// v-model ist die Foto-ID (oder null). Speichert über das geteilte Foto-Modul.
import { ref } from 'vue'
import Button from 'primevue/button'
import PhotoImg from './PhotoImg.vue'
import { addPhoto } from './photos'

const model = defineModel<string | null>({ required: true })
withDefaults(defineProps<{ label?: string }>(), { label: 'Foto hinzufügen' })

const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

async function onFileSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = true
  try {
    model.value = await addPhoto(file)
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}
</script>

<template>
  <div class="photo-picker">
    <div v-if="model" class="preview">
      <PhotoImg :photo-id="model" />
      <Button
        icon="pi pi-times"
        rounded
        size="small"
        severity="danger"
        class="preview-remove"
        aria-label="Foto entfernen"
        @click="model = null"
      />
    </div>
    <input ref="fileInput" type="file" accept="image/*" class="file-hidden" @change="onFileSelected" />
    <Button
      :label="uploading ? 'Wird verarbeitet …' : model ? 'Foto ersetzen' : label"
      icon="pi pi-camera"
      severity="secondary"
      outlined
      :loading="uploading"
      @click="fileInput?.click()"
    />
  </div>
</template>

<style scoped>
.photo-picker {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;
}

.preview {
  position: relative;
  width: 100%;
  max-width: 220px;
}

.preview-remove {
  position: absolute;
  top: 6px;
  right: 6px;
}

.file-hidden {
  display: none;
}
</style>
