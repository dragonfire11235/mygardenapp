<script setup lang="ts">
import Button from 'primevue/button'
import ToggleSwitch from 'primevue/toggleswitch'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import type { Device } from '../../data'
import { deviceKindLabels } from '../../shared/texts'
import { useDevicesStore } from './devicesStore'

const store = useDevicesStore()
const toast = useToast()

async function discover() {
  const added = await store.discoverAndAdd('demo')
  toast.add({
    severity: added ? 'success' : 'info',
    summary: added ? `${added} Geräte gefunden` : 'Keine neuen Geräte',
    life: 3000,
  })
}

async function toggle(device: Device, on: boolean) {
  await store.setOn(device, on)
}

function sensorText(deviceId: string): string {
  const state = store.states[deviceId]
  if (state?.value === undefined) return '–'
  return `${state.value} ${state.unit ?? ''}`.trim()
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>Geräte</h1>
        <span class="muted">{{ store.devices.length }} eingerichtet</span>
      </div>
      <Button label="Demo-Geräte suchen" icon="pi pi-search" severity="secondary" outlined @click="discover" />
    </div>

    <Message severity="info" :closable="false" class="ha-note">
      Aktuell laufen hier simulierte Demo-Geräte. Sobald dein Home Assistant steht,
      wird er als Adapter angebunden — deine Geräte tauchen dann genauso hier auf.
    </Message>

    <template v-if="store.devices.length">
      <h2 v-if="store.switchables.length" class="section-title">Schalten</h2>
      <div class="card-grid">
        <div v-for="device in store.switchables" :key="device.id" class="card device">
          <div class="device-info">
            <strong>{{ device.name }}</strong>
            <Tag :value="deviceKindLabels[device.kind]" severity="secondary" />
          </div>
          <ToggleSwitch
            :model-value="store.states[device.id]?.on ?? false"
            :aria-label="device.name"
            @update:model-value="(on: boolean) => toggle(device, on)"
          />
        </div>
      </div>

      <h2 v-if="store.sensors.length" class="section-title">Sensoren</h2>
      <div class="card-grid">
        <div v-for="device in store.sensors" :key="device.id" class="card device">
          <div class="device-info">
            <strong>{{ device.name }}</strong>
            <span class="muted">aktualisiert alle paar Sekunden</span>
          </div>
          <span class="sensor-value">{{ sensorText(device.id) }}</span>
        </div>
      </div>
    </template>

    <div v-else class="empty-state">
      <i class="pi pi-bolt" />
      <p>Noch keine Geräte. Klicke auf „Demo-Geräte suchen", um die Simulation zu starten.</p>
    </div>
  </div>
</template>

<style scoped>
.ha-note {
  margin-bottom: 1rem;
}

.section-title {
  font-size: 1rem;
  margin: 1.1rem 0 0.6rem;
  color: var(--app-text-muted);
}

.device {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.device-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: flex-start;
}

.sensor-value {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--app-accent);
  white-space: nowrap;
}
</style>
