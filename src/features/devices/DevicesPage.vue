<script setup lang="ts">
import ToggleSwitch from 'primevue/toggleswitch'
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
        <h1 class="page-title">Geräte</h1>
        <span class="muted">{{ store.devices.length }} eingerichtet</span>
      </div>
      <button type="button" class="pill-btn-ghost" @click="discover">
        <i class="ph-bold ph-magnifying-glass" /> Demo-Geräte suchen
      </button>
    </div>

    <div class="card ha-note">
      <i class="ph-fill ph-plugs-connected note-icon" />
      <span>
        Aktuell laufen hier simulierte Demo-Geräte. Sobald dein Home Assistant steht,
        wird er als Adapter angebunden — deine Geräte tauchen dann genauso hier auf.
      </span>
    </div>

    <template v-if="store.devices.length">
      <h2 v-if="store.switchables.length" class="section-title">Schalten</h2>
      <div class="card-grid">
        <div v-for="device in store.switchables" :key="device.id" class="card device">
          <div class="device-info">
            <div class="device-name">
              <span class="status-dot" :class="{ on: store.states[device.id]?.on }" />
              {{ device.name }}
            </div>
            <span class="device-kind">{{ deviceKindLabels[device.kind] }}</span>
            <span class="device-state">{{ store.states[device.id]?.on ? 'Eingeschaltet' : 'Ausgeschaltet' }}</span>
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
            <div class="device-name">
              <span class="status-dot on" />
              {{ device.name }}
            </div>
            <span class="device-kind">aktualisiert alle paar Sekunden</span>
          </div>
          <span class="sensor-tile">{{ sensorText(device.id) }}</span>
        </div>
      </div>
    </template>

    <div v-else class="empty-state">
      <i class="ph-fill ph-cpu" />
      <p>Noch keine Geräte. Klicke auf „Demo-Geräte suchen", um die Simulation zu starten.</p>
    </div>
  </div>
</template>

<style scoped>
.ha-note {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 13px;
  color: var(--text-2);
  padding: 12px 16px;
}
.note-icon {
  font-size: 22px;
  color: var(--accent);
  flex: none;
}

.section-title {
  margin: 8px 0 0;
}

.device {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.device-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-start;
  min-width: 0;
}

.device-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  font-size: 15px;
}

/* Status-Punkt mit Glow (grün = aktiv) */
.status-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--text-3);
  flex: none;
}
.status-dot.on {
  background: #34c759;
  box-shadow: 0 0 6px rgba(52, 199, 89, 0.8);
}

.device-kind {
  font-size: 12px;
  color: var(--text-3);
  font-weight: 600;
}

.device-state {
  font-size: 13px;
  color: var(--text-2);
  font-weight: 600;
}

/* Messwert-Kachel */
.sensor-tile {
  background: var(--surface-tint);
  border-radius: 14px;
  padding: 10px 14px;
  font-size: 19px;
  font-weight: 800;
  color: var(--text-brand);
  white-space: nowrap;
}
</style>
