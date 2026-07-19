<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useSightingsStore } from './sightingsStore'
import { biodiversityScore } from './biodiversity'

const store = useSightingsStore()

onMounted(() => {
  if (!store.loaded) store.load()
})

const score = computed(() => biodiversityScore(store.sightings))
</script>

<template>
  <div v-if="store.sightings.length" class="widget-summary">
    <p>{{ score.distinctSpecies }} Arten in {{ score.groups }} Gruppen entdeckt.</p>
    <p class="muted">Biodiversitäts-Score: {{ score.score }}/100</p>
    <RouterLink to="/entdeckungen" class="more">→ Entdeckungen</RouterLink>
  </div>
  <p v-else class="muted">
    Noch keine Entdeckungen. <RouterLink to="/entdeckungen" class="more">Jetzt starten →</RouterLink>
  </p>
</template>

<style scoped>
.widget-summary {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.more {
  color: var(--accent);
  text-decoration: none;
  font-size: 0.9rem;
}
</style>
