<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Plant } from '../../data'
import { categoryColors, monthNamesShort } from '../../shared/texts'
import { usePlantsStore } from './plantsStore'
import { useBedsStore } from '../beds/bedsStore'
import { monthRows, monthsCovered, type MonthSelector } from './bloomCalendar'

const plantsStore = usePlantsStore()
const bedsStore = useBedsStore()
const currentMonth = new Date().getMonth() + 1
const monthInitials = monthNamesShort.map((m) => m[0])

const mode = ref<'bloom' | 'pruning'>('bloom')
const modeOptions = [
  { label: '🌸 Blüte', value: 'bloom' },
  { label: '✂️ Schnitt', value: 'pruning' },
] as const
const selector = computed<MonthSelector>(() =>
  mode.value === 'bloom' ? (p) => p.bloomMonths : (p) => p.pruningMonths,
)

const NONE = '__none__'
// Aufgeklappte Beete (Default: alles zu → Übersichtsleiste; Aufklappen zeigt Pflanzen)
const expanded = ref(new Set<string>())

interface Group {
  id: string
  name: string
  plants: Plant[]
}

const groups = computed<Group[]>(() => {
  const get = selector.value
  const has = (p: Plant | undefined): p is Plant => !!p && !!get(p)?.length
  const result: Group[] = []
  const plantedIds = new Set<string>()

  for (const bed of bedsStore.beds) {
    const plantings = bedsStore.activePlantingsByBed.get(bed.id) ?? []
    const plants: Plant[] = []
    const seen = new Set<string>()
    for (const pl of plantings) {
      plantedIds.add(pl.plantId)
      if (seen.has(pl.plantId)) continue
      seen.add(pl.plantId)
      const plant = plantsStore.byId.get(pl.plantId)
      if (has(plant)) plants.push(plant)
    }
    if (plants.length) result.push({ id: bed.id, name: bed.name, plants })
  }

  // Bibliothekspflanzen ohne aktive Bepflanzung
  const ohneBeet = plantsStore.plants.filter((p) => has(p) && !plantedIds.has(p.id))
  if (ohneBeet.length) result.push({ id: NONE, name: 'Ohne Beet', plants: ohneBeet })

  return result
})

function isOpen(id: string): boolean {
  return expanded.value.has(id)
}
function toggle(id: string) {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

function covered(plants: Plant[]): boolean[] {
  return monthsCovered(plants, selector.value)
}
function rows(plants: Plant[]) {
  return monthRows(plants, selector.value)
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">Kalender</h1>
      <div class="segmented" role="group" aria-label="Modus">
        <button
          v-for="opt in modeOptions"
          :key="opt.value"
          type="button"
          class="segment"
          :class="{ 'is-active': mode === opt.value }"
          @click="mode = opt.value"
        >{{ opt.label }}</button>
      </div>
    </div>

    <div v-if="groups.length" class="cal">
      <!-- Monats-Kopfzeile -->
      <div class="grid head">
        <span class="namecol" />
        <span
          v-for="(ini, i) in monthInitials"
          :key="i"
          class="cell head-cell"
          :class="{ now: i + 1 === currentMonth }"
          :title="monthNamesShort[i]"
        >{{ ini }}</span>
      </div>

      <section v-for="group in groups" :key="group.id" class="group">
        <!-- Beet-Balken: zugeklappt = Übersichtsleiste -->
        <button class="grid banner" :aria-expanded="isOpen(group.id)" @click="toggle(group.id)">
          <span class="namecol banner-name">
            <i class="ph-bold" :class="isOpen(group.id) ? 'ph-caret-down' : 'ph-caret-right'" />
            <span class="bed-name">{{ group.name }}</span>
            <span class="count muted">{{ group.plants.length }}</span>
          </span>
          <span
            v-for="(on, i) in covered(group.plants)"
            :key="i"
            class="cell"
            :class="{ on: on && !isOpen(group.id), now: i + 1 === currentMonth }"
          />
        </button>

        <!-- aufgeklappt: je Pflanze eine Timeline-Zeile -->
        <div v-show="isOpen(group.id)" class="rows">
          <RouterLink
            v-for="row in rows(group.plants)"
            :key="row.plant.id"
            class="grid row"
            :to="`/pflanzen/${row.plant.id}`"
          >
            <span class="namecol plant-name" :title="row.plant.name">{{ row.plant.name }}</span>
            <span
              v-for="(on, i) in row.months"
              :key="i"
              class="cell"
              :class="{ now: i + 1 === currentMonth }"
              :style="on ? { background: categoryColors[row.plant.category] } : undefined"
            />
          </RouterLink>
        </div>
      </section>
    </div>

    <div v-else class="empty-state">
      <i class="ph-fill ph-calendar-blank" />
      <p v-if="mode === 'bloom'">Noch keine Blütezeiten hinterlegt. Übernimm Pflanzen aus dem Katalog oder trage „Blüte-Monate“ ein.</p>
      <p v-else>Noch keine Schnittzeiten hinterlegt. Übernimm Gehölze aus dem Katalog oder trage „Schnitt-Monate“ ein.</p>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.cal {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  overflow-x: auto;
}

/* Gemeinsames Raster: Namensspalte + 12 Monate — sorgt für Ausrichtung */
.grid {
  display: grid;
  grid-template-columns: 7rem repeat(12, minmax(14px, 1fr));
  gap: 2px;
  align-items: center;
  min-width: 20rem;
}

.namecol {
  min-width: 0;
}

.head {
  position: sticky;
  top: 0;
  background: var(--bg-app);
  z-index: 1;
  padding-bottom: 2px;
}

.cell {
  height: 20px;
  border-radius: 6px;
  background: var(--surface-tint);
}

.cell.on {
  background: var(--accent);
}

.cell.now {
  outline: 1.5px solid var(--accent);
  outline-offset: -1px;
}

.head-cell {
  height: auto;
  background: none;
  text-align: center;
  font-size: 11px;
  font-weight: 800;
  color: var(--text-3);
}

.head-cell.now {
  color: var(--accent-strong);
  outline: none;
}

.banner {
  background: var(--surface-card);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-m);
  box-shadow: var(--shadow-glow);
  padding: 0.5rem 0.6rem;
  font: inherit;
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition: filter var(--dur-fast) var(--ease-out);
}

.banner:hover {
  filter: brightness(var(--hover-brightness));
}

.banner-name {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 800;
  font-size: 14px;
  overflow: hidden;
}

.bed-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.count {
  background: var(--surface-tint);
  border-radius: var(--radius-pill);
  padding: 1px 8px;
  font-size: 12px;
  font-weight: 700;
}

/* Segmented Control (Glas-Pille) */
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

.rows {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 2px 0 0.4rem;
}

.row {
  color: inherit;
  text-decoration: none;
  padding: 1px 0.5rem;
  border-radius: 6px;
}

.row:hover {
  background: var(--surface-tint);
}

.plant-name {
  font-size: 0.8rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-right: 0.3rem;
}

.row:hover .plant-name {
  color: var(--accent-strong);
}
</style>
