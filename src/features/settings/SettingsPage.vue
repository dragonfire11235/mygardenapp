<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
import { useAccountStore } from '../account/accountStore'
import { useAuthStore } from '../auth/authStore'
import { useSyncStore } from '../sync/syncStore'
import { useUiStore } from '../ui/uiStore'

const settings = useSettingsStore()
const account = useAccountStore()
const auth = useAuthStore()
const sync = useSyncStore()
const ui = useUiStore()
const toast = useToast()
const confirm = useConfirm()

// --- Geräte-Sync ---
const lastSyncedLabel = computed(() =>
  sync.lastSyncedAt
    ? new Date(sync.lastSyncedAt).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })
    : 'noch nie',
)

// --- Angezeigte Identität: angemeldet = Konto-Anzeigename, sonst lokaler Name ---
const shownName = computed(() =>
  (auth.isAuthenticated ? auth.displayName || account.userName : account.userName) || 'Dein Garten',
)
const shownInitial = computed(() => shownName.value.trim().charAt(0).toUpperCase() || '🌱')

// Inline-Bearbeitung des Konto-Anzeigenamens (nur angemeldet)
const editingName = ref(false)
const displayNameDraft = ref('')
function startEditName() {
  displayNameDraft.value = auth.displayName
  editingName.value = true
}
async function saveDisplayName() {
  try {
    await auth.updateDisplayName(displayNameDraft.value)
    editingName.value = false
    toast.add({ severity: 'success', summary: 'Gespeichert', detail: 'Anzeigename aktualisiert.', life: 2000 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Fehler', detail: e instanceof Error ? e.message : String(e), life: 3000 })
  }
}

// --- Konto (Online-Login via Supabase) ---
async function logout() {
  try {
    await auth.logout()
    toast.add({ severity: 'success', summary: 'Abgemeldet', detail: 'Du bist jetzt abgemeldet.', life: 2000 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Fehler', detail: e instanceof Error ? e.message : String(e), life: 3000 })
  }
}

// --- Konto/Profil ---
const nameInput = ref(account.userName)
watch(() => account.userName, (v) => { nameInput.value = v })

async function saveName() {
  const next = nameInput.value.trim()
  if (next === account.userName) return
  await account.setUserName(next)
  toast.add({ severity: 'success', summary: 'Gespeichert', detail: 'Dein Name wurde aktualisiert.', life: 2000 })
}

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
    icon: 'ph-fill ph-warning',
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
      <!-- Konto/Profil — heute lokal, später Online-Konto (siehe Roadmap) -->
      <section class="card account-card">
        <div class="account-top">
          <div class="account-avatar">{{ shownInitial }}</div>
          <div class="account-meta">
            <div class="account-name">{{ shownName }}</div>
            <div class="account-plan-row">
              <span class="plan-badge" :class="{ 'is-pro': !account.isFree }">{{ account.planLabel }}</span>
              <span class="plan-sub">{{ account.planSub }}</span>
            </div>
          </div>
          <button v-if="account.isFree" type="button" class="pill-btn account-pro-btn" @click="ui.openPro()">
            Pro werden
          </button>
        </div>

        <!-- Angemeldet: Anzeigename aus dem Konto (inline änderbar). Abgemeldet: lokaler Name. -->
        <div v-if="auth.isAuthenticated" class="account-name-edit">
          <template v-if="editingName">
            <InputText v-model="displayNameDraft" placeholder="Anzeigename" class="grow" @keyup.enter="saveDisplayName" />
            <Button label="Speichern" @click="saveDisplayName" />
            <Button label="Abbrechen" severity="secondary" text @click="editingName = false" />
          </template>
          <template v-else>
            <span class="muted grow">Anzeigename: <strong>{{ auth.displayName || '—' }}</strong></span>
            <Button label="Ändern" severity="secondary" text @click="startEditName" />
          </template>
        </div>
        <div v-else class="account-name-edit">
          <InputText v-model="nameInput" placeholder="Dein Name" class="grow" @blur="saveName" @keyup.enter="saveName" />
          <Button label="Speichern" @click="saveName" />
        </div>

        <!-- Online-Konto (Supabase Auth) — additiv, App bleibt ohne Login offline nutzbar -->
        <div v-if="auth.available" class="account-auth">
          <template v-if="auth.isAuthenticated">
            <div class="account-auth-status">
              <i class="ph-fill ph-check-circle" />
              <span class="grow">Angemeldet als <strong>{{ auth.email }}</strong></span>
            </div>
            <p class="muted account-auth-hint">
              <template v-if="sync.status === 'error'">Sync-Fehler: {{ sync.errorMsg }}</template>
              <template v-else-if="sync.status === 'syncing'">Synchronisiere …</template>
              <template v-else>Zuletzt synchronisiert: {{ lastSyncedLabel }}</template>
            </p>
            <div class="account-auth-actions">
              <Button
                :label="sync.status === 'syncing' ? 'Synchronisiere …' : 'Jetzt synchronisieren'"
                :disabled="sync.status === 'syncing'"
                @click="sync.syncNow()"
              />
              <Button label="Passwort ändern" severity="secondary" outlined @click="ui.openAuth('password')" />
              <Button label="Abmelden" severity="secondary" text @click="logout" />
            </div>
          </template>
          <template v-else>
            <div class="account-auth-status">
              <i class="ph-fill ph-lock-simple" />
              <span class="grow">Lokal — nicht angemeldet. Deine Daten liegen nur auf diesem Gerät.</span>
            </div>
            <Button label="Anmelden / Registrieren" class="account-auth-cta" @click="ui.openAuth('login')" />
          </template>
        </div>
      </section>

      <!-- Schnellzugriff (mobil sind diese Bereiche nur hier erreichbar) -->
      <section class="card quick-links">
        <RouterLink to="/tagebuch" class="quick-link">
          <span class="icon-tile quick-tile"><i class="ph-fill ph-book-open" /></span>
          <span class="grow">Tagebuch</span>
          <i class="ph-bold ph-caret-right quick-caret" />
        </RouterLink>
        <RouterLink to="/geraete" class="quick-link">
          <span class="icon-tile quick-tile"><i class="ph-fill ph-cpu" /></span>
          <span class="grow">Geräte</span>
          <i class="ph-bold ph-caret-right quick-caret" />
        </RouterLink>
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
          <i class="ph-fill ph-map-pin" />
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
          <Button label="Suchen" icon="ph-bold ph-magnifying-glass" :loading="locationSearching" @click="findLocation" />
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
            <Button icon="ph-bold ph-arrow-up" text rounded size="small" severity="secondary" aria-label="Nach oben" @click="moveWidget(config.id, -1)" />
            <Button icon="ph-bold ph-arrow-down" text rounded size="small" severity="secondary" aria-label="Nach unten" @click="moveWidget(config.id, 1)" />
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
          <Button label="Backup herunterladen" icon="ph-bold ph-download-simple" @click="exportData" />
          <Button label="Backup importieren" icon="ph-bold ph-upload-simple" severity="secondary" outlined @click="importInput?.click()" />
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

.account-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.account-top {
  display: flex;
  align-items: center;
  gap: 14px;
}
.account-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 20px;
  font-weight: 800;
  flex: none;
}
.account-meta {
  flex: 1;
  min-width: 0;
}
.account-name {
  font-weight: 800;
  font-size: 16px;
}
.account-plan-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}
.plan-badge {
  font-size: 11px;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--surface-tint);
  color: var(--text-2);
}
.plan-badge.is-pro {
  background: var(--accent);
  color: #fff;
}
.plan-sub {
  font-size: 12px;
  color: var(--text-3);
  font-weight: 600;
}
.account-pro-btn {
  font-size: 13px;
  font-weight: 700;
  padding: 9px 16px;
  flex: none;
}
.account-name-edit {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.account-auth {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--border-soft);
}
.account-auth-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}
.account-auth-status i {
  font-size: 19px;
  color: var(--accent);
  flex: none;
}
.account-auth-hint {
  margin: 6px 0 0;
  font-size: 12px;
}
.account-auth-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 10px;
}
.account-auth-cta {
  margin-top: 12px;
  width: 100%;
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
