// Rendert den Beetplan (Raster + platzierte Pflanzen) dependency-frei auf ein
// Canvas und gibt ein PNG-Blob zurück. Nutzt dieselben Werte wie BedPlanner.vue
// (Metermaße, plantSpreadM, categoryColors), damit Bild und Ansicht übereinstimmen.

import type { Bed, Plant, Planting } from '../../data'
import { categoryColors, plantSpreadM } from '../../shared/texts'

export interface PlacedItem {
  plant: Plant
  planting: Planting
}

function fmt(n: number): string {
  return n.toLocaleString('de-DE', { maximumFractionDigits: 2 })
}

export async function renderPlannerImage(bed: Bed, items: PlacedItem[]): Promise<Blob> {
  const widthM = bed.widthM ?? 1
  const heightM = bed.heightM ?? 1
  // Lange Seite auf ~1000px skalieren (px pro Meter)
  const s = 1000 / Math.max(widthM, heightM)
  const pad = 24
  const header = 52
  const bw = widthM * s
  const bh = heightM * s
  const w = Math.round(bw + pad * 2)
  const h = Math.round(bh + pad * 2 + header)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas wird nicht unterstützt.')

  // Hintergrund
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)

  // Kopfzeile: Name links, Maße rechts
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#26302a'
  ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(bed.name, pad, 16)
  ctx.fillStyle = '#6b7a70'
  ctx.font = '16px "Segoe UI", system-ui, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(`${fmt(widthM)} × ${fmt(heightM)} m`, w - pad, 20)
  ctx.textAlign = 'left'

  const ox = pad
  const oy = pad + header

  // Beetfläche
  ctx.fillStyle = '#f0f7ee'
  ctx.fillRect(ox, oy, bw, bh)

  // Rasterlinien alle 0,5 m
  ctx.strokeStyle = 'rgba(22, 163, 74, 0.22)'
  ctx.lineWidth = 1
  for (let x = 0.5; x < widthM - 1e-6; x += 0.5) {
    ctx.beginPath()
    ctx.moveTo(ox + x * s, oy)
    ctx.lineTo(ox + x * s, oy + bh)
    ctx.stroke()
  }
  for (let y = 0.5; y < heightM - 1e-6; y += 0.5) {
    ctx.beginPath()
    ctx.moveTo(ox, oy + y * s)
    ctx.lineTo(ox + bw, oy + y * s)
    ctx.stroke()
  }

  // Pflanzen-Kreise (groß → klein), auf die Beetfläche beschnitten wie in der Ansicht
  ctx.save()
  ctx.beginPath()
  ctx.rect(ox, oy, bw, bh)
  ctx.clip()
  const sorted = [...items].sort((a, b) => plantSpreadM(b.plant) - plantSpreadM(a.plant))
  for (const { plant, planting } of sorted) {
    const d = plantSpreadM(plant) * s
    const cx = ox + (planting.posX ?? 0) * s
    const cy = oy + (planting.posY ?? 0) * s
    const color = categoryColors[plant.category]
    ctx.beginPath()
    ctx.arc(cx, cy, d / 2, 0, Math.PI * 2)
    ctx.globalAlpha = 0.4
    ctx.fillStyle = color
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.lineWidth = 2
    ctx.strokeStyle = color
    ctx.stroke()
    if (d >= 44) {
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = '600 14px "Segoe UI", system-ui, sans-serif'
      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
      ctx.strokeText(plant.name, cx, cy)
      ctx.fillStyle = '#26302a'
      ctx.fillText(plant.name, cx, cy)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
    }
  }
  ctx.restore()

  // Rahmen
  ctx.strokeStyle = '#a3b899'
  ctx.lineWidth = 2
  ctx.strokeRect(ox, oy, bw, bh)

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Bild konnte nicht erzeugt werden.'))), 'image/png'),
  )
}
