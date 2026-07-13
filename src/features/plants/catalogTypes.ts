// Schema des mitgelieferten Pflanzen-Katalogs (`public/catalog/garten-de.json`).
//
// Der Katalog ist ein schreibgeschützter Referenz-Datensatz, getrennt vom
// Live-`Plant`-Modell (src/data/models.ts). Er trägt schon jetzt Felder für
// spätere Features (Nützlinge, Blüh-/Schnittkalender, Mischkultur), die von der
// Build-Pipeline stufenweise gefüllt werden. Beim „Übernehmen" werden nur die
// `Plant`-mappbaren Felder in eine echte Pflanze kopiert (siehe catalogApi.ts).

import type { PlantCategory, Sunlight } from '../../data'

/** Aus welcher Quelle ein Datenbereich stammt (Transparenz/Vertrauen). */
export type CatalogSourceArea =
  | 'care'
  | 'season'
  | 'companions'
  | 'beneficials'
  | 'image'
  | 'info'

/** Nützlings-Teilwerte je Insektengruppe (je 0–3), plus aggregierter Score. */
export interface Beneficials {
  wildbees?: number
  butterflies?: number
  caterpillarHost?: number
  hoverflies?: number
  beetles?: number
}

export interface CatalogPlant {
  /** Stabiler Slug aus dem botanischen Namen (Referenz für Mischkultur etc.). */
  id: string
  name: string // deutsch
  botanicalName: string
  family: string // deutsch
  familyBotanical: string
  category: PlantCategory
  /** Nur gültige (Slug ~ Name) Info-Links aus der Quell-Liste. */
  infoUrl?: string
  /** Wikimedia-Commons-Thumbnail (extern → offline nicht sichtbar). */
  imageUrl?: string

  // Pflege (kuratierte Richtwerte)
  sunlight?: Sunlight
  wateringIntervalDays?: number
  fertilizingIntervalDays?: number
  spreadM?: number

  // Saison / Kalender (Monate 1–12)
  sowingMonths?: number[]
  harvestMonths?: number[]
  bloomMonths?: number[] // Blühkalender (Phase 3)
  pruningMonths?: number[] // Schnittkalender (Phase 3)

  // Mischkultur (Phase 4) — Referenzen per Katalog-id
  companionsGood?: string[]
  companionsBad?: string[]

  // Nützlinge (Phase 2)
  beneficials?: Beneficials
  beneficialScore?: number // aggregiert 0–5

  /** Herkunft je Datenbereich (z. B. { care: 'kuratiert', image: 'wikidata' }). */
  sources?: Partial<Record<CatalogSourceArea, string>>
}

/** Datei-Wurzel von `public/catalog/garten-de.json`. */
export interface CatalogFile {
  generatedAt: string
  count: number
  entries: CatalogPlant[]
}
