<script setup lang="ts">
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Tag from 'primevue/tag'
import { useConfirm } from 'primevue/useconfirm'
import type { Plant } from '../../data'
import { categoryLabels, formatMonths, sunlightLabels } from '../../shared/texts'
import { usePlantsStore, type PlantDraft } from './plantsStore'
import PlantFormDialog from './PlantFormDialog.vue'
import TrefleSearchDialog from './TrefleSearchDialog.vue'

const store = usePlantsStore()
const confirm = useConfirm()

const filter = ref('')
const dialogVisible = ref(false)
const trefleVisible = ref(false)
const editingPlant = ref<Plant | null>(null)
const initialDraft = ref<PlantDraft | null>(null)

const filteredPlants = computed(() => {
  const q = filter.value.trim().toLowerCase()
  if (!q) return store.plants
  return store.plants.filter(
    (p) => p.name.toLowerCase().includes(q) || p.botanicalName.toLowerCase().includes(q),
  )
})

function openNew() {
  editingPlant.value = null
  initialDraft.value = null
  dialogVisible.value = true
}

function openEdit(plant: Plant) {
  editingPlant.value = plant
  initialDraft.value = { ...plant }
  dialogVisible.value = true
}

function openTrefleImport(draft: PlantDraft) {
  editingPlant.value = null
  initialDraft.value = draft
  dialogVisible.value = true
}

async function save(draft: PlantDraft) {
  if (editingPlant.value) {
    await store.update({ ...editingPlant.value, ...draft })
  } else {
    await store.create(draft)
  }
}

function removeCurrent() {
  const plant = editingPlant.value
  if (!plant) return
  confirm.require({
    message: `„${plant.name}" wirklich löschen?`,
    header: 'Pflanze löschen',
    icon: 'pi pi-exclamation-triangle',
    acceptProps: { label: 'Löschen', severity: 'danger' },
    rejectProps: { label: 'Abbrechen', severity: 'secondary', text: true },
    accept: () => store.remove(plant.id),
  })
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>Pflanzen</h1>
        <span class="muted">{{ store.plants.length }} in der Bibliothek</span>
      </div>
      <div class="header-actions">
        <Button label="Online suchen" icon="pi pi-globe" severity="secondary" outlined @click="trefleVisible = true" />
        <Button label="Neue Pflanze" icon="pi pi-plus" @click="openNew" />
      </div>
    </div>

    <InputText v-model="filter" placeholder="Bibliothek durchsuchen …" class="filter-input" />

    <div v-if="filteredPlants.length" class="card-grid">
      <button v-for="plant in filteredPlants" :key="plant.id" class="card plant-card" @click="openEdit(plant)">
        <img v-if="plant.imageUrl" :src="plant.imageUrl" alt="" class="plant-img" loading="lazy" />
        <div v-else class="plant-img plant-img-empty">🌿</div>
        <div class="plant-info">
          <div class="plant-title">
            <strong>{{ plant.name }}</strong>
            <Tag :value="categoryLabels[plant.category]" severity="success" />
          </div>
          <span v-if="plant.botanicalName" class="muted plant-botanical">{{ plant.botanicalName }}</span>
          <div class="plant-care muted">
            <span v-if="plant.wateringIntervalDays">💧 alle {{ plant.wateringIntervalDays }} Tage</span>
            <span v-if="plant.fertilizingIntervalDays">🧪 alle {{ plant.fertilizingIntervalDays }} Tage</span>
            <span v-if="plant.sunlight">☀️ {{ sunlightLabels[plant.sunlight] }}</span>
          </div>
          <div v-if="plant.sowingMonths.length || plant.harvestMonths.length" class="plant-care muted">
            <span v-if="plant.sowingMonths.length">🌱 {{ formatMonths(plant.sowingMonths) }}</span>
            <span v-if="plant.harvestMonths.length">🧺 {{ formatMonths(plant.harvestMonths) }}</span>
          </div>
        </div>
      </button>
    </div>

    <div v-else class="empty-state">
      <i class="pi pi-book" />
      <p v-if="store.plants.length">Keine Treffer für „{{ filter }}".</p>
      <p v-else>
        Noch keine Pflanzen in der Bibliothek.<br />
        Lege die erste an — oder suche online danach.
      </p>
    </div>

    <PlantFormDialog
      v-model:visible="dialogVisible"
      :initial="initialDraft"
      :editing="editingPlant !== null"
      @save="save"
      @delete="removeCurrent"
    />
    <TrefleSearchDialog v-model:visible="trefleVisible" @import="openTrefleImport" />
  </div>
</template>

<style scoped>
.header-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.filter-input {
  width: 100%;
  margin-bottom: 1rem;
}

.plant-card {
  display: flex;
  gap: 0.85rem;
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: inherit;
}

.plant-card:hover {
  border-color: var(--app-accent);
}

.plant-img {
  width: 72px;
  height: 72px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
}

.plant-img-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  background: var(--app-bg);
}

.plant-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.plant-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.plant-botanical {
  font-style: italic;
}

.plant-care {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}
</style>
