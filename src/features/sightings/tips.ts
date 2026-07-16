// Reine Tipp-Logik: aus den Nützlingswerten der eigenen Pflanzen einen
// Vorschlag bilden, welche Tiergruppe sich als Nächstes zu fotografieren lohnt.
// Bevorzugt Gruppen, die noch keine Sichtung haben, und darunter den höchsten
// Teil-Score.
import type { Sighting, SightingGroup } from '../../data'
import type { Beneficials } from '../plants/catalogTypes'
import { sightingGroupLabels } from '../../shared/texts'

export interface PlantBeneficialInfo {
  plantName: string
  beneficials: Beneficials
}

export interface DiscoveryTip {
  plantName: string
  group: SightingGroup
  text: string
}

/** Raupen zählen als Vorstufe des Schmetterlings — es gibt keine eigene Sichtungsgruppe dafür. */
const GROUP_BY_BENEFICIAL_KEY: Partial<Record<keyof Beneficials, SightingGroup>> = {
  wildbees: 'wildbee',
  butterflies: 'butterfly',
  caterpillarHost: 'butterfly',
  hoverflies: 'hoverfly',
  beetles: 'beetle',
}

/**
 * Schlägt eine noch nicht fotografierte Gruppe anhand des Nützlingswerts der
 * eigenen Pflanzen vor, oder null, wenn schon alle vertretenen Gruppen fotografiert sind.
 */
export function suggestTip(plants: PlantBeneficialInfo[], sightings: Sighting[]): DiscoveryTip | null {
  const sightedGroups = new Set(sightings.map((s) => s.group))

  let best: DiscoveryTip | null = null
  let bestScore = 0

  for (const plant of plants) {
    for (const [key, group] of Object.entries(GROUP_BY_BENEFICIAL_KEY) as [keyof Beneficials, SightingGroup][]) {
      if (sightedGroups.has(group)) continue
      const score = plant.beneficials[key] ?? 0
      if (score <= 0 || score <= bestScore) continue
      bestScore = score
      best = {
        plantName: plant.plantName,
        group,
        text: `Deine ${plant.plantName} zieht ${sightingGroupLabels[group]} an — fotografier eine!`,
      }
    }
  }

  return best
}
