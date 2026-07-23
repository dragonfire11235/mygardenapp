// Baut den deutschen Garten-Kontext für den KI-Assistenten (Edge Function „lumi").
//
// Feature-Module importieren sonst nie voneinander (siehe PLAN.md). `assistant/`
// ist — wie `dashboard` via `widgetRegistry.ts` — sanktioniert, fremde Stores zu
// lesen, weil der Assistent naturgemäß einen Querschnitt über den ganzen Garten
// braucht (2. Ausnahme der Import-Regel).

import type { Bed, Plant, Planting, Task } from '../../data'
import { formatDate, todayIso } from '../../shared/dates'
import { getCatalogMapByBotanical, normalizeBotanical } from '../plants/catalogApi'
import { relationBetween } from '../plants/companions'
import type { CatalogPlant } from '../plants/catalogTypes'
import type { Weather } from '../weather/weatherApi'
import { weatherLabel } from '../weather/weatherApi'
import { useBedsStore } from '../beds/bedsStore'
import { usePlantsStore } from '../plants/plantsStore'
import { useSettingsStore } from '../settings/settingsStore'
import { useTasksStore } from '../tasks/tasksStore'
import { useWeatherStore } from '../weather/weatherStore'

const MAX_PLANTS = 60
const MAX_TASKS = 15

const MONAT_KURZ = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const WOCHENTAG_KURZ = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const SUNLIGHT_LABEL: Record<string, string> = { sonne: 'Sonne', halbschatten: 'Halbschatten', schatten: 'Schatten' }

export interface GardenContextInput {
  today: string
  locationName: string | null
  weather: Weather | null
  plants: Plant[]
  beds: Bed[]
  plantings: Planting[]
  dueTasks: Task[]
  catalog: Map<string, CatalogPlant>
}

function jahreszeit(monat: number): string {
  if (monat === 12 || monat <= 2) return 'Winter'
  if (monat <= 5) return 'Frühling'
  if (monat <= 8) return 'Sommer'
  return 'Herbst'
}

function wochentagKurz(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return WOCHENTAG_KURZ[new Date(y, m - 1, d).getDay()]
}

function monateKurz(monate: number[] | undefined): string {
  return (monate ?? []).map((m) => MONAT_KURZ[m - 1]).join(', ')
}

function catalogEintrag(catalog: Map<string, CatalogPlant>, botanicalName: string): CatalogPlant | undefined {
  return catalog.get(normalizeBotanical(botanicalName))
}

function kappen(zeilen: string[], max: number): string[] {
  if (zeilen.length <= max) return zeilen
  return [...zeilen.slice(0, max), `… und ${zeilen.length - max} weitere`]
}

function wetterAbschnitt(weather: Weather | null): string[] {
  if (!weather) return []
  const zeilen = ['## Wetter', `Aktuell: ${weather.currentTemp}°C, ${weatherLabel(weather.currentCode)}`]
  const vorhersage = weather.days
    .map((d) => `${wochentagKurz(d.date)} ${d.tempMax}/${d.tempMin}° ${weatherLabel(d.code)} ${d.precipProbability}%`)
    .join(', ')
  if (vorhersage) zeilen.push(`Vorhersage: ${vorhersage}`)
  if (weather.frostWarning) zeilen.push('⚠️ Frostgefahr in den kommenden Tagen')
  if (weather.rainToday) zeilen.push('⚠️ Heute Regen erwartet – Gießen kann warten')
  // Optionale Felder aus AP05 (Hagel-/Gewitterwarnung), falls schon vorhanden.
  const erweitert = weather as Weather & { hailWarning?: boolean; thunderstormWarning?: boolean }
  if (erweitert.hailWarning) zeilen.push('⚠️ Hagelgefahr in den kommenden Tagen')
  if (erweitert.thunderstormWarning) zeilen.push('⚠️ Gewitter in den kommenden Tagen')
  return zeilen
}

function beeteAbschnitt(beds: Bed[], plantings: Planting[], plants: Plant[]): string[] {
  if (beds.length === 0) return []
  const plantById = new Map(plants.map((p) => [p.id, p]))
  const zeilen = ['## Beete']
  for (const bed of beds) {
    const masse = bed.widthM && bed.heightM ? ` (${bed.widthM} × ${bed.heightM} m)` : ''
    zeilen.push(`### ${bed.name}${masse}`)
    const bepflanzt = plantings.filter((p) => p.bedId === bed.id)
    if (bepflanzt.length === 0) {
      zeilen.push('- (keine Pflanzen im Beet)')
      continue
    }
    for (const planting of bepflanzt) {
      const plant = plantById.get(planting.plantId)
      if (!plant) continue
      zeilen.push(`- ${plant.name} (${plant.botanicalName})`)
    }
  }
  return zeilen
}

function pflanzenAbschnitt(plants: Plant[]): string[] {
  if (plants.length === 0) return []
  const zeilen = ['## Pflanzen-Bibliothek']
  const eintraege = plants.map((plant) => {
    const details: string[] = []
    if (plant.wateringIntervalDays) details.push(`Gießen alle ${plant.wateringIntervalDays} Tage`)
    if (plant.fertilizingIntervalDays) details.push(`Düngen alle ${plant.fertilizingIntervalDays} Tage`)
    if (plant.sunlight) details.push(SUNLIGHT_LABEL[plant.sunlight])
    const aussaat = monateKurz(plant.sowingMonths)
    if (aussaat) details.push(`Aussaat: ${aussaat}`)
    const ernte = monateKurz(plant.harvestMonths)
    if (ernte) details.push(`Ernte: ${ernte}`)
    const suffix = details.length ? `: ${details.join(', ')}` : ''
    return `- ${plant.name} (${plant.botanicalName})${suffix}`
  })
  zeilen.push(...kappen(eintraege, MAX_PLANTS))
  return zeilen
}

function aufgabenAbschnitt(dueTasks: Task[], today: string): string[] {
  if (dueTasks.length === 0) return []
  const zeilen = ['## Fällige Aufgaben']
  const sortiert = [...dueTasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const eintraege = sortiert.map((task) => {
    const tage = tageSeit(task.dueDate, today)
    const status = tage > 0 ? ` (überfällig seit ${tage} Tagen)` : ' (heute fällig)'
    return `- ${formatDate(task.dueDate)} ${task.title}${status}`
  })
  zeilen.push(...kappen(eintraege, MAX_TASKS))
  return zeilen
}

function tageSeit(dueDate: string, today: string): number {
  const [y1, m1, d1] = dueDate.split('-').map(Number)
  const [y2, m2, d2] = today.split('-').map(Number)
  const a = new Date(y1, m1 - 1, d1)
  const b = new Date(y2, m2 - 1, d2)
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

function konflikteAbschnitt(beds: Bed[], plantings: Planting[], plants: Plant[], catalog: Map<string, CatalogPlant>): string[] {
  const plantById = new Map(plants.map((p) => [p.id, p]))
  const zeilen: string[] = []
  for (const bed of beds) {
    const bedPlants = plantings
      .filter((p) => p.bedId === bed.id)
      .map((p) => plantById.get(p.plantId))
      .filter((p): p is Plant => !!p)
    for (let i = 0; i < bedPlants.length; i++) {
      for (let j = i + 1; j < bedPlants.length; j++) {
        const a = bedPlants[i]
        const b = bedPlants[j]
        const relation = relationBetween(catalogEintrag(catalog, a.botanicalName), catalogEintrag(catalog, b.botanicalName))
        if (relation === 'bad') {
          zeilen.push(`${a.name} + ${b.name} im Beet „${bed.name}" vertragen sich schlecht`)
        }
      }
    }
  }
  if (zeilen.length === 0) return []
  return ['## Mischkultur-Konflikte', ...zeilen]
}

/** Baut den kompakten deutschen Garten-Kontext-Text. Rein, ohne Pinia — testbar. */
export function buildGardenContext(input: GardenContextInput): string {
  const [, monat] = input.today.split('-').map(Number)
  const abschnitte: string[][] = []

  const kopf = [`## Garten am ${formatDate(input.today)} (${jahreszeit(monat)})`]
  if (input.locationName) kopf.push(`Standort: ${input.locationName}`)
  if (input.plants.length === 0 && input.beds.length === 0) {
    kopf.push('Noch keine Pflanzen/Beete angelegt.')
  }
  abschnitte.push(kopf)

  abschnitte.push(wetterAbschnitt(input.weather))
  abschnitte.push(beeteAbschnitt(input.beds, input.plantings, input.plants))
  abschnitte.push(pflanzenAbschnitt(input.plants))
  abschnitte.push(aufgabenAbschnitt(input.dueTasks, input.today))
  abschnitte.push(konflikteAbschnitt(input.beds, input.plantings, input.plants, input.catalog))

  return abschnitte
    .filter((zeilen) => zeilen.length > 0)
    .map((zeilen) => zeilen.join('\n'))
    .join('\n\n')
}

/** Liest die Stores und baut den Garten-Kontext für die aktuelle Sitzung. */
export async function collectGardenContext(): Promise<string> {
  const plantsStore = usePlantsStore()
  const bedsStore = useBedsStore()
  const tasksStore = useTasksStore()
  const weatherStore = useWeatherStore()
  const settingsStore = useSettingsStore()

  let catalog: Map<string, CatalogPlant>
  try {
    catalog = await getCatalogMapByBotanical()
  } catch {
    catalog = new Map()
  }

  return buildGardenContext({
    today: todayIso(),
    locationName: settingsStore.weatherLocation?.name ?? null,
    weather: weatherStore.weather,
    plants: plantsStore.plants,
    beds: bedsStore.beds,
    plantings: bedsStore.activePlantings,
    dueTasks: tasksStore.dueTasks,
    catalog,
  })
}
