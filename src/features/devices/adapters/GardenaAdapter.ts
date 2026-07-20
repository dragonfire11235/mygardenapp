// Adapter für echte GARDENA-Geräte über die Edge Function (Proxy) + einen geteilten
// WebSocket für Live-Updates. Rate-Limit-schonend: REST nur beim Laden/WS-URL-Holen,
// alle Statusänderungen kommen über den WebSocket.
//
// Besonderheit der Gardena-Daten: `COMMON` teilt sich die id mit dem Gerät (und beim
// Mäher auch mit `MOWER`). Deshalb cachen wir nach `Typ:id`, nicht nur nach id.

import { gardenaApi, type GardenaService } from '../gardena/gardenaApi'
import type { DeviceAdapter, DeviceDescriptor, DeviceState } from './types'
import type { DeviceKind } from '../../../data'

interface GardenaDescriptor extends DeviceDescriptor {
  deviceId: string
  serviceType: 'MOWER' | 'VALVE' | 'SENSOR' | 'POWER_SOCKET'
}

type Attrs = Record<string, { value: unknown; timestamp?: string }>

function num(a: Attrs | undefined, key: string): number | undefined {
  const v = a?.[key]?.value
  return typeof v === 'number' ? v : undefined
}
function str(a: Attrs | undefined, key: string): string | undefined {
  const v = a?.[key]?.value
  return typeof v === 'string' ? v : undefined
}

const MOWER_LABELS: Record<string, string> = {
  OK_CUTTING: 'Mäht',
  OK_CUTTING_TIMER_OVERRIDDEN: 'Mäht (manuell)',
  OK_SEARCHING: 'Sucht Ladestation',
  OK_LEAVING: 'Verlässt Station',
  OK_CHARGING: 'Lädt',
  PARKED_TIMER: 'Geparkt (Zeitplan)',
  PARKED_PARK_SELECTED: 'Geparkt',
  PARKED_AUTOTIMER: 'Geparkt (Auto)',
  PAUSED: 'Pausiert',
  NONE: '—',
}
const VALVE_LABELS: Record<string, string> = {
  CLOSED: 'Zu',
  MANUAL_WATERING: 'Bewässert (manuell)',
  SCHEDULED_WATERING: 'Bewässert (Zeitplan)',
}

export class GardenaAdapter implements DeviceAdapter {
  readonly id = 'gardena' as const
  readonly label = 'Gardena'

  private locationId?: string
  private loadPromise?: Promise<void>
  // Cache der Attribute je Service, Schlüssel „TYPE:id"
  private cache = new Map<string, Attrs>()
  private descriptors = new Map<string, GardenaDescriptor>()

  // Ein geteilter WebSocket für alle Geräte
  private ws?: WebSocket
  private subscribers = new Map<string, (state: DeviceState) => void>()
  private reconnectTimer?: ReturnType<typeof setTimeout>
  private reconnectDelay = 5000
  // AP08: WebSocket nur offen, wenn die Geräte-Seite aktiv UND der Tab sichtbar ist
  private pageActive = false
  private visible = true

  constructor() {
    if (typeof document !== 'undefined') {
      this.visible = document.visibilityState !== 'hidden'
      document.addEventListener('visibilitychange', () => {
        this.visible = document.visibilityState !== 'hidden'
        this.syncSocket()
      })
    }
  }

  /** Von der Geräte-Seite gesteuert: schont das Rate-Limit (WS nur bei aktiver Seite). */
  setPageActive(active: boolean): void {
    this.pageActive = active
    if (active) void this.ensureLoaded().then(() => this.syncSocket())
    else this.syncSocket()
  }

  private syncSocket(): void {
    if (this.subscribers.size > 0 && this.pageActive && this.visible) void this.openSocket()
    else this.closeSocket()
  }

  // --- Laden / Parsen ------------------------------------------------------

  private async doLoad(): Promise<void> {
    const list = await gardenaApi.locations()
    const loc = list.data?.[0]
    if (!loc) throw new Error('Kein Gardena-Standort gefunden (ist ein Gateway online?).')
    this.locationId = loc.id
    const detail = await gardenaApi.locationDetail(loc.id)
    this.parse(detail.included ?? [])
  }

  /** Lädt einmalig (für getState/subscribe). discover() erzwingt einen Neuabruf. */
  private ensureLoaded(): Promise<void> {
    if (!this.loadPromise) this.loadPromise = this.doLoad()
    return this.loadPromise
  }

  private reload(): Promise<void> {
    this.loadPromise = this.doLoad()
    return this.loadPromise
  }

  private parse(services: GardenaService[]): void {
    this.cache.clear()
    this.descriptors.clear()
    for (const s of services) {
      if (s.attributes) this.cache.set(`${s.type}:${s.id}`, s.attributes)
    }
    // Gerätename kommt aus dem COMMON-Service (gleiche id wie das Gerät)
    const nameOf = (deviceId: string) => str(this.cache.get(`COMMON:${deviceId}`), 'name')

    for (const s of services) {
      const deviceId = s.relationships?.device?.data?.id ?? s.id
      if (s.type === 'MOWER') {
        this.addDescriptor(s.id, nameOf(deviceId) ?? 'Mähroboter', 'mower', deviceId, 'MOWER')
      } else if (s.type === 'VALVE') {
        this.addDescriptor(s.id, str(s.attributes, 'name') ?? 'Ventil', 'valve', deviceId, 'VALVE')
      } else if (s.type === 'SENSOR') {
        this.addDescriptor(s.id, nameOf(deviceId) ?? 'Sensor', 'sensor', deviceId, 'SENSOR')
      } else if (s.type === 'POWER_SOCKET') {
        this.addDescriptor(s.id, nameOf(deviceId) ?? 'Steckdose', 'switch', deviceId, 'POWER_SOCKET')
      }
      // VALVE_SET / COMMON / DEVICE / LOCATION sind keine eigenständigen Geräte
    }
  }

  private addDescriptor(
    externalId: string,
    name: string,
    kind: DeviceKind,
    deviceId: string,
    serviceType: GardenaDescriptor['serviceType'],
  ): void {
    this.descriptors.set(externalId, { externalId, name, kind, deviceId, serviceType })
  }

  // --- DeviceAdapter -------------------------------------------------------

  async discover(): Promise<DeviceDescriptor[]> {
    await this.reload()
    return [...this.descriptors.values()].map(({ externalId, name, kind }) => ({ externalId, name, kind }))
  }

  async getState(externalId: string): Promise<DeviceState> {
    await this.ensureLoaded()
    const d = this.descriptors.get(externalId)
    if (!d) return { updatedAt: new Date().toISOString() }
    return this.derive(d)
  }

  private derive(d: GardenaDescriptor): DeviceState {
    const now = new Date().toISOString()
    if (d.serviceType === 'MOWER') {
      const activity = str(this.cache.get(`MOWER:${d.deviceId}`), 'activity')
      const battery = num(this.cache.get(`COMMON:${d.deviceId}`), 'batteryLevel')
      return {
        on: Boolean(activity?.startsWith('OK_')),
        text: (activity && MOWER_LABELS[activity]) || activity || '—',
        battery,
        updatedAt: now,
      }
    }
    if (d.serviceType === 'VALVE') {
      const activity = str(this.cache.get(`VALVE:${d.externalId}`), 'activity')
      return {
        on: activity === 'MANUAL_WATERING' || activity === 'SCHEDULED_WATERING',
        text: (activity && VALVE_LABELS[activity]) || activity || '—',
        updatedAt: now,
      }
    }
    if (d.serviceType === 'SENSOR') {
      const a = this.cache.get(`SENSOR:${d.externalId}`)
      // erstes bekanntes Messfeld nehmen
      const fields: [string, string][] = [
        ['soilHumidity', '%'],
        ['soilTemperature', '°C'],
        ['ambientTemperature', '°C'],
        ['lightIntensity', 'lx'],
      ]
      for (const [key, unit] of fields) {
        const value = num(a, key)
        if (value !== undefined) return { value, unit, updatedAt: now }
      }
      return { updatedAt: now }
    }
    // POWER_SOCKET
    const activity = str(this.cache.get(`POWER_SOCKET:${d.externalId}`), 'activity')
    return { on: activity?.includes('ON') ?? false, text: activity, updatedAt: now }
  }

  async setOn(externalId: string, on: boolean): Promise<void> {
    const d = this.descriptors.get(externalId)
    if (!d) throw new Error('Unbekanntes Gardena-Gerät.')
    let command: unknown
    if (d.serviceType === 'MOWER') {
      command = on
        ? { data: { type: 'MOWER_CONTROL', id: 'mow', attributes: { command: 'START_SECONDS_TO_OVERRIDE', seconds: 3600 } } }
        : { data: { type: 'MOWER_CONTROL', id: 'park', attributes: { command: 'PARK_UNTIL_NEXT_TASK' } } }
    } else if (d.serviceType === 'VALVE') {
      command = on
        ? { data: { type: 'VALVE_CONTROL', id: 'open', attributes: { command: 'START_SECONDS_TO_OVERRIDE', seconds: 1800 } } }
        : { data: { type: 'VALVE_CONTROL', id: 'close', attributes: { command: 'STOP_UNTIL_NEXT_TASK' } } }
    } else if (d.serviceType === 'POWER_SOCKET') {
      command = on
        ? { data: { type: 'POWER_SOCKET_CONTROL', id: 'on', attributes: { command: 'START_OVERRIDE' } } }
        : { data: { type: 'POWER_SOCKET_CONTROL', id: 'off', attributes: { command: 'STOP_UNTIL_NEXT_TASK' } } }
    } else {
      throw new Error('Dieses Gerät lässt sich nicht schalten.')
    }
    await gardenaApi.command(externalId, command)
  }

  subscribe(externalId: string, callback: (state: DeviceState) => void): () => void {
    this.subscribers.set(externalId, callback)
    this.syncSocket()
    return () => {
      this.subscribers.delete(externalId)
      this.syncSocket()
    }
  }

  // --- WebSocket -----------------------------------------------------------

  private async openSocket(): Promise<void> {
    if (this.ws || !this.locationId) return
    try {
      const res = await gardenaApi.websocketUrl(this.locationId)
      const url = res.data?.attributes?.url
      if (!url) return
      const ws = new WebSocket(url)
      this.ws = ws
      ws.onopen = () => { this.reconnectDelay = 5000 }
      ws.onmessage = (e) => this.onMessage(e.data)
      ws.onclose = () => {
        this.ws = undefined
        if (this.subscribers.size > 0 && this.pageActive && this.visible) this.scheduleReconnect()
      }
      ws.onerror = () => ws.close()
    } catch {
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined
      // Backoff bis 60 s (rate-limit-schonend, jede WS-URL kostet einen REST-Call)
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 60000)
      this.syncSocket()
    }, this.reconnectDelay)
  }

  private closeSocket(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = undefined
    this.reconnectDelay = 5000
    this.ws?.close()
    this.ws = undefined
  }

  private onMessage(raw: unknown): void {
    let msg: GardenaService
    try {
      msg = JSON.parse(String(raw))
    } catch {
      return
    }
    if (!msg.id || !msg.type || !msg.attributes) return
    // Attribute mergen (Deltas ergänzen bestehende)
    const key = `${msg.type}:${msg.id}`
    this.cache.set(key, { ...(this.cache.get(key) ?? {}), ...msg.attributes })
    // Betroffene Geräte neu ableiten (externalId ODER deviceId trifft die Nachricht-id)
    for (const [externalId, cb] of this.subscribers) {
      const d = this.descriptors.get(externalId)
      if (d && (d.externalId === msg.id || d.deviceId === msg.id)) cb(this.derive(d))
    }
  }
}
