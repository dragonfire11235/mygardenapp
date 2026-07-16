// Reine Berechnung des Biodiversitäts-Scores aus dem Sichtungsbestand.
// Transparent gehalten: Punkte kommen aus zwei nachvollziehbaren Quellen —
// unterschiedliche Arten (8 Punkte je Art) und unterschiedliche Gruppen
// (5 Punkte je Gruppe) —, gedeckelt bei 100.
import type { Sighting } from '../../data'

export interface BiodiversityScore {
  score: number
  distinctSpecies: number
  groups: number
}

const POINTS_PER_SPECIES = 8
const POINTS_PER_GROUP = 5
const MAX_SCORE = 100

export function biodiversityScore(sightings: Sighting[]): BiodiversityScore {
  const species = new Set(
    sightings.map((s) => s.species.trim().toLowerCase()).filter((s) => s.length > 0),
  )
  const groups = new Set(sightings.map((s) => s.group))

  const score = Math.min(
    MAX_SCORE,
    species.size * POINTS_PER_SPECIES + groups.size * POINTS_PER_GROUP,
  )

  return { score, distinctSpecies: species.size, groups: groups.size }
}
