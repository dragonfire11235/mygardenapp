// KI-Arterkennung für Garten-Entdeckungen — nutzt die `lumi`-Edge-Function im
// Modus `species-only` (AP08). Importiert `sightings/identify/types`, was per
// Ausnahme erlaubt ist (Naht, keine Store-Kopplung).

import type { IdentificationResult, SpeciesIdentifier } from '../sightings/identify/types'
import type { SightingGroup } from '../../data'
import { fileToLumiImage } from './imageUtil'
import { lumiApi } from './lumiApi'

const VALID_GROUPS: readonly SightingGroup[] = ['wildbee', 'butterfly', 'hoverfly', 'beetle', 'bird', 'other']

interface SpeciesOnlyReply {
  group?: string
  species?: string | null
  confidence?: 'high' | 'medium' | 'low'
}

function isValidGroup(value: string | undefined): value is SightingGroup {
  return VALID_GROUPS.includes(value as SightingGroup)
}

/** Schlägt Gruppe/Art per Lumi-KI vor. Bei Unsicherheit oder Fehler: kein Vorschlag. */
export class LumiIdentifier implements SpeciesIdentifier {
  readonly source = 'ai' as const

  async suggest(blob: Blob): Promise<IdentificationResult | null> {
    try {
      const { imageBase64, mediaType } = await fileToLumiImage(blob)
      const { reply } = await lumiApi.identify({ imageBase64, mediaType, mode: 'species-only' })
      // Claude hält sich trotz Anweisung nicht immer an "nur JSON" — Markdown-Codefences abstreifen.
      const json = reply.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
      const parsed = JSON.parse(json) as SpeciesOnlyReply
      if (parsed.confidence === 'low') return null

      const result: IdentificationResult = {}
      if (isValidGroup(parsed.group)) result.group = parsed.group
      if (parsed.species) result.species = parsed.species
      return result.group || result.species ? result : null
    } catch {
      return null
    }
  }
}
