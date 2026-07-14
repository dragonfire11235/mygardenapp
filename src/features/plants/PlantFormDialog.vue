<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
import Textarea from 'primevue/textarea'
import DatePicker from 'primevue/datepicker'
import PhotoPicker from '../../shared/PhotoPicker.vue'
import type { PlantCategory, Sunlight } from '../../data'
import { categoryLabels, categorySpreadM, monthOptions, sunlightLabels } from '../../shared/texts'
import { toIsoDate } from '../../shared/dates'
import { useBedsStore } from '../beds/bedsStore'
import { emptyPlantDraft, type PlantDraft } from './plantsStore'

const props = defineProps<{
  /** Vorbelegung (bei Bearbeiten oder Trefle-Import) */
  initial?: PlantDraft | null
  editing?: boolean
  /** Nur beim Neu-Anlegen sinnvoll: „In Beete einsetzen"-Auswahl anzeigen */
  showBedAssign?: boolean
}>()

const emit = defineEmits<{
  /** bedIds nur gefüllt, wenn showBedAssign aktiv ist */
  save: [draft: PlantDraft, bedIds: string[]]
  delete: []
}>()

const visible = defineModel<boolean>('visible', { required: true })

const bedsStore = useBedsStore()

const draft = ref<PlantDraft>(emptyPlantDraft())
const assignBedIds = ref<string[]>([])

watch(visible, (open) => {
  if (open) {
    // emptyPlantDraft als Basis: sichert Defaults für Felder, die ältere
    // Datensätze noch nicht haben (z. B. bloomMonths).
    draft.value = props.initial ? { ...emptyPlantDraft(), ...props.initial } : emptyPlantDraft()
    assignBedIds.value = []
  }
})

const bedOptions = computed(() => bedsStore.beds.map((b) => ({ label: b.name, value: b.id })))

const categoryOptions = (Object.keys(categoryLabels) as PlantCategory[]).map((value) => ({
  value,
  label: categoryLabels[value],
}))

const sunlightOptions = [
  { value: null, label: '–' },
  ...(Object.keys(sunlightLabels) as Sunlight[]).map((value) => ({ value, label: sunlightLabels[value] })),
]

// DatePicker arbeitet mit Date, gespeichert wird der ISO-String (yyyy-mm-dd)
const wateringStart = computed<Date | null>({
  get: () => (draft.value.wateringStartDate ? new Date(draft.value.wateringStartDate) : null),
  set: (d) => {
    draft.value.wateringStartDate = d ? toIsoDate(d) : null
  },
})

function save() {
  if (!draft.value.name.trim()) return
  emit('save', { ...draft.value, name: draft.value.name.trim() }, [...assignBedIds.value])
  visible.value = false
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="editing ? 'Pflanze bearbeiten' : 'Neue Pflanze'"
    :style="{ width: 'min(560px, 95vw)' }"
  >
    <div class="form-grid">
      <div class="form-row">
        <div class="form-field">
          <label for="plant-name">Name *</label>
          <InputText id="plant-name" v-model="draft.name" autofocus placeholder="z. B. Tomate" />
        </div>
        <div class="form-field">
          <label for="plant-botanical">Botanischer Name</label>
          <InputText id="plant-botanical" v-model="draft.botanicalName" placeholder="z. B. Solanum lycopersicum" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-field">
          <label for="plant-category">Kategorie</label>
          <Select
            id="plant-category"
            v-model="draft.category"
            :options="categoryOptions"
            option-label="label"
            option-value="value"
          />
        </div>
        <div class="form-field">
          <label for="plant-sunlight">Standort</label>
          <Select
            id="plant-sunlight"
            v-model="draft.sunlight"
            :options="sunlightOptions"
            option-label="label"
            option-value="value"
          />
        </div>
      </div>

      <div class="form-row">
        <div class="form-field">
          <label for="plant-watering">Gießen alle … Tage</label>
          <InputNumber id="plant-watering" v-model="draft.wateringIntervalDays" :min="1" :max="365" show-buttons />
        </div>
        <div class="form-field">
          <label for="plant-fertilizing">Düngen alle … Tage</label>
          <InputNumber id="plant-fertilizing" v-model="draft.fertilizingIntervalDays" :min="1" :max="365" show-buttons />
        </div>
      </div>

      <div class="form-row">
        <div class="form-field">
          <label for="plant-watering-start">Gießen ab (optional)</label>
          <DatePicker
            id="plant-watering-start"
            v-model="wateringStart"
            date-format="dd.mm.yy"
            show-button-bar
            placeholder="ab sofort"
          />
        </div>
        <div class="form-field">
          <label for="plant-spread">Wuchsbreite (m)</label>
          <InputNumber
            id="plant-spread"
            v-model="draft.spreadM"
            :min="0.1"
            :max="15"
            :step="0.1"
            :min-fraction-digits="1"
            :max-fraction-digits="2"
            suffix=" m"
            :placeholder="`Standard: ${categorySpreadM[draft.category].toLocaleString('de-DE')} m`"
          />
        </div>
      </div>

      <div class="form-row">
        <div class="form-field">
          <label for="plant-sowing">Aussaat-Monate</label>
          <MultiSelect
            id="plant-sowing"
            v-model="draft.sowingMonths"
            :options="monthOptions"
            option-label="label"
            option-value="value"
            placeholder="wählen"
          />
        </div>
        <div class="form-field">
          <label for="plant-harvest">Ernte-Monate</label>
          <MultiSelect
            id="plant-harvest"
            v-model="draft.harvestMonths"
            :options="monthOptions"
            option-label="label"
            option-value="value"
            placeholder="wählen"
          />
        </div>
      </div>

      <div class="form-row">
        <div class="form-field">
          <label for="plant-bloom">Blüte-Monate</label>
          <MultiSelect
            id="plant-bloom"
            v-model="draft.bloomMonths"
            :options="monthOptions"
            option-label="label"
            option-value="value"
            placeholder="wählen"
          />
        </div>
        <div class="form-field">
          <label for="plant-pruning">Schnitt-Monate</label>
          <MultiSelect
            id="plant-pruning"
            v-model="draft.pruningMonths"
            :options="monthOptions"
            option-label="label"
            option-value="value"
            placeholder="wählen"
          />
        </div>
      </div>

      <div v-if="showBedAssign && !editing && bedOptions.length" class="form-field">
        <label for="plant-beds">In Beete einsetzen (optional)</label>
        <MultiSelect
          id="plant-beds"
          v-model="assignBedIds"
          :options="bedOptions"
          option-label="label"
          option-value="value"
          placeholder="direkt einpflanzen"
        />
      </div>

      <div class="form-field">
        <label>Eigenes Foto</label>
        <PhotoPicker v-model="draft.photoId" label="Foto wählen" />
      </div>

      <div class="form-field">
        <label for="plant-image">Bild-URL (alternativ)</label>
        <InputText id="plant-image" v-model="draft.imageUrl" placeholder="https://…" />
      </div>

      <div class="form-field">
        <label for="plant-notes">Notizen</label>
        <Textarea id="plant-notes" v-model="draft.notes" rows="3" auto-resize />
      </div>
    </div>

    <template #footer>
      <Button
        v-if="editing"
        label="Löschen"
        severity="danger"
        text
        @click="emit('delete'); visible = false"
      />
      <Button label="Abbrechen" severity="secondary" text @click="visible = false" />
      <Button label="Speichern" :disabled="!draft.name.trim()" @click="save" />
    </template>
  </Dialog>
</template>
