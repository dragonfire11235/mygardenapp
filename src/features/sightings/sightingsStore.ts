import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { createEntity, storage, touch, type Sighting, type SightingGroup } from '../../data'
import { deletePhoto } from '../../shared/photos'

export type SightingDraft = Omit<Sighting, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>

export const useSightingsStore = defineStore('sightings', () => {
  const sightings = ref<Sighting[]>([])
  const loaded = ref(false)

  const sortedSightings = computed(() =>
    [...sightings.value].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
  )

  const byId = computed(() => new Map(sightings.value.map((s) => [s.id, s])))

  const byGroup = computed(() => {
    const map = new Map<SightingGroup, Sighting[]>()
    for (const s of sortedSightings.value) {
      const list = map.get(s.group) ?? []
      list.push(s)
      map.set(s.group, list)
    }
    return map
  })

  async function load() {
    sightings.value = await storage.sightings.getAll()
    loaded.value = true
  }

  async function create(draft: SightingDraft) {
    await storage.sightings.put(createEntity<Sighting>(draft))
    await load()
  }

  async function update(sighting: Sighting) {
    await storage.sightings.put(touch(sighting))
    await load()
  }

  async function remove(sighting: Sighting) {
    // Foto gehört nur zu dieser Sichtung → endgültig mit entfernen
    if (sighting.photoId) await deletePhoto(sighting.photoId)
    await storage.sightings.softDelete(sighting.id)
    await load()
  }

  return { sightings, sortedSightings, byId, byGroup, loaded, load, create, update, remove }
})
