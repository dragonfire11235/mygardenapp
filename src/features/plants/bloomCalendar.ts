// Reine Hilfsfunktionen für Monatskalender (Blüte/Schnitt), testbar & framework-frei.
import type { Plant } from '../../data'

/** Wählt das relevante Monatsfeld einer Pflanze (z. B. bloomMonths, pruningMonths). */
export type MonthSelector = (plant: Plant) => number[] | undefined

export interface MonthRow {
  plant: Plant
  /** 12 Bool-Werte (Index 0 = Januar) — true = Monat aktiv. */
  months: boolean[]
  /** Erster aktiver Monat (1–12) für die Sortierung. */
  firstMonth: number
}
/** @deprecated Alias für MonthRow. */
export type BloomRow = MonthRow

/** Pflanzen mit hinterlegten Monaten, als Kalenderzeilen (nach erstem Monat, dann Name). */
export function monthRows(plants: Plant[], get: MonthSelector): MonthRow[] {
  const rows: MonthRow[] = []
  for (const plant of plants) {
    const set = new Set(get(plant) ?? [])
    if (set.size === 0) continue
    const months = Array.from({ length: 12 }, (_, i) => set.has(i + 1))
    rows.push({ plant, months, firstMonth: Math.min(...set) })
  }
  return rows.sort((a, b) => a.firstMonth - b.firstMonth || a.plant.name.localeCompare(b.plant.name, 'de'))
}

/** Anzahl Pflanzen je Monat (Index 0 = Januar). */
export function monthCountByMonth(plants: Plant[], get: MonthSelector): number[] {
  const counts = new Array(12).fill(0)
  for (const plant of plants) {
    for (const m of get(plant) ?? []) if (m >= 1 && m <= 12) counts[m - 1]++
  }
  return counts
}

/** 12 Bool-Werte (Index 0 = Januar): true, wo ≥1 Pflanze aktiv ist (Übersichtsleiste). */
export function monthsCovered(plants: Plant[], get: MonthSelector): boolean[] {
  return monthCountByMonth(plants, get).map((n) => n > 0)
}

/** Monate (1–12) ohne einzige Pflanze — Lücken. */
export function monthGaps(plants: Plant[], get: MonthSelector): number[] {
  const counts = monthCountByMonth(plants, get)
  const gaps: number[] = []
  for (let i = 0; i < 12; i++) if (counts[i] === 0) gaps.push(i + 1)
  return gaps
}

// --- Blüte-spezifische Wrapper (Rückwärtskompatibilität) ---
const bloomSel: MonthSelector = (p) => p.bloomMonths

/** Pflanzen mit hinterlegten Blütemonaten, als Kalenderzeilen. */
export function bloomRows(plants: Plant[]): MonthRow[] {
  return monthRows(plants, bloomSel)
}

/** Anzahl blühender Pflanzen je Monat. */
export function bloomCountByMonth(plants: Plant[]): number[] {
  return monthCountByMonth(plants, bloomSel)
}

/**
 * Blüht die Pflanze im geschlossenen Monatsintervall from..to?
 * (from ≤ to, keine Jahresüberlappung — für die Saison-Blühplanung ausreichend.)
 */
export function bloomsInRange(bloomMonths: number[] | undefined, from: number, to: number): boolean {
  if (!bloomMonths?.length) return false
  const lo = Math.min(from, to)
  const hi = Math.max(from, to)
  return bloomMonths.some((m) => m >= lo && m <= hi)
}

/** Monate (1–12) ohne einzige Blüte — Blühlücken für die Bepflanzungsplanung. */
export function bloomGaps(plants: Plant[]): number[] {
  return monthGaps(plants, bloomSel)
}
