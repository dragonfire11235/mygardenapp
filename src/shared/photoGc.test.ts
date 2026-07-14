import { beforeEach, describe, expect, it } from 'vitest'
import { DexieProvider } from '../data/dexie/DexieProvider'
import { createEntity, type DiaryEntry, type Photo, type Plant } from '../data'
import { deleteOrphanPhotos } from './photoGc'

function makePhoto(): Photo {
  return createEntity<Photo>({ blob: new Blob(['x'], { type: 'image/jpeg' }), mimeType: 'image/jpeg' })
}

function makePlant(photoId: string | null): Plant {
  return createEntity<Plant>({
    name: 'Tomate',
    botanicalName: '',
    category: 'gemuese',
    imageUrl: '',
    photoId,
    wateringIntervalDays: null,
    fertilizingIntervalDays: null,
    wateringStartDate: null,
    spreadM: null,
    sowingMonths: [],
    harvestMonths: [],
    bloomMonths: [],
    pruningMonths: [],
    sunlight: null,
    notes: '',
    trefleId: null,
  })
}

function makeDiaryEntry(photoIds: string[]): DiaryEntry {
  return createEntity<DiaryEntry>({
    date: '2026-07-07',
    title: 'Eintrag',
    text: '',
    plantIds: [],
    bedIds: [],
    photoIds,
  })
}

let provider: DexieProvider
let dbCounter = 0

beforeEach(() => {
  provider = new DexieProvider(`gc-test-${++dbCounter}`)
})

describe('deleteOrphanPhotos', () => {
  it('entfernt Fotos ohne Referenz und behält referenzierte', async () => {
    const kept = makePhoto()
    const orphan = makePhoto()
    await provider.photos.bulkPut([kept, orphan])
    await provider.plants.put(makePlant(kept.id))

    const deleted = await deleteOrphanPhotos(provider)

    expect(deleted).toBe(1)
    expect(await provider.photos.getById(kept.id)).toBeDefined()
    expect(await provider.photos.getById(orphan.id)).toBeUndefined()
  })

  it('zählt Tagebuch-Fotos und Settings-Bilder als Referenzen', async () => {
    const diaryPhoto = makePhoto()
    const headerPhoto = makePhoto()
    const backgroundPhoto = makePhoto()
    await provider.photos.bulkPut([diaryPhoto, headerPhoto, backgroundPhoto])
    await provider.diary.put(makeDiaryEntry([diaryPhoto.id]))
    await provider.setSetting('dashboardHeaderPhotoId', headerPhoto.id)
    await provider.setSetting('dashboardBackgroundPhotoId', backgroundPhoto.id)

    const deleted = await deleteOrphanPhotos(provider)

    expect(deleted).toBe(0)
    expect(await provider.photos.getAll()).toHaveLength(3)
  })

  it('behält Fotos soft-gelöschter Entitäten (für Sync/Restore)', async () => {
    const photo = makePhoto()
    const plant = makePlant(photo.id)
    await provider.photos.put(photo)
    await provider.plants.put(plant)
    await provider.plants.softDelete(plant.id)

    const deleted = await deleteOrphanPhotos(provider)

    expect(deleted).toBe(0)
    expect(await provider.photos.getById(photo.id)).toBeDefined()
  })

  it('tut nichts bei leerer Foto-Tabelle', async () => {
    expect(await deleteOrphanPhotos(provider)).toBe(0)
  })
})
