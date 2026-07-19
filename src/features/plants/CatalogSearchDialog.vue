<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import type { PlantCategory } from '../../data'
import { categoryLabels, formatMonths, sunlightLabels } from '../../shared/texts'
import { catalogPlantToDraft, loadCatalog, searchCatalog } from './catalogApi'
import type { CatalogPlant } from './catalogTypes'
import { activeGroups, scoreLabel } from './beneficials'
import type { PlantDraft } from './plantsStore'

const emit = defineEmits<{
  import: [draft: PlantDraft]
}>()

const visible = defineModel<boolean>('visible', { required: true })

const entries = ref<CatalogPlant[]>([])
const loading = ref(false)
const error = ref('')
const query = ref('')
const category = ref<PlantCategory | null>(null)

// Beim ersten Öffnen den Katalog laden (danach modulweit gecached)
watch(visible, async (open) => {
  if (!open || entries.value.length || loading.value) return
  loading.value = true
  error.value = ''
  try {
    entries.value = await loadCatalog()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Katalog konnte nicht geladen werden.'
  } finally {
    loading.value = false
  }
})

const results = computed(() =>
  searchCatalog(entries.value, query.value, { category: category.value ?? undefined }),
)

const categoryOptions = (Object.keys(categoryLabels) as PlantCategory[]).map((value) => ({
  value,
  label: categoryLabels[value],
}))

function toggleCategory(value: PlantCategory) {
  category.value = category.value === value ? null : value
}

function importEntry(entry: CatalogPlant) {
  emit('import', catalogPlantToDraft(entry))
  visible.value = false
}

function careHint(entry: CatalogPlant): string[] {
  const parts: string[] = []
  if (entry.sunlight) parts.push(`☀️ ${sunlightLabels[entry.sunlight]}`)
  if (entry.wateringIntervalDays) parts.push(`💧 alle ${entry.wateringIntervalDays} T`)
  if (entry.sowingMonths?.length) parts.push(`🌱 ${formatMonths(entry.sowingMonths)}`)
  if (entry.harvestMonths?.length) parts.push(`🧺 ${formatMonths(entry.harvestMonths)}`)
  return parts
}
</script>

<template>
  <Dialog v-model:visible="visible" modal header="Pflanzen-Katalog" :style="{ width: 'min(600px, 95vw)' }">
    <div class="search-row">
      <InputText v-model="query" placeholder="Name suchen … z. B. Tomate, Salbei, Aquilegia" class="search-input" autofocus />
    </div>

    <div class="cat-chips">
      <button
        v-for="opt in categoryOptions"
        :key="opt.value"
        class="chip"
        :class="{ active: category === opt.value }"
        @click="toggleCategory(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>

    <p class="muted hint">
      Offline-Katalog · {{ entries.length }} Pflanzen. Pflegewerte sind Richtwerte und im Formular anpassbar.
    </p>

    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

    <div v-if="loading" class="loading">
      <ProgressSpinner style="width: 40px; height: 40px" />
      <span class="muted">Katalog wird geladen …</span>
    </div>

    <div v-else class="results">
      <div v-for="entry in results" :key="entry.id" class="result">
        <img v-if="entry.imageUrl" :src="entry.imageUrl" alt="" class="result-img" loading="lazy" referrerpolicy="no-referrer" />
        <div v-else class="result-img result-img-empty">🌿</div>
        <div class="result-text">
          <div class="result-title">
            <strong>{{ entry.name }}</strong>
            <Tag :value="categoryLabels[entry.category]" severity="success" />
          </div>
          <span class="muted botanical">{{ entry.botanicalName }}</span>
          <div v-if="careHint(entry).length" class="care muted">
            <span v-for="(p, i) in careHint(entry)" :key="i">{{ p }}</span>
          </div>
          <div v-if="entry.beneficialScore" class="beneficials" :title="`Nützlings-Score ${entry.beneficialScore}/5 (Schätzung, Quelle GloBI)`">
            <span v-for="g in activeGroups(entry.beneficials)" :key="g.group.key">{{ g.group.icon }}</span>
            <span class="ben-score">Nützlinge: {{ scoreLabel(entry.beneficialScore) }}</span>
          </div>
          <a v-if="entry.infoUrl" :href="entry.infoUrl" target="_blank" rel="noopener noreferrer" class="info-link">
            Mehr Infos ↗
          </a>
        </div>
        <Button label="Übernehmen" size="small" severity="secondary" @click="importEntry(entry)" />
      </div>
      <p v-if="!results.length && !error" class="muted">Keine Treffer.</p>
    </div>
  </Dialog>
</template>

<style scoped>
.search-row {
  display: flex;
  gap: 0.5rem;
}

.search-input {
  flex: 1;
}

.cat-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.6rem;
}

.chip {
  border: 1px solid var(--border-soft);
  background: var(--surface-card-solid);
  border-radius: 999px;
  padding: 0.2rem 0.7rem;
  font: inherit;
  font-size: 0.85rem;
  color: inherit;
  cursor: pointer;
}

.chip:hover {
  border-color: var(--accent);
}

.chip.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.hint {
  font-size: 0.8rem;
  margin: 0.5rem 0 0.25rem;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem 0;
}

.results {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
  max-height: 55vh;
  overflow-y: auto;
}

.result {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  padding: 0.5rem;
}

.result-img {
  width: 52px;
  height: 52px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.result-img-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  background: var(--bg-app);
}

.result-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
  gap: 0.1rem;
}

.result-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.botanical {
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.care {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  font-size: 0.85rem;
}

.beneficials {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.85rem;
}

.ben-score {
  color: var(--text-2);
  font-size: 0.78rem;
}

.info-link {
  font-size: 0.8rem;
  color: var(--accent);
}
</style>
