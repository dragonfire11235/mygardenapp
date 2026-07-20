import { describe, expect, it } from 'vitest'
import type { BaseEntity } from '../../data'
import { mergeById } from './merge'

// Minimal-Zeile: mergeById nutzt nur id/updatedAt/deletedAt.
function row(id: string, updatedAt: string, deletedAt: string | null = null): BaseEntity {
  return { id, createdAt: updatedAt, updatedAt, deletedAt }
}

describe('mergeById', () => {
  it('nur lokal vorhanden → push zum Server', () => {
    const res = mergeById([row('a', '2026-01-01T00:00:00.000Z')], [])
    expect(res.pushRemote.map((e) => e.id)).toEqual(['a'])
    expect(res.applyLocal).toHaveLength(0)
  })

  it('nur remote vorhanden → lokal anwenden', () => {
    const res = mergeById([], [row('a', '2026-01-01T00:00:00.000Z')])
    expect(res.applyLocal.map((e) => e.id)).toEqual(['a'])
    expect(res.pushRemote).toHaveLength(0)
  })

  it('remote neuer → lokal anwenden', () => {
    const res = mergeById(
      [row('a', '2026-01-01T00:00:00.000Z')],
      [row('a', '2026-02-01T00:00:00.000Z')],
    )
    expect(res.applyLocal.map((e) => e.id)).toEqual(['a'])
    expect(res.pushRemote).toHaveLength(0)
  })

  it('lokal neuer → push zum Server', () => {
    const res = mergeById(
      [row('a', '2026-03-01T00:00:00.000Z')],
      [row('a', '2026-02-01T00:00:00.000Z')],
    )
    expect(res.pushRemote.map((e) => e.id)).toEqual(['a'])
    expect(res.applyLocal).toHaveLength(0)
  })

  it('gleiches updatedAt → nichts zu tun', () => {
    const res = mergeById(
      [row('a', '2026-02-01T00:00:00.000Z')],
      [row('a', '2026-02-01T00:00:00.000Z')],
    )
    expect(res.applyLocal).toHaveLength(0)
    expect(res.pushRemote).toHaveLength(0)
  })

  it('Tombstone gewinnt über älteren Edit (remote gelöscht neuer)', () => {
    const res = mergeById(
      [row('a', '2026-02-01T00:00:00.000Z')], // lokal aktiv, älter
      [row('a', '2026-03-01T00:00:00.000Z', '2026-03-01T00:00:00.000Z')], // remote gelöscht, neuer
    )
    expect(res.applyLocal).toHaveLength(1)
    expect(res.applyLocal[0].deletedAt).not.toBeNull()
    expect(res.pushRemote).toHaveLength(0)
  })

  it('mischt mehrere IDs korrekt', () => {
    const res = mergeById(
      [row('a', '2026-03-01T00:00:00.000Z'), row('b', '2026-01-01T00:00:00.000Z'), row('c', '2026-01-01T00:00:00.000Z')],
      [row('b', '2026-02-01T00:00:00.000Z'), row('d', '2026-01-01T00:00:00.000Z')],
    )
    // a nur lokal → push; b remote neuer → apply; c nur lokal → push; d nur remote → apply
    expect(res.pushRemote.map((e) => e.id).sort()).toEqual(['a', 'c'])
    expect(res.applyLocal.map((e) => e.id).sort()).toEqual(['b', 'd'])
  })
})
