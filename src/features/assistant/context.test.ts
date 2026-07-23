import { describe, expect, it } from 'vitest'
import type { Bed, Plant, Planting, Task } from '../../data'
import type { CatalogPlant } from '../plants/catalogTypes'
import type { Weather } from '../weather/weatherApi'
import { buildGardenContext, type GardenContextInput } from './context'

function plant(over: Partial<Plant>): Plant {
  return {
    id: over.id ?? over.name ?? 'p',
    name: 'Pflanze',
    botanicalName: 'Planta X',
    category: 'gemuese',
    imageUrl: '',
    photoId: null,
    wateringIntervalDays: null,
    fertilizingIntervalDays: null,
    wateringStartDate: null,
    spreadM: null,
    sowingMonths: [],
    harvestMonths: [],
    bloomMonths: [],
    pruningMonths: [],
    sunlight: null,
    notes: '',
    createdAt: '',
    updatedAt: '',
    deletedAt: null,
    ...over,
  }
}

function bed(over: Partial<Bed>): Bed {
  return {
    id: over.id ?? over.name ?? 'b',
    name: 'Beet',
    location: '',
    sizeText: '',
    widthM: null,
    heightM: null,
    notes: '',
    photoId: null,
    mapX: null,
    mapY: null,
    createdAt: '',
    updatedAt: '',
    deletedAt: null,
    ...over,
  }
}

function planting(over: Partial<Planting>): Planting {
  return {
    id: over.id ?? `${over.bedId}-${over.plantId}`,
    plantId: '',
    bedId: '',
    quantity: 1,
    plantedAt: '2026-04-01',
    removedAt: null,
    posX: null,
    posY: null,
    notes: '',
    createdAt: '',
    updatedAt: '',
    deletedAt: null,
    ...over,
  }
}

function task(over: Partial<Task>): Task {
  return {
    id: over.id ?? over.title ?? 't',
    title: 'Aufgabe',
    type: 'giessen',
    dueDate: '2026-07-20',
    intervalDays: null,
    plantId: null,
    bedId: null,
    auto: false,
    doneAt: null,
    notes: '',
    createdAt: '',
    updatedAt: '',
    deletedAt: null,
    ...over,
  }
}

function catalogEntry(over: Partial<CatalogPlant>): CatalogPlant {
  return {
    id: over.id ?? over.botanicalName ?? 'c',
    name: 'X',
    botanicalName: 'X',
    family: '',
    familyBotanical: '',
    category: 'gemuese',
    ...over,
  }
}

const weather: Weather = {
  currentTemp: 18,
  currentCode: 2,
  humidity: 60,
  days: [
    { date: '2026-07-23', code: 61, tempMax: 22, tempMin: 12, precipProbability: 80 },
    { date: '2026-07-24', code: 2, tempMax: 24, tempMin: 13, precipProbability: 10 },
  ],
  frostWarning: true,
  rainToday: true,
}

describe('buildGardenContext', () => {
  it('enthält Beetname, botanischen Namen, überfällige Aufgabe, Frost-Warnung und Schlecht-Nachbar-Paar', () => {
    const tomate = plant({ id: 'tomate', name: 'Tomate', botanicalName: 'Lycopersicon esculentum' })
    const kartoffel = plant({ id: 'kartoffel', name: 'Kartoffel', botanicalName: 'Solanum tuberosum' })
    const hochbeet = bed({ id: 'hb1', name: 'Hochbeet 1', widthM: 2, heightM: 1 })

    const catTomate = catalogEntry({
      botanicalName: 'Lycopersicon esculentum',
      companionsBad: ['Solanum tuberosum'],
    })
    const catKartoffel = catalogEntry({ botanicalName: 'Solanum tuberosum' })
    const catalog = new Map([
      ['lycopersicon esculentum', catTomate],
      ['solanum tuberosum', catKartoffel],
    ])

    const input: GardenContextInput = {
      today: '2026-07-23',
      locationName: 'Musterstadt',
      weather,
      plants: [tomate, kartoffel],
      beds: [hochbeet],
      plantings: [
        planting({ bedId: 'hb1', plantId: 'tomate' }),
        planting({ bedId: 'hb1', plantId: 'kartoffel' }),
      ],
      dueTasks: [task({ title: 'Gießen', dueDate: '2026-07-20' })],
      catalog,
    }

    const text = buildGardenContext(input)

    expect(text).toContain('Hochbeet 1')
    expect(text).toContain('Lycopersicon esculentum')
    expect(text).toContain('überfällig seit 3 Tagen')
    expect(text).toContain('Frostgefahr')
    expect(text).toContain('Tomate + Kartoffel im Beet „Hochbeet 1" vertragen sich schlecht')
  })

  it('kappt die Pflanzen-Bibliothek bei mehr als 60 Einträgen', () => {
    const plants60 = Array.from({ length: 60 }, (_, i) => plant({ id: `p${i}`, name: `Pflanze ${i}` }))
    const input60: GardenContextInput = {
      today: '2026-07-23',
      locationName: null,
      weather: null,
      plants: plants60,
      beds: [],
      plantings: [],
      dueTasks: [],
      catalog: new Map(),
    }
    const text60 = buildGardenContext(input60)
    expect(text60.length).toBeLessThan(8000)
    expect(text60).not.toContain('weitere')

    const plants70 = Array.from({ length: 70 }, (_, i) => plant({ id: `p${i}`, name: `Pflanze ${i}` }))
    const input70: GardenContextInput = { ...input60, plants: plants70 }
    const text70 = buildGardenContext(input70)
    expect(text70).toContain('… und 10 weitere')
  })

  it('liefert bei leerem Garten Datum und Hinweis', () => {
    const input: GardenContextInput = {
      today: '2026-07-23',
      locationName: null,
      weather: null,
      plants: [],
      beds: [],
      plantings: [],
      dueTasks: [],
      catalog: new Map(),
    }
    const text = buildGardenContext(input)
    expect(text).toContain('23.07.2026')
    expect(text).toContain('Noch keine')
  })
})
