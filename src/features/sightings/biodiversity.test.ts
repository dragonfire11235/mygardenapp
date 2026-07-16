import { describe, expect, it } from 'vitest'
import { createEntity, type Sighting, type SightingGroup } from '../../data'
import { biodiversityScore } from './biodiversity'

function s(over: Partial<Sighting> & { group: SightingGroup }): Sighting {
  return createEntity<Sighting>({
    date: '2026-07-16',
    species: '',
    photoId: null,
    plantId: null,
    bedId: null,
    notes: '',
    source: 'manual',
    ...over,
  })
}

describe('biodiversityScore', () => {
  it('liefert 0 bei leerer Eingabe', () => {
    expect(biodiversityScore([])).toEqual({ score: 0, distinctSpecies: 0, groups: 0 })
  })

  it('zählt eine Gruppe ohne Artname nur bei den Gruppen', () => {
    const result = biodiversityScore([s({ group: 'wildbee' })])
    expect(result).toEqual({ score: 5, distinctSpecies: 0, groups: 1 })
  })

  it('zählt distinkte Arten unabhängig von Groß-/Kleinschreibung nur einmal', () => {
    const result = biodiversityScore([
      s({ group: 'wildbee', species: 'Erdhummel' }),
      s({ group: 'wildbee', species: 'erdhummel' }),
    ])
    expect(result.distinctSpecies).toBe(1)
  })

  it('wächst mit zunehmender Vielfalt (mehr Arten und Gruppen → höherer Score)', () => {
    const wenig = biodiversityScore([s({ group: 'wildbee', species: 'Erdhummel' })])
    const mehr = biodiversityScore([
      s({ group: 'wildbee', species: 'Erdhummel' }),
      s({ group: 'butterfly', species: 'Zitronenfalter' }),
      s({ group: 'bird', species: 'Amsel' }),
    ])
    expect(mehr.score).toBeGreaterThan(wenig.score)
  })

  it('deckelt den Score bei 100', () => {
    const viele = Array.from({ length: 20 }, (_, i) => s({ group: 'wildbee', species: `Art ${i}` }))
    expect(biodiversityScore(viele).score).toBe(100)
  })
})
