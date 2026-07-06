<script setup lang="ts">
import { useDevicesStore } from './devicesStore'

const store = useDevicesStore()
</script>

<template>
  <div v-if="store.sensors.length" class="sensor-grid">
    <div v-for="device in store.sensors" :key="device.id" class="sensor">
      <span class="sensor-value">
        {{ store.states[device.id]?.value ?? '–' }}
        <small>{{ store.states[device.id]?.unit ?? '' }}</small>
      </span>
      <span class="muted sensor-name">{{ device.name }}</span>
    </div>
  </div>
  <p v-else class="muted">Keine Sensoren eingerichtet (siehe „Geräte").</p>
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
  color: var(--app-accent);
}

.sensor-name {
  font-size: 0.78rem;
}
</style>
