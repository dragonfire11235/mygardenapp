<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useSightingsStore } from './sightingsStore'

const store = useSightingsStore()

onMounted(() => {
  if (!store.loaded) store.load()
})

const distinctSpecies = computed(
  () => new Set(store.sightings.map((s) => s.species || s.id)).size,
)
</script>

<template>
  <div v-if="store.sightings.length" class="widget-summary">
    <p>{{ distinctSpecies }} Arten in {{ store.byGroup.size }} Gruppen entdeckt.</p>
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
  color: var(--app-accent);
  text-decoration: none;
  font-size: 0.9rem;
}
</style>
