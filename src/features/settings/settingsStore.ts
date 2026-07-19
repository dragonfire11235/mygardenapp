import { defineStore } from 'pinia'
import { ref } from 'vue'
import { storage } from '../../data'

export interface DashboardWidgetConfig {
  id: string
  visible: boolean
}

export interface WeatherLocation {
  lat: number
  lon: number
  name: string
}

export const useSettingsStore = defineStore('settings', () => {
  const notificationsEnabled = ref(false)
  const dashboardLayout = ref<DashboardWidgetConfig[]>([])
  const dashboardHeaderPhotoId = ref<string | null>(null)
  const dashboardBackgroundPhotoId = ref<string | null>(null)
  const weatherLocation = ref<WeatherLocation | null>(null)
  const gardenMapPhotoId = ref<string | null>(null)
  const darkMode = ref(false)
  const loaded = ref(false)

  async function load() {
    notificationsEnabled.value = (await storage.getSetting<boolean>('notificationsEnabled')) ?? false
    dashboardLayout.value = (await storage.getSetting<DashboardWidgetConfig[]>('dashboardLayout')) ?? []
    dashboardHeaderPhotoId.value = (await storage.getSetting<string>('dashboardHeaderPhotoId')) ?? null
    dashboardBackgroundPhotoId.value = (await storage.getSetting<string>('dashboardBackgroundPhotoId')) ?? null
    weatherLocation.value = (await storage.getSetting<WeatherLocation>('weatherLocation')) ?? null
    gardenMapPhotoId.value = (await storage.getSetting<string>('gardenMapPhotoId')) ?? null
    // Ohne gespeicherte Wahl der Systemvorgabe folgen
    const storedDark = await storage.getSetting<boolean>('darkMode')
    darkMode.value = storedDark ?? window.matchMedia('(prefers-color-scheme: dark)').matches
    loaded.value = true
  }

  async function setDarkMode(enabled: boolean) {
    darkMode.value = enabled
    await storage.setSetting('darkMode', enabled)
  }

  async function setNotificationsEnabled(enabled: boolean) {
    notificationsEnabled.value = enabled
    await storage.setSetting('notificationsEnabled', enabled)
  }

  async function setDashboardLayout(layout: DashboardWidgetConfig[]) {
    dashboardLayout.value = layout
    await storage.setSetting('dashboardLayout', JSON.parse(JSON.stringify(layout)))
  }

  async function setDashboardHeaderPhotoId(id: string | null) {
    dashboardHeaderPhotoId.value = id
    await storage.setSetting('dashboardHeaderPhotoId', id)
  }

  async function setDashboardBackgroundPhotoId(id: string | null) {
    dashboardBackgroundPhotoId.value = id
    await storage.setSetting('dashboardBackgroundPhotoId', id)
  }

  async function setWeatherLocation(location: WeatherLocation | null) {
    weatherLocation.value = location
    await storage.setSetting('weatherLocation', location ? { ...location } : null)
  }

  async function setGardenMapPhotoId(id: string | null) {
    gardenMapPhotoId.value = id
    await storage.setSetting('gardenMapPhotoId', id)
  }

  return {
    notificationsEnabled,
    dashboardLayout,
    dashboardHeaderPhotoId,
    dashboardBackgroundPhotoId,
    weatherLocation,
    gardenMapPhotoId,
    darkMode,
    loaded,
    load,
    setNotificationsEnabled,
    setDashboardLayout,
    setDashboardHeaderPhotoId,
    setDashboardBackgroundPhotoId,
    setWeatherLocation,
    setGardenMapPhotoId,
    setDarkMode,
  }
})
