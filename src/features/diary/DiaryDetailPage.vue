<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { formatDate } from '../../shared/dates'
import PhotoImg from '../../shared/PhotoImg.vue'
import { usePlantsStore } from '../plants/plantsStore'
import { useBedsStore } from '../beds/bedsStore'
import { useDiaryStore, type DiaryDraft } from './diaryStore'
import { diaryEntryToPayload, publishers } from './socialShare'
import DiaryEntryDialog from './DiaryEntryDialog.vue'

const route = useRoute()
const router = useRouter()
const store = useDiaryStore()
const plantsStore = usePlantsStore()
const bedsStore = useBedsStore()
const confirm = useConfirm()
const toast = useToast()

const entryId = computed(() => route.params.id as string)
const entry = computed(() => store.byId.get(entryId.value) ?? null)

const editVisible = ref(false)

const linkedPlants = computed(() =>
  (entry.value?.plantIds ?? [])
    .map((id) => plantsStore.byId.get(id))
    .filter((p): p is NonNullable<typeof p> => !!p),
)
const linkedBeds = computed(() =>
  (entry.value?.bedIds ?? [])
    .map((id) => bedsStore.bedById.get(id))
    .filter((b): b is NonNullable<typeof b> => !!b),
)

const sharePublisher = publishers.find((p) => p.isAvailable()) ?? null

async function saveEdit(draft: DiaryDraft) {
  if (entry.value) await store.update({ ...entry.value, ...draft })
}

function removeEntry() {
  const e = entry.value
  if (!e) return
  confirm.require({
    message: 'Eintrag samt Fotos wirklich löschen?',
    header: 'Eintrag löschen',
    icon: 'pi pi-exclamation-triangle',
    acceptProps: { label: 'Löschen', severity: 'danger' },
    rejectProps: { label: 'Abbrechen', severity: 'secondary', text: true },
    accept: async () => {
      await store.remove(e)
      router.push('/tagebuch')
    },
  })
}

async function share() {
  const e = entry.value
  if (!e || !sharePublisher) return
  const tags = [...linkedPlants.value.map((p) => p.name), ...linkedBeds.value.map((b) => b.name)]
  try {
    await sharePublisher.publish(await diaryEntryToPayload(e, tags))
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    toast.add({ severity: 'error', summary: 'Teilen fehlgeschlagen', detail: err instanceof Error ? err.message : String(err), life: 4000 })
  }
}
</script>

<template>
  <div class="page">
    <Button
      label="Tagebuch"
      icon="pi pi-arrow-left"
      text
      severity="secondary"
      class="back-btn"
      @click="router.push('/tagebuch')"
    />

    <template v-if="entry">
      <article class="card entry-detail">
        <header class="entry-head">
          <div>
            <h1>{{ entry.title || formatDate(entry.date) }}</h1>
            <p class="muted date">📅 {{ formatDate(entry.date) }}</p>
          </div>
          <div class="head-actions">
            <Button label="Bearbeiten" icon="pi pi-pencil" size="small" @click="editVisible = true" />
            <Button
              v-if="sharePublisher"
              label="Teilen"
              icon="pi pi-share-alt"
              size="small"
              severity="secondary"
              outlined
              @click="share"
            />
            <Button label="Löschen" icon="pi pi-trash" size="small" severity="danger" outlined @click="removeEntry" />
          </div>
        </header>

        <p v-if="entry.text" class="entry-text">{{ entry.text }}</p>

        <div v-if="entry.photoIds.length" class="entry-photos">
          <PhotoImg v-for="photoId in entry.photoIds" :key="photoId" :photo-id="photoId" class="entry-photo" />
        </div>

        <div v-if="linkedPlants.length || linkedBeds.length" class="links">
          <RouterLink v-for="p in linkedPlants" :key="p.id" :to="`/pflanzen/${p.id}`" class="link-chip">🌿 {{ p.name }}</RouterLink>
          <RouterLink v-for="b in linkedBeds" :key="b.id" :to="`/beete/${b.id}`" class="link-chip">🟫 {{ b.name }}</RouterLink>
        </div>
      </article>

      <DiaryEntryDialog v-model:visible="editVisible" :initial="entry" @save="saveEdit" @delete="removeEntry" />
    </template>

    <div v-else-if="store.loaded" class="empty-state">
      <i class="pi pi-pencil" />
      <p>Diesen Eintrag gibt es nicht (mehr).</p>
    </div>
  </div>
</template>

<style scoped>
.back-btn {
  margin-bottom: 0.5rem;
  padding-left: 0;
}

.entry-detail {
  max-width: 640px;
}

.entry-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.entry-head h1 {
  font-size: 1.4rem;
}

.date {
  margin: 0.2rem 0 0;
}

.head-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.entry-text {
  margin: 1rem 0 0;
  white-space: pre-wrap;
  line-height: 1.5;
}

.entry-photos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.6rem;
  margin-top: 1rem;
}

.entry-detail .entry-photo {
  width: 100%;
  border-radius: 10px;
}

.links {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-top: 1rem;
}

.link-chip {
  border: 1px solid var(--app-border);
  border-radius: 999px;
  padding: 0.2rem 0.7rem;
  font-size: 0.85rem;
  color: inherit;
  text-decoration: none;
}

.link-chip:hover {
  border-color: var(--app-accent);
  color: var(--app-accent);
}
</style>
