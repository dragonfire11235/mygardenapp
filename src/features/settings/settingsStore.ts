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
  const trefleToken = ref('')
  const notificationsEnabled = ref(false)
  const dashboardLayout = ref<DashboardWidgetConfig[]>([])
  const dashboardHeaderPhotoId = ref<string | null>(null)
  const dashboardBackgroundPhotoId = ref<string | null>(null)
  const weatherLocation = ref<WeatherLocation | null>(null)
  const gardenMapPhotoId = ref<string | null>(null)
  const loaded = ref(false)

  async function load() {
    trefleToken.value = (await storage.getSetting<string>('trefleToken')) ?? ''
    notificationsEnabled.value = (await storage.getSetting<boolean>('notificationsEnabled')) ?? false
    dashboardLayout.value = (await storage.getSetting<DashboardWidgetConfig[]>('dashboardLayout')) ?? []
    dashboardHeaderPhotoId.value = (await storage.getSetting<string>('dashboardHeaderPhotoId')) ?? null
    dashboardBackgroundPhotoId.value = (await storage.getSetting<string>('dashboardBackgroundPhotoId')) ?? null
    weatherLocation.value = (await storage.getSetting<WeatherLocation>('weatherLocation')) ?? null
    gardenMapPhotoId.value = (await storage.getSetting<string>('gardenMapPhotoId')) ?? null
    loaded.value = true
  }

  async function setTrefleToken(token: string) {
    trefleToken.value = token.trim()
    await storage.setSetting('trefleToken', trefleToken.value)
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
    trefleToken,
    notificationsEnabled,
    dashboardLayout,
    dashboardHeaderPhotoId,
    dashboardBackgroundPhotoId,
    weatherLocation,
    gardenMapPhotoId,
    loaded,
    load,
    setTrefleToken,
    setNotificationsEnabled,
    setDashboardLayout,
    setDashboardHeaderPhotoId,
    setDashboardBackgroundPhotoId,
    setWeatherLocation,
    setGardenMapPhotoId,
  }
})
