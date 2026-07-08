<script setup lang="ts">
// Beetplaner: Raster in echten Metern, Pflanzen als Kreise in Wuchsbreite.
// Aus der Palette ziehen = Pflanze wird echt ins Beet gesetzt (Bepflanzung
// mit Position). Überlappung ist erlaubt (z. B. Kräuter unterm Baumrand) —
// große Kreise liegen unten, kleine oben.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import type { Bed, Plant, Planting } from '../../data'
import { categoryColors, categoryLabels, plantSpreadM } from '../../shared/texts'
import { todayIso } from '../../shared/dates'
import { shareOrDownload } from '../../shared/shareFile'
import { renderPlannerImage } from './plannerImage'
import { usePlantsStore } from '../plants/plantsStore'
import { useTasksStore } from '../tasks/tasksStore'
import { useBedsStore } from './bedsStore'

const props = defineProps<{ bed: Bed }>()

const store = useBedsStore()
const plantsStore = usePlantsStore()
const tasksStore = useTasksStore()
const confirm = useConfirm()
const toast = useToast()

const SNAP_M = 0.25

// ---- Beetmaße ----
const widthInput = ref<number | null>(null)
const heightInput = ref<number | null>(null)
const hasDimensions = computed(() => !!props.bed.widthM && !!props.bed.heightM)

async function saveDimensions() {
  if (!widthInput.value || !heightInput.value) return
  await store.updateBed({ ...props.bed, widthM: widthInput.value, heightM: heightInput.value })
}

// ---- Canvas-Skalierung (px pro Meter) ----
const canvasEl = ref<HTMLElement | null>(null)
const canvasWidth = ref(0)
let resizeObserver: ResizeObserver | null = null

// Direkt messen + window.resize als Fallback — ResizeObserver allein ist
// nicht in jeder Umgebung zuverlässig.
function measure() {
  canvasWidth.value = canvasEl.value?.clientWidth ?? 0
}

onMounted(() => {
  measure()
  window.addEventListener('resize', measure)
  resizeObserver = new ResizeObserver(measure)
  if (canvasEl.value) resizeObserver.observe(canvasEl.value)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', measure)
  resizeObserver?.disconnect()
})

// Wenn die Maße gerade erst gesetzt wurden, existiert das Canvas erst jetzt
watch(hasDimensions, async (has) => {
  if (!has) return
  await nextTick()
  if (canvasEl.value && resizeObserver) resizeObserver.observe(canvasEl.value)
  measure()
})

const pxPerMeter = computed(() => {
  const w = props.bed.widthM
  return w && canvasWidth.value ? canvasWidth.value / w : 0
})

const canvasHeightPx = computed(() => (props.bed.heightM ?? 0) * pxPerMeter.value)

/** Rasterlinien alle 0,5 m */
const gridStyle = computed(() => {
  const step = 0.5 * pxPerMeter.value
  if (!step) return {}
  return {
    backgroundImage:
      'linear-gradient(to right, rgba(22,163,74,0.18) 1px, transparent 1px), ' +
      'linear-gradient(to bottom, rgba(22,163,74,0.18) 1px, transparent 1px)',
    backgroundSize: `${step}px ${step}px`,
  }
})

// ---- Bepflanzungen dieses Beets ----
const bedPlantings = computed(() =>
  store.activePlantings.filter((p) => p.bedId === props.bed.id),
)

/** Platzierte Kreise, groß → klein sortiert (kleine liegen oben und bleiben klickbar) */
const placed = computed(() =>
  bedPlantings.value
    .filter((p) => p.posX !== null && p.posY !== null)
    .map((p) => ({ planting: p, plant: plantsStore.byId.get(p.plantId) ?? null }))
    .filter((x): x is { planting: Planting; plant: Plant } => x.plant !== null)
    .sort((a, b) => plantSpreadM(b.plant) - plantSpreadM(a.plant)),
)

const unplaced = computed(() =>
  bedPlantings.value
    .filter((p) => p.posX === null || p.posY === null)
    .map((p) => ({ planting: p, plant: plantsStore.byId.get(p.plantId) ?? null }))
    .filter((x): x is { planting: Planting; plant: Plant } => x.plant !== null),
)

const selectedId = ref<string | null>(null)
const selected = computed(() => placed.value.find((x) => x.planting.id === selectedId.value) ?? null)

// ---- Geometrie-Helfer ----
function snap(v: number): number {
  return Math.round(v / SNAP_M) * SNAP_M
}

function clampToBed(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.min(props.bed.widthM ?? 0, Math.max(0, x)),
    y: Math.min(props.bed.heightM ?? 0, Math.max(0, y)),
  }
}

function metersFromEvent(e: PointerEvent): { x: number; y: number } | null {
  const rect = canvasEl.value?.getBoundingClientRect()
  if (!rect || !pxPerMeter.value) return null
  return clampToBed(
    (e.clientX - rect.left) / pxPerMeter.value,
    (e.clientY - rect.top) / pxPerMeter.value,
  )
}

function circleStyle(plant: Plant, x: number, y: number) {
  const d = plantSpreadM(plant) * pxPerMeter.value
  const color = categoryColors[plant.category]
  return {
    left: `${x * pxPerMeter.value - d / 2}px`,
    top: `${y * pxPerMeter.value - d / 2}px`,
    width: `${d}px`,
    height: `${d}px`,
    background: `${color}55`,
    borderColor: color,
  }
}

function showLabel(plant: Plant): boolean {
  return plantSpreadM(plant) * pxPerMeter.value >= 34
}

function fmtM(n: number): string {
  return n.toLocaleString('de-DE', { maximumFractionDigits: 2 })
}

// Beetplan als Bild teilen (oder herunterladen, wenn Teilen nicht geht)
const sharing = ref(false)
async function sharePlan() {
  sharing.value = true
  try {
    const blob = await renderPlannerImage(props.bed, placed.value)
    const safeName = props.bed.name.replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-|-$/g, '') || 'beet'
    const file = new File([blob], `beetplan-${safeName}.png`, { type: 'image/png' })
    await shareOrDownload(file, {
      title: `Beetplan: ${props.bed.name}`,
      text: '🌱 Mein Beetplan',
    })
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Teilen fehlgeschlagen',
      detail: e instanceof Error ? e.message : String(e),
      life: 4000,
    })
  } finally {
    sharing.value = false
  }
}

// ---- Kreise verschieben (gleiches Muster wie BedMapView) ----
const dragging = ref<{ id: string; x: number; y: number; moved: boolean } | null>(null)

function onCircleDown(item: { planting: Planting }, e: PointerEvent) {
  try {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  } catch {
    // Kein aktiver Pointer — Drag funktioniert trotzdem
  }
  dragging.value = {
    id: item.planting.id,
    x: item.planting.posX ?? 0,
    y: item.planting.posY ?? 0,
    moved: false,
  }
}

function onCircleMove(e: PointerEvent) {
  if (!dragging.value) return
  const pos = metersFromEvent(e)
  if (!pos) return
  dragging.value = { ...dragging.value, ...pos, moved: true }
}

async function onCircleUp(item: { planting: Planting }) {
  const drag = dragging.value
  dragging.value = null
  if (!drag || drag.id !== item.planting.id) return
  if (drag.moved) {
    await store.updatePlanting({ ...item.planting, posX: snap(drag.x), posY: snap(drag.y) })
  } else {
    selectedId.value = selectedId.value === item.planting.id ? null : item.planting.id
  }
}

function circlePos(item: { planting: Planting }): { x: number; y: number } {
  if (dragging.value?.id === item.planting.id && dragging.value.moved) {
    return { x: dragging.value.x, y: dragging.value.y }
  }
  return { x: item.planting.posX ?? 0, y: item.planting.posY ?? 0 }
}

// ---- Aus der Palette ziehen (neue Pflanze einsetzen) ----
const paletteDrag = ref<{ plant: Plant; x: number; y: number; over: boolean; moved: boolean } | null>(null)

function onPaletteDown(plant: Plant, e: PointerEvent) {
  e.preventDefault()
  paletteDrag.value = { plant, x: 0, y: 0, over: false, moved: false }
  document.addEventListener('pointermove', onPaletteMove)
  document.addEventListener('pointerup', onPaletteUp)
}

function onPaletteMove(e: PointerEvent) {
  if (!paletteDrag.value) return
  const pos = metersFromEvent(e)
  const rect = canvasEl.value?.getBoundingClientRect()
  const over =
    !!rect &&
    e.clientX >= rect.left &&
    e.clientX <= rect.right &&
    e.clientY >= rect.top &&
    e.clientY <= rect.bottom
  paletteDrag.value = {
    ...paletteDrag.value,
    ...(pos ?? {}),
    over,
    moved: true,
  }
}

async function onPaletteUp() {
  document.removeEventListener('pointermove', onPaletteMove)
  document.removeEventListener('pointerup', onPaletteUp)
  const drag = paletteDrag.value
  paletteDrag.value = null
  if (!drag) return
  if (drag.moved && drag.over) {
    await placePlant(drag.plant, snap(drag.x), snap(drag.y))
  } else if (!drag.moved) {
    // Antippen ohne Ziehen = mittig platzieren
    await placePlant(drag.plant, snap((props.bed.widthM ?? 0) / 2), snap((props.bed.heightM ?? 0) / 2))
  }
}

async function placePlant(plant: Plant, x: number, y: number) {
  await store.addPlanting({
    plantId: plant.id,
    bedId: props.bed.id,
    quantity: 1,
    plantedAt: todayIso(),
    notes: '',
    posX: x,
    posY: y,
  })
  // Pflegeaufgaben sofort erzeugen (sonst erst beim nächsten App-Start)
  await tasksStore.syncCareTasks(plantsStore.plants, store.activePlantings)
  toast.add({ severity: 'success', summary: `${plant.name} eingesetzt`, life: 2000 })
}

/** Bepflanzung ohne Position mittig platzieren */
async function placeUnplaced(item: { planting: Planting }) {
  await store.updatePlanting({
    ...item.planting,
    posX: snap((props.bed.widthM ?? 0) / 2),
    posY: snap((props.bed.heightM ?? 0) / 2),
  })
}

function removeSelected() {
  const sel = selected.value
  if (!sel) return
  confirm.require({
    message: `„${sel.plant.name}" aus dem Beet entfernen?`,
    header: 'Bepflanzung beenden',
    icon: 'pi pi-question-circle',
    acceptProps: { label: 'Entfernen', severity: 'danger' },
    rejectProps: { label: 'Abbrechen', severity: 'secondary', text: true },
    accept: async () => {
      await store.endPlanting(sel.planting.id)
      selectedId.value = null
    },
  })
}
</script>

<template>
  <div class="planner card">
    <!-- Ohne Maße: erst festlegen -->
    <div v-if="!hasDimensions" class="dimensions-form">
      <p class="muted">
        „{{ bed.name }}" hat noch keine Metermaße. Lege Breite und Länge fest, um zu planen.
      </p>
      <div class="dim-row">
        <InputNumber v-model="widthInput" :min="0.2" :max="50" :step="0.1" :max-fraction-digits="2" suffix=" m" placeholder="Breite" />
        <span class="muted">×</span>
        <InputNumber v-model="heightInput" :min="0.2" :max="50" :step="0.1" :max-fraction-digits="2" suffix=" m" placeholder="Länge" />
        <Button label="Übernehmen" :disabled="!widthInput || !heightInput" @click="saveDimensions" />
      </div>
    </div>

    <template v-else>
      <!-- Palette: Pflanzen ins Beet ziehen -->
      <div class="palette">
        <span class="muted palette-hint">Pflanze ins Raster ziehen (oder antippen = mittig):</span>
        <div class="palette-chips">
          <button
            v-for="plant in plantsStore.plants"
            :key="plant.id"
            class="chip"
            :style="{ borderColor: categoryColors[plant.category] }"
            :title="`${categoryLabels[plant.category]} · ${fmtM(plantSpreadM(plant))} m breit`"
            @pointerdown="onPaletteDown(plant, $event)"
          >
            <span class="chip-dot" :style="{ background: categoryColors[plant.category] }" />
            {{ plant.name }}
            <span class="muted">{{ fmtM(plantSpreadM(plant)) }} m</span>
          </button>
          <p v-if="!plantsStore.plants.length" class="muted">
            Die Bibliothek ist leer — lege zuerst unter „Pflanzen" welche an.
          </p>
        </div>
      </div>

      <!-- Das Beet-Raster -->
      <div class="canvas-wrap">
        <div
          ref="canvasEl"
          class="canvas"
          :style="{ height: `${canvasHeightPx}px`, ...gridStyle }"
        >
          <!-- Platzierte Pflanzen (groß unten, klein oben) -->
          <button
            v-for="item in placed"
            :key="item.planting.id"
            class="circle"
            :class="{ 'circle-selected': item.planting.id === selectedId }"
            :style="circleStyle(item.plant, circlePos(item).x, circlePos(item).y)"
            :title="item.plant.name"
            @pointerdown.prevent="onCircleDown(item, $event)"
            @pointermove="onCircleMove"
            @pointerup="onCircleUp(item)"
          >
            <span v-if="showLabel(item.plant)" class="circle-label">{{ item.plant.name }}</span>
          </button>

          <!-- Geister-Kreis beim Ziehen aus der Palette -->
          <div
            v-if="paletteDrag && paletteDrag.over"
            class="circle ghost"
            :style="circleStyle(paletteDrag.plant, paletteDrag.x, paletteDrag.y)"
          />
        </div>
        <div class="canvas-footer">
          <span class="canvas-meta muted">
            {{ fmtM(bed.widthM!) }} m × {{ fmtM(bed.heightM!) }} m · Raster 0,5 m · Einrasten 0,25 m
          </span>
          <Button
            label="Als Bild teilen"
            icon="pi pi-share-alt"
            size="small"
            severity="secondary"
            outlined
            :loading="sharing"
            @click="sharePlan"
          />
        </div>
      </div>

      <!-- Auswahl-Aktionsleiste -->
      <div v-if="selected" class="selection-bar">
        <span class="chip-dot" :style="{ background: categoryColors[selected.plant.category] }" />
        <strong>{{ selected.plant.name }}</strong>
        <span class="muted">
          {{ fmtM(plantSpreadM(selected.plant)) }} m breit ·
          Position {{ fmtM(selected.planting.posX!) }} / {{ fmtM(selected.planting.posY!) }} m
        </span>
        <Button label="Entfernen" icon="pi pi-trash" severity="danger" text size="small" @click="removeSelected" />
      </div>

      <!-- Noch nicht platzierte Bepflanzungen -->
      <div v-if="unplaced.length" class="unplaced">
        <span class="muted">Noch nicht platziert:</span>
        <Button
          v-for="item in unplaced"
          :key="item.planting.id"
          :label="item.plant.name"
          icon="pi pi-plus"
          size="small"
          severity="secondary"
          outlined
          @click="placeUnplaced(item)"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.planner {
  overflow: visible;
}

.dimensions-form {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.dim-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.palette {
  margin-bottom: 0.75rem;
}

.palette-hint {
  display: block;
  margin-bottom: 0.4rem;
}

.palette-chips {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: 1.5px solid;
  border-radius: 999px;
  background: var(--app-surface);
  padding: 0.25rem 0.7rem;
  font: inherit;
  font-size: 0.85rem;
  cursor: grab;
  touch-action: none; /* Drag am Touchscreen statt Scrollen */
  user-select: none;
}

.chip:active {
  cursor: grabbing;
}

.chip-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.canvas-wrap {
  margin-bottom: 0.5rem;
}

.canvas {
  position: relative;
  width: 100%;
  background-color: #f0f7ee;
  border: 2px solid #a3b899;
  border-radius: 8px;
  overflow: hidden;
  touch-action: none;
  user-select: none;
}

.circle {
  position: absolute;
  border-radius: 50%;
  border: 2px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font: inherit;
  cursor: grab;
  overflow: hidden;
}

.circle:active {
  cursor: grabbing;
}

.circle-selected {
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.5);
}

.circle-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--app-text);
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
  pointer-events: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 90%;
}

.ghost {
  opacity: 0.6;
  border-style: dashed;
  pointer-events: none;
}

.canvas-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.4rem;
}

.canvas-meta {
  font-size: 0.8rem;
}

.selection-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  margin-bottom: 0.5rem;
}

.unplaced {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}
</style>
