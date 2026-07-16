import { describe, expect, it } from 'vitest'
import { createEntity, type Sighting, type SightingGroup } from '../../data'
import { earnedAchievements } from './achievements'

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

describe('earnedAchievements', () => {
  it('vergibt kein Abzeichen ohne Sichtungen', () => {
    expect(earnedAchievements([])).toEqual([])
  })

  it('vergibt „Erste Sichtung" ab dem ersten Eintrag', () => {
    const ids = earnedAchievements([s({ group: 'wildbee' })]).map((b) => b.id)
    expect(ids).toContain('erste-sichtung')
    expect(ids).not.toContain('erster-vogel')
  })

  it('vergibt „Vogelbeobachter" nur bei einer Vogel-Sichtung', () => {
    const ids = earnedAchievements([s({ group: 'bird' })]).map((b) => b.id)
    expect(ids).toContain('erster-vogel')
  })

  it('vergibt „Verknüpft" nur bei einer Sichtung mit Pflanze', () => {
    expect(earnedAchievements([s({ group: 'wildbee' })]).map((b) => b.id)).not.toContain('mit-pflanze')
    expect(earnedAchievements([s({ group: 'wildbee', plantId: 'p1' })]).map((b) => b.id)).toContain('mit-pflanze')
  })

  it('vergibt „Vielfalt" erst ab drei verschiedenen Gruppen', () => {
    const zwei = earnedAchievements([s({ group: 'wildbee' }), s({ group: 'bird' })]).map((b) => b.id)
    expect(zwei).not.toContain('drei-gruppen')

    const drei = earnedAchievements([s({ group: 'wildbee' }), s({ group: 'bird' }), s({ group: 'beetle' })]).map((b) => b.id)
    expect(drei).toContain('drei-gruppen')
  })

  it('vergibt „Artenkenner" erst ab fünf verschiedenen Arten einer Gruppe', () => {
    const vier = ['Erdhummel', 'Steinhummel', 'Wollbiene', 'Mauerbiene'].map((species) => s({ group: 'wildbee', species }))
    expect(earnedAchievements(vier).map((b) => b.id)).not.toContain('fuenf-arten')

    const fuenf = [...vier, s({ group: 'wildbee', species: 'Gartenhummel' })]
    expect(earnedAchievements(fuenf).map((b) => b.id)).toContain('fuenf-arten')
  })

  it('zählt Sichtungen ohne Artnamen nicht doppelt und ignoriert Groß-/Kleinschreibung', () => {
    const doppelt = [
      s({ group: 'wildbee', species: 'Erdhummel' }),
      s({ group: 'wildbee', species: 'erdhummel' }),
      s({ group: 'wildbee', species: '' }),
      s({ group: 'wildbee', species: '' }),
    ]
    expect(earnedAchievements(doppelt).map((b) => b.id)).not.toContain('fuenf-arten')
  })
})
