import { describe, expect, it } from 'vitest'
import { gardenBirds, searchGardenBirds, undiscoveredGardenBirds } from './birds'

describe('gardenBirds', () => {
  it('enthält mindestens 25 Arten mit Namen und Lockmitteln', () => {
    expect(gardenBirds.length).toBeGreaterThanOrEqual(25)
    for (const bird of gardenBirds) {
      expect(bird.name.length).toBeGreaterThan(0)
      expect(bird.attracts.length).toBeGreaterThan(0)
    }
  })
})

describe('searchGardenBirds', () => {
  it('liefert die ersten Einträge ohne Suchbegriff', () => {
    expect(searchGardenBirds('').length).toBeGreaterThan(0)
  })

  it('findet Präfix-Treffer vor Teilstring-Treffern', () => {
    const results = searchGardenBirds('Amsel')
    expect(results[0].name).toBe('Amsel')
  })

  it('ist unabhängig von Groß-/Kleinschreibung', () => {
    expect(searchGardenBirds('kohlmeise').some((b) => b.name === 'Kohlmeise')).toBe(true)
  })

  it('liefert nichts bei unbekannter Eingabe', () => {
    expect(searchGardenBirds('Nichtvorhandenervogel')).toEqual([])
  })
})

describe('undiscoveredGardenBirds', () => {
  it('schließt bereits gesichtete Arten aus (case-insensitive)', () => {
    const rest = undiscoveredGardenBirds(['amsel'])
    expect(rest.some((b) => b.name === 'Amsel')).toBe(false)
    expect(rest.length).toBe(gardenBirds.length - 1)
  })

  it('liefert die volle Liste ohne Sichtungen', () => {
    expect(undiscoveredGardenBirds([]).length).toBe(gardenBirds.length)
  })
})
