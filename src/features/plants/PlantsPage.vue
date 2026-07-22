<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import type { Plant, PlantCategory } from '../../data'
import Select from 'primevue/select'
import { categoryColors, categoryLabels, formatMonths, sunlightLabels } from '../../shared/texts'
import { todayIso } from '../../shared/dates'
import PhotoImg from '../../shared/PhotoImg.vue'
import PlantBeneficialBadge from './PlantBeneficialBadge.vue'
import { useBedsStore } from '../beds/bedsStore'
import { useTasksStore } from '../tasks/tasksStore'
import { usePlantsStore, type PlantDraft } from './plantsStore'
import { loadCatalog, searchCatalog, catalogPlantToDraft, normalizeBotanical } from './catalogApi'
import type { CatalogPlant } from './catalogTypes'
import PlantFormDialog from './PlantFormDialog.vue'
import CatalogSearchDialog from './CatalogSearchDialog.vue'

const store = usePlantsStore()
const bedsStore = useBedsStore()
const tasksStore = useTasksStore()
const router = useRouter()

const filter = ref('')
const sortBy = ref<'name' | 'standort'>('name')
const dialogVisible = ref(false)
const catalogVisible = ref(false)
const initialDraft = ref<PlantDraft | null>(null)

// Zugeklappte Kategorien: modul-lokal, damit der Zustand beim Zurückkommen
// von der Detailseite erhalten bleibt. Standard: alles zugeklappt.
const collapsed = ref(new Set<PlantCategory>(Object.keys(categoryLabels) as PlantCategory[]))

const sortOptions = [
  { label: 'Name', value: 'name' },
  { label: 'Standort', value: 'standort' },
]

// Kategorie-Tönung wie im Design-System: Kategorie-Farbe mit 13 % Alpha
function tint(category: PlantCategory): string {
  return `${categoryColors[category]}22`
}

// Katalog-Vorschläge: während der Suche im mitgelieferten Katalog (657 Pflanzen)
// nach passenden Arten suchen, die noch nicht in der Bibliothek stehen.
const catalogEntries = ref<CatalogPlant[]>([])
onMounted(async () => {
  try {
    catalogEntries.value = await loadCatalog()
  } catch {
    /* Katalog nicht ladbar (offline/Fehler) → dann eben keine Vorschläge */
  }
})

const librarySet = computed(
  () => new Set(store.plants.map((p) => normalizeBotanical(p.botanicalName)).filter(Boolean)),
)

const catalogSuggestions = computed(() => {
  const q = filter.value.trim()
  if (q.length < 2 || !catalogEntries.value.length) return []
  return searchCatalog(catalogEntries.value, q, {}, 12)
    .filter((e) => !librarySet.value.has(normalizeBotanical(e.botanicalName)))
    .slice(0, 5)
})

function addFromCatalog(entry: CatalogPlant) {
  openImport(catalogPlantToDraft(entry))
  filter.value = ''
}

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

// Vom Katalog-Dialog genutzt: Entwurf ins Formular übernehmen
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
        <h1 class="page-title">Pflanzen</h1>
        <span class="muted">{{ store.plants.length }} in der Bibliothek</span>
      </div>
      <div class="header-actions">
        <button
          type="button"
          class="circle-glass-btn"
          aria-label="Pflanzenkatalog durchstöbern"
          title="Pflanzenkatalog"
          @click="catalogVisible = true"
        >
          <i class="ph-fill ph-books" />
        </button>
        <button type="button" class="round-icon-btn" aria-label="Neue Pflanze" @click="openNew">
          <i class="ph-bold ph-plus" />
        </button>
      </div>
    </div>

    <div class="toolbar">
      <div class="search-field">
        <i class="ph-bold ph-magnifying-glass" />
        <InputText v-model="filter" placeholder="Pflanze suchen …" unstyled class="search-input" />
      </div>
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

    <!-- Katalog-Vorschläge während der Suche (Arten, die noch nicht in der Bibliothek sind) -->
    <div v-if="catalogSuggestions.length" class="catalog-suggestions card">
      <div class="cs-head"><i class="ph-fill ph-books" /> Aus dem Katalog hinzufügen</div>
      <button
        v-for="entry in catalogSuggestions"
        :key="entry.id"
        type="button"
        class="cs-item"
        @click="addFromCatalog(entry)"
      >
        <span class="cs-emoji" :style="{ background: tint(entry.category) }">🌿</span>
        <span class="cs-text">
          <span class="cs-name">{{ entry.name }}</span>
          <span v-if="entry.botanicalName" class="cs-bot">{{ entry.botanicalName }}</span>
        </span>
        <i class="ph-bold ph-plus cs-add" />
      </button>
    </div>

    <div v-if="groupedPlants.length" class="groups">
      <section v-for="group in groupedPlants" :key="group.category" class="category-group">
        <button
          class="category-banner"
          :aria-expanded="isOpen(group.category)"
          @click="toggle(group.category)"
        >
          <span class="cat-dot" :style="{ background: group.color }" />
          <span class="cat-label">{{ group.label }}</span>
          <span class="cat-count">{{ group.plants.length }}</span>
          <i class="ph-bold cat-chevron" :class="isOpen(group.category) ? 'ph-caret-down' : 'ph-caret-right'" />
        </button>

        <div v-show="isOpen(group.category)" class="plant-grid">
          <button v-for="plant in group.plants" :key="plant.id" class="plant-card" @click="openDetail(plant)">
            <PhotoImg v-if="plant.photoId" :photo-id="plant.photoId" class="plant-img" />
            <img v-else-if="plant.imageUrl" :src="plant.imageUrl" alt="" class="plant-img" loading="lazy" />
            <div v-else class="plant-img plant-img-empty" :style="{ background: tint(plant.category) }">🌿</div>
            <div class="plant-name">{{ plant.name }}</div>
            <div v-if="plant.botanicalName" class="plant-botanical">{{ plant.botanicalName }}</div>
            <div class="plant-care">
              <span v-if="plant.wateringIntervalDays" class="plant-water">
                <i class="ph-fill ph-drop" />alle {{ plant.wateringIntervalDays }} Tage
              </span>
              <span v-if="plant.sunlight">☀️ {{ sunlightLabels[plant.sunlight] }}</span>
            </div>
            <div v-if="plant.sowingMonths.length || plant.harvestMonths.length" class="plant-care">
              <span v-if="plant.sowingMonths.length">🌱 {{ formatMonths(plant.sowingMonths) }}</span>
              <span v-if="plant.harvestMonths.length">🧺 {{ formatMonths(plant.harvestMonths) }}</span>
            </div>
            <PlantBeneficialBadge v-if="plant.botanicalName" :botanical-name="plant.botanicalName" />
          </button>
        </div>
      </section>
    </div>

    <div v-else class="empty-state">
      <i class="ph-fill ph-potted-plant" />
      <p v-if="store.plants.length">Keine Treffer für „{{ filter }}“.</p>
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
    <CatalogSearchDialog v-model:visible="catalogVisible" @import="openImport" />
  </div>
</template>

<style scoped>
.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

/* Glas-Suchfeld (16px Schrift: verhindert iOS-Zoom) */
.search-field {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--surface-card);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-m);
  padding: 11px 14px;
  box-shadow: var(--shadow-glow);
  border: 1px solid var(--border-soft);
}
.search-field > i {
  color: var(--text-3);
  font-size: 17px;
}
.search-input {
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 16px;
  flex: 1;
  min-width: 0;
  color: var(--text-1);
}

.sort-field {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sort-field label {
  font-size: 13px;
  font-weight: 600;
}

/* Katalog-Vorschläge (Autocomplete aus dem 657er-Katalog) */
.catalog-suggestions {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cs-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-3);
  padding: 2px 4px 6px;
}
.cs-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  border: none;
  background: transparent;
  cursor: pointer;
  font: inherit;
  color: inherit;
  text-align: left;
  padding: 8px 4px;
  border-radius: var(--radius-s);
  transition: background var(--dur-fast) var(--ease-out);
}
.cs-item:hover {
  background: var(--surface-tint);
}
.cs-emoji {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 18px;
  flex: none;
}
.cs-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.cs-name {
  font-weight: 700;
  font-size: 14px;
}
.cs-bot {
  font-size: 12px;
  color: var(--text-3);
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cs-add {
  color: var(--accent);
  font-size: 16px;
  flex: none;
}

.groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Kategorie-Zeile als Glas-Pille */
.category-banner {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: var(--surface-card);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-m);
  box-shadow: var(--shadow-glow);
  font: inherit;
  color: inherit;
  cursor: pointer;
  transition: filter var(--dur-fast) var(--ease-out);
}
.category-banner:hover {
  filter: brightness(var(--hover-brightness));
}

.cat-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.cat-label {
  font-weight: 800;
  font-size: 15px;
}

.cat-count {
  background: var(--surface-tint);
  color: var(--text-2);
  border-radius: var(--radius-pill);
  padding: 1px 10px;
  font-size: 12px;
  font-weight: 700;
}

.cat-chevron {
  margin-left: auto;
  color: var(--text-3);
}

/* Pflanzenkarten: kompaktes Grid wie im Prototyp */
.plant-grid {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.plant-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: inherit;
  border: none;
  background: var(--surface-card);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-l);
  padding: 16px;
  box-shadow: var(--shadow-glow), var(--shadow-card);
  transition: all var(--dur-fast) var(--ease-out);
}
.plant-card:hover {
  filter: brightness(var(--hover-brightness));
}
.plant-card:active {
  transform: scale(var(--press-scale));
}

/* Direktkind-Selektor überschreibt die Standardgröße von PhotoImg (.photo-img) */
.plant-card > .plant-img {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  object-fit: cover;
  flex-shrink: 0;
  margin-bottom: 8px;
}

.plant-img-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
}

.plant-name {
  font-weight: 800;
  font-size: 15px;
}

.plant-botanical {
  font-size: 12px;
  color: var(--text-3);
  font-style: italic;
}

.plant-care {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  margin-top: 6px;
}
.plant-water {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 700;
  color: var(--info);
}

</style>
