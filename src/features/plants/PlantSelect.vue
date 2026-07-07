<script setup lang="ts">
// Pflanzen-Auswahl mit eingebautem „➕ Neue Pflanze anlegen…" — legt die Pflanze
// direkt an und wählt sie aus, ohne dass man die Seite wechseln muss.
import { computed, ref } from 'vue'
import Select from 'primevue/select'
import PlantFormDialog from './PlantFormDialog.vue'
import { usePlantsStore, type PlantDraft } from './plantsStore'

const model = defineModel<string | null>({ required: true })
withDefaults(defineProps<{ placeholder?: string; showClear?: boolean }>(), {
  placeholder: 'wählen',
  showClear: false,
})

const store = usePlantsStore()
const dialogVisible = ref(false)

const NEW = '__new__'
const options = computed(() => [
  ...store.plants.map((p) => ({ label: p.name, value: p.id })),
  { label: '➕ Neue Pflanze anlegen…', value: NEW },
])

function onSelect(value: string | null) {
  if (value === NEW) {
    dialogVisible.value = true // Dialog öffnen, Auswahl unverändert lassen
  } else {
    model.value = value
  }
}

async function onCreated(draft: PlantDraft) {
  const plant = await store.create(draft)
  model.value = plant.id
}
</script>

<template>
  <Select
    :model-value="model"
    :options="options"
    option-label="label"
    option-value="value"
    :placeholder="placeholder"
    :show-clear="showClear"
    filter
    @update:model-value="onSelect"
  />
  <PlantFormDialog v-model:visible="dialogVisible" :initial="null" @save="onCreated" />
</template>
