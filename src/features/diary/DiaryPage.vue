<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import type { DiaryEntry } from '../../data'
import { formatDate } from '../../shared/dates'
import { usePlantsStore } from '../plants/plantsStore'
import { useBedsStore } from '../beds/bedsStore'
import { useDiaryStore, type DiaryDraft } from './diaryStore'
import { diaryEntryToPayload, publishers } from './socialShare'
import DiaryEntryDialog from './DiaryEntryDialog.vue'
import PhotoImg from '../../shared/PhotoImg.vue'

const store = useDiaryStore()
const plantsStore = usePlantsStore()
const bedsStore = useBedsStore()
const confirm = useConfirm()
const toast = useToast()

// Aktuell nur Web-Share (Teilen-Menü des Geräts); Backend-Publisher docken
// später in socialShare.ts an.
const sharePublisher = publishers.find((p) => p.isAvailable()) ?? null

async function share(entry: DiaryEntry) {
  if (!sharePublisher) return
  try {
    await sharePublisher.publish(await diaryEntryToPayload(entry, tagNames(entry)))
  } catch (e) {
    // Abbruch durch den User ist kein Fehler
    if (e instanceof DOMException && e.name === 'AbortError') return
    toast.add({
      severity: 'error',
      summary: 'Teilen fehlgeschlagen',
      detail: e instanceof Error ? e.message : String(e),
      life: 4000,
    })
  }
}

const dialogVisible = ref(false)
const editingEntry = ref<DiaryEntry | null>(null)

function openNew() {
  editingEntry.value = null
  dialogVisible.value = true
}

function openEdit(entry: DiaryEntry) {
  editingEntry.value = entry
  dialogVisible.value = true
}

async function save(draft: DiaryDraft) {
  if (editingEntry.value) {
    await store.update({ ...editingEntry.value, ...draft })
  } else {
    await store.create(draft)
  }
}

function removeCurrent() {
  const entry = editingEntry.value
  if (!entry) return
  confirm.require({
    message: 'Eintrag samt Fotos wirklich löschen?',
    header: 'Eintrag löschen',
    icon: 'pi pi-exclamation-triangle',
    acceptProps: { label: 'Löschen', severity: 'danger' },
    rejectProps: { label: 'Abbrechen', severity: 'secondary', text: true },
    accept: () => store.remove(entry),
  })
}

function tagNames(entry: DiaryEntry): string[] {
  return [
    ...entry.plantIds.map((id) => plantsStore.byId.get(id)?.name).filter((n): n is string => !!n),
    ...entry.bedIds.map((id) => bedsStore.bedById.get(id)?.name).filter((n): n is string => !!n),
  ]
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>Tagebuch</h1>
        <span class="muted">{{ store.entries.length }} Einträge</span>
      </div>
      <Button label="Neuer Eintrag" icon="pi pi-plus" @click="openNew" />
    </div>

    <div v-if="store.sortedEntries.length" class="timeline">
      <article v-for="entry in store.sortedEntries" :key="entry.id" class="card entry" @click="openEdit(entry)">
        <header class="entry-header">
          <strong>{{ entry.title || formatDate(entry.date) }}</strong>
          <span class="entry-header-right">
            <span class="muted">{{ formatDate(entry.date) }}</span>
            <Button
              v-if="sharePublisher"
              icon="pi pi-share-alt"
              text
              rounded
              size="small"
              severity="secondary"
              aria-label="Teilen"
              title="Eintrag teilen"
              @click.stop="share(entry)"
            />
          </span>
        </header>
        <p v-if="entry.text" class="entry-text">{{ entry.text }}</p>
        <div v-if="entry.photoIds.length" class="entry-photos">
          <PhotoImg v-for="photoId in entry.photoIds" :key="photoId" :photo-id="photoId" />
        </div>
        <div v-if="tagNames(entry).length" class="entry-tags">
          <Tag v-for="name in tagNames(entry)" :key="name" :value="name" severity="success" />
        </div>
      </article>
    </div>

    <div v-else class="empty-state">
      <i class="pi pi-pencil" />
      <p>Noch keine Einträge. Halte fest, was in deinem Garten passiert — gern mit Foto.</p>
    </div>

    <DiaryEntryDialog v-model:visible="dialogVisible" :initial="editingEntry" @save="save" @delete="removeCurrent" />
  </div>
</template>

<style scoped>
.timeline {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 640px;
}

.entry {
  cursor: pointer;
}

.entry:hover {
  border-color: var(--app-accent);
}

.entry-header {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  align-items: center;
}

.entry-header-right {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.entry-text {
  margin: 0.4rem 0 0;
  white-space: pre-wrap;
}

.entry-photos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.5rem;
  margin-top: 0.6rem;
}

.entry-tags {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  margin-top: 0.6rem;
}
</style>
