<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import AutoComplete from 'primevue/autocomplete'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import type { Sighting, SightingGroup, SightingSource } from '../../data'
import { toIsoDate } from '../../shared/dates'
import { sightingGroupOptions } from '../../shared/texts'
import PhotoPicker from '../../shared/PhotoPicker.vue'
import { getPhotoFile } from '../../shared/photos'
import PlantSelect from '../plants/PlantSelect.vue'
import { useBedsStore } from '../beds/bedsStore'
import { getSpeciesIdentifier } from './identify/registry'
import { searchSpecies, speciesForGroup } from './speciesCatalog'
import type { SightingDraft } from './sightingsStore'

const props = defineProps<{
  initial?: Sighting | null
  /** Vorverknüpfung bei neuen Sichtungen (z. B. von der Pflanzen-/Beet-Detailseite) */
  presetPlantId?: string | null
  presetBedId?: string | null
}>()

const emit = defineEmits<{
  save: [draft: SightingDraft]
  delete: []
}>()

const visible = defineModel<boolean>('visible', { required: true })

const bedsStore = useBedsStore()

const date = ref<Date>(new Date())
const group = ref<SightingGroup | null>(null)
const species = ref('')
const photoId = ref<string | null>(null)
const plantId = ref<string | null>(null)
const bedId = ref<string | null>(null)
const notes = ref('')

// Snapshot des zuletzt übernommenen KI-Vorschlags — nur wenn Gruppe/Art beim
// Speichern noch exakt so dastehen, zählt die Sichtung als `source: 'ai'`.
const appliedSuggestion = ref<{ source: SightingSource; group: SightingGroup; species: string } | null>(null)

watch(visible, (open) => {
  if (!open) return
  const s = props.initial
  date.value = s ? new Date(s.date) : new Date()
  group.value = s?.group ?? null
  species.value = s?.species ?? ''
  photoId.value = s?.photoId ?? null
  plantId.value = s ? s.plantId : (props.presetPlantId ?? null)
  bedId.value = s ? s.bedId : (props.presetBedId ?? null)
  notes.value = s?.notes ?? ''
  appliedSuggestion.value = null
})

const bedOptions = computed(() => bedsStore.beds.map((b) => ({ label: b.name, value: b.id })))

const hasSpeciesCatalog = computed(() => group.value !== null && speciesForGroup(group.value).length > 0)
const speciesSuggestions = ref<string[]>([])
function onSpeciesSearch(event: { query: string }) {
  if (!group.value) return
  speciesSuggestions.value = searchSpecies(group.value, event.query).map((s) => s.name)
}

async function onPhotoChanged(id: string | null) {
  photoId.value = id
  appliedSuggestion.value = null
  if (!id || species.value.trim()) return
  const photo = await getPhotoFile(id)
  if (!photo) return
  const identifier = getSpeciesIdentifier()
  const suggestion = await identifier.suggest(photo)
  if (!suggestion?.group && !suggestion?.species) return
  if (suggestion.group) group.value = suggestion.group
  if (suggestion.species) species.value = suggestion.species
  if (group.value) {
    appliedSuggestion.value = { source: identifier.source, group: group.value, species: species.value.trim() }
  }
}

const canSave = computed(() => Boolean(photoId.value && group.value))

function save() {
  if (!canSave.value || !group.value) return
  const suggestion = appliedSuggestion.value
  const unchanged = suggestion !== null && suggestion.group === group.value && suggestion.species === species.value.trim()
  emit('save', {
    date: toIsoDate(date.value),
    group: group.value,
    species: species.value.trim(),
    photoId: photoId.value,
    plantId: plantId.value,
    bedId: bedId.value,
    notes: notes.value.trim(),
    source: unchanged ? suggestion!.source : 'manual',
  })
  visible.value = false
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="initial ? 'Sichtung bearbeiten' : 'Neue Sichtung'"
    :style="{ width: 'min(560px, 95vw)' }"
  >
    <div class="form-grid">
      <div class="form-field">
        <label>Foto</label>
        <PhotoPicker :model-value="photoId" label="Foto aufnehmen" @update:model-value="onPhotoChanged" />
      </div>

      <div class="form-row">
        <div class="form-field">
          <label for="sighting-group">Gruppe</label>
          <Select
            id="sighting-group"
            v-model="group"
            :options="sightingGroupOptions"
            option-label="label"
            option-value="value"
            placeholder="wählen"
          />
        </div>
        <div class="form-field">
          <label for="sighting-date">Datum</label>
          <DatePicker id="sighting-date" v-model="date" date-format="dd.mm.yy" />
        </div>
      </div>

      <div class="form-field">
        <label for="sighting-species">Art</label>
        <AutoComplete
          v-if="hasSpeciesCatalog"
          id="sighting-species"
          v-model="species"
          :suggestions="speciesSuggestions"
          placeholder="Art wählen oder eintippen (optional)"
          @complete="onSpeciesSearch"
        />
        <InputText v-else id="sighting-species" v-model="species" placeholder="z. B. Erdhummel (optional)" />
      </div>

      <div class="form-row">
        <div class="form-field">
          <label for="sighting-plant">Pflanze</label>
          <PlantSelect v-model="plantId" placeholder="verknüpfen" show-clear />
        </div>
        <div class="form-field">
          <label for="sighting-bed">Beet</label>
          <Select
            id="sighting-bed"
            v-model="bedId"
            :options="bedOptions"
            option-label="label"
            option-value="value"
            placeholder="verknüpfen"
            show-clear
            filter
          />
        </div>
      </div>

      <div class="form-field">
        <label for="sighting-notes">Notizen</label>
        <Textarea id="sighting-notes" v-model="notes" rows="3" auto-resize />
      </div>
    </div>

    <template #footer>
      <Button v-if="initial" label="Löschen" severity="danger" text @click="emit('delete'); visible = false" />
      <Button label="Abbrechen" severity="secondary" text @click="visible = false" />
      <Button label="Speichern" :disabled="!canSave" @click="save" />
    </template>
  </Dialog>
</template>
