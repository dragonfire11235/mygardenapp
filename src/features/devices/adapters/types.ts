// Adapter-Schnittstelle für Smart-Garden-Geräte.
// Aktuell gibt es den DemoAdapter (simulierte Geräte).
// Für Home Assistant kommt später ein HomeAssistantAdapter dazu,
// der dieselbe Schnittstelle über REST + WebSocket bedient —
// die App selbst muss dafür nicht geändert werden.

import type { AdapterId, DeviceKind } from '../../../data'

export interface DeviceDescriptor {
  externalId: string
  name: string
  kind: DeviceKind
}

export interface DeviceState {
  /** Für Schalter/Ventile */
  on?: boolean
  /** Für Sensoren */
  value?: number
  unit?: string
  updatedAt: string
}

export interface DeviceAdapter {
  readonly id: AdapterId
  readonly label: string
  /** Verfügbare Geräte auflisten (bei HA: Entities abfragen) */
  discover(): Promise<DeviceDescriptor[]>
  getState(externalId: string): Promise<DeviceState>
  setOn(externalId: string, on: boolean): Promise<void>
  /** Live-Updates; Rückgabe = Abmelde-Funktion */
  subscribe(externalId: string, callback: (state: DeviceState) => void): () => void
}
