// Sync-Engine: verbindet lokalen Storage (Dexie) mit dem Server (sync_rows).
// Voller bidirektionaler Abgleich je Entitätsart über die reine mergeById-Funktion.
// Nutzt NIE das destruktive importAll — nur repo.bulkPut / pushRows.

import type { BaseEntity, Repository } from '../../data'
import { storage } from '../../data'
import { mergeById } from './merge'
import { KINDS, type Kind, pullAll, pushRows } from './syncRemote'

// Registry kind → lokales Repository. Cast auf Repository<BaseEntity>, weil die
// Server-Daten generisch als BaseEntity behandelt werden (die konkreten Felder
// liegen im data-JSONB und werden 1:1 durchgereicht).
const repoByKind: Record<Kind, Repository<BaseEntity>> = {
  plant: storage.plants as unknown as Repository<BaseEntity>,
  bed: storage.beds as unknown as Repository<BaseEntity>,
  planting: storage.plantings as unknown as Repository<BaseEntity>,
  task: storage.tasks as unknown as Repository<BaseEntity>,
  diary: storage.diary as unknown as Repository<BaseEntity>,
  device: storage.devices as unknown as Repository<BaseEntity>,
  sighting: storage.sightings as unknown as Repository<BaseEntity>,
}

/**
 * Führt einen vollständigen Abgleich durch: Server-Zeilen holen, je Art gegen die
 * lokalen (inkl. Tombstones) mergen, Gewinner lokal schreiben bzw. hochladen.
 * `changedLocal` = true, wenn lokal etwas geschrieben wurde (→ Stores neu laden).
 */
export async function runSync(): Promise<{ changedLocal: boolean }> {
  const remote = await pullAll()
  let changedLocal = false

  for (const kind of KINDS) {
    const repo = repoByKind[kind]
    const local = await repo.getAllForSync()
    const { applyLocal, pushRemote } = mergeById(local, remote[kind] ?? [])

    if (applyLocal.length) {
      await repo.bulkPut(applyLocal)
      changedLocal = true
    }
    if (pushRemote.length) {
      await pushRows(kind, pushRemote)
    }
  }

  return { changedLocal }
}
