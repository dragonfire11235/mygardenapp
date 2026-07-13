<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { categoryColors, formatMonths, monthNamesShort } from '../../shared/texts'
import { usePlantsStore } from './plantsStore'
import { bloomGaps, bloomRows } from './bloomCalendar'

const store = usePlantsStore()
const router = useRouter()
const currentMonth = new Date().getMonth() + 1

const rows = computed(() => bloomRows(store.plants))
const gaps = computed(() => bloomGaps(store.plants))
const bloomingNow = computed(() => rows.value.filter((r) => r.months[currentMonth - 1]))

// Einzelbuchstabe je Monat für die Kopfzeile (J F M A M J J A S O N D)
const monthInitials = monthNamesShort.map((m) => m[0])
</script>

<template>
  <div v-if="rows.length" class="bloom">
    <p class="summary">
      <span v-if="bloomingNow.length">🌸 {{ bloomingNow.length }} blüht im {{ monthNamesShort[currentMonth - 1] }}</span>
      <span v-else class="muted">Diesen Monat blüht laut deiner Bibliothek nichts.</span>
    </p>

    <div class="grid" role="table" aria-label="Blühkalender">
      <!-- Kopfzeile: Monate -->
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

      <!-- Eine Zeile je blühender Pflanze -->
      <RouterLink
        v-for="row in rows"
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
          :class="{ on, now: i + 1 === currentMonth }"
          :style="on ? { background: categoryColors[row.plant.category] } : undefined"
        />
      </RouterLink>
    </div>

    <p v-if="gaps.length" class="gaps muted">
      🕳️ Blühlücke: {{ formatMonths(gaps) }} — hier fehlt Nahrung für Insekten.
    </p>
  </div>

  <p v-else class="muted">
    Noch keine Blütezeiten hinterlegt. Übernimm Pflanzen aus dem
    <button class="link-btn" @click="router.push('/pflanzen')">Katalog</button>
    oder trage bei einer Pflanze „Blüte-Monate" ein.
  </p>
</template>

<style scoped>
.bloom {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.summary {
  margin: 0;
  font-weight: 600;
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
  color: var(--app-accent);
}

.cell {
  height: 16px;
  border-radius: 3px;
  background: var(--app-bg);
}

.head-cell {
  height: auto;
  background: none;
  text-align: center;
  font-size: 0.7rem;
  color: var(--app-text-muted);
}

.cell.now {
  outline: 1.5px solid var(--app-accent);
  outline-offset: -1px;
}

.head-cell.now {
  color: var(--app-accent);
  font-weight: 700;
}

.gaps {
  margin: 0;
  font-size: 0.8rem;
}

.link-btn {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: var(--app-accent);
  cursor: pointer;
  text-decoration: underline;
}
</style>
