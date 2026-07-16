// Bindet die reine Tipp-Logik (tips.ts) an Katalog + eigene Pflanzen + Sichtungen.
// Muster wie useBedBeneficials: Katalog-Map modulweit einmal laden.
import { computed, ref } from 'vue'
import type { CatalogPlant } from '../plants/catalogTypes'
import { getCatalogMapByBotanical, normalizeBotanical } from '../plants/catalogApi'
import { usePlantsStore } from '../plants/plantsStore'
import { useSightingsStore } from './sightingsStore'
import { suggestTip, type DiscoveryTip, type PlantBeneficialInfo } from './tips'

const catalogMap = ref<Map<string, CatalogPlant> | null>(null)
let loading = false

export function useSightingTip() {
  const plantsStore = usePlantsStore()
  const sightingsStore = useSightingsStore()

  if (!catalogMap.value && !loading) {
    loading = true
    getCatalogMapByBotanical()
      .then((m) => { catalogMap.value = m })
      .catch(() => {})
      .finally(() => { loading = false })
  }

  const tip = computed<DiscoveryTip | null>(() => {
    const map = catalogMap.value
    if (!map) return null
    const plants: PlantBeneficialInfo[] = plantsStore.plants
      .map((p) => ({ plantName: p.name, beneficials: map.get(normalizeBotanical(p.botanicalName))?.beneficials }))
      .filter((p): p is PlantBeneficialInfo => Boolean(p.beneficials))
    return suggestTip(plants, sightingsStore.sightings)
  })

  return { tip }
}
