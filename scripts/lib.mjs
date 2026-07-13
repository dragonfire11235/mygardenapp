// Geteilte Helfer für die Katalog-Build-Pipeline (dev-only, Node ESM).
import { readFileSync } from 'node:fs'
import * as XLSX from 'xlsx'

export const SOURCE_XLSX = 'Import/Pflanzenliste_klein.xlsx'
export const OUT_JSON = 'public/catalog/garten-de.json'
export const IMAGE_CACHE = 'scripts/.cache/wikidata-images.json'

/** Kleinschreibung + Umlaute/Diakritika entfernen (für Vergleich/Suche). */
export function normalize(s) {
  return String(s)
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** URL-tauglicher Slug aus einem (botanischen) Namen. */
export function slugify(s) {
  return normalize(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/**
 * Behält einen Info-Link nur, wenn der Dateiname-Slug grob zum Pflanzennamen
 * passt (die Quell-Liste hat ~86 falsch zugeordnete Links). Sonst `undefined`.
 */
export function validateInfoLink(name, target) {
  if (!target) return undefined
  const file = String(target).split('/').pop() || ''
  const slug = normalize(file.replace(/^innen_/, '').replace(/\.html?$/, ''))
  const n = normalize(name)
  if (n.length < 4) return undefined
  const nHead = n.slice(0, Math.min(6, n.length))
  const sHead = slug.slice(0, Math.min(6, slug.length))
  const ok = slug.includes(nHead) || n.includes(sHead)
  return ok ? String(target) : undefined
}

/**
 * Liest die Quell-Liste → Basis-Records mit eindeutiger id.
 * Felder: id, name, botanicalName, family, familyBotanical, infoUrl?
 */
export function readSourceList() {
  const wb = XLSX.read(readFileSync(SOURCE_XLSX), { type: 'buffer' })
  const ws = wb.Sheets['Tabelle1']
  const range = XLSX.utils.decode_range(ws['!ref'])
  const records = []
  const usedIds = new Map()

  for (let r = 1; r <= range.e.r; r++) {
    const cell = (c) => ws[XLSX.utils.encode_cell({ r, c })]
    const nameCell = cell(0)
    if (!nameCell || !String(nameCell.v).trim()) continue

    const name = String(nameCell.v).trim()
    const botanicalName = String(cell(1)?.v ?? '').trim()
    const family = String(cell(2)?.v ?? '').trim()
    const familyBotanical = String(cell(3)?.v ?? '').trim()
    const infoUrl = validateInfoLink(name, nameCell.l?.Target)

    // Eindeutige id: Slug des botanischen Namens (Fallback: deutscher Name)
    let base = slugify(botanicalName || name) || 'pflanze'
    const seen = usedIds.get(base) ?? 0
    usedIds.set(base, seen + 1)
    const id = seen === 0 ? base : `${base}-${seen + 1}`

    const rec = { id, name, botanicalName, family, familyBotanical }
    if (infoUrl) rec.infoUrl = infoUrl
    records.push(rec)
  }
  return records
}
