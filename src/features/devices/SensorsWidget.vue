<script setup lang="ts">
import { computed } from 'vue'
import { useDevicesStore } from './devicesStore'
import { useGardenaStore } from './gardena/gardenaStore'
import { useSettingsStore } from '../settings/settingsStore'

const store = useDevicesStore()
const gardena = useGardenaStore()
const settings = useSettingsStore()

// Demo-Geräte nur zeigen, solange die Demo aktiv ist (Setting an + keine Gardena-Verbindung) —
// gleiche Regel wie auf der Geräte-Seite (DevicesPage.vue).
const showDemo = computed(() => settings.demoDevicesEnabled && !gardena.connected)
const sensors = computed(() =>
  store.sensors.filter((d) => showDemo.value || d.adapter !== 'demo'),
)
</script>

<template>
  <div v-if="sensors.length" class="sensor-grid">
    <div v-for="device in sensors" :key="device.id" class="sensor">
      <span class="sensor-value">
        {{ store.states[device.id]?.value ?? '–' }}
        <small>{{ store.states[device.id]?.unit ?? '' }}</small>
      </span>
      <span class="muted sensor-name">{{ device.name }}</span>
    </div>
  </div>
  <p v-else class="muted">Keine Sensoren eingerichtet (siehe „Geräte“).</p>
</template>

<style scoped>
.sensor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.6rem;
}

.sensor {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.15rem;
}

.sensor-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent);
}

.sensor-name {
  font-size: 0.78rem;
}
</style>
