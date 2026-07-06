<script setup lang="ts">
import { useBedsStore } from './bedsStore'

const store = useBedsStore()
</script>

<template>
  <div v-if="store.beds.length" class="widget-list">
    <RouterLink v-for="bed in store.beds.slice(0, 5)" :key="bed.id" to="/beete" class="widget-row">
      <span class="widget-row-text">{{ bed.name }}</span>
      <span class="muted">
        {{ (store.activePlantingsByBed.get(bed.id) ?? []).length }} Pflanzen
      </span>
    </RouterLink>
  </div>
  <p v-else class="muted">Noch keine Beete angelegt.</p>
</template>

<style scoped>
.widget-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.widget-row {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  color: inherit;
  text-decoration: none;
  padding: 0.2rem 0;
}

.widget-row:hover .widget-row-text {
  color: var(--app-accent);
}
</style>
