import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useSettingsStore } from '../settings/settingsStore'
import { fetchWeather, type Weather } from './weatherApi'

// Wetter liegt in einem Store, damit auch andere Stellen (z. B. der
// „Alles gegossen"-Button) den Regen-/Frost-Status kennen.
export const useWeatherStore = defineStore('weather', () => {
  const settings = useSettingsStore()
  const weather = ref<Weather | null>(null)
  const loading = ref(false)
  const error = ref('')

  const rainToday = computed(() => weather.value?.rainToday ?? false)
  const frostWarning = computed(() => weather.value?.frostWarning ?? false)

  async function load() {
    if (!settings.weatherLocation) {
      weather.value = null
      return
    }
    loading.value = true
    error.value = ''
    try {
      weather.value = await fetchWeather(settings.weatherLocation)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Wetter konnte nicht geladen werden.'
    } finally {
      loading.value = false
    }
  }

  // Standortwechsel → neu laden
  watch(() => settings.weatherLocation, load, { deep: true })

  return { weather, loading, error, rainToday, frostWarning, load }
})
