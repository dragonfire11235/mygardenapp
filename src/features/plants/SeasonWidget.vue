<script setup lang="ts">
import { computed } from 'vue'
import { usePlantsStore } from './plantsStore'

const store = usePlantsStore()
const month = new Date().getMonth() + 1

const sowNow = computed(() => store.plants.filter((p) => p.sowingMonths.includes(month)))
const harvestNow = computed(() => store.plants.filter((p) => p.harvestMonths.includes(month)))
</script>

<template>
  <div v-if="sowNow.length || harvestNow.length" class="season">
    <div v-if="sowNow.length">
      <span class="season-label">🌱 Jetzt aussäen:</span>
      {{ sowNow.map((p) => p.name).join(', ') }}
    </div>
    <div v-if="harvestNow.length">
      <span class="season-label">🧺 Jetzt ernten:</span>
      {{ harvestNow.map((p) => p.name).join(', ') }}
    </div>
  </div>
  <p v-else class="muted">
    Diesen Monat steht laut deiner Bibliothek keine Aussaat oder Ernte an.
  </p>
</template>

<style scoped>
.season {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.season-label {
  font-weight: 600;
}
</style>
