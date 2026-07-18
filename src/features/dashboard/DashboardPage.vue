<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getPhotoUrl } from '../../shared/photos'
import { useSettingsStore } from '../settings/settingsStore'
import { useWeatherStore } from '../weather/weatherStore'
import { weatherLabel } from '../weather/weatherApi'
import { widgetRegistry } from './widgetRegistry'

const settings = useSettingsStore()
const weatherStore = useWeatherStore()

const mascotUrl = `${import.meta.env.BASE_URL}lumi/mascot/lumi-watering.png`

// Sichtbarkeit und Reihenfolge aus den Einstellungen; unbekannte/neue Widgets sind standardmäßig sichtbar.
const visibleWidgets = computed(() => {
  const layout = settings.dashboardLayout
  if (!layout.length) return [...widgetRegistry]
  const byId = new Map(widgetRegistry.map((w) => [w.id, w]))
  const ordered = layout
    .filter((c) => c.visible && byId.has(c.id))
    .map((c) => byId.get(c.id)!)
  const known = new Set(layout.map((c) => c.id))
  for (const w of widgetRegistry) if (!known.has(w.id)) ordered.push(w)
  return ordered
})

// Titelbild fürs Hero-Banner (Hintergrundbild liegt global in App.vue)
const headerUrl = ref<string | null>(null)

watch(
  () => settings.dashboardHeaderPhotoId,
  async (id) => {
    headerUrl.value = id ? await getPhotoUrl(id) : null
  },
  { immediate: true },
)

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 5) return 'Gute Nacht'
  if (hour < 11) return 'Guten Morgen'
  if (hour < 18) return 'Hallo'
  return 'Guten Abend'
})

const today = new Date().toLocaleDateString('de-DE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

// Wetterzeile im Hero (Daten kommen aus dem Weather-Store, der in App.vue lädt)
const weatherLine = computed(() => {
  const w = weatherStore.weather
  if (!w) return null
  return `${Math.round(w.currentTemp)}° · ${weatherLabel(w.currentCode).toLowerCase()}`
})

// Lumi-Tipp: kleine, kontextabhängige Hilfe statt statischem Text
const lumiTip = computed(() => {
  const w = weatherStore.weather
  if (w?.frostWarning) return '❄️ Lumi-Tipp: Nachtfrost erwartet — deck empfindliche Pflanzen ab!'
  if (w?.rainToday) return '🌧️ Lumi-Tipp: Heute ist Regen angesagt — das Gießen kann warten.'
  if (w && w.currentTemp >= 25) return '💧 Lumi-Tipp: Heute wird’s warm — gieß am besten erst am Abend!'
  return '🌱 Lumi-Tipp: Ein kurzer Blick ins Beet lohnt sich jeden Tag.'
})
</script>

<template>
  <div class="page">
    <!-- Hero: dunkle Glasfläche mit Begrüßung, Wetter und Lumi -->
    <header class="hero deep-card" :class="{ 'hero-photo': headerUrl }">
      <img v-if="headerUrl" :src="headerUrl" alt="" class="hero-img" />
      <div class="hero-inner">
        <div class="hero-row">
          <div class="hero-text">
            <div class="hero-date">{{ today }}</div>
            <h1 class="hero-greeting">{{ greeting }} 🌱</h1>
            <div v-if="weatherLine" class="hero-weather">
              <i class="ph-fill ph-cloud-sun" />{{ weatherLine }}
            </div>
          </div>
          <img :src="mascotUrl" alt="Lumi gießt" class="hero-mascot" />
        </div>
        <div class="hero-tip">{{ lumiTip }}</div>
      </div>
    </header>

    <div class="widget-grid">
      <section v-for="widget in visibleWidgets" :key="widget.id" class="card widget-card">
        <h2 class="widget-title">{{ widget.title }}</h2>
        <component :is="widget.component" />
      </section>
    </div>

    <p v-if="!visibleWidgets.length" class="muted">
      Alle Widgets sind ausgeblendet. Unter
      <RouterLink to="/einstellungen">Einstellungen</RouterLink> kannst du sie wieder einblenden.
    </p>
  </div>
</template>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
  padding: 24px;
}

/* Optionales Titelbild: liegt hinter einer dunklen Tönung, damit Text lesbar bleibt */
.hero-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.hero-photo::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(36, 54, 28, 0.55);
}

.hero-inner {
  position: relative;
  z-index: 1;
}

.hero-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.hero-date {
  font-size: 13px;
  opacity: 0.75;
  font-weight: 600;
}

.hero-greeting {
  font-size: 28px;
  font-weight: 800;
  line-height: 1.2;
  margin-top: 2px;
}

.hero-weather {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 14px;
  font-weight: 600;
  opacity: 0.9;
}
.hero-weather i {
  font-size: 20px;
}

.hero-mascot {
  width: 96px;
  height: 96px;
  object-fit: cover;
  border-radius: 24px;
  animation: lumiFloat 5s ease-in-out infinite;
  flex: none;
  align-self: center;
}

.hero-tip {
  margin-top: 16px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 18px;
  padding: 10px 14px;
  font-size: 14px;
}

.widget-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
  gap: 16px;
}

.widget-title {
  margin: 0 0 12px;
  font-size: 17px;
  font-weight: 800;
}
</style>
