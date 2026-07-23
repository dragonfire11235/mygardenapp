// Aktiver SpeciesIdentifier — austauschbar, damit `sightings` nie aus `assistant`
// importieren muss (Feature-Import-Regel). App.vue registriert den KI-Identifier
// bei Login, ManualIdentifier ist der Default/Fallback bei Logout.

import type { SpeciesIdentifier } from './types'
import { ManualIdentifier } from './ManualIdentifier'

let active: SpeciesIdentifier = new ManualIdentifier()

export function setSpeciesIdentifier(identifier: SpeciesIdentifier): void {
  active = identifier
}

export function getSpeciesIdentifier(): SpeciesIdentifier {
  return active
}
