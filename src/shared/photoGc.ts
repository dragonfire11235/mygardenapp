// Foto-Garbage-Collection: Blobs, auf die keine Entität mehr zeigt, endgültig
// entfernen. Nötig, weil "Foto ersetzen/entfernen" im PhotoPicker und das
// Löschen von Pflanzen/Beeten den Blob bewusst nicht sofort anfassen —
// Formulare können abgebrochen und Soft-Deletes theoretisch zurückgeholt
// werden. Stattdessen räumt dieser Sweep beim App-Start auf.

import { storage as defaultStorage } from '../data'
import type { StorageProvider } from '../data'

/**
 * Sammelt alle referenzierten Foto-IDs. Soft-gelöschte Entitäten zählen
 * bewusst als Referenz: Sie bleiben für einen späteren Sync/Restore erhalten,
 * also müssen auch ihre Fotos erhalten bleiben.
 */
async function collectReferencedPhotoIds(storage: StorageProvider): Promise<Set<string>> {
  // exportAll(false) liefert die Rohdaten aller Tabellen inkl. soft-gelöschter
  // Zeilen — ohne die Foto-Blobs selbst zu kodieren.
  const data = await storage.exportAll(false)
  const ids = new Set<string>()

  for (const plant of data.plants) if (plant.photoId) ids.add(plant.photoId)
  for (const bed of data.beds) if (bed.photoId) ids.add(bed.photoId)
  for (const entry of data.diary) for (const id of entry.photoIds) ids.add(id)

  for (const key of ['dashboardHeaderPhotoId', 'dashboardBackgroundPhotoId']) {
    const value = data.settings[key]
    if (typeof value === 'string' && value) ids.add(value)
  }

  return ids
}

/**
 * Entfernt alle Fotos ohne Referenz endgültig. Gibt die Anzahl der
 * gelöschten Fotos zurück. Wird beim App-Start im Hintergrund aufgerufen.
 */
export async function deleteOrphanPhotos(storage: StorageProvider = defaultStorage): Promise<number> {
  const referenced = await collectReferencedPhotoIds(storage)
  const photos = await storage.photos.getAll()

  let deleted = 0
  for (const photo of photos) {
    if (referenced.has(photo.id)) continue
    await storage.photos.hardDelete(photo.id)
    deleted++
  }
  return deleted
}
