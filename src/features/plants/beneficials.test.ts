import { describe, expect, it } from 'vitest'
import { activeGroups, aggregateBeneficials, gapGroups, levelLabel, overallScore, scoreLabel } from './beneficials'

describe('levelLabel', () => {
  it('mappt Teil-Scores auf Text', () => {
    expect(levelLabel(3)).toBe('hoch')
    expect(levelLabel(2)).toBe('mittel')
    expect(levelLabel(1)).toBe('gering')
    expect(levelLabel(0)).toBe('–')
    expect(levelLabel(undefined)).toBe('–')
  })
})

describe('scoreLabel', () => {
  it('mappt Gesamt-Score auf Text', () => {
    expect(scoreLabel(5)).toBe('sehr hoch')
    expect(scoreLabel(4)).toBe('hoch')
    expect(scoreLabel(3)).toBe('gut')
    expect(scoreLabel(2)).toBe('mittel')
    expect(scoreLabel(1)).toBe('gering')
    expect(scoreLabel(0)).toBe('keine Daten')
    expect(scoreLabel(undefined)).toBe('keine Daten')
  })
})

describe('activeGroups', () => {
  it('liefert nur Gruppen mit Wert > 0, in fester Reihenfolge', () => {
    const groups = activeGroups({ wildbees: 3, butterflies: 0, caterpillarHost: 2, hoverflies: 0, beetles: 1 })
    expect(groups.map((g) => g.group.key)).toEqual(['wildbees', 'caterpillarHost', 'beetles'])
    expect(groups[0].score).toBe(3)
  })

  it('leer bei fehlenden Daten', () => {
    expect(activeGroups(undefined)).toEqual([])
  })
})

describe('gapGroups', () => {
  it('liefert Gruppen mit Wert 0', () => {
    const gaps = gapGroups({ wildbees: 3, butterflies: 0, caterpillarHost: 2 })
    expect(gaps.map((g) => g.key).sort()).toEqual(['beetles', 'butterflies', 'hoverflies'])
  })
})

describe('overallScore', () => {
  it('= min(5, round(Σ/3))', () => {
    expect(overallScore({ wildbees: 3, butterflies: 3, caterpillarHost: 3, hoverflies: 3, beetles: 3 })).toBe(5) // 15/3=5
    expect(overallScore({ wildbees: 3, caterpillarHost: 3 })).toBe(2) // 6/3=2
    expect(overallScore({})).toBe(0)
  })
})

describe('aggregateBeneficials', () => {
  it('nimmt je Gruppe das Maximum der Pflanzen', () => {
    const agg = aggregateBeneficials([
      { wildbees: 1, butterflies: 3 },
      { wildbees: 3, caterpillarHost: 2 },
    ])
    expect(agg?.beneficials).toEqual({ wildbees: 3, butterflies: 3, caterpillarHost: 2 })
    expect(agg?.score).toBe(3) // (3+3+2)/3 ≈ 2.67 → 3
  })

  it('null bei leerer Liste oder nur Nullwerten', () => {
    expect(aggregateBeneficials([])).toBeNull()
    expect(aggregateBeneficials([undefined, { wildbees: 0 }])).toBeNull()
  })
})
