import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { createEntity, storage, touch, type DiaryEntry } from '../../data'
import { deletePhoto } from '../../shared/photos'

export type DiaryDraft = Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>

export const useDiaryStore = defineStore('diary', () => {
  const entries = ref<DiaryEntry[]>([])
  const loaded = ref(false)

  const sortedEntries = computed(() =>
    [...entries.value].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
  )

  const byId = computed(() => new Map(entries.value.map((e) => [e.id, e])))

  async function load() {
    entries.value = await storage.diary.getAll()
    loaded.value = true
  }

  async function create(draft: DiaryDraft) {
    await storage.diary.put(createEntity<DiaryEntry>(draft))
    await load()
  }

  async function update(entry: DiaryEntry) {
    await storage.diary.put(touch(entry))
    await load()
  }

  async function remove(entry: DiaryEntry) {
    // Fotos gehören nur zu diesem Eintrag → endgültig mit entfernen
    for (const photoId of entry.photoIds) await deletePhoto(photoId)
    await storage.diary.softDelete(entry.id)
    await load()
  }

  return { entries, sortedEntries, byId, loaded, load, create, update, remove }
})
