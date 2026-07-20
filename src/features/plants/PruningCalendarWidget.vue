<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { categoryColors, monthNamesShort } from '../../shared/texts'
import { usePlantsStore } from './plantsStore'
import { coverageRows, monthRows, type MonthSelector } from './bloomCalendar'
import { useCalendarBedGroups } from './useCalendarBedGroups'

const store = usePlantsStore()
const router = useRouter()
const currentMonth = new Date().getMonth() + 1

const MAX_ROWS = 7
const sel: MonthSelector = (p) => p.pruningMonths

// Ansicht: einzelne Pflanzen oder nach Beeten aggregiert
const view = ref<'plants' | 'beds'>('plants')

function currentFirst<T extends { months: boolean[]; firstMonth: number }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => Number(b.months[currentMonth - 1]) - Number(a.months[currentMonth - 1]) || a.firstMonth - b.firstMonth,
  )
}

// Pflanzen-Ansicht
const plantRows = computed(() => monthRows(store.plants, sel))
const visiblePlantRows = computed(() => currentFirst(plantRows.value).slice(0, MAX_ROWS))

// Beete-Ansicht
const bedGroups = useCalendarBedGroups(sel)
const bedRows = computed(() => coverageRows(bedGroups.value, sel))
const visibleBedRows = computed(() => currentFirst(bedRows.value).slice(0, MAX_ROWS))

const totalRows = computed(() => (view.value === 'plants' ? plantRows.value.length : bedRows.value.length))

const pruneNow = computed(() => plantRows.value.filter((r) => r.months[currentMonth - 1]))
const bedsPruneNow = computed(() => bedRows.value.filter((r) => r.months[currentMonth - 1]))

const monthInitials = monthNamesShort.map((m) => m[0])
</script>

<template>
  <div v-if="plantRows.length" class="prune">
    <!-- Umschalter Pflanzen ⇄ Beete (oben rechts, in Höhe der Überschrift) -->
    <div class="view-toggle" role="group" aria-label="Ansicht">
      <button type="button" :class="{ active: view === 'plants' }" title="Pflanzen" aria-label="Pflanzen" @click="view = 'plants'">
        <i class="ph-fill ph-potted-plant" />
      </button>
      <button type="button" :class="{ active: view === 'beds' }" title="Beete" aria-label="Beete" @click="view = 'beds'">
        <i class="ph-fill ph-grid-four" />
      </button>
    </div>

    <p class="summary">
      <template v-if="view === 'plants'">
        <span v-if="pruneNow.length">✂️ {{ pruneNow.map((r) => r.plant.name).join(', ') }} schneiden</span>
        <span v-else class="muted">Diesen Monat steht laut deiner Bibliothek kein Schnitt an.</span>
      </template>
      <template v-else>
        <span v-if="bedsPruneNow.length">✂️ {{ bedsPruneNow.length }} {{ bedsPruneNow.length === 1 ? 'Beet' : 'Beete' }} schneiden im {{ monthNamesShort[currentMonth - 1] }}</span>
        <span v-else class="muted">Diesen Monat ist in keinem Beet Schnitt fällig.</span>
      </template>
    </p>

    <div class="grid" role="table" aria-label="Schnittkalender">
      <div class="row head" role="row">
        <span class="name" />
        <span
          v-for="(ini, i) in monthInitials"
          :key="i"
          class="cell head-cell"
          :class="{ now: i + 1 === currentMonth }"
          :title="monthNamesShort[i]"
        >{{ ini }}</span>
      </div>

      <!-- Pflanzen-Ansicht -->
      <template v-if="view === 'plants'">
        <RouterLink
          v-for="row in visiblePlantRows"
          :key="row.plant.id"
          class="row"
          role="row"
          :to="`/pflanzen/${row.plant.id}`"
        >
          <span class="name" :title="row.plant.name">{{ row.plant.name }}</span>
          <span
            v-for="(on, i) in row.months"
            :key="i"
            class="cell"
            :class="{ now: i + 1 === currentMonth }"
            :style="on ? { background: categoryColors[row.plant.category] } : undefined"
          />
        </RouterLink>
      </template>

      <!-- Beete-Ansicht -->
      <template v-else>
        <RouterLink
          v-for="row in visibleBedRows"
          :key="row.id"
          class="row"
          role="row"
          :to="`/beete/${row.id}`"
        >
          <span class="name" :title="row.name">{{ row.name }}</span>
          <span
            v-for="(on, i) in row.months"
            :key="i"
            class="cell"
            :class="{ now: i + 1 === currentMonth }"
            :style="on ? { background: 'var(--accent)' } : undefined"
          />
        </RouterLink>
        <p v-if="!visibleBedRows.length" class="muted empty-beds">
          Noch kein Beet mit Schnitt-Terminen — setz Gehölze in ein Beet.
        </p>
      </template>
    </div>

    <RouterLink to="/kalender" class="more">
      <template v-if="totalRows > MAX_ROWS">+ {{ totalRows - MAX_ROWS }} weitere · </template>Ganzer Kalender →
    </RouterLink>
  </div>

  <p v-else class="muted">
    Noch keine Schnittzeiten hinterlegt. Übernimm Gehölze aus dem
    <button class="link-btn" @click="router.push('/pflanzen')">Katalog</button>
    oder trage bei einer Pflanze „Schnitt-Monate“ ein.
  </p>
</template>

<style scoped>
.prune {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

/* Umschalter oben rechts — positioniert relativ zur Widget-Karte (position:relative dort) */
.view-toggle {
  position: absolute;
  top: 14px;
  right: 16px;
  display: flex;
  gap: 2px;
  background: var(--surface-tint);
  border-radius: var(--radius-pill);
  padding: 2px;
}
.view-toggle button {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 4px 9px;
  border-radius: var(--radius-pill);
  color: var(--text-3);
  font-size: 15px;
  line-height: 1;
  display: grid;
  place-items: center;
  transition: all var(--dur-fast) var(--ease-out);
}
.view-toggle button.active {
  background: var(--surface-raised);
  color: var(--accent);
  box-shadow: var(--shadow-card);
}

.summary {
  margin: 0;
  font-weight: 600;
  padding-right: 4.5rem;
}

.grid {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-x: auto;
}

.row {
  display: grid;
  grid-template-columns: 5.5rem repeat(12, 1fr);
  align-items: center;
  gap: 2px;
  color: inherit;
  text-decoration: none;
  min-width: 15rem;
}

.row.head {
  position: sticky;
  top: 0;
}

.name {
  font-size: 0.78rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-right: 0.3rem;
}

.row:not(.head):hover .name {
  color: var(--accent);
}

.cell {
  height: 16px;
  border-radius: 3px;
  background: var(--bg-app);
}

.head-cell {
  height: auto;
  background: none;
  text-align: center;
  font-size: 0.7rem;
  color: var(--text-2);
}

.cell.now {
  outline: 1.5px solid var(--accent);
  outline-offset: -1px;
}

.head-cell.now {
  color: var(--accent);
  font-weight: 700;
}

.empty-beds {
  font-size: 0.82rem;
  margin: 0.2rem 0;
}

.more {
  font-size: 0.82rem;
  color: var(--accent);
  text-decoration: none;
  font-weight: 600;
}

.more:hover {
  text-decoration: underline;
}

.link-btn {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: var(--accent);
  cursor: pointer;
  text-decoration: underline;
}
</style>
