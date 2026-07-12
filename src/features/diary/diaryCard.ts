// Rendert einen Tagebucheintrag als Bild-Karte (Share-Card) — wie ein
// fertiger Social-Media-Post: Kopfzeile, Titel, Foto, kompletter Text,
// verknüpfte Pflanzen/Beete. Dependency-frei auf Canvas
// (gleiches Muster wie beds/plannerImage.ts).

import type { DiaryEntry } from '../../data'
import { formatDate } from '../../shared/dates'

const W = 1080
const PAD = 64
const CONTENT_W = W - PAD * 2

/**
 * Bricht Text an Wortgrenzen um, sodass jede Zeile in maxWidth passt.
 * `measure` liefert die Breite eines Strings (im Test: Zeichenanzahl).
 * Überlange Einzelwörter werden hart getrennt.
 */
export function wrapText(
  text: string,
  measure: (s: string) => number,
  maxWidth: number,
): string[] {
  const lines: string[] = []
  for (const paragraph of text.split(/\r?\n/)) {
    if (!paragraph.trim()) {
      lines.push('')
      continue
    }
    let line = ''
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word
      if (measure(candidate) <= maxWidth) {
        line = candidate
        continue
      }
      if (line) lines.push(line)
      // Überlanges Wort notfalls hart umbrechen
      let rest = word
      while (measure(rest) > maxWidth && rest.length > 1) {
        let cut = rest.length - 1
        while (cut > 1 && measure(rest.slice(0, cut)) > maxWidth) cut--
        lines.push(rest.slice(0, cut))
        rest = rest.slice(cut)
      }
      line = rest
    }
    lines.push(line)
  }
  // Abschließende Leerzeile entfernen
  while (lines.length && lines[lines.length - 1] === '') lines.pop()
  return lines
}

/** Karte rendern; photoBlob = erstes Foto des Eintrags (optional). */
export async function renderDiaryCard(
  entry: DiaryEntry,
  photoBlob: Blob | null,
  tagNames: string[],
): Promise<Blob> {
  const measureCanvas = document.createElement('canvas')
  const mctx = measureCanvas.getContext('2d')
  if (!mctx) throw new Error('Canvas wird nicht unterstützt.')

  const titleFont = 'bold 52px "Segoe UI", system-ui, sans-serif'
  const textFont = '36px "Segoe UI", system-ui, sans-serif'
  const metaFont = '30px "Segoe UI", system-ui, sans-serif'

  // Zeilen vorab berechnen, um die Kartenhöhe zu bestimmen
  mctx.font = titleFont
  const titleLines = entry.title
    ? wrapText(entry.title, (s) => mctx.measureText(s).width, CONTENT_W).slice(0, 3)
    : []
  mctx.font = textFont
  let textLines = entry.text
    ? wrapText(entry.text, (s) => mctx.measureText(s).width, CONTENT_W)
    : []
  const MAX_TEXT_LINES = 14
  if (textLines.length > MAX_TEXT_LINES) {
    textLines = [...textLines.slice(0, MAX_TEXT_LINES - 1), textLines[MAX_TEXT_LINES - 1] + ' …']
  }

  // Foto laden (Cover-Zuschnitt auf volle Breite)
  let bitmap: ImageBitmap | null = null
  if (photoBlob) {
    try {
      bitmap = await createImageBitmap(photoBlob)
    } catch {
      bitmap = null // defektes Foto → Karte ohne Bild
    }
  }
  const photoH = bitmap ? Math.min(720, Math.round((W * bitmap.height) / bitmap.width)) : 0

  const TITLE_LH = 64
  const TEXT_LH = 50
  const headerH = 120
  const titleH = titleLines.length * TITLE_LH + (titleLines.length ? 16 : 0)
  const textH = textLines.length * TEXT_LH + (textLines.length ? 24 : 0)
  const footerH = tagNames.length ? 96 : 48
  const h = headerH + photoH + (photoH ? 40 : 0) + titleH + textH + footerH

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas wird nicht unterstützt.')

  // Hintergrund
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, h)
  ctx.textBaseline = 'top'

  // Kopfzeile
  ctx.fillStyle = '#16a34a'
  ctx.font = 'bold 34px "Segoe UI", system-ui, sans-serif'
  ctx.fillText('🌱 Mein Gartentagebuch', PAD, 44)
  ctx.fillStyle = '#6b7a70'
  ctx.font = metaFont
  ctx.textAlign = 'right'
  ctx.fillText(formatDate(entry.date), W - PAD, 48)
  ctx.textAlign = 'left'

  let y = headerH

  // Foto
  if (bitmap && photoH) {
    const scale = W / bitmap.width
    const drawH = bitmap.height * scale
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, y, W, photoH)
    ctx.clip()
    ctx.drawImage(bitmap, 0, y - (drawH - photoH) / 2, W, drawH)
    ctx.restore()
    bitmap.close()
    y += photoH + 40
  }

  // Titel
  ctx.fillStyle = '#26302a'
  ctx.font = titleFont
  for (const line of titleLines) {
    ctx.fillText(line, PAD, y)
    y += TITLE_LH
  }
  if (titleLines.length) y += 16

  // Text
  ctx.font = textFont
  ctx.fillStyle = '#26302a'
  for (const line of textLines) {
    ctx.fillText(line, PAD, y)
    y += TEXT_LH
  }
  if (textLines.length) y += 24

  // Fußzeile: verknüpfte Pflanzen/Beete
  if (tagNames.length) {
    ctx.strokeStyle = '#e2e8de'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(PAD, y)
    ctx.lineTo(W - PAD, y)
    ctx.stroke()
    ctx.fillStyle = '#16a34a'
    ctx.font = metaFont
    let tagLine = `🌿 ${tagNames.join(' · ')}`
    while (ctx.measureText(tagLine).width > CONTENT_W && tagLine.length > 4) {
      tagLine = tagLine.slice(0, -5) + ' …'
    }
    ctx.fillText(tagLine, PAD, y + 24)
  }

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Karte konnte nicht erzeugt werden.'))),
      'image/png',
    ),
  )
}
