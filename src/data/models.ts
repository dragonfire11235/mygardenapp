// Zentrales Datenmodell. Alle Entitäten sind sync-fähig aufgebaut (UUID,
// Zeitstempel, Soft-Delete), damit später ein Server-Backend die gleichen
// Datensätze übernehmen kann.

export interface BaseEntity {
  id: string
  createdAt: string // ISO-Zeitstempel
  updatedAt: string
  deletedAt: string | null // Soft-Delete: gesetzt statt echtem Löschen
}

export type PlantCategory =
  | 'gemuese'
  | 'obst'
  | 'kraeuter'
  | 'blumen'
  | 'strauch'
  | 'baum'
  | 'sonstiges'

export type Sunlight = 'sonne' | 'halbschatten' | 'schatten'

export interface Plant extends BaseEntity {
  name: string
  botanicalName: string
  category: PlantCategory
  /** Externe Bild-URL (z. B. aus Trefle) */
  imageUrl: string
  /** Eigenes Foto aus der Photo-Tabelle */
  photoId: string | null
  wateringIntervalDays: number | null
  fertilizingIntervalDays: number | null
  /** Monate 1–12 */
  sowingMonths: number[]
  harvestMonths: number[]
  sunlight: Sunlight | null
  notes: string
  trefleId: number | null
}

export interface Bed extends BaseEntity {
  name: string
  location: string
  /** Freitext, z. B. "2 × 1 m" oder "3 Töpfe" */
  sizeText: string
  notes: string
}

/** Eine Pflanze steht für einen Zeitraum in einem Beet. */
export interface Planting extends BaseEntity {
  plantId: string
  bedId: string
  quantity: number
  plantedAt: string // ISO-Datum (yyyy-mm-dd)
  removedAt: string | null
  notes: string
}

export type TaskType = 'giessen' | 'duengen' | 'schneiden' | 'ernten' | 'aussaat' | 'sonstiges'

export interface Task extends BaseEntity {
  title: string
  type: TaskType
  dueDate: string // ISO-Datum (yyyy-mm-dd)
  /** Wiederholung: nach Abschluss wird eine Folgeaufgabe in n Tagen erzeugt */
  intervalDays: number | null
  plantId: string | null
  bedId: string | null
  /** Automatisch aus Pflegeintervallen erzeugt (taskEngine) */
  auto: boolean
  doneAt: string | null
  notes: string
}

export interface DiaryEntry extends BaseEntity {
  date: string // ISO-Datum (yyyy-mm-dd)
  title: string
  text: string
  plantIds: string[]
  bedIds: string[]
  photoIds: string[]
}

/** Foto-Blobs liegen in einer eigenen Tabelle, damit der JSON-Export sie ausschließen kann. */
export interface Photo extends BaseEntity {
  blob: Blob
  mimeType: string
}

export type DeviceKind = 'switch' | 'valve' | 'sensor'
export type AdapterId = 'demo' | 'homeassistant'

export interface Device extends BaseEntity {
  name: string
  kind: DeviceKind
  adapter: AdapterId
  /** ID des Geräts beim Adapter (z. B. Home-Assistant entity_id) */
  externalId: string
  /** Optional: Verknüpfung mit einem Beet */
  bedId: string | null
}

/** Erzeugt eine neue Entität mit ID und Zeitstempeln. */
export function createEntity<T extends BaseEntity>(data: Omit<T, keyof BaseEntity>): T {
  const now = new Date().toISOString()
  return {
    ...data,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  } as T
}

/** Aktualisiert den updatedAt-Zeitstempel vor dem Speichern. */
export function touch<T extends BaseEntity>(entity: T): T {
  return { ...entity, updatedAt: new Date().toISOString() }
}
