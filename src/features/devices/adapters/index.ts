import type { AdapterId } from '../../../data'
import { DemoAdapter } from './DemoAdapter'
import { GardenaAdapter } from './GardenaAdapter'
import type { DeviceAdapter } from './types'

// Wenn Home Assistant angebunden wird:
// 1. HomeAssistantAdapter.ts anlegen (implements DeviceAdapter)
// 2. Hier registrieren — fertig.
// Zu beachten (bereits bekannt): In der HA-Konfiguration muss
// `http: cors_allowed_origins` die App-URL erlauben, und eine über HTTPS
// installierte PWA darf kein HTTP-HA ansprechen (Mixed Content).
// Singleton, damit die Geräte-Seite das WebSocket-Gating (setPageActive) ansteuern kann.
export const gardenaAdapter = new GardenaAdapter()

const adapters: Partial<Record<AdapterId, DeviceAdapter>> = {
  demo: new DemoAdapter(),
  gardena: gardenaAdapter,
}

export function getAdapter(id: AdapterId): DeviceAdapter {
  const adapter = adapters[id]
  if (!adapter) throw new Error(`Adapter „${id}" ist noch nicht verfügbar.`)
  return adapter
}

export function availableAdapters(): DeviceAdapter[] {
  return Object.values(adapters)
}

export type { DeviceAdapter, DeviceDescriptor, DeviceState } from './types'
