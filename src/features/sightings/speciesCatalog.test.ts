import { describe, expect, it } from 'vitest'
import type { SightingGroup } from '../../data'
import { searchSpecies, speciesForGroup, undiscoveredSpecies } from './speciesCatalog'

const GROUPS_WITH_CATALOG: SightingGroup[] = ['wildbee', 'butterfly', 'hoverfly', 'beetle', 'bird']

describe('speciesForGroup', () => {
  it('liefert für jede Gruppe mit Katalog mindestens 10 Arten mit Name und Hinweis', () => {
    for (const group of GROUPS_WITH_CATALOG) {
      const list = speciesForGroup(group)
      expect(list.length).toBeGreaterThanOrEqual(10)
      for (const s of list) {
        expect(s.name.length).toBeGreaterThan(0)
        expect(s.hint.length).toBeGreaterThan(0)
      }
    }
  })

  it('liefert eine leere Liste für Gruppen ohne Katalog', () => {
    expect(speciesForGroup('other')).toEqual([])
  })
})

describe('searchSpecies', () => {
  it('liefert die ersten Einträge ohne Suchbegriff', () => {
    expect(searchSpecies('wildbee', '').length).toBeGreaterThan(0)
  })

  it('findet Präfix-Treffer vor Teilstring-Treffern', () => {
    const results = searchSpecies('bird', 'Amsel')
    expect(results[0].name).toBe('Amsel')
  })

  it('ist unabhängig von Groß-/Kleinschreibung', () => {
    expect(searchSpecies('butterfly', 'zitronenfalter').some((s) => s.name === 'Zitronenfalter')).toBe(true)
  })

  it('liefert nichts bei unbekannter Eingabe', () => {
    expect(searchSpecies('beetle', 'Nichtvorhandenerkaefer')).toEqual([])
  })

  it('liefert nichts für Gruppen ohne Katalog', () => {
    expect(searchSpecies('other', '')).toEqual([])
  })
})

describe('undiscoveredSpecies', () => {
  it('schließt bereits gesichtete Arten aus (case-insensitive)', () => {
    const rest = undiscoveredSpecies('bird', ['amsel'])
    expect(rest.some((s) => s.name === 'Amsel')).toBe(false)
    expect(rest.length).toBe(speciesForGroup('bird').length - 1)
  })

  it('liefert die volle Liste ohne Sichtungen', () => {
    expect(undiscoveredSpecies('wildbee', []).length).toBe(speciesForGroup('wildbee').length)
  })
})
