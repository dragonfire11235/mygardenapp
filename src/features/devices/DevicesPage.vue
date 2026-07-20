<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import ToggleSwitch from 'primevue/toggleswitch'
import { useToast } from 'primevue/usetoast'
import type { Device } from '../../data'
import { deviceKindLabels } from '../../shared/texts'
import { useDevicesStore } from './devicesStore'
import { useAccountStore } from '../account/accountStore'
import { useAuthStore } from '../auth/authStore'
import { useGardenaStore } from './gardena/gardenaStore'
import { useSettingsStore } from '../settings/settingsStore'
import { useUiStore } from '../ui/uiStore'

const store = useDevicesStore()
const account = useAccountStore()
const auth = useAuthStore()
const gardena = useGardenaStore()
const settings = useSettingsStore()
const ui = useUiStore()
const toast = useToast()

// Demo-Geräte: manuell an/aus, aber bei bestehender Gardena-Verbindung automatisch aus.
const showDemo = computed(() => settings.demoDevicesEnabled && !gardena.connected)
const demoToggle = computed({
  get: () => settings.demoDevicesEnabled,
  set: (v: boolean) => void settings.setDemoDevicesEnabled(v),
})
function withoutDemo<T extends { adapter: Device['adapter'] }>(list: T[]): T[] {
  return showDemo.value ? list : list.filter((d) => d.adapter !== 'demo')
}
const shownMowers = computed(() => withoutDemo(store.mowers))
const shownSwitchables = computed(() => withoutDemo(store.switchables))
const shownSensors = computed(() => withoutDemo(store.sensors))
const shownCount = computed(() => shownMowers.value.length + shownSwitchables.value.length + shownSensors.value.length)

onMounted(() => {
  void gardena.refresh()
  store.setGardenaLive(true) // AP08: WebSocket nur laufen, solange diese Seite offen ist
})
onUnmounted(() => {
  store.setGardenaLive(false)
})

async function disconnectGardena() {
  await gardena.disconnect()
  toast.add({ severity: 'info', summary: 'Gardena getrennt', life: 2500 })
}

async function discoverGardena() {
  try {
    const added = await store.discoverAndAdd('gardena')
    toast.add({
      severity: added ? 'success' : 'info',
      summary: added ? `${added} Gardena-Geräte gefunden` : 'Keine neuen Gardena-Geräte',
      life: 3000,
    })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Gardena-Fehler', detail: e instanceof Error ? e.message : String(e), life: 4000 })
  }
}

async function mowerCommand(device: Device, on: boolean) {
  try {
    await store.setOn(device, on)
    toast.add({ severity: 'success', summary: on ? 'Mähen gestartet' : 'Wird geparkt', life: 2500 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Fehler', detail: e instanceof Error ? e.message : String(e), life: 4000 })
  }
}

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
        <span class="muted">{{ shownCount }} eingerichtet</span>
      </div>
      <button
        type="button"
        class="demo-pill"
        :class="{ on: showDemo }"
        :disabled="gardena.connected"
        :title="gardena.connected ? 'Ausgeblendet, solange Gardena verbunden ist' : (showDemo ? 'Demo-Geräte ausschalten' : 'Demo-Geräte einschalten')"
        @click="demoToggle = !demoToggle"
      >
        <i class="ph-fill ph-flask" /> Demo
      </button>
    </div>

    <!-- Gardena-Anbindung (echte Geräte über dein eigenes Gardena-Konto) -->
    <div v-if="gardena.available" class="card gardena-card">
      <i class="ph-fill ph-plant note-icon" />
      <div class="gardena-body">
        <template v-if="!auth.isAuthenticated">
          <strong>Gardena verbinden</strong>
          <span class="muted">Melde dich zuerst in lumi an (unter „Mehr"), dann kannst du dein Gardena-Konto verbinden.</span>
        </template>
        <template v-else-if="gardena.connected">
          <strong><i class="ph-fill ph-check-circle ok-icon" /> Gardena verbunden</strong>
          <span class="muted">Deine Gardena-Geräte kannst du unten suchen und steuern.</span>
          <div class="gardena-actions">
            <button type="button" class="pill-btn" @click="discoverGardena">
              <i class="ph-bold ph-magnifying-glass" /> Gardena-Geräte suchen
            </button>
            <button type="button" class="pill-btn-ghost" :disabled="gardena.busy" @click="disconnectGardena">Trennen</button>
          </div>
        </template>
        <template v-else>
          <strong>Gardena verbinden</strong>
          <span class="muted">Verbinde dein eigenes Gardena-Konto, um Mäher, Bewässerung und Sensoren hier zu sehen und zu steuern.</span>
          <div class="gardena-actions">
            <button type="button" class="pill-btn" :disabled="gardena.busy" @click="gardena.startConnect()">Gardena verbinden</button>
          </div>
        </template>
        <span v-if="gardena.errorMsg" class="gardena-error">{{ gardena.errorMsg }}</span>
      </div>
    </div>

    <!-- Demo-Hinweis nur, solange die Demo aktiv ist (an/aus über den Button oben rechts) -->
    <div v-if="showDemo" class="card demo-note">
      <i class="ph-fill ph-plugs-connected note-icon" />
      <div class="demo-body">
        <span class="muted">Simulierte Geräte zum Ausprobieren — zeigen, was mit Pro möglich ist.</span>
        <button type="button" class="pill-btn-ghost demo-search" @click="discover">
          <i class="ph-bold ph-magnifying-glass" /> Demo-Geräte suchen
        </button>
      </div>
    </div>

    <template v-if="shownCount">
      <h2 v-if="shownMowers.length" class="section-title">Mähroboter</h2>
      <div class="card-grid">
        <div v-for="device in shownMowers" :key="device.id" class="card device mower">
          <div class="device-info">
            <div class="device-name">
              <span class="status-dot" :class="{ on: store.states[device.id]?.on }" />
              {{ device.name }}
            </div>
            <span class="device-state">
              {{ store.states[device.id]?.text ?? '–' }}
              <template v-if="store.states[device.id]?.battery !== undefined">· 🔋 {{ store.states[device.id]?.battery }} %</template>
            </span>
          </div>
          <div class="mower-actions">
            <button type="button" class="pill-btn" @click="mowerCommand(device, true)">Mähen</button>
            <button type="button" class="pill-btn-ghost" @click="mowerCommand(device, false)">Parken</button>
          </div>
        </div>
      </div>

      <h2 v-if="shownSwitchables.length" class="section-title">Schalten</h2>
      <div class="card-grid">
        <div v-for="device in shownSwitchables" :key="device.id" class="card device">
          <div class="device-info">
            <div class="device-name">
              <span class="status-dot" :class="{ on: store.states[device.id]?.on }" />
              {{ device.name }}
            </div>
            <span class="device-kind">{{ deviceKindLabels[device.kind] }}</span>
            <span class="device-state">{{ store.states[device.id]?.text ?? (store.states[device.id]?.on ? 'Eingeschaltet' : 'Ausgeschaltet') }}</span>
          </div>
          <ToggleSwitch
            :model-value="store.states[device.id]?.on ?? false"
            :aria-label="device.name"
            @update:model-value="(on: boolean) => toggle(device, on)"
          />
        </div>
      </div>

      <h2 v-if="shownSensors.length" class="section-title">Sensoren</h2>
      <div class="card-grid">
        <div v-for="device in shownSensors" :key="device.id" class="card device">
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
      <p v-if="showDemo">Noch keine Geräte. Klicke auf „Demo-Geräte suchen“, um die Simulation zu starten.</p>
      <p v-else-if="gardena.connected">Noch keine Gardena-Geräte übernommen — klick oben auf „Gardena-Geräte suchen“.</p>
      <p v-else>Noch keine Geräte. Verbinde Gardena oder aktiviere die Demo-Geräte.</p>
    </div>

    <!-- Pro-Upsell (nur für Free-Nutzer) -->
    <button v-if="account.isFree" type="button" class="deep-card pro-upsell" @click="ui.openPro()">
      <span class="pro-upsell-star">✨</span>
      <span class="pro-upsell-text">
        <span class="pro-upsell-title">Mehr Sensoren mit lumi Pro</span>
        <span class="pro-upsell-sub">Unbegrenzte Geräte, Automatiken und Verlaufsdaten.</span>
      </span>
      <i class="ph-bold ph-caret-right" />
    </button>
  </div>
</template>

<style scoped>
.demo-note {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  font-size: 13px;
  color: var(--text-2);
  padding: 12px 16px;
}
.demo-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
  min-width: 0;
}
.demo-search {
  font-size: 13px;
}

/* Kleiner Demo-An/Aus-Button oben rechts (auf Höhe der Überschrift) */
.demo-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--border-soft);
  background: var(--surface-tint);
  color: var(--text-2);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  padding: 7px 14px;
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
}
.demo-pill.on {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.demo-pill:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.note-icon {
  font-size: 22px;
  color: var(--accent);
  flex: none;
}

.gardena-card {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px 16px;
}
.gardena-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.gardena-body .muted {
  font-size: 13px;
}
.ok-icon {
  color: var(--accent);
}
.gardena-actions {
  margin-top: 8px;
  display: flex;
  gap: 0.5rem;
}
.gardena-error {
  color: var(--danger);
  font-size: 13px;
  margin-top: 6px;
}

.mower-actions {
  display: flex;
  gap: 0.5rem;
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

/* Pro-Upsell-Banner */
.pro-upsell {
  display: flex;
  gap: 14px;
  align-items: center;
  width: 100%;
  text-align: left;
  border: none;
  cursor: pointer;
  font-family: inherit;
  padding: 16px 18px;
  border-radius: var(--radius-l);
  transition: filter var(--dur-fast) var(--ease-out);
}
.pro-upsell:hover {
  filter: brightness(1.08);
}
.pro-upsell-star {
  font-size: 24px;
  flex: none;
}
.pro-upsell-text {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.pro-upsell-title {
  font-weight: 800;
}
.pro-upsell-sub {
  font-size: 13px;
  opacity: 0.8;
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
