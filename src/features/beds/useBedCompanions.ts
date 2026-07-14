// Mischkultur fürs Beet: findet gute/schlechte Nachbarschaften unter den
// aktuell eingepflanzten Pflanzen und liefert die Relation einzelner Paare
// (für die Planer-Hervorhebung). Nutzt den Katalog per botanischem Namen.
import { ref } from 'vue'
import type { Plant } from '../../data'
import type { CatalogPlant } from '../plants/catalogTypes'
import { getCatalogMapByBotanical, normalizeBotanical } from '../plants/catalogApi'
import { relationBetween, type CompanionRelation } from '../plants/companions'
import { usePlantsStore } from '../plants/plantsStore'
import { useBedsStore } from './bedsStore'

const catalogMap = ref<Map<string, CatalogPlant> | null>(null)
let loading = false

export interface CompanionPair {
  a: string
  b: string
}

export function useBedCompanions() {
  const bedsStore = useBedsStore()
  const plantsStore = usePlantsStore()

  if (!catalogMap.value && !loading) {
    loading = true
    getCatalogMapByBotanical()
      .then((m) => { catalogMap.value = m })
      .catch(() => {})
      .finally(() => { loading = false })
  }

  function entryOf(plant: Plant | null | undefined): CatalogPlant | undefined {
    const map = catalogMap.value
    return map && plant ? map.get(normalizeBotanical(plant.botanicalName)) : undefined
  }

  /** Relation zweier eigener Pflanzen (für die Planer-Markierung). */
  function relation(a: Plant | null | undefined, b: Plant | null | undefined): CompanionRelation {
    return relationBetween(entryOf(a), entryOf(b))
  }

  /** Gute/schlechte Paare unter den aktiven Pflanzen eines Beets. */
  function forBed(bedId: string): { matches: CompanionPair[]; conflicts: CompanionPair[] } | null {
    if (!catalogMap.value) return null
    const plantings = bedsStore.activePlantingsByBed.get(bedId) ?? []
    // distinkte Pflanzen (nach plantId) im Beet
    const plants = [...new Map(plantings.map((pl) => [pl.plantId, plantsStore.byId.get(pl.plantId)])).values()]
      .filter((p): p is Plant => !!p)
    const matches: CompanionPair[] = []
    const conflicts: CompanionPair[] = []
    for (let i = 0; i < plants.length; i++) {
      for (let j = i + 1; j < plants.length; j++) {
        const rel = relation(plants[i], plants[j])
        if (rel === 'good') matches.push({ a: plants[i].name, b: plants[j].name })
        else if (rel === 'bad') conflicts.push({ a: plants[i].name, b: plants[j].name })
      }
    }
    if (!matches.length && !conflicts.length) return null
    return { matches, conflicts }
  }

  return { forBed, relation }
}
