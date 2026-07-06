import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { createEntity, storage, touch, type Plant } from '../../data'

export type PlantDraft = Omit<Plant, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>

export function emptyPlantDraft(): PlantDraft {
  return {
    name: '',
    botanicalName: '',
    category: 'gemuese',
    imageUrl: '',
    photoId: null,
    wateringIntervalDays: null,
    fertilizingIntervalDays: null,
    sowingMonths: [],
    harvestMonths: [],
    sunlight: null,
    notes: '',
    trefleId: null,
  }
}

export const usePlantsStore = defineStore('plants', () => {
  const plants = ref<Plant[]>([])
  const loaded = ref(false)

  const byId = computed(() => new Map(plants.value.map((p) => [p.id, p])))

  async function load() {
    plants.value = (await storage.plants.getAll()).sort((a, b) => a.name.localeCompare(b.name, 'de'))
    loaded.value = true
  }

  async function create(draft: PlantDraft): Promise<Plant> {
    const plant = createEntity<Plant>(draft)
    await storage.plants.put(plant)
    await load()
    return plant
  }

  async function update(plant: Plant) {
    await storage.plants.put(touch(plant))
    await load()
  }

  async function remove(id: string) {
    await storage.plants.softDelete(id)
    await load()
  }

  return { plants, loaded, byId, load, create, update, remove }
})
