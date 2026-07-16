// Kuratierte Liste gängiger Gartenvögel (Mitteleuropa) als „erwartete Arten"
// der Gruppe Vogel — Autocomplete im Sichtungs-Dialog und Übersicht der noch
// zu entdeckenden Arten im Album. Kein GloBI-Bezug (das ist der Vogelwert je
// Pflanze, siehe beneficials.ts) — reine Namensliste mit Lockmittel-Hinweis.

export type BirdAttraction = 'beeren' | 'samen' | 'insekten' | 'nistplatz'

export interface GardenBird {
  name: string
  /** Was den Vogel typischerweise anlockt. */
  attracts: BirdAttraction[]
}

export const attractionLabels: Record<BirdAttraction, string> = {
  beeren: 'Beeren',
  samen: 'Samen',
  insekten: 'Insekten',
  nistplatz: 'Nistplatz',
}

export const gardenBirds: GardenBird[] = [
  { name: 'Amsel', attracts: ['beeren', 'insekten'] },
  { name: 'Blaumeise', attracts: ['insekten', 'nistplatz'] },
  { name: 'Kohlmeise', attracts: ['insekten', 'samen', 'nistplatz'] },
  { name: 'Haussperling', attracts: ['samen', 'nistplatz'] },
  { name: 'Feldsperling', attracts: ['samen', 'nistplatz'] },
  { name: 'Rotkehlchen', attracts: ['insekten', 'beeren'] },
  { name: 'Zaunkönig', attracts: ['insekten'] },
  { name: 'Buchfink', attracts: ['samen', 'insekten'] },
  { name: 'Grünfink', attracts: ['samen'] },
  { name: 'Stieglitz', attracts: ['samen'] },
  { name: 'Erlenzeisig', attracts: ['samen'] },
  { name: 'Girlitz', attracts: ['samen'] },
  { name: 'Hausrotschwanz', attracts: ['insekten', 'nistplatz'] },
  { name: 'Gartenrotschwanz', attracts: ['insekten', 'nistplatz'] },
  { name: 'Star', attracts: ['beeren', 'insekten', 'nistplatz'] },
  { name: 'Amsel (Weibchen)', attracts: ['beeren', 'insekten'] },
  { name: 'Singdrossel', attracts: ['beeren', 'insekten'] },
  { name: 'Wacholderdrossel', attracts: ['beeren'] },
  { name: 'Heckenbraunelle', attracts: ['insekten'] },
  { name: 'Bachstelze', attracts: ['insekten'] },
  { name: 'Elster', attracts: ['insekten', 'beeren'] },
  { name: 'Eichelhäher', attracts: ['samen', 'beeren'] },
  { name: 'Ringeltaube', attracts: ['samen', 'beeren'] },
  { name: 'Türkentaube', attracts: ['samen'] },
  { name: 'Buntspecht', attracts: ['insekten', 'nistplatz'] },
  { name: 'Grünspecht', attracts: ['insekten'] },
  { name: 'Mauersegler', attracts: ['insekten', 'nistplatz'] },
  { name: 'Rauchschwalbe', attracts: ['insekten', 'nistplatz'] },
  { name: 'Mehlschwalbe', attracts: ['insekten', 'nistplatz'] },
  { name: 'Kleiber', attracts: ['insekten', 'samen', 'nistplatz'] },
]

/** Namen aus der Liste, die filterbar mit einer Eingabe beginnen oder sie enthalten. */
export function searchGardenBirds(query: string, limit = 10): GardenBird[] {
  const q = query.trim().toLowerCase()
  if (!q) return gardenBirds.slice(0, limit)
  const starts = gardenBirds.filter((b) => b.name.toLowerCase().startsWith(q))
  const contains = gardenBirds.filter((b) => !b.name.toLowerCase().startsWith(q) && b.name.toLowerCase().includes(q))
  return [...starts, ...contains].slice(0, limit)
}

/** Noch nicht fotografierte Gartenvögel (nach Name aus den Sichtungen abgeglichen). */
export function undiscoveredGardenBirds(sightedSpecies: string[]): GardenBird[] {
  const sighted = new Set(sightedSpecies.map((s) => s.trim().toLowerCase()))
  return gardenBirds.filter((b) => !sighted.has(b.name.toLowerCase()))
}
