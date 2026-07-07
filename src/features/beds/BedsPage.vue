<script setup lang="ts">
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import { useConfirm } from 'primevue/useconfirm'
import type { Bed } from '../../data'
import { formatDate } from '../../shared/dates'
import SelectButton from 'primevue/selectbutton'
import PhotoImg from '../../shared/PhotoImg.vue'
import { usePlantsStore } from '../plants/plantsStore'
import { useBedsStore } from './bedsStore'
import BedFormDialog, { type BedDraft } from './BedFormDialog.vue'
import BedDetailDialog from './BedDetailDialog.vue'
import BedMapView from './BedMapView.vue'
import BedPlanner from './BedPlanner.vue'
import PlantingDialog from './PlantingDialog.vue'

const store = useBedsStore()
const plantsStore = usePlantsStore()
const confirm = useConfirm()

const bedDialogVisible = ref(false)
const plantingDialogVisible = ref(false)
const detailVisible = ref(false)
const editingBed = ref<Bed | null>(null)
const detailBed = ref<Bed | null>(null)
const plantingBedId = ref<string | null>(null)

const view = ref<'liste' | 'karte'>('liste')
const viewOptions = [
  { label: 'Liste', value: 'liste' },
  { label: 'Karte', value: 'karte' },
]

// Beetplaner: Klick auf eine Beet-Karte wählt das Beet für den Planer darunter
const plannerBedId = ref<string | null>(null)
const plannerBed = computed(() => store.beds.find((b) => b.id === plannerBedId.value) ?? null)

/** Anzeige der Beetgröße: Metermaße bevorzugt, sonst Legacy-Freitext */
function sizeLabel(bed: Bed): string {
  if (bed.widthM && bed.heightM) {
    const fmt = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 2 })
    return `${fmt(bed.widthM)} × ${fmt(bed.heightM)} m`
  }
  return bed.sizeText
}

function openNewBed() {
  editingBed.value = null
  bedDialogVisible.value = true
}

function openEditBed(bed: Bed) {
  editingBed.value = bed
  bedDialogVisible.value = true
}

function openPlanting(bedId: string) {
  plantingBedId.value = bedId
  plantingDialogVisible.value = true
}

// Klick auf einen Marker in der Kartenansicht → Detail-Dialog mit Pflanzenliste
function openBedDetail(bed: Bed) {
  detailBed.value = bed
  detailVisible.value = true
}

function editFromDetail(bed: Bed) {
  detailVisible.value = false
  openEditBed(bed)
}

function addPlantFromDetail(bed: Bed) {
  detailVisible.value = false
  openPlanting(bed.id)
}

async function saveBed(draft: BedDraft) {
  if (editingBed.value) {
    await store.updateBed({ ...editingBed.value, ...draft })
  } else {
    await store.createBed(draft)
  }
}

function removeBed() {
  const bed = editingBed.value
  if (!bed) return
  confirm.require({
    message: `„${bed.name}" wirklich löschen? Aktive Bepflanzungen werden beendet.`,
    header: 'Beet löschen',
    icon: 'pi pi-exclamation-triangle',
    acceptProps: { label: 'Löschen', severity: 'danger' },
    rejectProps: { label: 'Abbrechen', severity: 'secondary', text: true },
    accept: () => store.removeBed(bed.id),
  })
}

async function savePlanting(data: { plantId: string; quantity: number; plantedAt: string }) {
  if (!plantingBedId.value) return
  await store.addPlanting({ ...data, bedId: plantingBedId.value, notes: '' })
}

function endPlanting(plantingId: string, plantName: string) {
  confirm.require({
    message: `„${plantName}" aus dem Beet entfernen?`,
    header: 'Bepflanzung beenden',
    icon: 'pi pi-question-circle',
    acceptProps: { label: 'Entfernen' },
    rejectProps: { label: 'Abbrechen', severity: 'secondary', text: true },
    accept: () => store.endPlanting(plantingId),
  })
}

function plantName(plantId: string): string {
  return plantsStore.byId.get(plantId)?.name ?? 'Unbekannte Pflanze'
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>Beete</h1>
        <span class="muted">{{ store.beds.length }} angelegt</span>
      </div>
      <div class="header-actions">
        <SelectButton
          v-model="view"
          :options="viewOptions"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          aria-label="Ansicht"
        />
        <Button label="Neues Beet" icon="pi pi-plus" @click="openNewBed" />
      </div>
    </div>

    <BedMapView v-if="view === 'karte'" @select="openBedDetail" />

    <div v-else-if="store.beds.length" class="card-grid">
      <div
        v-for="bed in store.beds"
        :key="bed.id"
        class="card bed-card"
        :class="{ 'bed-selected': bed.id === plannerBedId }"
        @click="plannerBedId = bed.id"
      >
        <PhotoImg v-if="bed.photoId" :photo-id="bed.photoId" class="bed-banner" />
        <div class="bed-header">
          <div>
            <strong>{{ bed.name }}</strong>
            <div class="muted">
              {{ [bed.location, sizeLabel(bed)].filter(Boolean).join(' · ') || ' ' }}
            </div>
          </div>
          <Button icon="pi pi-pencil" text rounded severity="secondary" aria-label="Bearbeiten" @click.stop="openEditBed(bed)" />
        </div>

        <ul class="planting-list">
          <li
            v-for="planting in store.activePlantingsByBed.get(bed.id) ?? []"
            :key="planting.id"
            class="planting"
          >
            <span>
              🌿 {{ plantName(planting.plantId) }}
              <span v-if="planting.quantity > 1" class="muted">×{{ planting.quantity }}</span>
            </span>
            <span class="planting-right muted">
              seit {{ formatDate(planting.plantedAt) }}
              <Button
                icon="pi pi-times"
                text
                rounded
                size="small"
                severity="secondary"
                aria-label="Entfernen"
                @click="endPlanting(planting.id, plantName(planting.plantId))"
              />
            </span>
          </li>
          <li v-if="!(store.activePlantingsByBed.get(bed.id) ?? []).length" class="muted planting-empty">
            Noch nichts eingepflanzt.
          </li>
        </ul>

        <Button
          label="Pflanze einsetzen"
          icon="pi pi-plus"
          size="small"
          severity="secondary"
          outlined
          @click="openPlanting(bed.id)"
        />
      </div>
    </div>

    <div v-else class="empty-state">
      <i class="pi pi-table" />
      <p>Noch keine Beete. Lege dein erstes Beet oder deinen ersten Standort an.</p>
    </div>

    <!-- Beetplaner: eigener Bereich unterhalb der Beet-Liste -->
    <section v-if="view === 'liste' && store.beds.length" class="planner-section">
      <h2 class="planner-heading"><i class="pi pi-th-large" /> Beetplaner</h2>
      <BedPlanner v-if="plannerBed" :bed="plannerBed" />
      <p v-else class="muted">Klicke oben auf ein Beet, um es hier zu planen.</p>
    </section>

    <BedFormDialog
      v-model:visible="bedDialogVisible"
      :initial="editingBed"
      @save="saveBed"
      @delete="removeBed"
    />
    <PlantingDialog v-model:visible="plantingDialogVisible" @save="savePlanting" />
    <BedDetailDialog
      v-model:visible="detailVisible"
      :bed="detailBed"
      @edit="editFromDetail"
      @add-plant="addPlantFromDetail"
    />
  </div>
</template>

<style scoped>
.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.bed-card {
  cursor: pointer;
}

.bed-card.bed-selected {
  border-color: var(--app-accent);
  box-shadow: 0 0 0 1px var(--app-accent);
}

.planner-section {
  margin-top: 1.5rem;
}

.planner-heading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  margin-bottom: 0.75rem;
}

.planner-heading .pi {
  color: var(--app-accent);
}

/* Direktkind-Selektor überschreibt die Standardbreite von PhotoImg (.photo-img) */
.card > .bed-banner {
  margin: -1rem -1rem 0.75rem;
  width: calc(100% + 2rem);
  height: 130px;
  border-radius: var(--app-radius) var(--app-radius) 0 0;
}

.bed-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}

.planting-list {
  list-style: none;
  padding: 0;
  margin: 0.6rem 0 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.planting {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.planting-right {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
}

.planting-empty {
  padding: 0.25rem 0;
}
</style>
