// Reine Hilfsfunktionen für den Blühkalender (testbar, framework-frei).
import type { Plant } from '../../data'

export interface BloomRow {
  plant: Plant
  /** 12 Bool-Werte (Index 0 = Januar) — true = blüht in diesem Monat. */
  months: boolean[]
  /** Erster Blütemonat (1–12) für die Sortierung. */
  firstMonth: number
}

/** Pflanzen mit hinterlegten Blütemonaten, als Kalenderzeilen (nach Blühbeginn, dann Name). */
export function bloomRows(plants: Plant[]): BloomRow[] {
  const rows: BloomRow[] = []
  for (const plant of plants) {
    const set = new Set(plant.bloomMonths ?? [])
    if (set.size === 0) continue
    const months = Array.from({ length: 12 }, (_, i) => set.has(i + 1))
    const firstMonth = Math.min(...set)
    rows.push({ plant, months, firstMonth })
  }
  return rows.sort((a, b) => a.firstMonth - b.firstMonth || a.plant.name.localeCompare(b.plant.name, 'de'))
}

/** Anzahl blühender Pflanzen je Monat (Index 0 = Januar). */
export function bloomCountByMonth(plants: Plant[]): number[] {
  const counts = new Array(12).fill(0)
  for (const plant of plants) {
    for (const m of plant.bloomMonths ?? []) {
      if (m >= 1 && m <= 12) counts[m - 1]++
    }
  }
  return counts
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
  const counts = bloomCountByMonth(plants)
  const gaps: number[] = []
  for (let i = 0; i < 12; i++) if (counts[i] === 0) gaps.push(i + 1)
  return gaps
}
