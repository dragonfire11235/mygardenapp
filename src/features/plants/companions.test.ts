import { describe, expect, it } from 'vitest'
import type { CatalogPlant } from './catalogTypes'
import { relationBetween, resolveCompanions } from './companions'

function p(over: Partial<CatalogPlant>): CatalogPlant {
  return { id: over.botanicalName ?? 'x', name: 'X', botanicalName: 'X', family: '', familyBotanical: '', category: 'gemuese', ...over }
}

const tomate = p({ name: 'Tomate', botanicalName: 'Lycopersicon esculentum', companionsGood: ['Ocimum basilicum'], companionsBad: ['Solanum tuberosum'] })
const basilikum = p({ name: 'Basilikum', botanicalName: 'Ocimum basilicum' })
const kartoffel = p({ name: 'Kartoffel', botanicalName: 'Solanum tuberosum' })
const zwiebel = p({ name: 'Zwiebel', botanicalName: 'Allium cepa' })

describe('relationBetween', () => {
  it('gut, wenn A den Partner als gut führt', () => {
    expect(relationBetween(tomate, basilikum)).toBe('good')
  })

  it('bidirektional: gilt auch von der anderen Seite', () => {
    expect(relationBetween(basilikum, tomate)).toBe('good')
  })

  it('schlecht schlägt gut', () => {
    const konflikt = p({ botanicalName: 'A', companionsGood: ['B'], companionsBad: ['B'] })
    const other = p({ botanicalName: 'B' })
    expect(relationBetween(konflikt, other)).toBe('bad')
  })

  it('null bei ohne Beziehung und bei gleicher Pflanze', () => {
    expect(relationBetween(tomate, zwiebel)).toBeNull()
    expect(relationBetween(tomate, tomate)).toBeNull()
    expect(relationBetween(tomate, undefined)).toBeNull()
  })

  it('erkennt schlechten Nachbarn', () => {
    expect(relationBetween(tomate, kartoffel)).toBe('bad')
  })
})

describe('resolveCompanions', () => {
  it('löst Referenzen zu Anzeigenamen auf (dedupliziert, sortiert)', () => {
    const map = new Map<string, CatalogPlant>([
      ['ocimum basilicum', basilikum],
      ['solanum tuberosum', kartoffel],
    ])
    const r = resolveCompanions(tomate, map)
    expect(r.good.map((c) => c.name)).toEqual(['Basilikum'])
    expect(r.bad.map((c) => c.name)).toEqual(['Kartoffel'])
  })

  it('fällt auf den botanischen Namen zurück, wenn kein Katalog-Treffer', () => {
    const r = resolveCompanions(p({ companionsGood: ['Unbekannta plantus'] }), new Map())
    expect(r.good[0].name).toBe('Unbekannta plantus')
  })
})
