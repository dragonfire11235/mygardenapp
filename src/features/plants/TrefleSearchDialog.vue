<script setup lang="ts">
import { ref } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import { useSettingsStore } from '../settings/settingsStore'
import { searchTrefle, trefleResultToDraft, type TrefleResult } from './trefleApi'
import type { PlantDraft } from './plantsStore'

const emit = defineEmits<{
  import: [draft: PlantDraft]
}>()

const visible = defineModel<boolean>('visible', { required: true })

const settings = useSettingsStore()
const query = ref('')
const results = ref<TrefleResult[]>([])
const searching = ref(false)
const error = ref('')
const searched = ref(false)

async function search() {
  if (!query.value.trim()) return
  searching.value = true
  error.value = ''
  try {
    results.value = await searchTrefle(query.value.trim(), settings.trefleToken)
    searched.value = true
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unbekannter Fehler bei der Suche.'
    results.value = []
  } finally {
    searching.value = false
  }
}

function importResult(result: TrefleResult) {
  emit('import', trefleResultToDraft(result))
  visible.value = false
}
</script>

<template>
  <Dialog v-model:visible="visible" modal header="Online suchen (Trefle)" :style="{ width: 'min(560px, 95vw)' }">
    <Message v-if="!settings.trefleToken" severity="warn" :closable="false">
      Kein Trefle-Token hinterlegt. Du kannst ihn unter „Mehr → Einstellungen" eintragen.
    </Message>

    <div class="search-row">
      <InputText
        v-model="query"
        placeholder="z. B. tomato, basil, rose …"
        class="search-input"
        @keyup.enter="search"
      />
      <Button label="Suchen" icon="pi pi-search" :loading="searching" :disabled="!query.trim()" @click="search" />
    </div>
    <p class="muted">Tipp: Trefle kennt vor allem englische und botanische Namen.</p>

    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

    <div v-if="results.length" class="results">
      <div v-for="result in results" :key="result.id" class="result">
        <img v-if="result.imageUrl" :src="result.imageUrl" alt="" class="result-img" loading="lazy" />
        <div v-else class="result-img result-img-empty">🌿</div>
        <div class="result-text">
          <strong>{{ result.commonName || result.scientificName }}</strong>
          <span class="muted">{{ result.scientificName }}</span>
        </div>
        <Button label="Übernehmen" size="small" severity="secondary" @click="importResult(result)" />
      </div>
    </div>
    <p v-else-if="searched && !error && !searching" class="muted">Keine Treffer.</p>
  </Dialog>
</template>

<style scoped>
.search-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.search-input {
  flex: 1;
}

.results {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.75rem;
  max-height: 50vh;
  overflow-y: auto;
}

.result {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid var(--app-border);
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
  background: var(--app-bg);
}

.result-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.result-text .muted {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
