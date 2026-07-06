import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { createEntity, storage, touch, type DiaryEntry, type Photo } from '../../data'
import { resizeImage } from './photoUtils'

export type DiaryDraft = Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>

export const useDiaryStore = defineStore('diary', () => {
  const entries = ref<DiaryEntry[]>([])
  const loaded = ref(false)
  /** Objekt-URLs pro Foto-ID (werden lazy erzeugt) */
  const photoUrls = ref<Record<string, string>>({})

  const sortedEntries = computed(() =>
    [...entries.value].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
  )

  async function load() {
    entries.value = await storage.diary.getAll()
    loaded.value = true
  }

  async function photoUrl(photoId: string): Promise<string | null> {
    if (photoUrls.value[photoId]) return photoUrls.value[photoId]
    const photo = await storage.photos.getById(photoId)
    if (!photo) return null
    const url = URL.createObjectURL(photo.blob)
    photoUrls.value = { ...photoUrls.value, [photoId]: url }
    return url
  }

  /** Verkleinert und speichert ein Foto, gibt die Photo-ID zurück. */
  async function addPhoto(file: File): Promise<string> {
    const { blob, mimeType } = await resizeImage(file)
    const photo = createEntity<Photo>({ blob, mimeType })
    await storage.photos.put(photo)
    return photo.id
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
    for (const photoId of entry.photoIds) {
      await storage.photos.hardDelete(photoId)
      const url = photoUrls.value[photoId]
      if (url) URL.revokeObjectURL(url)
    }
    await storage.diary.softDelete(entry.id)
    await load()
  }

  return { entries, sortedEntries, loaded, load, photoUrl, addPhoto, create, update, remove }
})
