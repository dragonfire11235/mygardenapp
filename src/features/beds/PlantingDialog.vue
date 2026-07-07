<script setup lang="ts">
import { ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import DatePicker from 'primevue/datepicker'
import PlantSelect from '../plants/PlantSelect.vue'
import { toIsoDate } from '../../shared/dates'

const emit = defineEmits<{
  save: [data: { plantId: string; quantity: number; plantedAt: string }]
}>()

const visible = defineModel<boolean>('visible', { required: true })

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
    <div class="form-grid">
      <div class="form-field">
        <label for="planting-plant">Pflanze *</label>
        <PlantSelect id="planting-plant" v-model="plantId" placeholder="wählen oder neu anlegen" />
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
