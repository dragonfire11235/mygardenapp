<script setup lang="ts">
// Beetplaner: Raster in echten Metern, Pflanzen als Kreise in Wuchsbreite.
// Aus der Palette ziehen = Pflanze wird echt ins Beet gesetzt (Bepflanzung
// mit Position). Überlappung ist erlaubt (z. B. Kräuter unterm Baumrand) —
// große Kreise liegen unten, kleine oben.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import type { Bed, Plant, PlantCategory, Planting } from '../../data'
import { categoryColors, categoryLabels, formatMonths, monthNamesShort, plantSpreadM } from '../../shared/texts'
import { todayIso } from '../../shared/dates'
import { shareOrDownload } from '../../shared/shareFile'
import { renderPlannerImage } from './plannerImage'
import { bloomsInRange } from '../plants/bloomCalendar'
import BedBeneficialBadge from './BedBeneficialBadge.vue'
import { useBedCompanions } from './useBedCompanions'
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

/** Rasterlinien alle 0,5 m (lumi: dezente Linien in --border-soft-Optik) */
const gridStyle = computed(() => {
  const step = 0.5 * pxPerMeter.value
  if (!step) return {}
  return {
    backgroundImage:
      'linear-gradient(to right, rgba(74,107,58,0.14) 1px, transparent 1px), ' +
      'linear-gradient(to bottom, rgba(74,107,58,0.14) 1px, transparent 1px)',
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

// ---- Blüh-Timeline (hebt Pflanzen hervor, die im gewählten Zeitraum blühen) ----
const months = monthNamesShort.map((label, i) => ({ label, value: i + 1 }))
const bloomFrom = ref<number | null>(new Date().getMonth() + 1) // Default: aktueller Monat
const bloomTo = ref<number | null>(new Date().getMonth() + 1)
// pending = erster Monat gewählt, wartet auf zweiten Klick fürs Bereichsende
const pending = ref(false)

const rangeActive = computed(() => bloomFrom.value !== null && bloomTo.value !== null)
const rangeLo = computed(() => Math.min(bloomFrom.value ?? 1, bloomTo.value ?? 1))
const rangeHi = computed(() => Math.max(bloomFrom.value ?? 1, bloomTo.value ?? 1))

const rangeLabel = computed(() => {
  if (!rangeActive.value) return ''
  const list = []
  for (let m = rangeLo.value; m <= rangeHi.value; m++) list.push(m)
  return formatMonths(list)
})

function clickMonth(m: number) {
  if (!rangeActive.value || !pending.value) {
    // Neuer Bereich: erster Monat
    bloomFrom.value = m
    bloomTo.value = m
    pending.value = true
  } else {
    // Zweiter Klick: Bereichsende
    bloomTo.value = m
    pending.value = false
  }
}

function clearRange() {
  bloomFrom.value = null
  bloomTo.value = null
  pending.value = false
}

function isMonthActive(m: number): boolean {
  return rangeActive.value && m >= rangeLo.value && m <= rangeHi.value
}

/** Blüh-Zustand einer Pflanze im gewählten Zeitraum → CSS-Klasse. */
function bloomClass(plant: Plant): string {
  if (!rangeActive.value) return ''
  return bloomsInRange(plant.bloomMonths, rangeLo.value, rangeHi.value) ? 'circle-blooming' : 'circle-dimmed'
}

// Mischkultur: beim Auswählen einer Pflanze Nachbarn grün/rot markieren
const { relation } = useBedCompanions()
function companionClass(plant: Plant): string {
  const sel = selected.value
  if (!sel || sel.plant.id === plant.id) return ''
  const rel = relation(sel.plant, plant)
  return rel === 'good' ? 'circle-good' : rel === 'bad' ? 'circle-bad' : ''
}

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
    background: `${color}cc`,
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

// ---- Palette: Kategorien → Auswahl-Dialog (übersichtlich bei vielen Pflanzen) ----
const pickerCategory = ref<PlantCategory | null>(null)
const pickerVisible = ref(false)
const pickerFilter = ref('')

/** Nur Kategorien mit Pflanzen, samt Anzahl */
const categoriesInLibrary = computed(() => {
  const counts = new Map<PlantCategory, number>()
  for (const p of plantsStore.plants) counts.set(p.category, (counts.get(p.category) ?? 0) + 1)
  return (Object.keys(categoryLabels) as PlantCategory[])
    .filter((c) => counts.has(c))
    .map((c) => ({ category: c, count: counts.get(c)! }))
})

const pickerPlants = computed(() => {
  const q = pickerFilter.value.trim().toLowerCase()
  return plantsStore.plants
    .filter((p) => p.category === pickerCategory.value)
    .filter((p) => !q || p.name.toLowerCase().includes(q))
})

function openPicker(category: PlantCategory) {
  pickerCategory.value = category
  pickerFilter.value = ''
  pickerVisible.value = true
}

/** Pflanze aus dem Dialog mittig einsetzen — danach zurechtziehen */
async function pickPlant(plant: Plant) {
  pickerVisible.value = false
  await placePlant(plant, snap((props.bed.widthM ?? 0) / 2), snap((props.bed.heightM ?? 0) / 2))
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
        <InputNumber v-model="widthInput" :min="0.2" :max="50" :step="0.1" :min-fraction-digits="1" :max-fraction-digits="2" suffix=" m" placeholder="Breite" />
        <span class="muted">×</span>
        <InputNumber v-model="heightInput" :min="0.2" :max="50" :step="0.1" :min-fraction-digits="1" :max-fraction-digits="2" suffix=" m" placeholder="Länge" />
        <Button label="Übernehmen" :disabled="!widthInput || !heightInput" @click="saveDimensions" />
      </div>
    </div>

    <template v-else>
      <BedBeneficialBadge :bed-id="bed.id" class="planner-ben" />

      <!-- Blüh-Timeline: Zeitraum antippen → blühende Pflanzen heben sich hervor -->
      <div class="timeline">
        <div class="timeline-head">
          <span class="muted timeline-hint">
            🌸 Blüte im Zeitraum
            <template v-if="rangeActive"> · <strong>{{ rangeLabel }}</strong></template>
            <template v-else> · alle sichtbar</template>
          </span>
          <button v-if="rangeActive" class="timeline-clear" @click="clearRange">Alle zeigen</button>
        </div>
        <div class="timeline-months">
          <button
            v-for="m in months"
            :key="m.value"
            class="month"
            :class="{ active: isMonthActive(m.value) }"
            @click="clickMonth(m.value)"
          >{{ m.label }}</button>
        </div>
      </div>

      <!-- Palette: Kategorie antippen → Pflanze wählen → mittig eingesetzt -->
      <div class="palette">
        <span class="muted palette-hint">Kategorie antippen → Pflanze wählen → Kreis zurechtziehen:</span>
        <div class="palette-chips">
          <button
            v-for="entry in categoriesInLibrary"
            :key="entry.category"
            class="chip"
            :style="{ borderColor: categoryColors[entry.category] }"
            @click="openPicker(entry.category)"
          >
            <span class="chip-dot" :style="{ background: categoryColors[entry.category] }" />
            {{ categoryLabels[entry.category] }}
            <span class="muted">{{ entry.count }}</span>
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
            :class="[{ 'circle-selected': item.planting.id === selectedId }, bloomClass(item.plant), companionClass(item.plant)]"
            :style="circleStyle(item.plant, circlePos(item).x, circlePos(item).y)"
            :title="item.plant.name"
            @pointerdown.prevent="onCircleDown(item, $event)"
            @pointermove="onCircleMove"
            @pointerup="onCircleUp(item)"
          >
            <span v-if="showLabel(item.plant)" class="circle-label">{{ item.plant.name }}</span>
          </button>

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
        <span class="muted comp-legend">🟢 gute · 🔴 ungünstige Nachbarn</span>
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

      <!-- Pflanzen-Auswahl je Kategorie -->
      <Dialog
        v-model:visible="pickerVisible"
        modal
        :header="pickerCategory ? categoryLabels[pickerCategory] : ''"
        :style="{ width: 'min(420px, 95vw)' }"
      >
        <InputText
          v-model="pickerFilter"
          placeholder="Suchen …"
          class="picker-filter"
        />
        <div class="picker-list">
          <button
            v-for="plant in pickerPlants"
            :key="plant.id"
            class="picker-row"
            @click="pickPlant(plant)"
          >
            <span class="chip-dot" :style="{ background: categoryColors[plant.category] }" />
            <span class="picker-name">{{ plant.name }}</span>
            <span class="muted">{{ fmtM(plantSpreadM(plant)) }} m</span>
          </button>
          <p v-if="!pickerPlants.length" class="muted">Keine Treffer.</p>
        </div>
      </Dialog>
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

.planner-ben {
  margin-bottom: 0.6rem;
}

.timeline {
  margin-bottom: 0.75rem;
}

.timeline-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}

.timeline-hint {
  font-size: 0.85rem;
}

.timeline-clear {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  font-size: 0.8rem;
  color: var(--app-accent);
  cursor: pointer;
  text-decoration: underline;
}

.timeline-months {
  display: flex;
  gap: 3px;
}

.month {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--border-soft);
  background: var(--surface-card);
  border-radius: 8px;
  padding: 0.3rem 0;
  font: inherit;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-3);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}

.month:hover {
  border-color: var(--accent);
}

.month.active {
  background: #f472b6;
  border-color: #f472b6;
  color: #fff;
  font-weight: 600;
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
  border-radius: var(--radius-pill);
  background: var(--surface-card);
  box-shadow: var(--shadow-glow);
  padding: 0.3rem 0.8rem;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-2);
  user-select: none;
  cursor: pointer;
  transition: filter var(--dur-fast) var(--ease-out);
}
.chip:hover {
  filter: brightness(var(--hover-brightness));
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
  background-color: var(--surface-tint);
  border: 1px dashed var(--border-soft);
  border-radius: 20px;
  overflow: hidden;
  touch-action: none;
  user-select: none;
}

.circle {
  position: absolute;
  border-radius: 50%;
  border: 2.5px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font: inherit;
  cursor: grab;
  overflow: hidden;
  box-shadow: var(--shadow-card);
  transition: transform var(--dur-fast) var(--ease-spring), opacity 0.2s, box-shadow 0.2s;
}
.circle:hover {
  transform: scale(1.06);
}

.circle:active {
  cursor: grabbing;
}

.circle-selected {
  box-shadow: 0 0 0 3px rgba(95, 140, 74, 0.55);
}

/* Blüh-Timeline: blühende Pflanzen leuchten, andere treten zurück */
.circle-dimmed {
  opacity: 0.22;
}

.circle-blooming {
  box-shadow: 0 0 0 3px rgba(244, 114, 182, 0.55), 0 0 12px rgba(244, 114, 182, 0.6);
}

/* Mischkultur beim Auswählen: gute/schlechte Nachbarn */
.circle-good {
  outline: 3px solid #16a34a;
  outline-offset: -1px;
}

.circle-bad {
  outline: 3px solid #dc2626;
  outline-offset: -1px;
}

.circle-label {
  font-size: 10px;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
  pointer-events: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 90%;
}

.picker-filter {
  width: 100%;
  margin-bottom: 0.6rem;
}

.picker-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 50vh;
  overflow-y: auto;
}

.picker-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.7rem;
  border: 1px solid var(--border-soft);
  border-radius: 14px;
  background: var(--surface-card);
  font: inherit;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.picker-row:hover {
  border-color: var(--accent);
}

.picker-name {
  flex: 1;
  min-width: 0;
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
  padding: 0.5rem 0.8rem;
  border: 1px solid var(--border-soft);
  background: var(--surface-raised);
  border-radius: 16px;
  box-shadow: var(--shadow-card);
  margin-bottom: 0.5rem;
}

.unplaced {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}
</style>
