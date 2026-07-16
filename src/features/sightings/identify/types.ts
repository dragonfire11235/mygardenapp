// Identifikations-Naht für Sichtungen. Aktuell bestimmt der Nutzer selbst
// (ManualIdentifier), aber die Schnittstelle erlaubt später eine
// KI-Arterkennung (z. B. iNaturalist), ohne Datenmodell/UI umzubauen —
// Muster wie bei den Geräte-Adaptern (features/devices/adapters).

import type { SightingGroup, SightingSource } from '../../../data'

export interface IdentificationResult {
  group?: SightingGroup
  species?: string
}

export interface SpeciesIdentifier {
  readonly source: SightingSource
  /** Schlägt Gruppe/Art anhand eines Fotos vor, oder null, wenn keine Aussage möglich ist. */
  suggest(blob: Blob): Promise<IdentificationResult | null>
}
