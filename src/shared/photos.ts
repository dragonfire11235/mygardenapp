// Geteiltes Foto-Handling für alle Module (Tagebuch, Pflanzen, Beete, Dashboard).
// Fotos werden vor dem Speichern clientseitig verkleinert und als Blob in der
// Photo-Tabelle abgelegt. Objekt-URLs werden app-weit gecacht.

import { createEntity, storage, type Photo } from '../data'

const MAX_EDGE = 1600
const JPEG_QUALITY = 0.82

/** Objekt-URL-Cache pro Foto-ID (app-weit geteilt) */
const urlCache = new Map<string, string>()

/** Verkleinert ein Bild auf max. 1600px Kantenlänge und gibt Blob + MIME zurück. */
export async function resizeImage(file: Blob): Promise<{ blob: Blob; mimeType: string }> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas wird nicht unterstützt.')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  )
  if (!blob) throw new Error('Bild konnte nicht verarbeitet werden.')
  return { blob, mimeType: 'image/jpeg' }
}

/** Verkleinert, speichert und gibt die neue Foto-ID zurück. */
export async function addPhoto(file: File): Promise<string> {
  const { blob, mimeType } = await resizeImage(file)
  const photo = createEntity<Photo>({ blob, mimeType })
  await storage.photos.put(photo)
  return photo.id
}

/** Liefert eine (gecachte) Objekt-URL zum Foto oder null, wenn es nicht existiert. */
export async function getPhotoUrl(photoId: string): Promise<string | null> {
  const cached = urlCache.get(photoId)
  if (cached) return cached
  const photo = await storage.photos.getById(photoId)
  if (!photo) return null
  const url = URL.createObjectURL(photo.blob)
  urlCache.set(photoId, url)
  return url
}

/** Holt das Foto als File (z. B. für den Web-Share-Teilen-Button). */
export async function getPhotoFile(photoId: string, name = 'foto.jpg'): Promise<File | null> {
  const photo = await storage.photos.getById(photoId)
  if (!photo) return null
  return new File([photo.blob], name, { type: photo.mimeType })
}

/** Entfernt ein Foto endgültig und gibt die Objekt-URL frei. */
export async function deletePhoto(photoId: string): Promise<void> {
  await storage.photos.hardDelete(photoId)
  const url = urlCache.get(photoId)
  if (url) {
    URL.revokeObjectURL(url)
    urlCache.delete(photoId)
  }
}
