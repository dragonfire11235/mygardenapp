// Zugriff auf den mitgelieferten Pflanzen-Katalog (public/catalog/garten-de.json).
//
// Der Katalog ist ein schreibgeschützter Referenz-Datensatz. Beim „Übernehmen"
// wird ein Eintrag über catalogPlantToDraft() in einen PlantDraft gewandelt und
// dann über den normalen Anlege-Flow gespeichert (Katalog-Import).

import type { CatalogFile, CatalogPlant } from './catalogTypes'
import { emptyPlantDraft, type PlantDraft } from './plantsStore'

/** Kleinschreibung + Umlaute/Diakritika entfernen (für Suche/Vergleich). */
export function normalizeBotanical(s: string): string {
  return normalize(s)
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
}

let cache: Promise<CatalogPlant[]> | null = null

/** Lädt den Katalog einmalig (lazy) und cached ihn für die Sitzung. */
export function loadCatalog(): Promise<CatalogPlant[]> {
  if (!cache) {
    // BASE_URL: bei GitHub-Pages liegt die App unter /<repo>/
    const url = `${import.meta.env.BASE_URL}catalog/garten-de.json`
    cache = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Katalog nicht ladbar (HTTP ${r.status})`)
        return r.json() as Promise<CatalogFile>
      })
      .then((f) => f.entries)
      .catch((e) => {
        cache = null // bei Fehler erneut versuchen lassen
        throw e
      })
  }
  return cache
}

/** Katalog-Eintrag zu einem botanischen Namen finden (für Nützlinge auf der Detailseite). */
export async function getCatalogByBotanical(botanicalName: string): Promise<CatalogPlant | null> {
  if (!botanicalName.trim()) return null
  const entries = await loadCatalog()
  const q = normalize(botanicalName.trim())
  return entries.find((e) => normalize(e.botanicalName) === q) ?? null
}

let botanicalMap: Promise<Map<string, CatalogPlant>> | null = null

/** Katalog als Map (normalisierter botanischer Name → Eintrag), für Beet-Aggregation. */
export function getCatalogMapByBotanical(): Promise<Map<string, CatalogPlant>> {
  if (!botanicalMap) {
    botanicalMap = loadCatalog()
      .then((entries) => new Map(entries.map((e) => [normalize(e.botanicalName), e])))
      .catch((e) => {
        botanicalMap = null
        throw e
      })
  }
  return botanicalMap
}

export interface CatalogSearchOptions {
  category?: CatalogPlant['category']
}

/**
 * Durchsucht den Katalog nach deutschem + botanischem Namen.
 * Ranking: Präfix-Treffer vor Teilstring, deutscher Name vor botanischem.
 */
export function searchCatalog(
  entries: CatalogPlant[],
  query: string,
  options: CatalogSearchOptions = {},
  limit = 40,
): CatalogPlant[] {
  const filtered = options.category
    ? entries.filter((e) => e.category === options.category)
    : entries

  const q = normalize(query.trim())
  // Ohne Suchbegriff: kompletten (ggf. nach Kategorie gefilterten) Katalog
  // zurückgeben — die Ergebnisliste ist scrollbar, ein Limit würde Arten
  // verstecken, die man ohne Suchwort durchstöbern will.
  if (!q) return filtered

  const scored: { entry: CatalogPlant; score: number }[] = []
  for (const entry of filtered) {
    const name = normalize(entry.name)
    const bot = normalize(entry.botanicalName)
    let score = 0
    if (name.startsWith(q)) score = 4
    else if (bot.startsWith(q)) score = 3
    else if (name.includes(q)) score = 2
    else if (bot.includes(q)) score = 1
    if (score > 0) scored.push({ entry, score })
  }

  scored.sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name, 'de'))
  return scored.slice(0, limit).map((s) => s.entry)
}

/** Wandelt einen Katalog-Eintrag in einen Entwurf für die eigene Bibliothek. */
export function catalogPlantToDraft(entry: CatalogPlant): PlantDraft {
  const familyNote = entry.family
    ? `Familie: ${entry.family}${entry.familyBotanical ? ` (${entry.familyBotanical})` : ''}`
    : ''
  return {
    ...emptyPlantDraft(),
    name: entry.name,
    botanicalName: entry.botanicalName,
    category: entry.category,
    imageUrl: entry.imageUrl ?? '',
    sunlight: entry.sunlight ?? null,
    wateringIntervalDays: entry.wateringIntervalDays ?? null,
    fertilizingIntervalDays: entry.fertilizingIntervalDays ?? null,
    spreadM: entry.spreadM ?? null,
    sowingMonths: entry.sowingMonths ?? [],
    harvestMonths: entry.harvestMonths ?? [],
    bloomMonths: entry.bloomMonths ?? [],
    pruningMonths: entry.pruningMonths ?? [],
    notes: familyNote,
  }
}
