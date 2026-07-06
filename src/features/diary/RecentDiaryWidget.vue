<script setup lang="ts">
import { formatDate } from '../../shared/dates'
import { useDiaryStore } from './diaryStore'

const store = useDiaryStore()
</script>

<template>
  <div v-if="store.sortedEntries.length" class="widget-list">
    <RouterLink v-for="entry in store.sortedEntries.slice(0, 4)" :key="entry.id" to="/tagebuch" class="widget-row">
      <span class="widget-row-text">{{ entry.title || entry.text || 'Foto-Eintrag' }}</span>
      <span class="muted">{{ formatDate(entry.date) }}</span>
    </RouterLink>
  </div>
  <p v-else class="muted">Noch keine Tagebucheinträge.</p>
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

.widget-row-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.widget-row:hover .widget-row-text {
  color: var(--app-accent);
}
</style>
