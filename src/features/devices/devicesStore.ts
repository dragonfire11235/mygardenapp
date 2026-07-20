import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { createEntity, storage, type Device } from '../../data'
import { gardenaAdapter, getAdapter, type DeviceState } from './adapters'

export const useDevicesStore = defineStore('devices', () => {
  const devices = ref<Device[]>([])
  const states = ref<Record<string, DeviceState>>({})
  const loaded = ref(false)
  const unsubscribers: (() => void)[] = []

  const sensors = computed(() => devices.value.filter((d) => d.kind === 'sensor'))
  const mowers = computed(() => devices.value.filter((d) => d.kind === 'mower'))
  const switchables = computed(() => devices.value.filter((d) => d.kind === 'valve' || d.kind === 'switch'))

  async function load() {
    devices.value = await storage.devices.getAll()
    loaded.value = true
    await refreshStates()
    resubscribe()
  }

  async function refreshStates() {
    for (const device of devices.value) {
      try {
        const state = await getAdapter(device.adapter).getState(device.externalId)
        states.value = { ...states.value, [device.id]: state }
      } catch {
        // Gerät nicht erreichbar — Zustand bleibt leer
      }
    }
  }

  function resubscribe() {
    while (unsubscribers.length) unsubscribers.pop()?.()
    for (const device of devices.value) {
      try {
        const unsub = getAdapter(device.adapter).subscribe(device.externalId, (state) => {
          states.value = { ...states.value, [device.id]: state }
        })
        unsubscribers.push(unsub)
      } catch {
        // Adapter nicht verfügbar
      }
    }
  }

  /** Übernimmt alle vom Adapter gefundenen Geräte, die noch nicht angelegt sind. */
  async function discoverAndAdd(adapterId: Device['adapter']): Promise<number> {
    const found = await getAdapter(adapterId).discover()
    const existing = new Set(devices.value.map((d) => `${d.adapter}:${d.externalId}`))
    let added = 0
    for (const desc of found) {
      if (existing.has(`${adapterId}:${desc.externalId}`)) continue
      await storage.devices.put(
        createEntity<Device>({
          name: desc.name,
          kind: desc.kind,
          adapter: adapterId,
          externalId: desc.externalId,
          bedId: null,
        }),
      )
      added++
    }
    if (added) await load()
    return added
  }

  async function setOn(device: Device, on: boolean) {
    await getAdapter(device.adapter).setOn(device.externalId, on)
    const state = await getAdapter(device.adapter).getState(device.externalId)
    states.value = { ...states.value, [device.id]: state }
  }

  async function remove(id: string) {
    await storage.devices.softDelete(id)
    await load()
  }

  /** Gardena-Live-Updates nur laufen lassen, solange die Geräte-Seite aktiv ist (Rate-Limit). */
  function setGardenaLive(active: boolean) {
    gardenaAdapter.setPageActive(active)
  }

  return { devices, states, loaded, sensors, mowers, switchables, load, discoverAndAdd, setOn, remove, refreshStates, setGardenaLive }
})
