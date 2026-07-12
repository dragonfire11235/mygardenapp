// Teilen von Tagebucheinträgen.
//
// Architektur wie beim DeviceAdapter: SocialPublisher ist die Naht, an die
// später echtes Auto-Posting andockt (Instagram/Facebook Graph API braucht
// ein Backend mit OAuth — eine reine PWA ohne Server kann nicht direkt
// posten). Bis dahin gibt es den WebSharePublisher: er öffnet das
// Teilen-Menü des Geräts (am Handy mit Instagram, WhatsApp & Co.).

import type { DiaryEntry } from '../../data'
import { formatDate } from '../../shared/dates'
import { getPhotoFile } from '../../shared/photos'
import { renderDiaryCard } from './diaryCard'

export interface SharePayload {
  title: string
  text: string
  files: File[]
}

export interface SocialPublisher {
  readonly id: string
  readonly label: string
  /** Steht die Plattform in dieser Umgebung zur Verfügung? */
  isAvailable(): boolean
  /** Wirft AbortError, wenn der User das Teilen abbricht. */
  publish(payload: SharePayload): Promise<void>
}

/** Web-Share-API: natives Teilen-Menü des Geräts (Handy: Instagram, WhatsApp …) */
class WebSharePublisher implements SocialPublisher {
  readonly id = 'webshare'
  readonly label = 'Teilen'

  isAvailable(): boolean {
    return typeof navigator !== 'undefined' && 'share' in navigator
  }

  async publish(payload: SharePayload): Promise<void> {
    const data: ShareData = { title: payload.title, text: payload.text }
    // Fotos nur mitgeben, wenn der Browser das unterstützt (canShare)
    if (
      payload.files.length &&
      'canShare' in navigator &&
      navigator.canShare({ files: payload.files })
    ) {
      data.files = payload.files
    }
    await navigator.share(data)
  }
}

// Später (mit Backend): InstagramPublisher, FacebookPublisher … — implementieren
// SocialPublisher und werden nur hier registriert, die App bleibt unverändert.
export const publishers: SocialPublisher[] = [new WebSharePublisher()]

/**
 * Baut aus einem Tagebucheintrag das Teilen-Paket.
 * Erste Datei ist die gerenderte Share-Card (Bild mit Titel, Text, Foto,
 * Verknüpfungen) — Instagram & Co. zeigen beim Teilen nur Bilder, so kommt
 * trotzdem „alles" an. Danach folgen die Original-Fotos; der Text bleibt
 * für Messenger erhalten.
 */
export async function diaryEntryToPayload(
  entry: DiaryEntry,
  tagNames: string[] = [],
): Promise<SharePayload> {
  const files: File[] = []
  for (const [i, photoId] of entry.photoIds.entries()) {
    const file = await getPhotoFile(photoId, `garten-${entry.date}-${i + 1}.jpg`)
    if (file) files.push(file)
  }
  try {
    const card = await renderDiaryCard(entry, files[0] ?? null, tagNames)
    files.unshift(new File([card], `gartentagebuch-${entry.date}.png`, { type: 'image/png' }))
  } catch {
    // Karte optional — ohne sie werden weiterhin Text + Fotos geteilt
  }
  const title = entry.title || `Gartentagebuch vom ${formatDate(entry.date)}`
  const text = [entry.text, '🌱 Aus meinem Gartentagebuch'].filter(Boolean).join('\n\n')
  return { title, text, files }
}
