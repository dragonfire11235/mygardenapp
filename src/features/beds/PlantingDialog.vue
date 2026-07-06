<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import Message from 'primevue/message'
import { usePlantsStore } from '../plants/plantsStore'
import { toIsoDate } from '../../shared/dates'

const emit = defineEmits<{
  save: [data: { plantId: string; quantity: number; plantedAt: string }]
}>()

const visible = defineModel<boolean>('visible', { required: true })

const plantsStore = usePlantsStore()

const plantId = ref<string | null>(null)
const quantity = ref(1)
const plantedAt = ref<Date>(new Date())

watch(visible, (open) => {
  if (open) {
    plantId.value = null
    quantity.value = 1
    plantedAt.value = new Date()
  }
})

const plantOptions = computed(() =>
  plantsStore.plants.map((p) => ({ label: p.name, value: p.id })),
)

function save() {
  if (!plantId.value) return
  emit('save', {
    plantId: plantId.value,
    quantity: quantity.value || 1,
    plantedAt: toIsoDate(plantedAt.value),
  })
  visible.value = false
}
</script>

<template>
  <Dialog v-model:visible="visible" modal header="Pflanze einsetzen" :style="{ width: 'min(440px, 95vw)' }">
    <Message v-if="!plantOptions.length" severity="info" :closable="false">
      Die Bibliothek ist noch leer — lege zuerst unter „Pflanzen" eine Pflanze an.
    </Message>

    <div v-else class="form-grid">
      <div class="form-field">
        <label for="planting-plant">Pflanze *</label>
        <Select
          id="planting-plant"
          v-model="plantId"
          :options="plantOptions"
          option-label="label"
          option-value="value"
          filter
          placeholder="wählen"
        />
      </div>
      <div class="form-row">
        <div class="form-field">
          <label for="planting-qty">Anzahl</label>
          <InputNumber id="planting-qty" v-model="quantity" :min="1" :max="999" show-buttons />
        </div>
        <div class="form-field">
          <label for="planting-date">Gepflanzt am</label>
          <DatePicker id="planting-date" v-model="plantedAt" date-format="dd.mm.yy" />
        </div>
      </div>
    </div>

    <template #footer>
      <Button label="Abbrechen" severity="secondary" text @click="visible = false" />
      <Button label="Einsetzen" :disabled="!plantId" @click="save" />
    </template>
  </Dialog>
</template>
