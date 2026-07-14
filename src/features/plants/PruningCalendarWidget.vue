<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { categoryColors, monthNamesShort } from '../../shared/texts'
import { usePlantsStore } from './plantsStore'
import { monthRows } from './bloomCalendar'

const store = usePlantsStore()
const router = useRouter()
const currentMonth = new Date().getMonth() + 1

const rows = computed(() => monthRows(store.plants, (p) => p.pruningMonths))
const pruneNow = computed(() => rows.value.filter((r) => r.months[currentMonth - 1]))

const monthInitials = monthNamesShort.map((m) => m[0])
</script>

<template>
  <div v-if="rows.length" class="prune">
    <p class="summary">
      <span v-if="pruneNow.length">✂️ {{ pruneNow.map((r) => r.plant.name).join(', ') }} schneiden</span>
      <span v-else class="muted">Diesen Monat steht laut deiner Bibliothek kein Schnitt an.</span>
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
  </div>

  <p v-else class="muted">
    Noch keine Schnittzeiten hinterlegt. Übernimm Gehölze aus dem
    <button class="link-btn" @click="router.push('/pflanzen')">Katalog</button>
    oder trage bei einer Pflanze „Schnitt-Monate" ein.
  </p>
</template>

<style scoped>
.prune {
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
