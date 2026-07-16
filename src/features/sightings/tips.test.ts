import { describe, expect, it } from 'vitest'
import { createEntity, type Sighting, type SightingGroup } from '../../data'
import { suggestTip } from './tips'

function s(group: SightingGroup): Sighting {
  return createEntity<Sighting>({
    date: '2026-07-16',
    group,
    species: '',
    photoId: null,
    plantId: null,
    bedId: null,
    notes: '',
    source: 'manual',
  })
}

describe('suggestTip', () => {
  it('schlägt eine Pflanze mit hohem Nützlingswert ohne bisherige Sichtung vor', () => {
    const tip = suggestTip(
      [{ plantName: 'Salbei', beneficials: { wildbees: 3, hoverflies: 1 } }],
      [],
    )
    expect(tip).toMatchObject({ plantName: 'Salbei', group: 'wildbee' })
    expect(tip?.text).toContain('Salbei')
    expect(tip?.text).toContain('Wildbiene')
  })

  it('bevorzugt den höchsten Teil-Score über mehrere Pflanzen hinweg', () => {
    const tip = suggestTip(
      [
        { plantName: 'Thymian', beneficials: { hoverflies: 1 } },
        { plantName: 'Salbei', beneficials: { wildbees: 3 } },
      ],
      [],
    )
    expect(tip?.plantName).toBe('Salbei')
  })

  it('ignoriert Gruppen, die schon fotografiert wurden', () => {
    const tip = suggestTip(
      [{ plantName: 'Salbei', beneficials: { wildbees: 3, hoverflies: 2 } }],
      [s('wildbee')],
    )
    expect(tip?.group).toBe('hoverfly')
  })

  it('gibt null zurück, wenn alle vertretenen Gruppen schon fotografiert sind', () => {
    const tip = suggestTip(
      [{ plantName: 'Salbei', beneficials: { wildbees: 3 } }],
      [s('wildbee')],
    )
    expect(tip).toBeNull()
  })

  it('gibt null zurück ohne Pflanzen mit Nützlingswerten', () => {
    expect(suggestTip([{ plantName: 'Kartoffel', beneficials: {} }], [])).toBeNull()
  })

  it('behandelt Raupenfutter als Schmetterlings-Tipp', () => {
    const tip = suggestTip([{ plantName: 'Brennnessel', beneficials: { caterpillarHost: 2 } }], [])
    expect(tip?.group).toBe('butterfly')
  })
})
