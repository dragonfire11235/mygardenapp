// Beete mit ihren aktiv bepflanzten Pflanzen, gefiltert auf einen Monats-Selektor
// (Blüte/Schnitt). Wird von den Kalender-Widgets für die Beete-Ansicht genutzt.

import { computed, type ComputedRef } from 'vue'
import type { Plant } from '../../data'
import { usePlantsStore } from './plantsStore'
import { useBedsStore } from '../beds/bedsStore'
import type { MonthSelector } from './bloomCalendar'

export interface BedGroup {
  id: string
  name: string
  plants: Plant[]
}

/** Reaktive Liste der Beete, die mindestens eine passende (blühende/zu schneidende) Pflanze tragen. */
export function useCalendarBedGroups(get: MonthSelector): ComputedRef<BedGroup[]> {
  const plantsStore = usePlantsStore()
  const bedsStore = useBedsStore()

  return computed(() => {
    const groups: BedGroup[] = []
    for (const bed of bedsStore.beds) {
      const plantings = bedsStore.activePlantingsByBed.get(bed.id) ?? []
      const seen = new Set<string>()
      const plants: Plant[] = []
      for (const pl of plantings) {
        if (seen.has(pl.plantId)) continue
        seen.add(pl.plantId)
        const plant = plantsStore.byId.get(pl.plantId)
        if (plant && get(plant)?.length) plants.push(plant)
      }
      if (plants.length) groups.push({ id: bed.id, name: bed.name, plants })
    }
    return groups
  })
}
