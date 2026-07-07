import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { createEntity, storage, touch, type Bed, type Planting } from '../../data'
import { todayIso } from '../../shared/dates'

export const useBedsStore = defineStore('beds', () => {
  const beds = ref<Bed[]>([])
  const plantings = ref<Planting[]>([])
  const loaded = ref(false)

  const bedById = computed(() => new Map(beds.value.map((b) => [b.id, b])))

  /** Aktive (nicht entfernte) Bepflanzungen pro Beet */
  const activePlantingsByBed = computed(() => {
    const map = new Map<string, Planting[]>()
    for (const p of plantings.value) {
      if (p.removedAt !== null) continue
      const list = map.get(p.bedId) ?? []
      list.push(p)
      map.set(p.bedId, list)
    }
    return map
  })

  const activePlantings = computed(() => plantings.value.filter((p) => p.removedAt === null))

  async function load() {
    beds.value = (await storage.beds.getAll()).sort((a, b) => a.name.localeCompare(b.name, 'de'))
    plantings.value = await storage.plantings.getAll()
    loaded.value = true
  }

  async function createBed(data: Pick<Bed, 'name' | 'location' | 'sizeText' | 'notes' | 'photoId' | 'widthM' | 'heightM'>) {
    await storage.beds.put(createEntity<Bed>({ ...data, mapX: null, mapY: null }))
    await load()
  }

  async function updateBed(bed: Bed) {
    await storage.beds.put(touch(bed))
    await load()
  }

  async function removeBed(id: string) {
    // Aktive Bepflanzungen des Beets mit beenden
    for (const p of plantings.value) {
      if (p.bedId === id && p.removedAt === null) {
        await storage.plantings.put(touch({ ...p, removedAt: todayIso() }))
      }
    }
    await storage.beds.softDelete(id)
    await load()
  }

  async function addPlanting(
    data: Pick<Planting, 'plantId' | 'bedId' | 'quantity' | 'plantedAt' | 'notes'> &
      Partial<Pick<Planting, 'posX' | 'posY'>>,
  ) {
    await storage.plantings.put(
      createEntity<Planting>({ posX: null, posY: null, ...data, removedAt: null }),
    )
    await load()
  }

  /** Aktualisiert eine Bepflanzung (z. B. Position im Beetplaner). */
  async function updatePlanting(planting: Planting) {
    await storage.plantings.put(touch(planting))
    await load()
  }

  /** Beendet eine Bepflanzung (Pflanze entfernt/abgeerntet) */
  async function endPlanting(id: string) {
    const p = plantings.value.find((x) => x.id === id)
    if (!p) return
    await storage.plantings.put(touch({ ...p, removedAt: todayIso() }))
    await load()
  }

  return {
    beds,
    plantings,
    loaded,
    bedById,
    activePlantingsByBed,
    activePlantings,
    load,
    createBed,
    updateBed,
    removeBed,
    addPlanting,
    updatePlanting,
    endPlanting,
  }
})
