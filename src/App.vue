<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import { getPhotoUrl } from './shared/photos'
import { deleteOrphanPhotos } from './shared/photoGc'
import { useSettingsStore } from './features/settings/settingsStore'
import { usePlantsStore } from './features/plants/plantsStore'
import { useBedsStore } from './features/beds/bedsStore'
import { useTasksStore } from './features/tasks/tasksStore'
import { useDiaryStore } from './features/diary/diaryStore'
import { useDevicesStore } from './features/devices/devicesStore'
import { useWeatherStore } from './features/weather/weatherStore'
import { useAccountStore } from './features/account/accountStore'
import { useAuthStore } from './features/auth/authStore'
import { useSyncStore } from './features/sync/syncStore'
import { useUiStore } from './features/ui/uiStore'
import ProDialog from './features/ui/ProDialog.vue'
import AuthDialog from './features/auth/AuthDialog.vue'
import Onboarding from './features/account/Onboarding.vue'

const settings = useSettingsStore()
const plants = usePlantsStore()
const beds = useBedsStore()
const tasks = useTasksStore()
const diary = useDiaryStore()
const devices = useDevicesStore()
const weather = useWeatherStore()
const account = useAccountStore()
const auth = useAuthStore()
const sync = useSyncStore()
const ui = useUiStore()
const route = useRoute()

// Logo aus public/ — BASE_URL beachten (GitHub Pages liegt unter /<repo>/)
const logoUrl = `${import.meta.env.BASE_URL}lumi/logo-lumi-wordmark-alpha.png`

// Navigation (Phosphor-Icons, Stil "fill" — siehe Design-Handoff)
// Mobil: 5 Tabs (passt sicher bis 320 px, iOS-Standard). Tagebuch, Geräte,
// Entdeckungen und Kalender sind über „Mehr" (Schnellzugriff) erreichbar.
// Desktop-Sidebar zeigt alle Bereiche direkt.
const tabItems = [
  { to: '/', icon: 'ph-house', label: 'Start' },
  { to: '/pflanzen', icon: 'ph-potted-plant', label: 'Pflanzen' },
  { to: '/beete', icon: 'ph-grid-four', label: 'Beete' },
  { to: '/aufgaben', icon: 'ph-list-checks', label: 'Aufgaben' },
  { to: '/einstellungen', icon: 'ph-dots-three-circle', label: 'Mehr' },
]
const sideItems = [
  { to: '/', icon: 'ph-house', label: 'Start' },
  { to: '/pflanzen', icon: 'ph-potted-plant', label: 'Pflanzen' },
  { to: '/beete', icon: 'ph-grid-four', label: 'Beete' },
  { to: '/aufgaben', icon: 'ph-list-checks', label: 'Aufgaben' },
  { to: '/tagebuch', icon: 'ph-book-open', label: 'Tagebuch' },
  { to: '/geraete', icon: 'ph-cpu', label: 'Geräte' },
  { to: '/entdeckungen', icon: 'ph-binoculars', label: 'Entdeckungen' },
  { to: '/kalender', icon: 'ph-calendar-blank', label: 'Kalender' },
  { to: '/einstellungen', icon: 'ph-dots-three-circle', label: 'Mehr' },
]

// Aktiv-Logik: Detailseiten zählen zum Hauptbereich (z. B. /pflanzen/42 → Pflanzen)
function isActive(to: string): boolean {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(`${to}/`)
}

const darkLabel = computed(() => (settings.darkMode ? 'Heller Modus' : 'Dunkelmodus'))
const darkIcon = computed(() => (settings.darkMode ? 'ph-sun' : 'ph-moon'))

// Hintergrundbild gilt für alle Seiten (nicht nur Dashboard)
const backgroundUrl = ref<string | null>(null)
watch(
  () => settings.dashboardBackgroundPhotoId,
  async (id) => {
    backgroundUrl.value = id ? await getPhotoUrl(id) : null
  },
  { immediate: true },
)

// Dunkelmodus: schaltet die .app-dark-Klasse (PrimeVue + eigene CSS-Variablen)
watch(
  () => settings.darkMode,
  (dark) => {
    document.documentElement.classList.toggle('app-dark', dark)
  },
  { immediate: true },
)

// Nach dem Anmelden (Login während der Session) einmal abgleichen.
watch(
  () => auth.isAuthenticated,
  (yes, was) => {
    if (yes && !was) void sync.syncNow()
  },
)

onMounted(async () => {
  await Promise.all([settings.load(), plants.load(), beds.load(), tasks.load(), diary.load(), devices.load(), account.load(), auth.init()])

  // Fehlende Pflegeaufgaben aus den Pflanzen-Intervallen erzeugen
  await tasks.syncCareTasks(plants.plants, beds.activePlantings)

  // Wetter laden (für Widget + „Alles gegossen"-Hervorhebung bei Regen)
  void weather.load()

  // Geräte-Sync: letzten Stand lesen; wenn angemeldet, beim App-Start abgleichen.
  await sync.loadMeta()
  if (auth.isAuthenticated) void sync.syncNow()

  // Verwaiste Foto-Blobs im Hintergrund aufräumen (PhotoPicker ersetzt/entfernt
  // nur die Referenz; die Blobs selbst räumt dieser Sweep ab)
  void deleteOrphanPhotos()

  // Zähler am App-Icon + Hinweis beim Öffnen (echte Push-Nachrichten brauchen ein Backend)
  const due = tasks.dueTasks.length
  if ('setAppBadge' in navigator) {
    const nav = navigator as Navigator & { setAppBadge: (n: number) => void; clearAppBadge: () => void }
    if (due > 0) nav.setAppBadge(due)
    else nav.clearAppBadge()
  }
  if (due > 0 && settings.notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
    new Notification('Mein Garten', {
      body: due === 1 ? 'Eine Aufgabe ist fällig.' : `${due} Aufgaben sind fällig.`,
    })
  }
})
</script>

<template>
  <div class="app-shell">
    <!-- Desktop-Sidebar (≥1024px) -->
    <nav class="side-nav">
      <img :src="logoUrl" alt="lumi" data-logo="1" class="side-logo" />
      <RouterLink
        v-for="item in sideItems"
        :key="item.to"
        :to="item.to"
        class="side-item"
        :class="{ 'is-active': isActive(item.to) }"
      >
        <i class="ph-fill" :class="item.icon" />
        <span>{{ item.label }}</span>
        <span v-if="item.to === '/aufgaben' && tasks.dueTasks.length" class="nav-badge">{{ tasks.dueTasks.length }}</span>
      </RouterLink>
      <div class="side-spacer" />
      <button v-if="account.isFree" type="button" class="side-pro" @click="ui.openPro()">
        <div class="side-pro-title">✨ lumi Pro</div>
        <div class="side-pro-sub">Sync, Smart Garden &amp; mehr</div>
      </button>
      <button type="button" class="side-dark-toggle" @click="settings.setDarkMode(!settings.darkMode)">
        <i class="ph-fill" :class="darkIcon" />
        <span>{{ darkLabel }}</span>
      </button>
    </nav>

    <main
      class="app-main"
      :class="{ 'has-bg': backgroundUrl }"
      :style="backgroundUrl ? { backgroundImage: `linear-gradient(var(--bg-photo-veil), var(--bg-photo-veil)), url(${backgroundUrl})` } : undefined"
    >
      <div class="app-content">
        <RouterView v-slot="{ Component }">
          <Transition name="screen">
            <component :is="Component" :key="route.path" />
          </Transition>
        </RouterView>
      </div>
    </main>

    <!-- Mobile Glas-Tab-Bar (<1024px) -->
    <nav class="tab-bar">
      <RouterLink
        v-for="item in tabItems"
        :key="item.to"
        :to="item.to"
        class="tab-item"
        :class="{ 'is-active': isActive(item.to) }"
      >
        <i class="ph-fill" :class="item.icon" />
        <span>{{ item.label }}</span>
        <span v-if="item.to === '/aufgaben' && tasks.dueTasks.length" class="nav-badge tab-badge">{{ tasks.dueTasks.length }}</span>
      </RouterLink>
    </nav>

    <Toast position="bottom-center" />
    <ConfirmDialog />
    <ProDialog />
    <AuthDialog />
    <Onboarding v-if="!account.onboarded" />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  background: var(--bg-app-gradient);
  --bg-photo-veil: rgba(247, 244, 238, 0.6);
}
:global(.app-dark) .app-shell {
  /* Kräftiger abdunkeln, damit helle Hintergrundbilder im Dunkelmodus nicht blenden */
  --bg-photo-veil: rgba(13, 18, 12, 0.86);
}

.app-main {
  flex: 1;
  min-width: 0;
}

/* Optionales Hintergrundbild hinter dem Seiteninhalt (alle Seiten) */
.app-main.has-bg {
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  min-height: 100vh; /* füllt den Bildschirm auch bei wenig Inhalt */
}

/* Inhalt: zentriert, Platz unten für die schwebende Tab-Bar.
   Oben env(safe-area-inset-top), damit der Seitenkopf in der installierten
   PWA (Notch-iPhones, standalone) nicht unter die Statusleiste rutscht. */
.app-content {
  max-width: 1060px;
  margin: 0 auto;
  padding: calc(20px + env(safe-area-inset-top)) 18px 140px;
}

/* Seitenwechsel: fadeUp nur beim Eintreten (wie im Prototyp) */
.screen-enter-active {
  animation: fadeUp var(--dur-slow, 300ms) var(--ease-out);
}
.screen-leave-active {
  display: none;
}

/* ---- Desktop-Sidebar ---- */
.side-nav {
  width: 250px;
  flex: none;
  padding: 24px 16px;
  display: none;
  flex-direction: column;
  gap: 4px;
  border-right: 1px solid var(--border-soft);
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
}

.side-logo {
  height: 32px;
  align-self: flex-start;
  margin: 4px 8px 20px;
}

.side-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 15px;
  font-weight: 700;
  padding: 11px 14px;
  border-radius: 16px;
  color: var(--text-2);
  transition: background var(--dur-fast) var(--ease-out);
  position: relative;
}
.side-item i {
  font-size: 20px;
}
.side-item:hover {
  background: var(--surface-tint);
  color: var(--text-2);
}
.side-item.is-active {
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.side-spacer {
  flex: 1;
}

.side-pro {
  border: none;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  background: var(--surface-deep);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  color: var(--text-on-deep);
  border-radius: 20px;
  padding: 14px;
  box-shadow: var(--shadow-deep);
  transition: filter var(--dur-fast) var(--ease-out);
}
.side-pro:hover {
  filter: brightness(1.08);
}
.side-pro-title {
  font-weight: 800;
  font-size: 14px;
}
.side-pro-sub {
  font-size: 12px;
  opacity: 0.8;
}

.side-dark-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  padding: 11px 14px;
  border-radius: 16px;
  background: transparent;
  color: var(--text-2);
  margin-top: 8px;
  text-align: left;
}
.side-dark-toggle i {
  font-size: 20px;
}
.side-dark-toggle:hover {
  background: var(--surface-tint);
}

.nav-badge {
  margin-left: auto;
  background: var(--danger);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  border-radius: 999px;
  min-width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
}

/* ---- Mobile Glas-Tab-Bar ---- */
.tab-bar {
  position: fixed;
  left: 50%;
  bottom: calc(12px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  z-index: 40;
  display: flex;
  gap: 2px;
  background: var(--surface-deep);
  backdrop-filter: var(--glass-blur-strong);
  -webkit-backdrop-filter: var(--glass-blur-strong);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: var(--radius-pill);
  padding: 8px 10px;
  box-shadow: var(--shadow-deep);
  max-width: calc(100vw - 16px);
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 7px 11px;
  border-radius: var(--radius-pill);
  min-width: 48px;
  color: rgba(244, 248, 238, 0.72);
  transition: all var(--dur-fast) var(--ease-out);
  position: relative;
}
.tab-item i {
  font-size: 21px;
}
.tab-item span:not(.nav-badge) {
  font-size: 10px;
  font-weight: 800;
  white-space: nowrap;
}
.tab-item:active {
  transform: scale(var(--press-scale, 0.97));
}
.tab-item.is-active {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
}

.tab-badge {
  position: absolute;
  top: 0;
  right: 2px;
  margin-left: 0;
  min-width: 16px;
  height: 16px;
  font-size: 10px;
}

/* Breakpoint 1024px: Sidebar ↔ Tab-Bar */
@media (min-width: 1024px) {
  .side-nav {
    display: flex;
  }
  .tab-bar {
    display: none;
  }
  /* Kein Platz mehr für die (ausgeblendete) schwebende Tab-Bar nötig */
  .app-content {
    padding-bottom: 40px;
  }
}
</style>
