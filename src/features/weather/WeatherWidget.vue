<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useSettingsStore } from '../settings/settingsStore'
import { useWeatherStore } from './weatherStore'
import { weatherIcon, weatherLabel } from './weatherApi'

const settings = useSettingsStore()
const store = useWeatherStore()

const weather = computed(() => store.weather)
const loading = computed(() => store.loading)
const error = computed(() => store.error)

const weekday = (iso: string) =>
  new Date(iso).toLocaleDateString('de-DE', { weekday: 'short' })

onMounted(() => {
  if (!store.weather && settings.weatherLocation) store.load()
})
</script>

<template>
  <div v-if="!settings.weatherLocation" class="muted">
    Kein Standort gewählt.
    <RouterLink to="/einstellungen">In den Einstellungen festlegen →</RouterLink>
  </div>
  <div v-else-if="loading && !weather" class="muted">Wetter wird geladen …</div>
  <div v-else-if="error" class="muted">{{ error }}</div>
  <div v-else-if="weather" class="weather">
    <div class="now">
      <span class="now-icon">{{ weatherIcon(weather.currentCode) }}</span>
      <div>
        <div class="now-temp">{{ weather.currentTemp }}°</div>
        <div class="muted">{{ weatherLabel(weather.currentCode) }} · {{ settings.weatherLocation.name }}</div>
      </div>
    </div>

    <div class="forecast">
      <div v-for="day in weather.days" :key="day.date" class="fday">
        <span class="muted">{{ weekday(day.date) }}</span>
        <span class="fday-icon">{{ weatherIcon(day.code) }}</span>
        <span class="fday-temp">{{ day.tempMax }}° <span class="muted">{{ day.tempMin }}°</span></span>
      </div>
    </div>

    <p v-if="weather.frostWarning" class="hint frost">❄️ Frost erwartet — empfindliche Pflanzen schützen.</p>
    <p v-else-if="weather.rainToday" class="hint rain">🌧️ Regen wahrscheinlich — Gießen kann heute warten.</p>
  </div>
</template>

<style scoped>
.weather {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.now {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.now-icon {
  font-size: 2.2rem;
}

.now-temp {
  font-size: 1.8rem;
  font-weight: 700;
  line-height: 1;
}

.forecast {
  display: flex;
  justify-content: space-between;
  gap: 0.3rem;
}

.fday {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  flex: 1;
}

.fday-icon {
  font-size: 1.25rem;
}

.fday-temp {
  font-size: 0.85rem;
  font-weight: 600;
}

.hint {
  margin: 0;
  font-size: 0.85rem;
  padding: 0.4rem 0.6rem;
  border-radius: 8px;
}

.hint.frost {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
}

.hint.rain {
  background: rgba(22, 163, 74, 0.1);
  color: var(--app-accent);
}
</style>
