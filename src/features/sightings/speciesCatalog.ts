// Kuratierte Artenlisten je Sichtungsgruppe (gängige mitteleuropäische
// Garten-Arten) — Autocomplete im Sichtungs-Dialog und "noch zu entdecken"
// im Album. Daten in speciesCatalog.data.json (auch vom Foto-Build-Script
// scripts/build-species-photos.mjs genutzt, daher als JSON statt in TS).
// Kein GloBI-Bezug (das ist der Nützlingswert je Pflanze, siehe beneficials.ts).
import type { SightingGroup } from '../../data'
import speciesData from './speciesCatalog.data.json'

export interface CuratedSpecies {
  name: string
  /** Wissenschaftlicher Name — Grundlage für das Foto (siehe speciesPhotos.ts). */
  scientificName: string
  hint: string
}

const CATALOG: Partial<Record<SightingGroup, CuratedSpecies[]>> = speciesData

/** Kuratierte Liste einer Gruppe, oder leer (z. B. für "Sonstiges"). */
export function speciesForGroup(group: SightingGroup): CuratedSpecies[] {
  return CATALOG[group] ?? []
}

/** Präfix-Treffer vor Teilstring-Treffern, unabhängig von Groß-/Kleinschreibung. */
export function searchSpecies(group: SightingGroup, query: string, limit = 10): CuratedSpecies[] {
  const list = speciesForGroup(group)
  const q = query.trim().toLowerCase()
  if (!q) return list.slice(0, limit)
  const starts = list.filter((s) => s.name.toLowerCase().startsWith(q))
  const contains = list.filter((s) => !s.name.toLowerCase().startsWith(q) && s.name.toLowerCase().includes(q))
  return [...starts, ...contains].slice(0, limit)
}

/** Noch nicht fotografierte Arten der Gruppe (nach Name aus den Sichtungen abgeglichen). */
export function undiscoveredSpecies(group: SightingGroup, sightedSpecies: string[]): CuratedSpecies[] {
  const sighted = new Set(sightedSpecies.map((s) => s.trim().toLowerCase()))
  return speciesForGroup(group).filter((s) => !sighted.has(s.name.toLowerCase()))
}
