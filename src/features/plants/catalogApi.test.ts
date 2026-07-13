import { describe, expect, it } from 'vitest'
import { catalogPlantToDraft, searchCatalog } from './catalogApi'
import type { CatalogFile, CatalogPlant } from './catalogTypes'
import catalogJson from '../../../public/catalog/garten-de.json'

function entry(over: Partial<CatalogPlant> = {}): CatalogPlant {
  return {
    id: 'x',
    name: 'Testpflanze',
    botanicalName: 'Testus plantus',
    family: 'Testgewächse',
    familyBotanical: 'Testaceae',
    category: 'sonstiges',
    ...over,
  }
}

const FIXTURE: CatalogPlant[] = [
  entry({ id: 'salvia', name: 'Echter Salbei', botanicalName: 'Salvia officinalis', category: 'kraeuter' }),
  entry({ id: 'salvia-p', name: 'Wiesensalbei', botanicalName: 'Salvia pratensis', category: 'sonstiges' }),
  entry({ id: 'aquilegia', name: 'Akelei', botanicalName: 'Aquilegia vulgaris', category: 'blumen' }),
  entry({ id: 'ruebe', name: 'Rote Bete', botanicalName: 'Beta vulgaris', category: 'gemuese' }),
]

describe('searchCatalog', () => {
  it('findet über den deutschen Namen', () => {
    const r = searchCatalog(FIXTURE, 'Akelei')
    expect(r.map((e) => e.id)).toContain('aquilegia')
  })

  it('findet über den botanischen Namen', () => {
    const r = searchCatalog(FIXTURE, 'Aquilegia')
    expect(r[0].id).toBe('aquilegia')
  })

  it('rankt Präfix-Treffer im deutschen Namen vor Teilstring', () => {
    // "salbei" kommt in "Echter Salbei" (Teilstring) vor; "Wiesensalbei" ebenfalls.
    // Ein Präfix-Query "wiesen" muss Wiesensalbei zuerst liefern.
    const r = searchCatalog(FIXTURE, 'wiesen')
    expect(r[0].id).toBe('salvia-p')
  })

  it('sucht case-insensitiv im Teilstring', () => {
    // "salbei" steckt in "Echter Salbei" und "Wiesensalbei"
    expect(searchCatalog(FIXTURE, 'salbei').map((e) => e.id).sort()).toEqual(['salvia', 'salvia-p'])
  })

  it('normalisiert Umlaute (ä→ae) im Query', () => {
    // Fixture-Name mit Umlaut, Query ohne
    const list = [entry({ id: 'moehre', name: 'Möhre', botanicalName: 'Daucus carota' })]
    expect(searchCatalog(list, 'moehre').map((e) => e.id)).toContain('moehre')
    expect(searchCatalog(list, 'Möhre').map((e) => e.id)).toContain('moehre')
  })

  it('filtert nach Kategorie', () => {
    const r = searchCatalog(FIXTURE, 'Salvia', { category: 'kraeuter' })
    expect(r.map((e) => e.id)).toEqual(['salvia'])
  })

  it('respektiert das Limit', () => {
    expect(searchCatalog(FIXTURE, '', {}, 2).length).toBe(2)
  })
})

describe('catalogPlantToDraft', () => {
  it('mappt Namen, Kategorie und Pflegefelder', () => {
    const draft = catalogPlantToDraft(
      entry({
        name: 'Tomate',
        botanicalName: 'Solanum lycopersicum',
        category: 'gemuese',
        sunlight: 'sonne',
        wateringIntervalDays: 2,
        spreadM: 0.5,
        sowingMonths: [3],
        harvestMonths: [7, 8],
        bloomMonths: [6, 7],
        imageUrl: 'https://example/x.jpg',
      }),
    )
    expect(draft.name).toBe('Tomate')
    expect(draft.botanicalName).toBe('Solanum lycopersicum')
    expect(draft.category).toBe('gemuese')
    expect(draft.sunlight).toBe('sonne')
    expect(draft.wateringIntervalDays).toBe(2)
    expect(draft.spreadM).toBe(0.5)
    expect(draft.sowingMonths).toEqual([3])
    expect(draft.harvestMonths).toEqual([7, 8])
    expect(draft.bloomMonths).toEqual([6, 7])
    expect(draft.imageUrl).toBe('https://example/x.jpg')
    expect(draft.notes).toContain('Testgewächse')
  })

  it('nutzt leere Defaults, wenn Felder fehlen', () => {
    const draft = catalogPlantToDraft(entry())
    expect(draft.sunlight).toBeNull()
    expect(draft.wateringIntervalDays).toBeNull()
    expect(draft.sowingMonths).toEqual([])
    expect(draft.trefleId).toBeNull()
  })
})

describe('garten-de.json (Datensatz-Smoke-Test)', () => {
  const file = catalogJson as CatalogFile
  const valid = new Set(['gemuese', 'obst', 'kraeuter', 'blumen', 'strauch', 'baum', 'sonstiges'])

  it('hat Einträge und stimmige count-Angabe', () => {
    expect(file.entries.length).toBe(file.count)
    expect(file.entries.length).toBeGreaterThan(600)
  })

  it('jeder Eintrag hat Pflichtfelder + gültige Kategorie', () => {
    for (const e of file.entries) {
      expect(e.id).toBeTruthy()
      expect(e.name).toBeTruthy()
      expect(e.botanicalName).toBeTruthy()
      expect(valid.has(e.category)).toBe(true)
    }
  })

  it('ids sind eindeutig', () => {
    const ids = new Set(file.entries.map((e) => e.id))
    expect(ids.size).toBe(file.entries.length)
  })

  it('Monatsfelder liegen in 1–12', () => {
    for (const e of file.entries) {
      for (const f of ['sowingMonths', 'harvestMonths', 'bloomMonths', 'pruningMonths'] as const) {
        for (const m of e[f] ?? []) expect(m >= 1 && m <= 12).toBe(true)
      }
    }
  })
})
