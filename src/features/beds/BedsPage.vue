<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import type { Bed } from '../../data'
import PhotoImg from '../../shared/PhotoImg.vue'
import { usePlantsStore } from '../plants/plantsStore'
import { useBedsStore } from './bedsStore'
import BedFormDialog, { type BedDraft } from './BedFormDialog.vue'
import BedMapView from './BedMapView.vue'
import BedBeneficialBadge from './BedBeneficialBadge.vue'

const store = useBedsStore()
const plantsStore = usePlantsStore()
const router = useRouter()

const bedDialogVisible = ref(false)

const view = ref<'liste' | 'karte'>('liste')
const viewOptions = [
  { label: 'Liste', value: 'liste' },
  { label: 'Karte', value: 'karte' },
]

/** Anzeige der Beetgröße: Metermaße bevorzugt, sonst Legacy-Freitext */
function sizeLabel(bed: Bed): string {
  if (bed.widthM && bed.heightM) {
    const fmt = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 2 })
    return `${fmt(bed.widthM)} × ${fmt(bed.heightM)} m`
  }
  return bed.sizeText
}

function plantNames(bedId: string): string {
  const list = store.activePlantingsByBed.get(bedId) ?? []
  return list.map((p) => plantsStore.byId.get(p.plantId)?.name ?? '?').join(', ')
}

function openDetail(bed: Bed) {
  router.push(`/beete/${bed.id}`)
}

function openNewBed() {
  bedDialogVisible.value = true
}

async function saveBed(draft: BedDraft) {
  await store.createBed(draft)
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

    <BedMapView v-if="view === 'karte'" @select="openDetail" />

    <div v-else-if="store.beds.length" class="card-grid">
      <button
        v-for="bed in store.beds"
        :key="bed.id"
        class="card bed-card"
        @click="openDetail(bed)"
      >
        <PhotoImg v-if="bed.photoId" :photo-id="bed.photoId" class="bed-banner" />
        <div class="bed-body">
          <strong>{{ bed.name }}</strong>
          <div class="muted">{{ [bed.location, sizeLabel(bed)].filter(Boolean).join(' · ') || ' ' }}</div>
          <div class="muted plant-summary">
            {{ (store.activePlantingsByBed.get(bed.id) ?? []).length
              ? '🌿 ' + plantNames(bed.id)
              : 'Noch nichts eingepflanzt.' }}
          </div>
          <BedBeneficialBadge :bed-id="bed.id" class="bed-ben" />
        </div>
      </button>
    </div>

    <div v-else class="empty-state">
      <i class="pi pi-table" />
      <p>Noch keine Beete. Lege dein erstes Beet oder deinen ersten Standort an.</p>
    </div>

    <BedFormDialog v-model:visible="bedDialogVisible" :initial="null" @save="saveBed" />
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
  display: block;
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: inherit;
}

.bed-card:hover {
  border-color: var(--app-accent);
}

/* Direktkind-Selektor überschreibt die Standardbreite von PhotoImg (.photo-img) */
.bed-card > .bed-banner {
  margin: -1rem -1rem 0.75rem;
  width: calc(100% + 2rem);
  height: 130px;
  border-radius: var(--app-radius) var(--app-radius) 0 0;
}

.bed-body {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.plant-summary {
  margin-top: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bed-ben {
  margin-top: 0.4rem;
}
</style>
