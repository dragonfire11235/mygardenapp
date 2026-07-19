<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
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
const router = useRouter()

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

// Datums-Kachel: Tag + Kurzmonat (z. B. „15 / Jul")
function dayOf(date: string): string {
  return String(new Date(date).getDate())
}
function monthOf(date: string): string {
  return new Date(date).toLocaleDateString('de-DE', { month: 'short' }).replace('.', '')
}

function openNew() {
  editingEntry.value = null
  dialogVisible.value = true
}

function openDetail(entry: DiaryEntry) {
  router.push(`/tagebuch/${entry.id}`)
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
    icon: 'ph-fill ph-warning',
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
        <h1 class="page-title">Tagebuch</h1>
        <span class="muted">{{ store.entries.length }} Einträge</span>
      </div>
      <button type="button" class="pill-btn entry-btn" @click="openNew">
        <i class="ph-bold ph-plus" /> Eintrag
      </button>
    </div>

    <div v-if="store.sortedEntries.length" class="timeline">
      <article v-for="entry in store.sortedEntries" :key="entry.id" class="card entry" @click="openDetail(entry)">
        <div class="date-tile">
          <div class="date-day">{{ dayOf(entry.date) }}</div>
          <div class="date-month">{{ monthOf(entry.date) }}</div>
        </div>
        <div class="entry-main">
          <header class="entry-header">
            <span class="entry-title">{{ entry.title || formatDate(entry.date) }}</span>
            <Button
              v-if="sharePublisher"
              icon="ph-bold ph-share-network"
              text
              rounded
              size="small"
              severity="secondary"
              aria-label="Teilen"
              title="Eintrag teilen"
              @click.stop="share(entry)"
            />
          </header>
          <p v-if="entry.text" class="entry-text">{{ entry.text }}</p>
          <div v-if="entry.photoIds.length" class="entry-photos">
            <PhotoImg v-for="photoId in entry.photoIds" :key="photoId" :photo-id="photoId" />
          </div>
          <div v-if="tagNames(entry).length" class="entry-tags">
            <span v-for="name in tagNames(entry)" :key="name" class="entry-tag">{{ name }}</span>
          </div>
        </div>
      </article>
    </div>

    <div v-else class="empty-state">
      <i class="ph-fill ph-book-open" />
      <p>Noch keine Einträge. Halte fest, was in deinem Garten passiert — gern mit Foto.</p>
    </div>

    <DiaryEntryDialog v-model:visible="dialogVisible" :initial="editingEntry" @save="save" @delete="removeCurrent" />
  </div>
</template>

<style scoped>
.entry-btn {
  font-size: 14px;
  padding: 10px 18px;
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 640px;
}

.entry {
  cursor: pointer;
  display: flex;
  gap: 14px;
  transition: filter var(--dur-fast) var(--ease-out);
}
.entry:hover {
  filter: brightness(var(--hover-brightness));
}

/* Datums-Kachel links */
.date-tile {
  flex: none;
  width: 52px;
  text-align: center;
  background: var(--surface-tint);
  border-radius: 16px;
  padding: 8px 4px;
  height: fit-content;
}
.date-day {
  font-size: 19px;
  font-weight: 800;
  color: var(--text-brand);
}
.date-month {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-2);
}

.entry-main {
  flex: 1;
  min-width: 0;
}

.entry-header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}

.entry-title {
  font-weight: 800;
  font-size: 15px;
}

.entry-text {
  margin: 2px 0 0;
  white-space: pre-wrap;
  font-size: 14px;
  color: var(--text-2);
}

.entry-photos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
  margin-top: 10px;
}
.entry-photos :deep(img) {
  border-radius: 16px;
}

.entry-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 10px;
}
.entry-tag {
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
}
</style>
