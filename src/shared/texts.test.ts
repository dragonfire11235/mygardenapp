import { describe, expect, it } from 'vitest'
import { createEntity, type Plant } from '../data'
import { categorySpreadM, plantSpreadM } from './texts'

function makePlant(overrides: Partial<Plant> = {}): Plant {
  return createEntity<Plant>({
    name: 'Test',
    botanicalName: '',
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
    trefleId: null,
    ...overrides,
  })
}

describe('plantSpreadM', () => {
  it('nutzt den Kategorie-Standard, wenn keine eigene Wuchsbreite gesetzt ist', () => {
    expect(plantSpreadM(makePlant({ category: 'kraeuter' }))).toBe(0.3)
    expect(plantSpreadM(makePlant({ category: 'baum' }))).toBe(2.5)
  })

  it('bevorzugt die eigene Wuchsbreite der Pflanze', () => {
    expect(plantSpreadM(makePlant({ category: 'baum', spreadM: 2.5 }))).toBe(2.5)
  })

  it('hat für jede Kategorie einen Standardwert > 0', () => {
    for (const value of Object.values(categorySpreadM)) {
      expect(value).toBeGreaterThan(0)
    }
  })
})
