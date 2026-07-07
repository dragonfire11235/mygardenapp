<script setup lang="ts">
// Zeigt beim Antippen eines Beets (auf der Karte) die Pflanzen darin.
import { computed } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import type { Bed } from '../../data'
import { formatDate } from '../../shared/dates'
import PhotoImg from '../../shared/PhotoImg.vue'
import { usePlantsStore } from '../plants/plantsStore'
import { useBedsStore } from './bedsStore'

const props = defineProps<{ bed: Bed | null }>()

const emit = defineEmits<{
  edit: [bed: Bed]
  addPlant: [bed: Bed]
}>()

const visible = defineModel<boolean>('visible', { required: true })

const store = useBedsStore()
const plantsStore = usePlantsStore()

const plantings = computed(() =>
  props.bed ? store.activePlantingsByBed.get(props.bed.id) ?? [] : [],
)

function plantName(plantId: string): string {
  return plantsStore.byId.get(plantId)?.name ?? 'Unbekannte Pflanze'
}
</script>

<template>
  <Dialog v-model:visible="visible" modal :header="bed?.name ?? 'Beet'" :style="{ width: 'min(460px, 95vw)' }">
    <template v-if="bed">
      <PhotoImg v-if="bed.photoId" :photo-id="bed.photoId" class="detail-banner" />
      <p v-if="bed.location || bed.sizeText" class="muted">
        {{ [bed.location, bed.sizeText].filter(Boolean).join(' · ') }}
      </p>

      <h3 class="section">Pflanzen in diesem Beet</h3>
      <ul v-if="plantings.length" class="plant-list">
        <li v-for="planting in plantings" :key="planting.id" class="plant-row">
          <span>
            🌿 {{ plantName(planting.plantId) }}
            <span v-if="planting.quantity > 1" class="muted">×{{ planting.quantity }}</span>
          </span>
          <span class="muted">seit {{ formatDate(planting.plantedAt) }}</span>
        </li>
      </ul>
      <p v-else class="muted">Noch nichts eingepflanzt.</p>
    </template>

    <template #footer>
      <Button label="Pflanze einsetzen" icon="pi pi-plus" severity="secondary" outlined @click="bed && emit('addPlant', bed)" />
      <Button label="Beet bearbeiten" icon="pi pi-pencil" @click="bed && emit('edit', bed)" />
    </template>
  </Dialog>
</template>

<style scoped>
.detail-banner {
  margin-bottom: 0.75rem;
}

.section {
  font-size: 0.95rem;
  margin: 0.75rem 0 0.5rem;
}

.plant-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.plant-row {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  align-items: center;
}
</style>
