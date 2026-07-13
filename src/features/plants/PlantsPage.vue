<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Tag from 'primevue/tag'
import type { Plant, PlantCategory } from '../../data'
import Select from 'primevue/select'
import { categoryColors, categoryLabels, formatMonths, sunlightLabels } from '../../shared/texts'
import { todayIso } from '../../shared/dates'
import PhotoImg from '../../shared/PhotoImg.vue'
import { useBedsStore } from '../beds/bedsStore'
import { useTasksStore } from '../tasks/tasksStore'
import { usePlantsStore, type PlantDraft } from './plantsStore'
import PlantFormDialog from './PlantFormDialog.vue'
import TrefleSearchDialog from './TrefleSearchDialog.vue'
import CatalogSearchDialog from './CatalogSearchDialog.vue'

const store = usePlantsStore()
const bedsStore = useBedsStore()
const tasksStore = useTasksStore()
const router = useRouter()

const filter = ref('')
const sortBy = ref<'name' | 'standort'>('name')
const dialogVisible = ref(false)
const trefleVisible = ref(false)
const catalogVisible = ref(false)
const initialDraft = ref<PlantDraft | null>(null)

// Zugeklappte Kategorien: modul-lokal, damit der Zustand beim Zurückkommen
// von der Detailseite erhalten bleibt. Standard: alles zugeklappt.
const collapsed = ref(new Set<PlantCategory>(Object.keys(categoryLabels) as PlantCategory[]))

const sortOptions = [
  { label: 'Name', value: 'name' },
  { label: 'Standort', value: 'standort' },
]

const filteredPlants = computed(() => {
  const q = filter.value.trim().toLowerCase()
  const list = q
    ? store.plants.filter(
        (p) => p.name.toLowerCase().includes(q) || p.botanicalName.toLowerCase().includes(q),
      )
    : [...store.plants]

  return list.sort((a, b) => {
    if (sortBy.value === 'standort') {
      // Ohne Standort ans Ende
      const sa = a.sunlight ? sunlightLabels[a.sunlight] : 'zzz'
      const sb = b.sunlight ? sunlightLabels[b.sunlight] : 'zzz'
      const cmp = sa.localeCompare(sb, 'de')
      if (cmp !== 0) return cmp
    }
    return a.name.localeCompare(b.name, 'de')
  })
})

// Nach Kategorie gruppiert (feste Reihenfolge), nur Kategorien mit Treffern
const groupedPlants = computed(() => {
  const order = Object.keys(categoryLabels) as PlantCategory[]
  return order
    .map((category) => ({
      category,
      label: categoryLabels[category],
      color: categoryColors[category],
      plants: filteredPlants.value.filter((p) => p.category === category),
    }))
    .filter((g) => g.plants.length > 0)
})

const searching = computed(() => filter.value.trim().length > 0)

// Beim Suchen sind alle Treffer-Kategorien offen; sonst nach collapsed-Set
function isOpen(category: PlantCategory): boolean {
  return searching.value || !collapsed.value.has(category)
}

function toggle(category: PlantCategory) {
  const next = new Set(collapsed.value)
  if (next.has(category)) next.delete(category)
  else next.add(category)
  collapsed.value = next
}

function openNew() {
  initialDraft.value = null
  dialogVisible.value = true
}

function openDetail(plant: Plant) {
  router.push(`/pflanzen/${plant.id}`)
}

// Von Trefle- UND Katalog-Dialog genutzt: Entwurf ins Formular übernehmen
function openImport(draft: PlantDraft) {
  initialDraft.value = draft
  dialogVisible.value = true
}

async function save(draft: PlantDraft, bedIds: string[]) {
  // Auf dieser Seite wird nur neu angelegt; Bearbeiten passiert auf der Detailseite.
  const plant = await store.create(draft)
  // Optional gleich in Beete einsetzen (inkl. automatischer Pflegeaufgaben)
  for (const bedId of bedIds) {
    await bedsStore.addPlanting({ plantId: plant.id, bedId, quantity: 1, plantedAt: todayIso(), notes: '' })
  }
  if (bedIds.length) {
    await tasksStore.syncCareTasks(store.plants, bedsStore.activePlantings)
  }
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
        <Button label="Katalog" icon="pi pi-book" severity="secondary" outlined @click="catalogVisible = true" />
        <Button label="Online suchen" icon="pi pi-globe" severity="secondary" outlined @click="trefleVisible = true" />
        <Button label="Neue Pflanze" icon="pi pi-plus" @click="openNew" />
      </div>
    </div>

    <div class="toolbar">
      <InputText v-model="filter" placeholder="Bibliothek durchsuchen …" class="filter-input" />
      <div class="sort-field">
        <label for="plant-sort" class="muted">Sortieren</label>
        <Select
          id="plant-sort"
          v-model="sortBy"
          :options="sortOptions"
          option-label="label"
          option-value="value"
        />
      </div>
    </div>

    <div v-if="groupedPlants.length" class="groups">
      <section v-for="group in groupedPlants" :key="group.category" class="category-group">
        <button
          class="category-banner"
          :style="{ borderLeftColor: group.color }"
          :aria-expanded="isOpen(group.category)"
          @click="toggle(group.category)"
        >
          <span class="cat-dot" :style="{ background: group.color }" />
          <span class="cat-label">{{ group.label }}</span>
          <span class="cat-count muted">{{ group.plants.length }}</span>
          <i class="pi cat-chevron" :class="isOpen(group.category) ? 'pi-chevron-down' : 'pi-chevron-right'" />
        </button>

        <div v-show="isOpen(group.category)" class="card-grid category-cards">
          <button v-for="plant in group.plants" :key="plant.id" class="card plant-card" @click="openDetail(plant)">
            <PhotoImg v-if="plant.photoId" :photo-id="plant.photoId" class="plant-img" />
            <img v-else-if="plant.imageUrl" :src="plant.imageUrl" alt="" class="plant-img" loading="lazy" />
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
      </section>
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
      :editing="false"
      show-bed-assign
      @save="save"
    />
    <TrefleSearchDialog v-model:visible="trefleVisible" @import="openImport" />
    <CatalogSearchDialog v-model:visible="catalogVisible" @import="openImport" />
  </div>
</template>

<style scoped>
.header-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.toolbar {
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.filter-input {
  flex: 1;
  min-width: 180px;
}

.sort-field {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.sort-field label {
  font-size: 0.8rem;
}

.groups {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.category-banner {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 0.9rem;
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  border-left: 4px solid;
  border-radius: var(--app-radius);
  font: inherit;
  color: inherit;
  cursor: pointer;
}

.category-banner:hover {
  border-color: var(--app-accent);
}

.cat-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.cat-label {
  font-weight: 650;
}

.cat-count {
  background: var(--app-bg);
  border-radius: 999px;
  padding: 0.05rem 0.5rem;
  font-size: 0.8rem;
}

.cat-chevron {
  margin-left: auto;
  color: var(--app-text-muted);
}

.category-cards {
  margin-top: 0.6rem;
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

/* Direktkind-Selektor überschreibt die Standardgröße von PhotoImg (.photo-img) */
.plant-card > .plant-img {
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
