// Reiner Merge-Kern für den Geräte-Sync (kein Netz, keine DB → unit-testbar).
//
// Last-Write-Wins über `updatedAt` (ISO-UTC → lexikografischer Vergleich ist korrekt).
// Löschungen sind Tombstones (deletedAt gesetzt) und zählen als normale Zeilen —
// die mit dem höheren updatedAt gewinnt.

import type { BaseEntity } from '../../data'

export interface MergeResult<T extends BaseEntity> {
  /** Server-Gewinner → lokal (Dexie) schreiben. */
  applyLocal: T[]
  /** Lokale Gewinner → zum Server hochladen. */
  pushRemote: T[]
}

/** Gleicht zwei Zeilenmengen gleicher Art nach id ab (LWW über updatedAt). */
export function mergeById<T extends BaseEntity>(local: T[], remote: T[]): MergeResult<T> {
  const localById = new Map(local.map((e) => [e.id, e]))
  const remoteById = new Map(remote.map((e) => [e.id, e]))

  const applyLocal: T[] = []
  const pushRemote: T[] = []

  const ids = new Set<string>([...localById.keys(), ...remoteById.keys()])
  for (const id of ids) {
    const l = localById.get(id)
    const r = remoteById.get(id)
    if (l && !r) {
      pushRemote.push(l)
    } else if (r && !l) {
      applyLocal.push(r)
    } else if (l && r) {
      if (r.updatedAt > l.updatedAt) applyLocal.push(r)
      else if (l.updatedAt > r.updatedAt) pushRemote.push(l)
      // gleiches updatedAt → nichts zu tun
    }
  }

  return { applyLocal, pushRemote }
}
