// Reine Auswertung der Sichtungen zu Abzeichen — keine Storage-Abhängigkeit,
// damit sie sowohl im Album als auch später im Widget einsetzbar ist.
import type { Sighting } from '../../data'

export interface Badge {
  id: string
  label: string
  icon: string
  description: string
}

const DEFINITIONS: Badge[] = [
  { id: 'erste-sichtung', label: 'Erste Sichtung', icon: '🔎', description: 'Die erste Entdeckung im Garten festgehalten.' },
  { id: 'erster-vogel', label: 'Vogelbeobachter', icon: '🐦', description: 'Den ersten Vogel fotografiert.' },
  { id: 'fuenf-arten', label: 'Artenkenner', icon: '🏅', description: 'Fünf verschiedene Arten einer Gruppe entdeckt.' },
  { id: 'mit-pflanze', label: 'Verknüpft', icon: '🌿', description: 'Eine Sichtung mit einer Pflanze verknüpft.' },
  { id: 'drei-gruppen', label: 'Vielfalt', icon: '🌈', description: 'Tiere aus drei verschiedenen Gruppen entdeckt.' },
]

/** Distinkte, nicht-leere Artennamen je Gruppe. */
function speciesCountByGroup(sightings: Sighting[]): Map<string, number> {
  const map = new Map<string, Set<string>>()
  for (const s of sightings) {
    if (!s.species.trim()) continue
    const set = map.get(s.group) ?? new Set<string>()
    set.add(s.species.trim().toLowerCase())
    map.set(s.group, set)
  }
  return new Map([...map].map(([group, set]) => [group, set.size]))
}

/** Ermittelt die erfüllten Abzeichen aus dem aktuellen Sichtungsbestand. */
export function earnedAchievements(sightings: Sighting[]): Badge[] {
  const earned = new Set<string>()

  if (sightings.length >= 1) earned.add('erste-sichtung')
  if (sightings.some((s) => s.group === 'bird')) earned.add('erster-vogel')
  if (sightings.some((s) => s.plantId !== null)) earned.add('mit-pflanze')
  if (new Set(sightings.map((s) => s.group)).size >= 3) earned.add('drei-gruppen')
  if ([...speciesCountByGroup(sightings).values()].some((count) => count >= 5)) earned.add('fuenf-arten')

  return DEFINITIONS.filter((b) => earned.has(b.id))
}
