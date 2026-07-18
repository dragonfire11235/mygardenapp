// Anzeige-Helfer für Nützlingswerte (aus dem Katalog, Quelle GloBI).
// Teil-Scores sind 0–3 je Gruppe, Gesamt-Score 0–5. Werte sind Schätzungen
// (GloBI-Interaktionen sind global aggregiert, Abdeckung schwankt).
import type { Beneficials } from './catalogTypes'

export interface BeneficialGroup {
  key: keyof Beneficials
  label: string
  icon: string
  /** Phosphor-Icon-Klasse (lumi-Design-System; Handoff: bug/butterfly/bug-beetle/bird) */
  phIcon: string
}

export const beneficialGroups: BeneficialGroup[] = [
  { key: 'wildbees', label: 'Wildbienen', icon: '🐝', phIcon: 'ph-bug' },
  { key: 'butterflies', label: 'Schmetterlinge', icon: '🦋', phIcon: 'ph-butterfly' },
  { key: 'caterpillarHost', label: 'Raupen-Futter', icon: '🐛', phIcon: 'ph-leaf' },
  { key: 'hoverflies', label: 'Schwebfliegen', icon: '🪰', phIcon: 'ph-bug' },
  { key: 'beetles', label: 'Käfer', icon: '🪲', phIcon: 'ph-bug-beetle' },
  { key: 'birds', label: 'Vögel', icon: '🐦', phIcon: 'ph-bird' },
]

/** Teil-Score (0–3) → Text. */
export function levelLabel(score: number | undefined): string {
  switch (score) {
    case 3: return 'hoch'
    case 2: return 'mittel'
    case 1: return 'gering'
    default: return '–'
  }
}

/** Gesamt-Score (0–5) → kurzer Text fürs Badge. */
export function scoreLabel(score: number | undefined): string {
  if (!score) return 'keine Daten'
  if (score >= 5) return 'sehr hoch'
  if (score >= 4) return 'hoch'
  if (score >= 3) return 'gut'
  if (score >= 2) return 'mittel'
  return 'gering'
}

/** Gruppen mit Wert > 0, für die Detailanzeige. */
export function activeGroups(b: Beneficials | undefined): { group: BeneficialGroup; score: number }[] {
  if (!b) return []
  return beneficialGroups
    .map((group) => ({ group, score: b[group.key] ?? 0 }))
    .filter((g) => g.score > 0)
}

/** Gruppen mit Wert 0 — Lücken (z. B. fürs Beet-Profil). */
export function gapGroups(b: Beneficials | undefined): BeneficialGroup[] {
  return beneficialGroups.filter((group) => !(b?.[group.key] ?? 0))
}

/** Gesamt-Score 0–5 aus den Teil-Scores (spiegelt build-catalog.mjs). */
export function overallScore(b: Beneficials): number {
  const sum = beneficialGroups.reduce((a, g) => a + (b[g.key] ?? 0), 0)
  return Math.min(5, Math.round(sum / 3))
}

/**
 * Aggregiert mehrere Pflanzen-Nützlingswerte zu einem Beet-Wert:
 * je Gruppe das Maximum. Gibt null zurück, wenn nichts (> 0) vorhanden ist.
 */
export function aggregateBeneficials(
  list: (Beneficials | undefined)[],
): { beneficials: Beneficials; score: number } | null {
  const agg: Beneficials = {}
  let any = false
  for (const group of beneficialGroups) {
    let max = 0
    for (const b of list) max = Math.max(max, b?.[group.key] ?? 0)
    if (max > 0) { agg[group.key] = max; any = true }
  }
  if (!any) return null
  return { beneficials: agg, score: overallScore(agg) }
}
