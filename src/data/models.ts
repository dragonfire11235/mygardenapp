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
  /** Externe Bild-URL (z. B. aus dem Katalog) */
  imageUrl: string
  /** Eigenes Foto aus der Photo-Tabelle */
  photoId: string | null
  wateringIntervalDays: number | null
  fertilizingIntervalDays: number | null
  /** Ab wann gegossen werden soll (yyyy-mm-dd); null = ab sofort */
  wateringStartDate: string | null
  /** Wuchsbreite/Durchmesser in Metern; null = Kategorie-Standard (categorySpreadM) */
  spreadM: number | null
  /** Monate 1–12 */
  sowingMonths: number[]
  harvestMonths: number[]
  /** Blütemonate 1–12 (für den Blühkalender) */
  bloomMonths: number[]
  /** Schnittmonate 1–12 (für den Schnittkalender) */
  pruningMonths: number[]
  sunlight: Sunlight | null
  notes: string
}

export interface Bed extends BaseEntity {
  name: string
  location: string
  /** Legacy-Freitext für alte Daten; neue Beete nutzen widthM/heightM */
  sizeText: string
  /** Beetmaße in Metern (für den Beetplaner) */
  widthM: number | null
  heightM: number | null
  notes: string
  /** Titelbild aus der Photo-Tabelle */
  photoId: string | null
  /** Position auf dem Lageplan (normalisiert 0..1); null = noch nicht platziert */
  mapX: number | null
  mapY: number | null
}

/** Eine Pflanze steht für einen Zeitraum in einem Beet. */
export interface Planting extends BaseEntity {
  plantId: string
  bedId: string
  quantity: number
  plantedAt: string // ISO-Datum (yyyy-mm-dd)
  removedAt: string | null
  /** Position im Beetplaner: Kreis-Mittelpunkt in Metern vom linken/oberen Beetrand */
  posX: number | null
  posY: number | null
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

export type SightingGroup = 'wildbee' | 'butterfly' | 'hoverfly' | 'beetle' | 'bird' | 'other'
export type SightingSource = 'manual' | 'ai'

export interface Sighting extends BaseEntity {
  date: string // ISO-Datum (yyyy-mm-dd)
  group: SightingGroup
  species: string
  photoId: string | null
  plantId: string | null
  bedId: string | null
  notes: string
  source: SightingSource
}

/** Foto-Blobs liegen in einer eigenen Tabelle, damit der JSON-Export sie ausschließen kann. */
export interface Photo extends BaseEntity {
  blob: Blob
  mimeType: string
}

export type DeviceKind = 'switch' | 'valve' | 'sensor' | 'mower'
export type AdapterId = 'demo' | 'homeassistant' | 'gardena'

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
