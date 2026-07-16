<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Button from 'primevue/button'
import { useConfirm } from 'primevue/useconfirm'
import type { Sighting } from '../../data'
import { sightingGroupIcons, sightingGroupLabels } from '../../shared/texts'
import { formatDate } from '../../shared/dates'
import PhotoImg from '../../shared/PhotoImg.vue'
import { useSightingsStore, type SightingDraft } from './sightingsStore'
import SightingDialog from './SightingDialog.vue'

const store = useSightingsStore()
const confirm = useConfirm()

onMounted(() => {
  if (!store.loaded) store.load()
})

const dialogVisible = ref(false)
const editingSighting = ref<Sighting | null>(null)

function openNew() {
  editingSighting.value = null
  dialogVisible.value = true
}

function openEdit(sighting: Sighting) {
  editingSighting.value = sighting
  dialogVisible.value = true
}

async function save(draft: SightingDraft) {
  if (editingSighting.value) {
    await store.update({ ...editingSighting.value, ...draft })
  } else {
    await store.create(draft)
  }
}

function removeCurrent() {
  const sighting = editingSighting.value
  if (!sighting) return
  confirm.require({
    message: 'Sichtung samt Foto wirklich löschen?',
    header: 'Sichtung löschen',
    icon: 'pi pi-exclamation-triangle',
    acceptProps: { label: 'Löschen', severity: 'danger' },
    rejectProps: { label: 'Abbrechen', severity: 'secondary', text: true },
    accept: () => store.remove(sighting),
  })
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>Entdeckungen</h1>
        <span class="muted">{{ store.sightings.length }} Sichtungen</span>
      </div>
      <Button label="Neue Sichtung" icon="pi pi-plus" @click="openNew" />
    </div>

    <div v-if="store.byGroup.size" class="groups">
      <section v-for="[group, sightings] in store.byGroup" :key="group" class="card group-card">
        <h2 class="group-title">{{ sightingGroupIcons[group] }} {{ sightingGroupLabels[group] }} ({{ sightings.length }})</h2>
        <div class="photo-grid">
          <button
            v-for="sighting in sightings"
            :key="sighting.id"
            type="button"
            class="photo-tile"
            @click="openEdit(sighting)"
          >
            <PhotoImg v-if="sighting.photoId" :photo-id="sighting.photoId" />
            <span class="photo-caption">{{ sighting.species || formatDate(sighting.date) }}</span>
          </button>
        </div>
      </section>
    </div>

    <div v-else class="empty-state">
      <i class="pi pi-camera" />
      <p>Noch keine Entdeckungen. Fotografiere Insekten oder Vögel in deinem Garten und sammle sie hier.</p>
    </div>

    <SightingDialog v-model:visible="dialogVisible" :initial="editingSighting" @save="save" @delete="removeCurrent" />
  </div>
</template>

<style scoped>
.groups {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 640px;
}

.group-title {
  margin: 0 0 0.6rem;
  font-size: 1rem;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 0.5rem;
}

.photo-tile {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
}

.photo-tile :deep(.photo-img) {
  height: 90px;
  border-radius: var(--app-radius);
}

.photo-caption {
  font-size: 0.8rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
