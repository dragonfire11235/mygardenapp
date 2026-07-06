// Simulierte Geräte, solange noch keine echte Hardware da ist.
// Sensorwerte laufen als sanfter Zufalls-Drift, Schaltzustände werden
// im Speicher gehalten (bewusst nicht persistiert — es ist eine Demo).

import type { DeviceAdapter, DeviceDescriptor, DeviceState } from './types'

interface DemoDevice extends DeviceDescriptor {
  on?: boolean
  value?: number
  unit?: string
  min?: number
  max?: number
  drift?: number
}

const demoDevices: DemoDevice[] = [
  { externalId: 'demo.valve.tropf', name: 'Tropfbewässerung Hochbeet', kind: 'valve', on: false },
  { externalId: 'demo.valve.rasen', name: 'Rasensprenger', kind: 'valve', on: false },
  { externalId: 'demo.switch.pumpe', name: 'Regentonnen-Pumpe', kind: 'switch', on: false },
  { externalId: 'demo.sensor.feuchte', name: 'Bodenfeuchte Hochbeet', kind: 'sensor', value: 46, unit: '%', min: 15, max: 80, drift: 2.5 },
  { externalId: 'demo.sensor.temp', name: 'Temperatur Gewächshaus', kind: 'sensor', value: 24, unit: '°C', min: 8, max: 42, drift: 0.8 },
]

function snapshot(d: DemoDevice): DeviceState {
  return { on: d.on, value: d.value, unit: d.unit, updatedAt: new Date().toISOString() }
}

export class DemoAdapter implements DeviceAdapter {
  readonly id = 'demo' as const
  readonly label = 'Demo-Geräte'

  async discover(): Promise<DeviceDescriptor[]> {
    return demoDevices.map(({ externalId, name, kind }) => ({ externalId, name, kind }))
  }

  async getState(externalId: string): Promise<DeviceState> {
    const d = this.find(externalId)
    return snapshot(d)
  }

  async setOn(externalId: string, on: boolean): Promise<void> {
    const d = this.find(externalId)
    d.on = on
  }

  subscribe(externalId: string, callback: (state: DeviceState) => void): () => void {
    const d = this.find(externalId)
    const timer = setInterval(() => {
      if (d.kind === 'sensor' && d.value !== undefined) {
        const drift = (Math.random() - 0.5) * 2 * (d.drift ?? 1)
        // Läuft die Bewässerung, steigt die simulierte Bodenfeuchte
        const wateringBoost =
          d.unit === '%' && demoDevices.some((x) => x.kind !== 'sensor' && x.on) ? 1.5 : 0
        d.value = Math.min(d.max ?? 100, Math.max(d.min ?? 0, d.value + drift + wateringBoost))
        d.value = Math.round(d.value * 10) / 10
      }
      callback(snapshot(d))
    }, 3000)
    return () => clearInterval(timer)
  }

  private find(externalId: string): DemoDevice {
    const d = demoDevices.find((x) => x.externalId === externalId)
    if (!d) throw new Error(`Unbekanntes Demo-Gerät: ${externalId}`)
    return d
  }
}
