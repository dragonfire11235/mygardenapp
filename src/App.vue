<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import { getPhotoUrl } from './shared/photos'
import { useSettingsStore } from './features/settings/settingsStore'
import { usePlantsStore } from './features/plants/plantsStore'
import { useBedsStore } from './features/beds/bedsStore'
import { useTasksStore } from './features/tasks/tasksStore'
import { useDiaryStore } from './features/diary/diaryStore'
import { useDevicesStore } from './features/devices/devicesStore'
import { useWeatherStore } from './features/weather/weatherStore'

const settings = useSettingsStore()
const plants = usePlantsStore()
const beds = useBedsStore()
const tasks = useTasksStore()
const diary = useDiaryStore()
const devices = useDevicesStore()
const weather = useWeatherStore()

const navItems = [
  { to: '/', icon: 'pi-home', label: 'Start' },
  { to: '/pflanzen', icon: 'pi-book', label: 'Pflanzen' },
  { to: '/beete', icon: 'pi-table', label: 'Beete' },
  { to: '/aufgaben', icon: 'pi-check-square', label: 'Aufgaben' },
  { to: '/tagebuch', icon: 'pi-pencil', label: 'Tagebuch' },
  { to: '/geraete', icon: 'pi-bolt', label: 'Geräte' },
  { to: '/einstellungen', icon: 'pi-cog', label: 'Mehr' },
]

// Hintergrundbild gilt für alle Seiten (nicht nur Dashboard)
const backgroundUrl = ref<string | null>(null)
watch(
  () => settings.dashboardBackgroundPhotoId,
  async (id) => {
    backgroundUrl.value = id ? await getPhotoUrl(id) : null
  },
  { immediate: true },
)

onMounted(async () => {
  await Promise.all([settings.load(), plants.load(), beds.load(), tasks.load(), diary.load(), devices.load()])

  // Fehlende Pflegeaufgaben aus den Pflanzen-Intervallen erzeugen
  await tasks.syncCareTasks(plants.plants, beds.activePlantings)

  // Wetter laden (für Widget + „Alles gegossen"-Hervorhebung bei Regen)
  void weather.load()

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
    <aside class="app-nav">
      <div class="app-brand">
        <span class="app-brand-icon">🌱</span>
        <span class="app-brand-name">Mein Garten</span>
      </div>
      <nav>
        <RouterLink v-for="item in navItems" :key="item.to" :to="item.to" class="nav-item">
          <i class="pi" :class="item.icon" />
          <span>{{ item.label }}</span>
          <span
            v-if="item.to === '/aufgaben' && tasks.dueTasks.length"
            class="nav-badge"
          >{{ tasks.dueTasks.length }}</span>
        </RouterLink>
      </nav>
    </aside>

    <main
      class="app-main"
      :class="{ 'has-bg': backgroundUrl }"
      :style="backgroundUrl ? { backgroundImage: `linear-gradient(rgba(246, 248, 244, 0.6), rgba(246, 248, 244, 0.6)), url(${backgroundUrl})` } : undefined"
    >
      <RouterView />
    </main>

    <Toast position="bottom-center" />
    <ConfirmDialog />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
}

/* Optionales Hintergrundbild hinter dem Seiteninhalt (alle Seiten) */
.app-main.has-bg {
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  min-height: 100vh; /* füllt den Bildschirm auch bei wenig Inhalt */
}

.app-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 1.05rem;
  padding: 1rem 0.9rem;
}

.app-brand-icon {
  font-size: 1.4rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.65rem 0.9rem;
  border-radius: 10px;
  color: var(--app-text);
  text-decoration: none;
  position: relative;
}

.nav-item:hover {
  background: rgba(22, 163, 74, 0.08);
}

.nav-item.router-link-active {
  background: rgba(22, 163, 74, 0.12);
  color: var(--app-accent);
  font-weight: 600;
}

.nav-badge {
  margin-left: auto;
  background: var(--app-danger);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 700;
  border-radius: 999px;
  min-width: 1.3rem;
  height: 1.3rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 0.3rem;
}

/* Desktop: Seitenleiste links */
@media (min-width: 768px) {
  .app-shell {
    display: grid;
    grid-template-columns: 215px 1fr;
  }

  .app-nav {
    position: sticky;
    top: 0;
    height: 100vh;
    background: var(--app-surface);
    border-right: 1px solid var(--app-border);
    padding: 0 0.5rem;
  }

  .app-main {
    min-width: 0;
  }
}

/* Mobil: Navigationsleiste unten */
@media (max-width: 767px) {
  .app-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
    background: var(--app-surface);
    border-top: 1px solid var(--app-border);
  }

  .app-brand {
    display: none;
  }

  .app-nav nav {
    display: flex;
    justify-content: space-around;
  }

  .nav-item {
    flex-direction: column;
    gap: 0.15rem;
    font-size: 0.62rem;
    padding: 0.5rem 0.35rem;
    flex: 1;
    align-items: center;
  }

  .nav-item .pi {
    font-size: 1.15rem;
  }

  .nav-badge {
    position: absolute;
    top: 2px;
    right: 50%;
    transform: translateX(1.2rem);
    margin-left: 0;
  }

  .app-main {
    padding-bottom: calc(var(--app-nav-height) + 0.5rem);
  }
}
</style>
