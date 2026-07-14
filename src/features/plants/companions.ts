// Mischkultur-Logik: gute/schlechte Nachbarschaft zwischen zwei Katalog-Pflanzen.
// Beziehungen werden bidirektional geprüft (steht sie auf einer Seite, gilt sie
// für beide); „schlecht" schlägt „gut".
import type { CatalogPlant } from './catalogTypes'
import { normalizeBotanical } from './catalogApi'

export type CompanionRelation = 'good' | 'bad' | null

function normSet(list: string[] | undefined): Set<string> {
  return new Set((list ?? []).map(normalizeBotanical))
}

/** Beziehung zwischen zwei Pflanzen (bidirektional; 'bad' vor 'good'). */
export function relationBetween(a: CatalogPlant | undefined, b: CatalogPlant | undefined): CompanionRelation {
  if (!a || !b) return null
  const an = normalizeBotanical(a.botanicalName)
  const bn = normalizeBotanical(b.botanicalName)
  if (an === bn) return null
  if (normSet(a.companionsBad).has(bn) || normSet(b.companionsBad).has(an)) return 'bad'
  if (normSet(a.companionsGood).has(bn) || normSet(b.companionsGood).has(an)) return 'good'
  return null
}

export interface CompanionName {
  botanicalName: string
  name: string
}

/** Löst die Companion-Referenzen eines Eintrags in Anzeigenamen auf (dedupliziert). */
export function resolveCompanions(
  entry: CatalogPlant | undefined,
  catalog: Map<string, CatalogPlant>,
): { good: CompanionName[]; bad: CompanionName[] } {
  const map = (list: string[] | undefined): CompanionName[] => {
    const seen = new Set<string>()
    const out: CompanionName[] = []
    for (const bn of list ?? []) {
      const name = catalog.get(normalizeBotanical(bn))?.name ?? bn
      if (seen.has(name)) continue
      seen.add(name)
      out.push({ botanicalName: bn, name })
    }
    return out.sort((a, b) => a.name.localeCompare(b.name, 'de'))
  }
  return { good: map(entry?.companionsGood), bad: map(entry?.companionsBad) }
}
