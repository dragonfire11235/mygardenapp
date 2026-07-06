import { defineStore } from 'pinia'
import { ref } from 'vue'
import { storage } from '../../data'

export interface DashboardWidgetConfig {
  id: string
  visible: boolean
}

export const useSettingsStore = defineStore('settings', () => {
  const trefleToken = ref('')
  const notificationsEnabled = ref(false)
  const dashboardLayout = ref<DashboardWidgetConfig[]>([])
  const loaded = ref(false)

  async function load() {
    trefleToken.value = (await storage.getSetting<string>('trefleToken')) ?? ''
    notificationsEnabled.value = (await storage.getSetting<boolean>('notificationsEnabled')) ?? false
    dashboardLayout.value = (await storage.getSetting<DashboardWidgetConfig[]>('dashboardLayout')) ?? []
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

  return {
    trefleToken,
    notificationsEnabled,
    dashboardLayout,
    loaded,
    load,
    setTrefleToken,
    setNotificationsEnabled,
    setDashboardLayout,
  }
})
