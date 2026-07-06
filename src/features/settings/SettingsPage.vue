<script setup lang="ts">
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import ToggleSwitch from 'primevue/toggleswitch'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { downloadBackup, importBackupFile } from '../../data/backup'
import { useSettingsStore, type DashboardWidgetConfig } from './settingsStore'

const settings = useSettingsStore()
const toast = useToast()
const confirm = useConfirm()

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
const widgetLabels: Record<string, string> = {
  tasks: 'Fällige Aufgaben',
  season: 'Saison',
  beds: 'Beete',
  diary: 'Tagebuch',
  sensors: 'Sensoren',
  switches: 'Schalter',
}

const widgetIds = Object.keys(widgetLabels)

const layout = computed<DashboardWidgetConfig[]>(() => {
  const existing = new Map(settings.dashboardLayout.map((c) => [c.id, c]))
  return widgetIds.map((id) => existing.get(id) ?? { id, visible: true })
})

async function toggleWidget(id: string, visible: boolean) {
  await settings.setDashboardLayout(layout.value.map((c) => (c.id === id ? { ...c, visible } : c)))
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
        <h1>Einstellungen</h1>
        <p class="muted">App-Konfiguration, Dashboard und Datensicherung.</p>
      </div>
    </div>

    <div class="settings-sections">
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
        <h2>Dashboard-Widgets</h2>
        <div class="widget-toggles">
          <div v-for="config in layout" :key="config.id" class="row">
            <ToggleSwitch
              :modelValue="config.visible"
              :inputId="`widget-${config.id}`"
              @update:modelValue="(v: boolean) => toggleWidget(config.id, v)"
            />
            <label :for="`widget-${config.id}`">{{ widgetLabels[config.id] }}</label>
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

.card h2 {
  margin: 0 0 0.6rem;
  font-size: 1rem;
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
