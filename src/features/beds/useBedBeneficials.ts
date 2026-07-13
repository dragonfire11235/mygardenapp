// Beet-Nützlingswert: aggregiert die Nützlingswerte der aktuell im Beet
// stehenden Pflanzen (aus dem Katalog, per botanischem Namen). Genutzt auf
// Beet-Detailseite, Beete-Übersicht und im Beetplaner.
import { ref } from 'vue'
import type { CatalogPlant } from '../plants/catalogTypes'
import { getCatalogMapByBotanical, normalizeBotanical } from '../plants/catalogApi'
import { activeGroups, aggregateBeneficials, gapGroups } from '../plants/beneficials'
import { usePlantsStore } from '../plants/plantsStore'
import { useBedsStore } from './bedsStore'

// Modulweit: Katalog-Map nur einmal laden (reaktiv, damit forBed nachzieht).
const catalogMap = ref<Map<string, CatalogPlant> | null>(null)
let loading = false

export function useBedBeneficials() {
  const bedsStore = useBedsStore()
  const plantsStore = usePlantsStore()

  if (!catalogMap.value && !loading) {
    loading = true
    getCatalogMapByBotanical()
      .then((m) => { catalogMap.value = m })
      .catch(() => {})
      .finally(() => { loading = false })
  }

  /** Aggregierter Nützlingswert eines Beets, oder null (kein Match / keine Daten). */
  function forBed(bedId: string) {
    const map = catalogMap.value
    if (!map) return null
    const plantings = bedsStore.activePlantingsByBed.get(bedId) ?? []
    const list = plantings.map((pl) => {
      const plant = plantsStore.byId.get(pl.plantId)
      return plant ? map.get(normalizeBotanical(plant.botanicalName))?.beneficials : undefined
    })
    const agg = aggregateBeneficials(list)
    if (!agg) return null
    return { ...agg, groups: activeGroups(agg.beneficials), gaps: gapGroups(agg.beneficials) }
  }

  return { forBed }
}
