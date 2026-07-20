// Server-Zugriff für den Sync gegen die Tabelle `sync_rows` (Supabase).
// Reiner Netz-Layer: keine Merge-Logik, kein Dexie. RLS liefert nur eigene Zeilen.

import type { BaseEntity } from '../../data'
import { supabase } from '../../data/supabase/client'

/** Die synchronisierten Entitätsarten (Fotos + Settings sind bewusst NICHT dabei). */
export const KINDS = ['plant', 'bed', 'planting', 'task', 'diary', 'device', 'sighting'] as const
export type Kind = (typeof KINDS)[number]

function client() {
  if (!supabase) throw new Error('Supabase ist nicht konfiguriert.')
  return supabase
}

/** Alle eigenen Zeilen holen, gruppiert nach kind (Rückgabe = die data-Objekte). */
export async function pullAll(): Promise<Record<Kind, BaseEntity[]>> {
  const { data, error } = await client().from('sync_rows').select('kind, data')
  if (error) throw error

  const out = Object.fromEntries(KINDS.map((k) => [k, [] as BaseEntity[]])) as Record<Kind, BaseEntity[]>
  for (const row of (data ?? []) as { kind: Kind; data: BaseEntity }[]) {
    if (out[row.kind]) out[row.kind].push(row.data)
  }
  return out
}

/** Entitäten eines Kind zum Server hochladen (Upsert über id). user_id setzt der DB-Default. */
export async function pushRows(kind: Kind, entities: BaseEntity[]): Promise<void> {
  if (entities.length === 0) return
  const rows = entities.map((e) => ({
    id: e.id,
    kind,
    updated_at: e.updatedAt,
    deleted_at: e.deletedAt,
    data: e,
  }))
  const { error } = await client().from('sync_rows').upsert(rows, { onConflict: 'id' })
  if (error) throw error
}
