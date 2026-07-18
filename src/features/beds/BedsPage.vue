<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Bed } from '../../data'
import PhotoImg from '../../shared/PhotoImg.vue'
import { categoryColors } from '../../shared/texts'
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
] as const

/** Anzeige der Beetgröße: Metermaße bevorzugt, sonst Legacy-Freitext */
function sizeLabel(bed: Bed): string {
  if (bed.widthM && bed.heightM) {
    const fmt = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 2 })
    return `${fmt(bed.widthM)} × ${fmt(bed.heightM)} m`
  }
  return bed.sizeText
}

function plantCount(bedId: string): number {
  return (store.activePlantingsByBed.get(bedId) ?? []).length
}

/** Mini-Vorschau: platzierte Pflanzen als Farbkreise (Position in % der Beetmaße) */
function previewCircles(bed: Bed) {
  if (!bed.widthM || !bed.heightM) return []
  const list = store.activePlantingsByBed.get(bed.id) ?? []
  return list
    .filter((p) => p.posX !== null && p.posY !== null)
    .slice(0, 6)
    .map((p) => {
      const plant = plantsStore.byId.get(p.plantId)
      const color = plant ? categoryColors[plant.category] : '#64748b'
      return {
        id: p.id,
        left: `${Math.min(88, Math.max(0, (p.posX! / bed.widthM!) * 100 - 6))}%`,
        top: `${Math.min(60, Math.max(0, (p.posY! / bed.heightM!) * 100 - 12))}%`,
        background: `${color}cc`,
        borderColor: color,
      }
    })
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
        <h1 class="page-title">Beete</h1>
        <span class="muted">{{ store.beds.length }} angelegt</span>
      </div>
      <div class="header-actions">
        <div class="segmented">
          <button
            v-for="opt in viewOptions"
            :key="opt.value"
            type="button"
            class="segment"
            :class="{ 'is-active': view === opt.value }"
            @click="view = opt.value"
          >{{ opt.label }}</button>
        </div>
        <button type="button" class="round-icon-btn" aria-label="Neues Beet" @click="openNewBed">
          <i class="ph-bold ph-plus" />
        </button>
      </div>
    </div>

    <BedMapView v-if="view === 'karte'" @select="openDetail" />

    <div v-else-if="store.beds.length" class="bed-grid">
      <button
        v-for="bed in store.beds"
        :key="bed.id"
        class="bed-card"
        @click="openDetail(bed)"
      >
        <PhotoImg v-if="bed.photoId" :photo-id="bed.photoId" class="bed-banner" />
        <div v-else class="bed-preview">
          <span
            v-for="c in previewCircles(bed)"
            :key="c.id"
            class="preview-circle"
            :style="{ left: c.left, top: c.top, background: c.background, borderColor: c.borderColor }"
          />
          <span v-if="!previewCircles(bed).length" class="preview-empty">🌱</span>
        </div>
        <div class="bed-body">
          <div class="bed-name">{{ bed.name }}</div>
          <div class="bed-meta">
            {{ [bed.location, sizeLabel(bed)].filter(Boolean).join(' · ') || '—' }}
            · {{ plantCount(bed.id) === 1 ? '1 Pflanze' : `${plantCount(bed.id)} Pflanzen` }}
          </div>
          <BedBeneficialBadge :bed-id="bed.id" class="bed-ben" />
        </div>
      </button>
    </div>

    <div v-else class="empty-state">
      <i class="ph-fill ph-grid-four" />
      <p>Noch keine Beete. Lege dein erstes Beet oder deinen ersten Standort an.</p>
    </div>

    <BedFormDialog v-model:visible="bedDialogVisible" :initial="null" @save="saveBed" />
  </div>
</template>

<style scoped>
.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

/* Segmented Control (Glas-Pille), wie auf der Aufgaben-Seite */
.segmented {
  display: flex;
  background: var(--surface-card);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-pill);
  padding: 4px;
  box-shadow: var(--shadow-glow);
  border: 1px solid var(--border-soft);
}
.segment {
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  padding: 7px 14px;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--text-2);
  transition: all var(--dur-fast) var(--ease-out);
}
.segment.is-active {
  background: var(--surface-raised);
  color: var(--text-1);
  box-shadow: var(--shadow-card);
}

.bed-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.bed-card {
  display: block;
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: inherit;
  border: none;
  background: var(--surface-card);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-l);
  padding: 18px;
  box-shadow: var(--shadow-glow), var(--shadow-card);
  transition: filter var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}
.bed-card:hover {
  filter: brightness(var(--hover-brightness));
}
.bed-card:active {
  transform: scale(var(--press-scale));
}

/* Foto-Banner oben in der Karte */
.bed-card > .bed-banner {
  margin: -18px -18px 12px;
  width: calc(100% + 36px);
  height: 110px;
  border-radius: var(--radius-l) var(--radius-l) 0 0;
  object-fit: cover;
}

/* Mini-Vorschau des Beetplans */
.bed-preview {
  height: 90px;
  border-radius: 18px;
  background: var(--surface-tint);
  position: relative;
  overflow: hidden;
  margin-bottom: 12px;
  border: 1px dashed var(--border-soft);
}
.preview-circle {
  position: absolute;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 2px solid;
}
.preview-empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 24px;
  opacity: 0.5;
}

.bed-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.bed-name {
  font-weight: 800;
  font-size: 16px;
}
.bed-meta {
  font-size: 13px;
  color: var(--text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bed-ben {
  margin-top: 6px;
}
</style>
