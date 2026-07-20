import { beforeEach, describe, expect, it } from 'vitest'
import { createEntity, type Plant, type Sighting } from '../models'
import { DexieProvider } from './DexieProvider'

function makePlant(name: string): Plant {
  return createEntity<Plant>({
    name,
    botanicalName: '',
    category: 'gemuese',
    imageUrl: '',
    photoId: null,
    wateringIntervalDays: 3,
    fertilizingIntervalDays: null,
    wateringStartDate: null,
    spreadM: null,
    sowingMonths: [3, 4],
    harvestMonths: [8],
    bloomMonths: [],
    pruningMonths: [],
    sunlight: 'sonne',
    notes: '',
  })
}

function makeSighting(): Sighting {
  return createEntity<Sighting>({
    date: '2026-07-16',
    group: 'wildbee',
    species: 'Erdhummel',
    photoId: null,
    plantId: null,
    bedId: null,
    notes: '',
    source: 'manual',
  })
}

let provider: DexieProvider
let dbCounter = 0

beforeEach(() => {
  provider = new DexieProvider(`test-db-${++dbCounter}`)
})

describe('DexieProvider', () => {
  it('legt Entitäten an und liest sie zurück', async () => {
    const plant = makePlant('Tomate')
    await provider.plants.put(plant)

    const all = await provider.plants.getAll()
    expect(all).toHaveLength(1)
    expect(all[0].name).toBe('Tomate')
    expect(await provider.plants.getById(plant.id)).toMatchObject({ name: 'Tomate' })
  })

  it('liefert undefined für unbekannte IDs', async () => {
    expect(await provider.plants.getById('gibt-es-nicht')).toBeUndefined()
  })

  it('put überschreibt bestehende Entitäten (upsert)', async () => {
    const plant = makePlant('Tomate')
    await provider.plants.put(plant)
    await provider.plants.put({ ...plant, name: 'Cherrytomate' })

    const all = await provider.plants.getAll()
    expect(all).toHaveLength(1)
    expect(all[0].name).toBe('Cherrytomate')
  })

  it('bulkPut speichert mehrere Entitäten auf einmal', async () => {
    await provider.plants.bulkPut([makePlant('Tomate'), makePlant('Basilikum')])
    expect(await provider.plants.getAll()).toHaveLength(2)
  })

  it('blendet soft-gelöschte Einträge aus, behält sie aber für den Sync', async () => {
    const plant = makePlant('Gurke')
    await provider.plants.put(plant)
    await provider.plants.softDelete(plant.id)

    expect(await provider.plants.getAll()).toHaveLength(0)
    expect(await provider.plants.getById(plant.id)).toBeUndefined()

    // Im Export ist der Datensatz weiterhin enthalten (deletedAt gesetzt)
    const backup = await provider.exportAll(false)
    expect(backup.plants).toHaveLength(1)
    expect(backup.plants[0].deletedAt).not.toBeNull()
  })

  it('getAllForSync liefert Tombstones, getAll nicht', async () => {
    const a = makePlant('Aktiv')
    const b = makePlant('Gelöscht')
    await provider.plants.bulkPut([a, b])
    await provider.plants.softDelete(b.id)

    expect(await provider.plants.getAll()).toHaveLength(1)
    const forSync = await provider.plants.getAllForSync()
    expect(forSync).toHaveLength(2)
    expect(forSync.find((p) => p.id === b.id)?.deletedAt).not.toBeNull()
  })

  it('setzt beim Soft-Delete auch updatedAt neu (für späteren Sync)', async () => {
    const plant = makePlant('Gurke')
    await provider.plants.put(plant)
    await new Promise((r) => setTimeout(r, 5))
    await provider.plants.softDelete(plant.id)

    const backup = await provider.exportAll(false)
    expect(backup.plants[0].updatedAt).not.toBe(plant.updatedAt)
  })

  it('hardDelete entfernt die Entität endgültig', async () => {
    const plant = makePlant('Gurke')
    await provider.plants.put(plant)
    await provider.plants.hardDelete(plant.id)

    const backup = await provider.exportAll(false)
    expect(backup.plants).toHaveLength(0)
  })

  it('legt Sichtungen an, liest sie zurück und löscht sie soft', async () => {
    const sighting = makeSighting()
    await provider.sightings.put(sighting)

    const all = await provider.sightings.getAll()
    expect(all).toHaveLength(1)
    expect(all[0].species).toBe('Erdhummel')

    await provider.sightings.softDelete(sighting.id)
    expect(await provider.sightings.getAll()).toHaveLength(0)
  })

  it('speichert und liest Einstellungen', async () => {
    await provider.setSetting('someSetting', 'abc123')
    expect(await provider.getSetting<string>('someSetting')).toBe('abc123')
    expect(await provider.getSetting<string>('gibtEsNicht')).toBeUndefined()
  })

  it('überschreibt vorhandene Einstellungen und speichert auch strukturierte Werte', async () => {
    await provider.setSetting('someSetting', 'alt')
    await provider.setSetting('someSetting', 'neu')
    await provider.setSetting('layout', [{ id: 'tasks', visible: true }])

    expect(await provider.getSetting('someSetting')).toBe('neu')
    expect(await provider.getSetting('layout')).toEqual([{ id: 'tasks', visible: true }])
  })

  it('Export → Import stellt den Datenbestand wieder her', async () => {
    await provider.plants.put(makePlant('Basilikum'))
    await provider.sightings.put(makeSighting())
    await provider.setSetting('notificationsEnabled', true)
    const backup = await provider.exportAll(false)

    const target = new DexieProvider(`test-db-import-${dbCounter}`)
    await target.plants.put(makePlant('Wird ersetzt'))
    await target.importAll(backup)

    const plants = await target.plants.getAll()
    expect(plants).toHaveLength(1)
    expect(plants[0].name).toBe('Basilikum')
    expect(await target.sightings.getAll()).toHaveLength(1)
    expect(await target.getSetting<boolean>('notificationsEnabled')).toBe(true)
  })

  it('importAll ersetzt den kompletten Datenbestand inkl. Einstellungen', async () => {
    await provider.plants.put(makePlant('Alt'))
    await provider.setSetting('someSetting', 'alt')

    await provider.importAll({
      version: 1,
      exportedAt: new Date().toISOString(),
      plants: [makePlant('Gurke')],
      beds: [],
      plantings: [],
      tasks: [],
      diary: [],
      devices: [],
      sightings: [],
      settings: { someSetting: 'neu' },
      photos: [],
    })

    const plants = await provider.plants.getAll()
    expect(plants).toHaveLength(1)
    expect(plants[0].name).toBe('Gurke')
    expect(await provider.beds.getAll()).toHaveLength(0)
    expect(await provider.getSetting('someSetting')).toBe('neu')
  })
})
