// Wandelt ein ausgewähltes Foto in die Form um, die die Edge Function fürs LLM braucht.
import { resizeImage } from '../../shared/photos'

/** Verkleinert (via resizeImage) und liefert Base64 ohne `data:`-Präfix + MIME-Typ. */
export async function fileToLumiImage(file: File): Promise<{ imageBase64: string; mediaType: string }> {
  const { blob, mimeType } = await resizeImage(file)
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
  return { imageBase64: dataUrl.slice(dataUrl.indexOf(',') + 1), mediaType: mimeType }
}
