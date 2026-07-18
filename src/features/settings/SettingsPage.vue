<script setup lang="ts">
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import ToggleSwitch from 'primevue/toggleswitch'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { downloadBackup, importBackupFile } from '../../data/backup'
import PhotoPicker from '../../shared/PhotoPicker.vue'
import { widgetRegistry } from '../dashboard/widgetRegistry'
import { searchLocation, type GeoResult } from '../weather/weatherApi'
import { useSettingsStore, type DashboardWidgetConfig } from './settingsStore'

const settings = useSettingsStore()
const toast = useToast()
const confirm = useConfirm()

// --- Dashboard-Bilder (Titelbild/Hero + Hintergrund) ---
const headerPhotoId = computed({
  get: () => settings.dashboardHeaderPhotoId,
  set: (id: string | null) => void settings.setDashboardHeaderPhotoId(id),
})

const backgroundPhotoId = computed({
  get: () => settings.dashboardBackgroundPhotoId,
  set: (id: string | null) => void settings.setDashboardBackgroundPhotoId(id),
})

const darkMode = computed({
  get: () => settings.darkMode,
  set: (enabled: boolean) => void settings.setDarkMode(enabled),
})

// --- Wetter-Standort ---
const locationQuery = ref('')
const locationResults = ref<GeoResult[]>([])
const locationSearching = ref(false)

async function findLocation() {
  if (!locationQuery.value.trim()) return
  locationSearching.value = true
  try {
    locationResults.value = await searchLocation(locationQuery.value.trim())
    if (!locationResults.value.length) {
      toast.add({ severity: 'info', summary: 'Kein Ort gefunden', life: 2500 })
    }
  } catch {
    toast.add({ severity: 'error', summary: 'Ortssuche nicht erreichbar', life: 3000 })
  } finally {
    locationSearching.value = false
  }
}

async function chooseLocation(result: GeoResult) {
  await settings.setWeatherLocation({ lat: result.lat, lon: result.lon, name: result.name })
  locationResults.value = []
  locationQuery.value = ''
  toast.add({ severity: 'success', summary: 'Standort gespeichert', detail: result.name, life: 2500 })
}

async function clearLocation() {
  await settings.setWeatherLocation(null)
}

// --- Trefle-API ---
const tokenInput = ref(settings.trefleToken)

async function saveToken() {
  await settings.setTrefleToken(tokenInput.value)
  toast.add({ severity: 'success', summary: 'Gespeichert', detail: 'Trefle-Token aktualisiert.', life: 2500 })
}

// --- Benachrichtigungen ---
const notificationsEnabled = computed({
  get: () => settings.notificationsEnabled,
  set: (enabled: boolean) => void toggleNotifications(enabled),
})

async function toggleNotifications(enabled: boolean) {
  if (enabled && 'Notification' in window && Notification.permission !== 'granted') {
    const result = await Notification.requestPermission()
    if (result !== 'granted') {
      toast.add({ severity: 'warn', summary: 'Nicht erlaubt', detail: 'Der Browser hat Benachrichtigungen abgelehnt.', life: 3500 })
      await settings.setNotificationsEnabled(false)
      return
    }
  }
  await settings.setNotificationsEnabled(enabled)
}

// --- Dashboard-Widgets ---
// Labels kommen aus der Widget-Registry (eine Quelle für Dashboard + Einstellungen).
const widgetTitle = new Map(widgetRegistry.map((w) => [w.id, w.title]))

const layout = computed<DashboardWidgetConfig[]>(() => {
  const existing = new Map(settings.dashboardLayout.map((c) => [c.id, c]))
  const stored = settings.dashboardLayout.filter((c) => widgetTitle.has(c.id))
  const missing = widgetRegistry
    .filter((w) => !existing.has(w.id))
    .map((w) => ({ id: w.id, visible: true }))
  return [...stored, ...missing]
})

async function toggleWidget(id: string, visible: boolean) {
  await settings.setDashboardLayout(layout.value.map((c) => (c.id === id ? { ...c, visible } : c)))
}

async function moveWidget(id: string, direction: -1 | 1) {
  const next = [...layout.value]
  const index = next.findIndex((c) => c.id === id)
  const target = index + direction
  if (index < 0 || target < 0 || target >= next.length) return
  ;[next[index], next[target]] = [next[target], next[index]]
  await settings.setDashboardLayout(next)
}

// --- Backup ---
const includePhotos = ref(true)
const importInput = ref<HTMLInputElement | null>(null)

async function exportData() {
  await downloadBackup(includePhotos.value)
  toast.add({ severity: 'success', summary: 'Backup erstellt', detail: 'Der Download wurde gestartet.', life: 2500 })
}

function onImportSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  confirm.require({
    message: 'Der Import ersetzt alle vorhandenen Daten. Fortfahren?',
    header: 'Backup importieren',
    icon: 'pi pi-exclamation-triangle',
    acceptProps: { label: 'Importieren', severity: 'danger' },
    rejectProps: { label: 'Abbrechen', severity: 'secondary', text: true },
    accept: async () => {
      try {
        await importBackupFile(file)
        toast.add({ severity: 'success', summary: 'Importiert', detail: 'Daten wurden ersetzt. Seite wird neu geladen.', life: 2500 })
        setTimeout(() => window.location.reload(), 1200)
      } catch (err) {
        toast.add({ severity: 'error', summary: 'Import fehlgeschlagen', detail: err instanceof Error ? err.message : String(err), life: 5000 })
      }
    },
  })
  if (importInput.value) importInput.value.value = ''
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Mehr</h1>
        <p class="muted">App-Konfiguration, Dashboard und Datensicherung.</p>
      </div>
    </div>

    <div class="settings-sections">
      <!-- Schnellzugriff (mobil sind Entdeckungen/Kalender nur hier erreichbar) -->
      <section class="card quick-links">
        <RouterLink to="/kalender" class="quick-link">
          <span class="icon-tile quick-tile"><i class="ph-fill ph-calendar-blank" /></span>
          <span class="grow">Kalender</span>
          <i class="ph-bold ph-caret-right quick-caret" />
        </RouterLink>
        <RouterLink to="/entdeckungen" class="quick-link">
          <span class="icon-tile quick-tile"><i class="ph-fill ph-binoculars" /></span>
          <span class="grow">Entdeckungen</span>
          <i class="ph-bold ph-caret-right quick-caret" />
        </RouterLink>
      </section>
      <section class="card">
        <h2>Pflanzen-Datenbank (Trefle)</h2>
        <p class="muted">
          Mit einem kostenlosen Token von trefle.io kannst du Pflanzen aus der Online-Datenbank suchen.
        </p>
        <div class="row">
          <InputText v-model="tokenInput" placeholder="Trefle API-Token" class="grow" />
          <Button label="Speichern" @click="saveToken" />
        </div>
      </section>

      <section class="card">
        <h2>Benachrichtigungen</h2>
        <div class="row">
          <ToggleSwitch v-model="notificationsEnabled" inputId="notif" />
          <label for="notif">Beim Öffnen der App an fällige Aufgaben erinnern</label>
        </div>
      </section>

      <section class="card">
        <h2>Aussehen</h2>
        <div class="row">
          <ToggleSwitch v-model="darkMode" inputId="darkmode" />
          <label for="darkmode">Dunkelmodus</label>
        </div>
        <p class="muted">Titelbild fürs Dashboard und ein Hintergrundbild für alle Seiten.</p>
        <div class="picture-settings">
          <div class="form-field">
            <label>Titelbild (Dashboard-Banner)</label>
            <PhotoPicker v-model="headerPhotoId" label="Titelbild wählen" />
          </div>
          <div class="form-field">
            <label>Hintergrundbild (alle Seiten)</label>
            <PhotoPicker v-model="backgroundPhotoId" label="Hintergrund wählen" />
          </div>
        </div>
      </section>

      <section class="card">
        <h2>Wetter</h2>
        <p class="muted">Standort für das Wetter-Widget am Dashboard (Open-Meteo, kostenlos).</p>
        <div v-if="settings.weatherLocation" class="row">
          <i class="pi pi-map-marker" />
          <span class="grow">{{ settings.weatherLocation.name }}</span>
          <Button label="Entfernen" severity="secondary" text size="small" @click="clearLocation" />
        </div>
        <div class="row">
          <InputText
            v-model="locationQuery"
            placeholder="Ort suchen, z. B. Wien"
            class="grow"
            @keyup.enter="findLocation"
          />
          <Button label="Suchen" icon="pi pi-search" :loading="locationSearching" @click="findLocation" />
        </div>
        <div v-if="locationResults.length" class="location-results">
          <Button
            v-for="result in locationResults"
            :key="`${result.lat},${result.lon}`"
            :label="`${result.name}${result.admin ? ', ' + result.admin : ''} (${result.country})`"
            severity="secondary"
            outlined
            size="small"
            @click="chooseLocation(result)"
          />
        </div>
      </section>

      <section class="card">
        <h2>Dashboard-Widgets</h2>
        <p class="muted">Sichtbarkeit und Reihenfolge der Karten am Dashboard.</p>
        <div class="widget-toggles">
          <div v-for="config in layout" :key="config.id" class="row">
            <ToggleSwitch
              :modelValue="config.visible"
              :inputId="`widget-${config.id}`"
              @update:modelValue="(v: boolean) => toggleWidget(config.id, v)"
            />
            <label :for="`widget-${config.id}`" class="grow">{{ widgetTitle.get(config.id) }}</label>
            <Button icon="pi pi-arrow-up" text rounded size="small" severity="secondary" aria-label="Nach oben" @click="moveWidget(config.id, -1)" />
            <Button icon="pi pi-arrow-down" text rounded size="small" severity="secondary" aria-label="Nach unten" @click="moveWidget(config.id, 1)" />
          </div>
        </div>
      </section>

      <section class="card">
        <h2>Datensicherung</h2>
        <div class="row">
          <ToggleSwitch v-model="includePhotos" inputId="photos" />
          <label for="photos">Fotos ins Backup aufnehmen</label>
        </div>
        <div class="row actions">
          <Button label="Backup herunterladen" icon="pi pi-download" @click="exportData" />
          <Button label="Backup importieren" icon="pi pi-upload" severity="secondary" outlined @click="importInput?.click()" />
          <input ref="importInput" type="file" accept="application/json,.json" class="hidden-input" @change="onImportSelected" />
        </div>
        <p class="muted">Der Import ersetzt alle vorhandenen Daten durch den Inhalt der Backup-Datei.</p>
      </section>

      <p class="app-footer muted">lumi · Mein Garten 2.0 · offline-fähig 🌱</p>
    </div>
  </div>
</template>

<style scoped>
.settings-sections {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 640px;
}

.picture-settings {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 520px) {
  .picture-settings {
    grid-template-columns: 1fr;
  }
}

.location-results {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.35rem;
  margin-top: 0.5rem;
}

.card h2 {
  margin: 0 0 0.6rem;
  font-size: 17px;
  font-weight: 800;
}

.quick-links {
  padding: 6px 16px;
}
.quick-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 2px;
  border-bottom: 1px solid var(--border-soft);
  color: inherit;
  font-weight: 700;
  font-size: 15px;
}
.quick-link:last-child {
  border-bottom: none;
}
.quick-link:hover {
  color: var(--accent-strong);
}
.quick-tile {
  width: 36px;
  height: 36px;
  border-radius: 13px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 19px;
}
.quick-caret {
  color: var(--text-3);
}

.app-footer {
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  padding: 8px 0 4px;
}

.row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0.5rem 0;
}

.grow {
  flex: 1;
}

.actions {
  flex-wrap: wrap;
}

.widget-toggles {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.hidden-input {
  display: none;
}
</style>
