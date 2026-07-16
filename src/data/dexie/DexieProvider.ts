import Dexie, { type Table, type UpdateSpec } from 'dexie'
import type {
  BaseEntity,
  Bed,
  Device,
  DiaryEntry,
  Photo,
  Plant,
  Planting,
  Sighting,
  Task,
} from '../models'
import type { BackupData, Repository, StorageProvider } from '../storage'
import { base64ToBlob, blobToBase64 } from '../blobCodec'
import { toPlainObject } from '../clone'

interface SettingRow {
  key: string
  value: unknown
}

class GardenDatabase extends Dexie {
  plants!: Table<Plant, string>
  beds!: Table<Bed, string>
  plantings!: Table<Planting, string>
  tasks!: Table<Task, string>
  diary!: Table<DiaryEntry, string>
  photos!: Table<Photo, string>
  devices!: Table<Device, string>
  sightings!: Table<Sighting, string>
  settings!: Table<SettingRow, string>

  constructor(name = 'mygarden') {
    super(name)
    this.version(1).stores({
      plants: 'id, name, category',
      beds: 'id, name',
      plantings: 'id, plantId, bedId',
      tasks: 'id, dueDate, plantId, bedId',
      diary: 'id, date',
      photos: 'id',
      devices: 'id, adapter',
      settings: 'key',
    })
    this.version(2).stores({
      sightings: 'id, date, group, plantId, bedId',
    })
  }
}

class DexieRepository<T extends BaseEntity> implements Repository<T> {
  private table: Table<T, string>

  constructor(table: Table<T, string>) {
    this.table = table
  }

  async getAll(): Promise<T[]> {
    return (await this.table.toArray()).filter((e) => e.deletedAt === null)
  }

  async getById(id: string): Promise<T | undefined> {
    const item = await this.table.get(id)
    return item && item.deletedAt === null ? item : undefined
  }

  async put(item: T): Promise<void> {
    // toPlainObject: Vue-Proxies sind nicht structured-clonebar
    await this.table.put(toPlainObject(item))
  }

  async bulkPut(items: T[]): Promise<void> {
    await this.table.bulkPut(items.map((i) => toPlainObject(i)))
  }

  async softDelete(id: string): Promise<void> {
    const now = new Date().toISOString()
    // BaseEntity-Felder sind auf jedem T vorhanden; Dexie kann das generisch nicht ableiten.
    await this.table.update(id, { deletedAt: now, updatedAt: now } as unknown as UpdateSpec<T>)
  }

  async hardDelete(id: string): Promise<void> {
    await this.table.delete(id)
  }
}

export class DexieProvider implements StorageProvider {
  private db: GardenDatabase

  plants: Repository<Plant>
  beds: Repository<Bed>
  plantings: Repository<Planting>
  tasks: Repository<Task>
  diary: Repository<DiaryEntry>
  photos: Repository<Photo>
  devices: Repository<Device>
  sightings: Repository<Sighting>

  constructor(dbName = 'mygarden') {
    this.db = new GardenDatabase(dbName)
    this.plants = new DexieRepository(this.db.plants)
    this.beds = new DexieRepository(this.db.beds)
    this.plantings = new DexieRepository(this.db.plantings)
    this.tasks = new DexieRepository(this.db.tasks)
    this.diary = new DexieRepository(this.db.diary)
    this.photos = new DexieRepository(this.db.photos)
    this.devices = new DexieRepository(this.db.devices)
    this.sightings = new DexieRepository(this.db.sightings)
  }

  async getSetting<T>(key: string): Promise<T | undefined> {
    const row = await this.db.settings.get(key)
    return row?.value as T | undefined
  }

  async setSetting(key: string, value: unknown): Promise<void> {
    await this.db.settings.put({ key, value: toPlainObject(value) })
  }

  async exportAll(includePhotos: boolean): Promise<BackupData> {
    const settingsRows = await this.db.settings.toArray()
    const settings: Record<string, unknown> = {}
    for (const row of settingsRows) settings[row.key] = row.value

    const photos: BackupData['photos'] = []
    if (includePhotos) {
      for (const photo of await this.db.photos.toArray()) {
        photos.push({
          id: photo.id,
          createdAt: photo.createdAt,
          updatedAt: photo.updatedAt,
          deletedAt: photo.deletedAt,
          mimeType: photo.mimeType,
          base64: await blobToBase64(photo.blob),
        })
      }
    }

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      plants: await this.db.plants.toArray(),
      beds: await this.db.beds.toArray(),
      plantings: await this.db.plantings.toArray(),
      tasks: await this.db.tasks.toArray(),
      diary: await this.db.diary.toArray(),
      devices: await this.db.devices.toArray(),
      sightings: await this.db.sightings.toArray(),
      settings,
      photos,
    }
  }

  async importAll(data: BackupData): Promise<void> {
    const photos: Photo[] = data.photos.map((p) => ({
      id: p.id,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      deletedAt: p.deletedAt,
      mimeType: p.mimeType,
      blob: base64ToBlob(p.base64, p.mimeType),
    }))

    await this.db.transaction(
      'rw',
      [this.db.plants, this.db.beds, this.db.plantings, this.db.tasks, this.db.diary, this.db.photos, this.db.devices, this.db.sightings, this.db.settings],
      async () => {
        await Promise.all([
          this.db.plants.clear(),
          this.db.beds.clear(),
          this.db.plantings.clear(),
          this.db.tasks.clear(),
          this.db.diary.clear(),
          this.db.photos.clear(),
          this.db.devices.clear(),
          this.db.sightings.clear(),
          this.db.settings.clear(),
        ])
        await this.db.plants.bulkPut(data.plants)
        await this.db.beds.bulkPut(data.beds)
        await this.db.plantings.bulkPut(data.plantings)
        await this.db.tasks.bulkPut(data.tasks)
        await this.db.diary.bulkPut(data.diary)
        await this.db.devices.bulkPut(data.devices)
        await this.db.sightings.bulkPut(data.sightings)
        await this.db.photos.bulkPut(photos)
        await this.db.settings.bulkPut(
          Object.entries(data.settings).map(([key, value]) => ({ key, value })),
        )
      },
    )
  }
}
