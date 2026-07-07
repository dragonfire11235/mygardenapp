<script setup lang="ts">
// Lageplan: Ein hochgeladenes Kartenbild (z. B. Google-Maps-Screenshot) mit
// verschiebbaren Beet-Markern. Positionen werden normalisiert (0..1)
// gespeichert und funktionieren so in jeder Bildschirmgröße.
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'
import { useConfirm } from 'primevue/useconfirm'
import type { Bed } from '../../data'
import { addPhoto, deletePhoto, getPhotoUrl } from '../../shared/photos'
import { useSettingsStore } from '../settings/settingsStore'
import { useBedsStore } from './bedsStore'

const emit = defineEmits<{ select: [bed: Bed] }>()

const store = useBedsStore()
const settings = useSettingsStore()
const confirm = useConfirm()

const mapUrl = ref<string | null>(null)
const mapEl = ref<HTMLElement | null>(null)
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

watch(
  () => settings.gardenMapPhotoId,
  async (id) => {
    mapUrl.value = id ? await getPhotoUrl(id) : null
  },
  { immediate: true },
)

const placedBeds = computed(() => store.beds.filter((b) => b.mapX !== null && b.mapY !== null))
const unplacedBeds = computed(() => store.beds.filter((b) => b.mapX === null || b.mapY === null))

async function onMapSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = true
  try {
    const old = settings.gardenMapPhotoId
    const id = await addPhoto(file)
    await settings.setGardenMapPhotoId(id)
    if (old) await deletePhoto(old)
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

function removeMap() {
  confirm.require({
    message: 'Kartenbild entfernen? Die Beet-Positionen bleiben gespeichert.',
    header: 'Karte entfernen',
    icon: 'pi pi-question-circle',
    acceptProps: { label: 'Entfernen', severity: 'danger' },
    rejectProps: { label: 'Abbrechen', severity: 'secondary', text: true },
    accept: async () => {
      const old = settings.gardenMapPhotoId
      await settings.setGardenMapPhotoId(null)
      if (old) await deletePhoto(old)
    },
  })
}

/** Beet mittig auf der Karte platzieren (danach zurechtziehen) */
async function placeBed(bed: Bed) {
  await store.updateBed({ ...bed, mapX: 0.5, mapY: 0.5 })
}

async function unplaceBed(bed: Bed) {
  await store.updateBed({ ...bed, mapX: null, mapY: null })
}

// --- Drag & Drop der Marker (Pointer Events, funktioniert mit Maus + Touch) ---
const dragging = ref<{ bedId: string; x: number; y: number; moved: boolean } | null>(null)

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v))
}

function positionFromEvent(e: PointerEvent): { x: number; y: number } | null {
  const rect = mapEl.value?.getBoundingClientRect()
  if (!rect) return null
  return {
    x: clamp01((e.clientX - rect.left) / rect.width),
    y: clamp01((e.clientY - rect.top) / rect.height),
  }
}

function onMarkerDown(bed: Bed, e: PointerEvent) {
  try {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  } catch {
    // Kein aktiver Pointer (z. B. Stift-Sonderfälle) — Drag geht trotzdem
  }
  dragging.value = { bedId: bed.id, x: bed.mapX ?? 0.5, y: bed.mapY ?? 0.5, moved: false }
}

function onMarkerMove(e: PointerEvent) {
  if (!dragging.value) return
  const pos = positionFromEvent(e)
  if (!pos) return
  dragging.value = { ...dragging.value, ...pos, moved: true }
}

async function onMarkerUp(bed: Bed) {
  const drag = dragging.value
  dragging.value = null
  if (!drag || drag.bedId !== bed.id) return
  if (drag.moved) {
    await store.updateBed({ ...bed, mapX: drag.x, mapY: drag.y })
  } else {
    emit('select', bed) // Tippen ohne Ziehen = Beet-Details öffnen
  }
}

function markerStyle(bed: Bed) {
  const isDragged = dragging.value?.bedId === bed.id && dragging.value.moved
  const x = isDragged ? dragging.value!.x : (bed.mapX ?? 0.5)
  const y = isDragged ? dragging.value!.y : (bed.mapY ?? 0.5)
  return { left: `${x * 100}%`, top: `${y * 100}%` }
}

function plantCount(bedId: string): number {
  return (store.activePlantingsByBed.get(bedId) ?? []).length
}
</script>

<template>
  <div class="map-view">
    <!-- Noch kein Kartenbild: Upload anbieten -->
    <div v-if="!mapUrl" class="empty-state card">
      <i class="pi pi-map" />
      <p>
        Lade ein Bild deines Gartens hoch — z. B. einen Google-Maps-Screenshot
        oder eine Zeichnung. Danach platzierst du deine Beete darauf.
      </p>
      <Button
        :label="uploading ? 'Wird verarbeitet …' : 'Kartenbild hochladen'"
        icon="pi pi-upload"
        :loading="uploading"
        @click="fileInput?.click()"
      />
    </div>

    <template v-else>
      <div ref="mapEl" class="map-canvas" :class="{ dragging: dragging?.moved }">
        <img :src="mapUrl" alt="Gartenkarte" class="map-img" draggable="false" />
        <button
          v-for="bed in placedBeds"
          :key="bed.id"
          class="marker"
          :style="markerStyle(bed)"
          :title="bed.name"
          @pointerdown.prevent="onMarkerDown(bed, $event)"
          @pointermove="onMarkerMove"
          @pointerup="onMarkerUp(bed)"
        >
          <span class="marker-pin">📍</span>
          <span class="marker-label">
            {{ bed.name }}
            <span v-if="plantCount(bed.id)" class="marker-count">{{ plantCount(bed.id) }}</span>
          </span>
        </button>
      </div>
      <p class="muted map-hint">Marker ziehen zum Verschieben · antippen zum Öffnen</p>

      <div v-if="unplacedBeds.length" class="card unplaced">
        <strong>Noch nicht auf der Karte:</strong>
        <div class="unplaced-list">
          <Button
            v-for="bed in unplacedBeds"
            :key="bed.id"
            :label="bed.name"
            icon="pi pi-plus"
            size="small"
            severity="secondary"
            outlined
            @click="placeBed(bed)"
          />
        </div>
      </div>

      <div v-if="placedBeds.length" class="placed-actions">
        <Button
          v-for="bed in placedBeds"
          :key="bed.id"
          :label="`${bed.name} von Karte nehmen`"
          icon="pi pi-times"
          text
          size="small"
          severity="secondary"
          @click="unplaceBed(bed)"
        />
      </div>

      <div class="map-actions">
        <Button label="Karte ändern" icon="pi pi-upload" severity="secondary" outlined size="small" :loading="uploading" @click="fileInput?.click()" />
        <Button label="Karte entfernen" icon="pi pi-trash" severity="danger" text size="small" @click="removeMap" />
      </div>
    </template>

    <input ref="fileInput" type="file" accept="image/*" class="file-hidden" @change="onMapSelected" />
  </div>
</template>

<style scoped>
.map-view {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.map-canvas {
  position: relative;
  border-radius: var(--app-radius);
  overflow: hidden;
  border: 1px solid var(--app-border);
  touch-action: none; /* verhindert Scrollen beim Marker-Ziehen am Handy */
  user-select: none;
}

.map-canvas.dragging {
  cursor: grabbing;
}

.map-img {
  display: block;
  width: 100%;
}

.marker {
  position: absolute;
  transform: translate(-50%, -90%);
  background: none;
  border: none;
  padding: 0;
  cursor: grab;
  display: flex;
  flex-direction: column;
  align-items: center;
  font: inherit;
}

.marker:active {
  cursor: grabbing;
}

.marker-pin {
  font-size: 1.7rem;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.4));
}

.marker-label {
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: 999px;
  padding: 0.1rem 0.55rem;
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.marker-count {
  background: var(--app-accent);
  color: #fff;
  border-radius: 999px;
  min-width: 1.1rem;
  height: 1.1rem;
  font-size: 0.68rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 0.25rem;
}

.map-hint {
  margin: 0;
  text-align: center;
}

.unplaced {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.unplaced-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.placed-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.15rem;
}

.map-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.file-hidden {
  display: none;
}
</style>
