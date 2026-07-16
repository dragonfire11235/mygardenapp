import type { IdentificationResult, SpeciesIdentifier } from './types'

/** Gibt nie einen Vorschlag zurück — der Nutzer bestimmt Gruppe/Art selbst. */
export class ManualIdentifier implements SpeciesIdentifier {
  readonly source = 'manual' as const

  async suggest(_blob: Blob): Promise<IdentificationResult | null> {
    return null
  }
}
