<script setup lang="ts">
import { computed } from 'vue'
import ToggleSwitch from 'primevue/toggleswitch'
import type { Device } from '../../data'
import { useDevicesStore } from './devicesStore'
import { useGardenaStore } from './gardena/gardenaStore'
import { useSettingsStore } from '../settings/settingsStore'

const store = useDevicesStore()
const gardena = useGardenaStore()
const settings = useSettingsStore()

// Demo-Geräte nur zeigen, solange die Demo aktiv ist (Setting an + keine Gardena-Verbindung) —
// gleiche Regel wie auf der Geräte-Seite (DevicesPage.vue).
const showDemo = computed(() => settings.demoDevicesEnabled && !gardena.connected)
const switchables = computed(() =>
  store.switchables.filter((d) => showDemo.value || d.adapter !== 'demo'),
)

async function toggle(device: Device, on: boolean) {
  await store.setOn(device, on)
}
</script>

<template>
  <div v-if="switchables.length" class="widget-list">
    <div v-for="device in switchables" :key="device.id" class="widget-row">
      <span class="widget-row-text">{{ device.name }}</span>
      <ToggleSwitch
        :model-value="store.states[device.id]?.on ?? false"
        :aria-label="device.name"
        @update:model-value="(on: boolean) => toggle(device, on)"
      />
    </div>
  </div>
  <p v-else class="muted">Keine schaltbaren Geräte (siehe „Geräte“).</p>
</template>

<style scoped>
.widget-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.widget-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.widget-row-text {
  flex: 1;
  min-width: 0;
}
</style>
