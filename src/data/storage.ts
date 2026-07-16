// Storage-Abstraktion: Die App spricht nur gegen diese Interfaces.
// Aktuell implementiert sie der DexieProvider (IndexedDB, lokal).
// Später kann ein SupabaseProvider o. ä. mit identischem Interface
// dahinter geschoben werden, ohne dass sich die Features ändern.

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
} from './models'

export interface Repository<T extends BaseEntity> {
  /** Alle nicht gelöschten Einträge */
  getAll(): Promise<T[]>
  getById(id: string): Promise<T | undefined>
  /** Legt an oder überschreibt (upsert) */
  put(item: T): Promise<void>
  bulkPut(items: T[]): Promise<void>
  /** Soft-Delete: markiert als gelöscht, Daten bleiben für späteren Sync erhalten */
  softDelete(id: string): Promise<void>
  /** Endgültig entfernen (z. B. Foto-Blobs) */
  hardDelete(id: string): Promise<void>
}

export interface BackupData {
  version: number
  exportedAt: string
  plants: Plant[]
  beds: Bed[]
  plantings: Planting[]
  tasks: Task[]
  diary: DiaryEntry[]
  devices: Device[]
  sightings: Sighting[]
  settings: Record<string, unknown>
  /** Fotos optional als Base64 (kann den Export groß machen) */
  photos: { id: string; createdAt: string; updatedAt: string; deletedAt: string | null; mimeType: string; base64: string }[]
}

export interface StorageProvider {
  plants: Repository<Plant>
  beds: Repository<Bed>
  plantings: Repository<Planting>
  tasks: Repository<Task>
  diary: Repository<DiaryEntry>
  photos: Repository<Photo>
  devices: Repository<Device>
  sightings: Repository<Sighting>

  getSetting<T>(key: string): Promise<T | undefined>
  setSetting(key: string, value: unknown): Promise<void>

  exportAll(includePhotos: boolean): Promise<BackupData>
  /** Ersetzt den kompletten Datenbestand durch das Backup */
  importAll(data: BackupData): Promise<void>
}
