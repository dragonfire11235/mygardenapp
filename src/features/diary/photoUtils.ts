// Fotos werden vor dem Speichern clientseitig verkleinert,
// damit die IndexedDB nicht mit Original-Kamerabildern volläuft.

const MAX_EDGE = 1600
const JPEG_QUALITY = 0.82

export async function resizeImage(file: File): Promise<{ blob: Blob; mimeType: string }> {
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
